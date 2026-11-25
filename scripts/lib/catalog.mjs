import '../../catalog-pricing.js';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { parseCatalogSource, validateCatalog, sourceSha256, localImagePath } from './catalog-release.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// products-data.js kategori kimlikleri → yeni sitedeki kategori adları (kullanıcı kararı 2026-11-17).
// Mevcut web adresleri (slug) değişmez. Ferforje/ayaklı ürünler veride 'wreaths' altında; sitede ayrı 'Ferforje Aranjman' kategorisinde gösterilir.
export const CATEGORIES = [
  { id: 'ferforje', slug: 'ferforje-aranjman', name: 'Ferforje Aranjman' },
  { id: 'arrangements', slug: 'stant-aranjmani', name: 'Aranjmanlar' },
  { id: 'plants', slug: 'saksi-bitkisi', name: 'Saksı Bitkileri' },
  { id: 'orchids', slug: 'vip-orkide', name: 'Orkideler' },
  { id: 'wreaths', slug: 'acilis-fuar-celengi', name: 'Fuar Çelengi' },
];

// VİP sekmesi: KDV hariç bu tutar ve üzerindeki ürünler (kullanıcı kararı 2026-11-17).
export const VIP_MIN_PRICE = 7000;

const displayCategory = (p) => (p.category === 'wreaths' && /ferforje|ayaklı/i.test(p.name) ? 'ferforje' : p.category);

export const categoryOf = (id) => CATEGORIES.find((c) => c.id === id);

export function loadFairs(today = globalThis.FuarPricing.today()) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'fairs-data.js'), 'utf8'), ctx);
  const data = ctx.window.FUAR_TAKVIMI;
  const fairs = data.fairs.filter((f) => f.end >= today).sort((a, b) => a.start.localeCompare(b.start));
  return { updatedAt: data.updatedAt, venues: data.venues, fairs, allFairs: data.fairs, today };
}

export function loadCatalog(root = ROOT) {
  const source = fs.readFileSync(path.join(root, 'products-data.js'), 'utf8');
  const data = validateCatalog(parseCatalogSource(source), { root, checkFiles: true, allowEmbedded: false });
  const managedRanking = data.products.some((product) => Object.hasOwn(product, 'bestsellerRank'));
  const badges = Object.fromEntries((data.badges || []).map((b) => [b.id, b.name]));
  const today = globalThis.FuarPricing.today();
  const cartDiscount = data.cartDiscount ?? null;
  const allProducts = data.products
    .map((p) => {
      const inStock = p.inStock !== false;
      const available = p.active !== false && inStock;
      const current = available ? globalThis.FuarPricing.resolve(p, today) : { price: p.price, discount: null };
      return {
        id: p.id,
        name: p.name,
        category: displayCategory(p),
        categoryName: categoryOf(displayCategory(p))?.name || p.label,
        vip: Number(p.price) >= VIP_MIN_PRICE,
        price: current.price,
        basePrice: p.price,
        discount: available ? p.discount ?? null : null,
        activeDiscount: current.discount,
        cartDiscount: available ? cartDiscount : null,
        image: '/' + localImagePath(p.image),
        fuarImage: (() => { const relative = localImagePath(p.image).replace(/\.(?:webp|png|jpe?g|gif|avif)$/i, '-fuar.webp'); return fs.existsSync(path.join(root, relative)) ? '/' + relative : null; })(),
        shareImage: localImagePath(p.image) === `assets/products/${p.id}.webp` && fs.existsSync(path.join(root, 'assets/share', `${p.id}.jpg`)) ? `/assets/share/${p.id}.jpg` : '/' + localImagePath(p.image),
        alt: p.alt,
        badge: p.badge ? badges[p.badge] || '' : '',
        badgeId: p.badge || '',
        page: '/' + (p.sharePage || `urunler/${p.id}.html`).replace(/^\//, ''),
        active: p.active !== false,
        inStock,
        ...(Object.hasOwn(p, 'sortOrder') ? { sortOrder: p.sortOrder } : {}),
        ...(managedRanking ? { bestsellerRank: p.bestsellerRank ?? null } : {}),
      };
    })
    .sort((a, b) => b.price - a.price);
  const products = allProducts.filter((p) => p.active);
  return { revision: data.revision, source, sourceSha256: sourceSha256(source), vat: data.settings?.vat ?? 20, cartDiscount, products, allProducts, raw: data };
}

// Stokta olmayan ürünler her listede en sona gider; kendi aralarındaki ve diğerlerinin sırası değişmez.
export const stockLast = (products) => [...products.filter((p) => p.inStock !== false), ...products.filter((p) => p.inStock === false)];

// Kategori görünümü: stokta olanlar önce; onların başında "En çok satan" etiketliler (sıra numarasına göre),
// sonra mevcut sıra. Stokta olmayanlar en sonda. Tarayıcıdaki kategori sekmeleri (src/js/catalog.js) aynı kuralı uygular.
export function categoryDisplayOrder(products) {
  const bestKey = (p) => (p.badgeId === 'best-seller' ? (p.bestsellerRank ?? 50) : 99);
  return products
    .map((p, index) => ({ p, index }))
    .sort((a, b) => (a.p.inStock === false) - (b.p.inStock === false) || bestKey(a.p) - bestKey(b.p) || a.index - b.index)
    .map(({ p }) => p);
}
