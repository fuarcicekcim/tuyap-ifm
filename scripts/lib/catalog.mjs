import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// products-data.js kategori kimlikleri → yeni sitedeki kategori adları (kullanıcı kararı 2026-11-16).
export const CATEGORIES = [
  { id: 'wreaths', slug: 'acilis-fuar-celengi', name: 'Açılış & Fuar Çelengi' },
  { id: 'orchids', slug: 'vip-orkide', name: 'VIP Orkide' },
  { id: 'arrangements', slug: 'stant-aranjmani', name: 'Stant Aranjmanı' },
  { id: 'plants', slug: 'saksi-bitkisi', name: 'Saksı Bitkisi' },
];

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
      category: p.category,
      categoryName: categoryOf(p.category)?.name || p.label,
      price: Number(p.price),
      image: '/' + p.image.replace(/^\//, ''),
      alt: p.alt,
      badge: p.badge ? badges[p.badge] || '' : '',
      page: '/' + (p.sharePage || `urunler/${p.id}.html`).replace(/^\//, ''),
    }))
    .sort((a, b) => b.price - a.price);
  return { revision: data.revision, vat: data.settings?.vat ?? 20, products };
}
