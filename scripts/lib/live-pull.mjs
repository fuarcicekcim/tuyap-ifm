// Canlı katalog (Supabase fc_live_products) → statik katalog (products-data.js) işleme mantığı.
// Ağ ve dosya yok: Node'da test edilir. Kural, panelin ve sitenin kullandığı ortak kuralla aynıdır:
//   • Satır tümüyle geçerliyse ürünün TAM canlı durumudur; geçersiz satır tarayıcıdaki gibi yok sayılır.
//   • Satırı olmayan ürüne dokunulmaz; katalogda olmayan ürün kimliği yok sayılır.
//   • Yalnız canlı yönetilen alanlar değişir (fiyat, stok, aktif, vitrin sırası, "en çok satan" sırası, rozet, indirim);
//     ad, açıklama, fotoğraf, kategori, ayarlar ve kampanya (cartDiscount) ASLA değişmez.
import '../../catalog-pricing.js';
import { parseRow } from '../../src/js/live-rules.js';
import { stateOf, stateOfRow, sameState, describeChange } from '../../admin-live-core.js';
import { validateCatalog } from './catalog-release.mjs';

export class PullError extends Error {
  constructor(message, problems = []) { super(message); this.name = 'PullError'; this.problems = problems; }
}

const REVISION_SUFFIX = /-canli-\d{8}-\d{4}$/;

// "2026-11-25T20:08" (İstanbul saati) → "20261125-2008"
export function revisionStamp(now) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}`;
}

// Yalnız farklı olan alanları işler; ürünün diğer anahtarlarına ve anahtar sırasına dokunmaz.
// Kurallar panelin taslağa uygulamasıyla aynıdır (admin-live-core.applyStateToProduct): stok varsa `inStock` anahtarı silinir.
function applyDifferences(product, from, to) {
  if (from.price !== to.price) product.price = to.price;
  if (from.inStock !== to.inStock) { if (to.inStock) delete product.inStock; else product.inStock = false; }
  if (from.active !== to.active) product.active = to.active;
  if ((from.sortOrder ?? null) !== (to.sortOrder ?? null)) {
    if (to.sortOrder === null) { if (Object.hasOwn(product, 'sortOrder')) product.sortOrder = null; } else product.sortOrder = to.sortOrder;
  }
  if ((from.bestsellerRank ?? null) !== (to.bestsellerRank ?? null)) product.bestsellerRank = to.bestsellerRank;
  if ((from.badge || '') !== (to.badge || '')) product.badge = to.badge || '';
  if (JSON.stringify(from.discount) !== JSON.stringify(to.discount)) {
    if (to.discount) product.discount = { price: to.discount.price, previousPrice: to.discount.previousPrice, startsOn: to.discount.startsOn, endsOn: to.discount.endsOn };
    else delete product.discount;
  }
}

/**
 * @param {object} catalog  products-data.js'ten okunan katalog (DEĞİŞTİRİLMEZ)
 * @param {unknown[]} rows  fc_live_products ham satırları
 * @param {{packages?: object[], now?: Date}} options
 * @returns {{changed:boolean, catalog:object, changes:object[], summary:object}}
 */
export function planPull(catalog, rows, { packages = [], now = new Date() } = {}) {
  const pricing = globalThis.FuarPricing;
  if (!Array.isArray(rows)) throw new PullError('Canlı katalog yanıtı bir liste değil.');
  const next = structuredClone(catalog);
  const byId = new Map(next.products.map((product) => [product.id, product]));
  const badges = new Map((next.badges || []).map((badge) => [badge.id, badge.name]));

  const invalid = [], unknown = [], duplicates = [], problems = [];
  const live = new Map();
  for (const raw of rows) {
    const row = parseRow(raw, pricing);
    if (!row) { invalid.push(typeof raw?.product_id === 'string' ? raw.product_id : '(kimliksiz satır)'); continue; }
    if (!byId.has(row.id)) { unknown.push(row.id); continue; }
    if (live.has(row.id)) duplicates.push(row.id);
    live.set(row.id, row);
  }

  const changes = [];
  let unchanged = 0;
  for (const [id, row] of live) {
    const product = next.products.find((item) => item.id === id);
    if (row.badge && !badges.has(row.badge)) {
      problems.push(`${product.name}: canlıdaki rozet ("${row.badge}") katalogda tanımlı değil.`);
      continue;
    }
    const before = stateOf(product);
    const after = stateOfRow(row);
    if (sameState(before, after)) { unchanged += 1; continue; }
    const lines = describeChange(before, after, { badgeName: (badge) => badges.get(badge) });
    applyDifferences(product, before, after);
    if (!sameState(stateOf(product), after)) throw new PullError(`${product.name}: canlı durum katalog ürününe birebir işlenemedi (iç tutarsızlık).`);
    changes.push({ id, name: product.name, degisiklikler: lines });
  }

  // "En çok satan" sırası benzersiz olmalı. Canlı satırı olmayan bir ürün aynı sırayı statikte tutuyorsa sessizce seçim yapılmaz.
  const holders = new Map();
  for (const product of next.products) {
    if (product.bestsellerRank == null) continue;
    holders.set(product.bestsellerRank, [...(holders.get(product.bestsellerRank) || []), product.name]);
  }
  for (const [rank, names] of holders) {
    if (names.length > 1) problems.push(`"En çok satan" ${rank}. sırasını birden çok ürün tutuyor: ${names.join(', ')}. Canlıda sıralamayı panelden yeniden kaydedin.`);
  }
  if (problems.length) throw new PullError('Canlı durum kataloğa işlenemedi; hiçbir şey yazılmadı.', problems);

  const summary = {
    liveRows: rows.length, applied: changes.length, unchanged,
    ignoredInvalid: invalid, ignoredUnknownProduct: unknown, duplicateRows: duplicates,
  };
  if (!changes.length) return { changed: false, catalog: catalog, changes, summary };

  const previousRevision = String(next.revision);
  next.revision = `${previousRevision.replace(REVISION_SUFFIX, '')}-canli-${revisionStamp(now)}`;
  next.updatedAt = now.toISOString();
  try {
    // Ürün adresleri ve silinmeme kuralı ile paket içeriği (kapalı ürün paketteyse) mevcut içe aktarmayla aynı denetimden geçer.
    validateCatalog(next, { previous: catalog, packages, root: null, checkFiles: false, allowEmbedded: false });
  } catch (error) {
    throw new PullError('Canlı durumla katalog doğrulamadan geçmedi; hiçbir şey yazılmadı.', [error.message]);
  }
  return { changed: true, catalog: next, changes, summary: { ...summary, revision: { from: previousRevision, to: next.revision } } };
}
