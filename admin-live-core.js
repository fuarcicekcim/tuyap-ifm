// Yönetim paneli — canlı yayın çekirdeği (saf mantık: DOM ve ağ yok, Node'da test edilir).
//
// Model (PLAN.md "Adım 4 için kural"): fc_live_products'taki bir satır ürünün TAM canlı durumudur. Panel her yazmada
// ürünün fiyat, stok, aktif, vitrin sırası, "en çok satan" sırası, rozet ve indirim alanlarını eksiksiz yazar.
//
// Panelde düzenlemeler tarayıcıdaki taslağa (localStorage) yazılır. Taslak ile canlı durum ayrışabileceği için
// (başka cihazdan yapılan değişiklik) üç yönlü karşılaştırma yapılır:
//   TABAN (B)  = taslağın son eşitlendiği canlı durum (yoksa statik katalogdaki değer)
//   TASLAK (D) = bu cihazdaki değer
//   CANLI (L)  = Supabase'teki geçerli durum (satır yoksa statik değer)
//   D == B  → kullanıcı dokunmamış: canlıdaki değer taslağa alınır
//   D != B, L == B → yalnız bu cihazda değişmiş: canlıya yazılacak değişiklik
//   D != B, L != B, D == L → aynı değer zaten canlıda: yapılacak bir şey yok
//   D != B, L != B, D != L → ÇAKIŞMA: iki taraf da değiştirmiş; varsayılan canlıdaki kalır, üzerine yazmak kullanıcı kararıdır.

const MONEY = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
const round2 = (value) => Math.round(Number(value) * 100) / 100;

export const money = (value) => `${MONEY.format(round2(value))} ₺`;

// ---- Durum (bir ürünün canlı yönetilen alanları) ----------------------------------------------------------------

// Panel ürününden durum çıkarır. `rank`: ürünün etkin "en çok satan" sırası (store.bestsellerRank sonucu).
export function stateOf(product, rank = product?.bestsellerRank ?? null) {
  const d = product.discount ?? null;
  return {
    price: round2(product.price),
    inStock: product.inStock !== false,
    active: product.active !== false,
    sortOrder: product.sortOrder ?? null,
    bestsellerRank: rank ?? null,
    badge: product.badge || '',
    discount: d ? { price: round2(d.price), previousPrice: round2(d.previousPrice), startsOn: d.startsOn, endsOn: d.endsOn } : null,
  };
}

// parseRow çıktısından (live-rules.js) durum. Bilinmeyen rozet kimliği '' sayılır (panel de aynısını yapar).
export function stateOfRow(row, knownBadges = null) {
  return {
    price: round2(row.price), inStock: row.inStock, active: row.active, sortOrder: row.sortOrder ?? null,
    bestsellerRank: row.bestsellerRank ?? null,
    badge: !row.badge || (knownBadges && !knownBadges.has(row.badge)) ? '' : row.badge,
    discount: row.discount ? { price: round2(row.discount.price), previousPrice: round2(row.discount.previousPrice), startsOn: row.discount.startsOn, endsOn: row.discount.endsOn } : null,
  };
}

const canon = (s) => JSON.stringify([s.price, s.inStock, s.active, s.sortOrder ?? null, s.bestsellerRank ?? null, s.badge || '',
  s.discount ? [s.discount.price, s.discount.previousPrice, s.discount.startsOn, s.discount.endsOn] : null]);
export const sameState = (a, b) => canon(a) === canon(b);

// İki (normalleştirilmiş) katalog içeriği, sürüm ve güncelleme damgası hariç, birebir aynı mı?
export const sameCatalogContent = (a, b) => Boolean(a && b) && JSON.stringify({ ...a, revision: '', updatedAt: '' }) === JSON.stringify({ ...b, revision: '', updatedAt: '' });

// Veritabanı satırı (tüm alanlar eksiksiz; updated_at/updated_by sunucuda damgalanır).
export function stateToRow(id, s) {
  return {
    product_id: id, price: s.price, in_stock: s.inStock, active: s.active, sort_order: s.sortOrder ?? null,
    bestseller_rank: s.bestsellerRank ?? null, badge: s.badge || '',
    discount_price: s.discount?.price ?? null, discount_previous: s.discount?.previousPrice ?? null,
    discount_starts_on: s.discount?.startsOn ?? null, discount_ends_on: s.discount?.endsOn ?? null,
  };
}

// Yazmadan önce tek bir durumu doğrular; hata iletisi ya da '' döner. `parseRow`: live-rules.js'teki ortak doğrulayıcı.
export function validateState(id, s, pricing, parseRow) {
  if (!Number.isFinite(s.price) || s.price < 0 || s.price > 1_000_000) return 'Canlı yayında fiyat 0 ile 1.000.000 ₺ arasında olmalı.';
  if (s.discount) {
    const message = pricing.validate({ price: s.price, discount: s.discount });
    if (message) return message;
  }
  return parseRow(stateToRow(id, s), pricing) ? '' : 'Satır doğrulanamadı; alanları kontrol edin.';
}

