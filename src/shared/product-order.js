// Ürün sıralama kuralları: derlemede (scripts/) ve tarayıcıdaki canlı katalog katmanında (src/js/live-catalog.js)
// AYNI kod çalışır; böylece sayfa HTML'indeki sıra ile canlı güncellemeden sonraki sıra ayrışmaz. Node'a özgü bağımlılık yok.

// VİP sekmesi: KDV hariç bu tutar ve üzerindeki ürünler (kullanıcı kararı 2026-11-17).
export const VIP_MIN_PRICE = 7000;

// "En çok satan" sırası ürün verisinde hiç yönetilmiyorsa kullanılan eski varsayılan.
export const LEGACY_BESTSELLERS = ['iki-dalli-beyaz-orkide', 'yucca-iki-govde', 'seflera', 'beyaz-lilyum-prestij-ferforje', 'antoryum'];

export function homeProductOrder(products) {
  const explicit = products.some((product) => Object.hasOwn(product, 'bestsellerRank'));
  const byId = new Map(products.map((product) => [product.id, product]));
  const featured = explicit
    ? products.filter((product) => Number.isInteger(product.bestsellerRank) && product.bestsellerRank > 0).sort((a, b) => a.bestsellerRank - b.bestsellerRank)
    : LEGACY_BESTSELLERS.map((id) => byId.get(id)).filter(Boolean);
  const selected = new Set(featured.map((product) => product.id));
  const remaining = products.filter((product) => !selected.has(product.id)).sort((a, b) => a.price - b.price || a.id.localeCompare(b.id, 'tr'));
  const mixed = [];
  for (let low = 0, high = remaining.length - 1; low <= high;) {
    mixed.push(remaining[low++]);
    if (low <= high) mixed.push(remaining[high--]);
  }
  const fallback = new Map(mixed.map((product, index) => [product.id, index]));
  mixed.sort((a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity) || fallback.get(a.id) - fallback.get(b.id));
  return [...featured, ...mixed];
}

// Stokta olmayan ürünler her listede en sona gider; kendi aralarındaki ve diğerlerinin sırası değişmez.
export const stockLast = (products) => [...products.filter((p) => p.inStock !== false), ...products.filter((p) => p.inStock === false)];

// Kategori görünümü: stokta olanlar önce; onların başında "En çok satan" etiketliler (sıra numarasına göre),
// sonra mevcut sıra. Stokta olmayanlar en sonda.
export function categoryDisplayOrder(products) {
  const bestKey = (p) => (p.badgeId === 'best-seller' ? (p.bestsellerRank ?? 50) : 99);
  return products
    .map((p, index) => ({ p, index }))
    .sort((a, b) => (a.p.inStock === false) - (b.p.inStock === false) || bestKey(a.p) - bestKey(b.p) || a.index - b.index)
    .map(({ p }) => p);
}
