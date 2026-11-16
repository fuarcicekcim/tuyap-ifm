import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// products-data.js kategori kimlikleri → yeni sitedeki kategori adları (kullanıcı kararı 2026-11-17).
// Web adresleri (slug) değişmez. Ferforje/ayaklı ürünler veride 'wreaths' altında; sitede 'Ferforje Aranjman'da gösterilir.
export const CATEGORIES = [
  { id: 'arrangements', slug: 'stant-aranjmani', name: 'Ferforje Aranjman' },
  { id: 'plants', slug: 'saksi-bitkisi', name: 'Saksı Bitkileri' },
  { id: 'orchids', slug: 'vip-orkide', name: 'Orkideler' },
  { id: 'wreaths', slug: 'acilis-fuar-celengi', name: 'Fuar Çelengi' },
];

// VİP sekmesi: KDV hariç bu tutar ve üzerindeki ürünler (kullanıcı kararı 2026-11-17).
export const VIP_MIN_PRICE = 7000;

const displayCategory = (p) => (p.category === 'wreaths' && /ferforje|ayaklı/i.test(p.name) ? 'arrangements' : p.category);

export const categoryOf = (id) => CATEGORIES.find((c) => c.id === id);

export function loadFairs(today = new Date().toISOString().slice(0, 10)) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'fairs-data.js'), 'utf8'), ctx);
  const data = ctx.window.FUAR_TAKVIMI;
  const fairs = data.fairs.filter((f) => f.end >= today).sort((a, b) => a.start.localeCompare(b.start));
  return { updatedAt: data.updatedAt, venues: data.venues, fairs };
}

export function loadCatalog() {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'products-data.js'), 'utf8'), ctx);
  const data = ctx.window.FUAR_CATALOG;
  const badges = Object.fromEntries((data.badges || []).map((b) => [b.id, b.name]));
  const products = data.products
    .filter((p) => p.active !== false)
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: displayCategory(p),
      categoryName: categoryOf(displayCategory(p))?.name || p.label,
      vip: Number(p.price) >= VIP_MIN_PRICE,
      price: Number(p.price),
      image: '/' + p.image.replace(/^\//, ''),
      alt: p.alt,
      badge: p.badge ? badges[p.badge] || '' : '',
      page: '/' + (p.sharePage || `urunler/${p.id}.html`).replace(/^\//, ''),
    }))
    .sort((a, b) => b.price - a.price);
  return { revision: data.revision, vat: data.settings?.vat ?? 20, products };
}