// ---- Üç yönlü eşitleme --------------------------------------------------------------------------------------------

// ids: taslak ∩ statik ürün kimlikleri (sıralı). Her biri Map<id, durum>: statik, taslak, canlı; baseline: Map<id, durum> (yalnız statikten farklı olanlar).
export function planSync({ ids, staticStates, draftStates, liveStates, baseline = new Map() }) {
  const items = [];
  for (const id of ids) {
    const S = staticStates.get(id);
    const D = draftStates.get(id);
    const L = liveStates.get(id) ?? S;
    const B = baseline.get(id) ?? S;
    if (!S || !D) continue;
    if (sameState(D, B)) items.push({ id, kind: sameState(L, B) ? 'same' : 'adopt', draft: D, live: L, base: B });
    else if (sameState(L, B)) items.push({ id, kind: 'pending', draft: D, live: L, base: B });
    else if (sameState(D, L)) items.push({ id, kind: 'same', draft: D, live: L, base: B });
    else items.push({ id, kind: 'conflict', draft: D, live: L, base: B, reason: 'changed' });
  }
  // "En çok satan" sırası benzersizdir. Taslakta düzenlenmiş bir ürün, canlıda başka ürüne verilmiş bir sırayı isterse
  // (taslakta çakışma yok ama canlıya alınınca olur) o ürünün değişikliği çakışma sayılır; çözüm yalnız "canlıdaki kalsın"dır.
  const effective = (item) => (item.kind === 'pending' ? item.draft : item.kind === 'conflict' ? item.live : item.live);
  const holders = new Map();
  for (const item of items) {
    const rank = effective(item).bestsellerRank;
    if (rank != null) holders.set(rank, [...(holders.get(rank) ?? []), item]);
  }
  for (const [, group] of holders) {
    if (group.length < 2) continue;
    for (const item of group) {
      if (item.kind === 'pending') { item.kind = 'conflict'; item.reason = 'rank'; }
    }
  }
  return items;
}

// Çakışma çözümleri uygulanır. choices: Map<id, 'mine'|'live'>; varsayılan 'live'. 'rank' çakışması her zaman canlıyı seçer.
// Dönüş: adopts (taslağa alınacak canlı durum), writes (canlıya yazılacak durum), errors ve iki taban:
//   baselineBefore: yazma BAŞARISIZ olursa saklanacak taban (yazılacak ürünlerde eski taban korunur),
//   baseline: yazma BAŞARILI olursa saklanacak taban.
export function resolve(items, choices = new Map(), { staticStates, pricing, parseRow } = {}) {
  const adopts = new Map();
  const writes = new Map();
  const baseline = new Map();
  const baselineBefore = new Map();
  const errors = [];
  for (const item of items) {
    const choice = item.kind === 'conflict' ? (item.reason === 'rank' ? 'live' : choices.get(item.id) ?? 'live') : null;
    if (item.kind === 'adopt' || choice === 'live') {
      adopts.set(item.id, item.live);
      baseline.set(item.id, item.live);
      baselineBefore.set(item.id, item.live);
    } else if (item.kind === 'pending' || choice === 'mine') {
      writes.set(item.id, item.draft);
      baseline.set(item.id, item.draft);
      baselineBefore.set(item.id, item.base);
    } else {
      baseline.set(item.id, item.live);
      baselineBefore.set(item.id, item.live);
    }
  }
  // Doğrulama ve "en çok satan" sırasının canlıya alındıktan sonraki benzersizliği (yazılanlar + olduğu gibi kalanlar).
  if (pricing && parseRow) {
    for (const [id, state] of writes) {
      const message = validateState(id, state, pricing, parseRow);
      if (message) errors.push({ id, message });
    }
  }
  const after = new Map();
  for (const item of items) after.set(item.id, writes.get(item.id) ?? adopts.get(item.id) ?? item.live);
  const seen = new Map();
  for (const [id, state] of after) {
    if (state.bestsellerRank == null) continue;
    if (seen.has(state.bestsellerRank)) errors.push({ id, message: `${state.bestsellerRank}. sıra iki üründe birden olamaz.`, other: seen.get(state.bestsellerRank) });
    else seen.set(state.bestsellerRank, id);
  }
  // Taban yalnız statikten farklıysa saklanır (küçük kalır).
  const compact = (map) => {
    const kept = new Map();
    for (const [id, state] of map) if (!staticStates || !sameState(state, staticStates.get(id) ?? state)) kept.set(id, state);
    return kept;
  };
  return { adopts, writes, baseline: compact(baseline), baselineBefore: compact(baselineBefore), errors };
}

