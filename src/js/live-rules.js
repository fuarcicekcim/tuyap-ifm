// Canlı katalog satırlarının doğrulanması ve ürün nesnesine uygulanması. DOM'a dokunmaz; Node'da test edilebilir.
//
// Model: statik katalog (products-data.js) ana kaynak ve yedektir. Supabase'teki `fc_live_products` satırı, o ürünün
// TAM canlı durumudur (kısmi değil): satır varsa bu değerler, yoksa statik değerler geçerlidir.
// Bozuk bir satır (tür, aralık, indirim kuralı) tümüyle yok sayılır; ürün statik değerinde kalır.

// Tarayıcının okuduğu sütunlar: herkese açık sütunlar (updated_by hiç okunmaz).
export const LIVE_SELECT = [
  'product_id', 'price', 'in_stock', 'active', 'sort_order', 'bestseller_rank', 'badge',
  'discount_price', 'discount_previous', 'discount_starts_on', 'discount_ends_on', 'updated_at',
].join(',');

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const inRange = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const present = (value) => value !== null && value !== undefined;

// Ürün satışa açık mı? (sayfada kapalıysa "Siparişe ekle" görünmez, sepete eklenemez.)
export const isAvailable = (product) => Boolean(product) && product.active !== false && product.inStock !== false;

// Ham satırı doğrular; geçerliyse sade bir nesne, değilse null döner.
export function parseRow(raw, pricing) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.product_id;
  if (typeof id !== 'string' || id.length > 80 || !ID.test(id)) return null;
  const { price } = raw;
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0 || price > 1_000_000
    || Math.abs(price * 100 - Math.round(price * 100)) > 0.0001) return null;
  if (typeof raw.in_stock !== 'boolean' || typeof raw.active !== 'boolean') return null;

  const sortOrder = raw.sort_order ?? null;
  if (sortOrder !== null && !inRange(sortOrder, 0, 1_000_000)) return null;
  const bestsellerRank = raw.bestseller_rank ?? null;
  if (bestsellerRank !== null && !inRange(bestsellerRank, 1, 5)) return null;
  const badge = raw.badge ?? '';
  if (typeof badge !== 'string' || !/^[a-z0-9-]{0,40}$/.test(badge)) return null;

  // İndirim ya hiç yoktur ya da dört alanıyla eksiksizdir (veritabanındaki kural ile aynı).
  const fields = [raw.discount_price, raw.discount_previous, raw.discount_starts_on, raw.discount_ends_on];
  const given = fields.filter(present).length;
  let discount = null;
  if (given === 4) {
    discount = { price: raw.discount_price, previousPrice: raw.discount_previous, startsOn: raw.discount_starts_on, endsOn: raw.discount_ends_on };
    // Ortak katalog kuralı: indirimli < önceki <= fiyat, geçerli tarihler, başlangıç <= bitiş.
    if (pricing.validate({ price, discount })) return null;
  } else if (given !== 0) {
    return null;
  }
  return { id, price, inStock: raw.in_stock, active: raw.active, sortOrder, bestsellerRank, badge, discount };
}

// Satır listesini id'ye göre haritaya çevirir; geçersiz satırlar atlanır. Aynı ürün iki kez gelirse sonuncusu geçerlidir.
export function parseRows(list, pricing) {
  const rows = new Map();
  if (!Array.isArray(list)) return rows;
  for (const raw of list) {
    const row = parseRow(raw, pricing);
    if (row) rows.set(row.id, row);
  }
  return rows;
}

// Satırı ürün nesnesine işler (yerinde). Satışa kapalı üründe indirim gösterilmez (derlemedeki kuralla aynı).
export function applyRow(product, row, pricing, today = pricing.today()) {
  const available = row.active && row.inStock;
  product.basePrice = row.price;
  product.active = row.active;
  product.inStock = row.inStock;
  product.badgeId = row.badge;
  product.bestsellerRank = row.bestsellerRank;
  if (row.sortOrder === null) delete product.sortOrder; else product.sortOrder = row.sortOrder;
  if (available && row.discount) product.discount = row.discount; else delete product.discount;
  product.price = pricing.resolve({ price: row.price, active: row.active, discount: product.discount }, today).price;
  return product;
}

// Ürünün sayfada görünen durumunun imzası: değişmeyen ürünlerde DOM'a dokunulmaz.
export const stateSignature = (p) => JSON.stringify([
  p.price, p.basePrice ?? null, p.inStock !== false, p.active !== false, p.badgeId ?? '', p.bestsellerRank ?? null, p.sortOrder ?? null, p.discount ?? null,
]);

// Yalnız sıralamayı etkileyen alanların imzası: değişmediyse kartlar yeniden dizilmez.
export const orderSignature = (p) => JSON.stringify([
  p.price, p.inStock !== false, p.active !== false, p.badgeId ?? '', p.bestsellerRank ?? null, p.sortOrder ?? null,
]);