// ---- Değişiklik açıklaması (inceleme penceresi) -------------------------------------------------------------------

const day = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.split('-').reverse().slice(0, 2).join('.') : '—');
const discountText = (d) => `${money(d.price)} (önceki ${money(d.previousPrice)}) · ${day(d.startsOn)}–${day(d.endsOn)}`;

// from → to farkını okunur satırlar olarak döndürür. ctx.badgeName(id): rozet adı.
export function describeChange(from, to, ctx = {}) {
  const badge = (id) => (id ? ctx.badgeName?.(id) || id : 'yok');
  const lines = [];
  if (from.price !== to.price) lines.push(`Fiyat: ${money(from.price)} → ${money(to.price)}`);
  if (from.inStock !== to.inStock) lines.push(`Stok: ${from.inStock ? 'var' : 'yok'} → ${to.inStock ? 'var' : 'yok'}`);
  if (from.active !== to.active) lines.push(`Vitrin: ${from.active ? 'görünür' : 'gizli'} → ${to.active ? 'görünür' : 'gizli'}`);
  if ((from.sortOrder ?? null) !== (to.sortOrder ?? null)) lines.push(`Vitrin sırası: ${from.sortOrder ?? 'otomatik'} → ${to.sortOrder ?? 'otomatik'}`);
  if ((from.bestsellerRank ?? null) !== (to.bestsellerRank ?? null)) lines.push(`En çok satan: ${from.bestsellerRank ? `${from.bestsellerRank}. sıra` : 'yok'} → ${to.bestsellerRank ? `${to.bestsellerRank}. sıra` : 'yok'}`);
  if ((from.badge || '') !== (to.badge || '')) lines.push(`Rozet: ${badge(from.badge)} → ${badge(to.badge)}`);
  const fd = from.discount; const td = to.discount;
  if (JSON.stringify(fd) !== JSON.stringify(td)) {
    if (!fd) lines.push(`İndirim: yok → ${discountText(td)}`);
    else if (!td) lines.push('İndirim: kaldırıldı');
    else lines.push(`İndirim: ${discountText(fd)} → ${discountText(td)}`);
  }
  return lines;
}

// ---- Taslağa uygulama -----------------------------------------------------------------------------------------------

// Canlı durumu panel ürününe işler (yerinde). "En çok satan" sırası için sahip anahtar her zaman yazılır (yönetilen sıralama).
export function applyStateToProduct(product, s) {
  product.price = s.price;
  if (s.inStock) delete product.inStock; else product.inStock = false;
  product.active = s.active;
  if (s.sortOrder === null) { if (Object.hasOwn(product, 'sortOrder')) product.sortOrder = null; } else product.sortOrder = s.sortOrder;
  product.bestsellerRank = s.bestsellerRank;
  product.badge = s.badge;
  if (s.discount) product.discount = { ...s.discount }; else delete product.discount;
  return product;
}

// ---- Hata iletileri ---------------------------------------------------------------------------------------------------

// Supabase/PostgREST hatasını kullanıcıya anlaşılır Türkçe iletiye çevirir. kind: 'auth' (yeniden giriş), 'conflict', 'denied', 'network', 'other'.
export function explainError(error) {
  const code = String(error?.code || '');
  const text = String(error?.message || '');
  if (error?.name === 'AbortError' || /timeout|aborted/i.test(text)) return { kind: 'network', message: 'Sunucu yanıtı zaman aşımına uğradı. Canlı durumu yenileyip sonucu doğrulayın; değişiklikleriniz bu cihazda korunuyor.' };
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(text) || error instanceof TypeError) return { kind: 'network', message: 'Bağlantı kurulamadı. İnternetinizi kontrol edin; değişiklikleriniz bu cihazda korunuyor.' };
  if (code === 'PGRST301' || /jwt|token.*expired|not authenticated/i.test(text)) return { kind: 'auth', message: 'Oturum süresi doldu. Yeniden giriş yapın.' };
  if (code === '42501' || /row-level security|permission denied/i.test(text)) return { kind: 'denied', message: 'Bu hesabın canlı yayın yetkisi yok ya da oturum geçersiz. Yönetici hesabıyla yeniden giriş yapın.' };
  if (code === '23505') return { kind: 'conflict', message: '"En çok satan" sırası başka bir üründe. Canlı durumu yenileyip sıralamayı yeniden seçin.' };
  if (code === '23514' || code === '22003' || code === '22P02') return { kind: 'other', message: 'Veritabanı değeri kabul etmedi (fiyat/indirim/tarih kuralı). Değerleri kontrol edin.' };
  return { kind: 'other', message: 'Canlı yayın işlemi tamamlanamadı. Canlı durumu yenileyip tekrar deneyin.' };
}
