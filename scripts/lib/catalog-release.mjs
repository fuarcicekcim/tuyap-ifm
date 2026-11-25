import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import '../../catalog-pricing.js';

// Sıralama kuralları tarayıcıdaki canlı katalog katmanıyla paylaşılır (tek kaynak): src/shared/product-order.js
export { LEGACY_BESTSELLERS, homeProductOrder } from '../../src/shared/product-order.js';
export const sourceSha256 = (source) => createHash('sha256').update(source).digest('hex');

// Yalnız JSON veya panelin ürettiği tek atama kabul edilir; JavaScript çalıştırılmaz.
export function parseCatalogSource(source) {
  if (typeof source !== 'string' || Buffer.byteLength(source) > 30 * 1024 * 1024) throw new Error('Katalog dosyası okunamadı veya 30 MB sınırını aşıyor.');
  const text = source.replace(/^\uFEFF/, '').trim();
  const match = /^window\.FUAR_CATALOG\s*=\s*(\{[\s\S]*\})\s*;?$/.exec(text);
  let data;
  try { data = JSON.parse(match ? match[1] : text); }
  catch { throw new Error('Katalog yalnız JSON veya window.FUAR_CATALOG = {...}; biçiminde olmalı.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Katalog bir JSON nesnesi olmalı.');
  return data;
}

export function localImagePath(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || /[\u0000-\u001f?#]/u.test(value)) return null;
  let decoded;
  try { decoded = decodeURIComponent(value.replace(/^\.\//, '').replace(/^\//, '')); }
  catch { return null; }
  if (!/^assets\/[\p{L}\p{N}_ .()/+%-]+\.(?:webp|png|jpe?g|gif|avif)$/iu.test(decoded)
    || decoded.split('/').some((part) => !part || part === '.' || part === '..') || decoded.includes('%')) return null;
  return decoded;
}

export function effectivePage(product) {
  return product.sharePage || `urunler/${product.id}.html`;
}

export function validateCatalog(catalog, { previous = null, packages = [], root = null, checkFiles = false, allowEmbedded = true } = {}) {
  const data = structuredClone(catalog);
  const fail = (message) => { throw new Error(message); };
  const text = (value, label, limit) => {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > limit || /[\u0000-\u001f]/u.test(value)) fail(`${label} alanını kontrol edin.`);
    return value.trim();
  };
  if (!data || !Array.isArray(data.products) || !data.products.length || data.products.length > 1000) fail('Katalog 1–1000 ürün içermeli.');
  if (data.cartDiscount === null) delete data.cartDiscount;
  const cartDiscountError = globalThis.FuarPricing.validateCartDiscount(data.cartDiscount);
  if (cartDiscountError) fail(cartDiscountError);
  if (!Array.isArray(data.categories) || !data.categories.length || !Array.isArray(data.badges)) fail('Kategori ve rozet listesi gerekli.');
  const categories = new Set(), badges = new Set();
  for (const [items, ids, label] of [[data.categories, categories, 'Kategori'], [data.badges, badges, 'Rozet']]) {
    for (const item of items) {
      if (!item || !/^[a-z\d][a-z\d-]*$/i.test(item.id || '') || ids.has(item.id)) fail(`${label} kimlikleri geçersiz veya tekrarlı.`);
      ids.add(item.id); item.name = text(item.name, `${label} adı`, 100);
    }
  }
  if (!data.settings || !/^[1-9]\d{6,14}$/.test(String(data.settings.whatsapp || '')) || !Number.isFinite(data.settings.vat) || data.settings.vat < 0 || data.settings.vat > 100) fail('WhatsApp veya KDV ayarı geçersiz.');
  text(data.settings.announcement, 'Duyuru', 180);
  text(data.revision, 'Katalog sürümü', 160);
  const ids = new Set(), pages = new Set(), ranks = new Set();
  const old = new Map((previous?.products || []).map((product) => [product.id, product]));
  for (const product of data.products) {
    if (!product || !/^[a-z\d][a-z\d-]{0,89}$/i.test(product.id || '') || ids.has(product.id)) fail('Ürün kimlikleri benzersiz ve geçerli olmalı.');
    ids.add(product.id);
    product.name = text(product.name, 'Ürün adı', 100);
    if (!categories.has(product.category)) fail(`${product.name}: kategori bulunamadı.`);
    if (typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price < 0 || product.price > 1_000_000_000 || Math.abs(product.price * 100 - Math.round(product.price * 100)) > 0.0001) fail(`${product.name}: fiyat en fazla iki ondalıklı bir sayı olmalı.`);
    if (product.discount === null) delete product.discount;
    const discountError = globalThis.FuarPricing.validate(product);
    if (discountError) fail(`${product.name}: ${discountError}`);
    if (Object.hasOwn(product, 'inStock') && typeof product.inStock !== 'boolean') fail(`${product.name}: stok durumu geçersiz.`);
    if (product.active !== undefined && typeof product.active !== 'boolean') fail(`${product.name}: aktiflik geçersiz.`);
    if (product.badge && !badges.has(product.badge)) fail(`${product.name}: rozet bulunamadı.`);
    for (const [key, maximum, minimum] of [['sortOrder', 1_000_000, 0], ['bestsellerRank', 5, 1]]) {
      if (Object.hasOwn(product, key) && product[key] !== null && (!Number.isInteger(product[key]) || product[key] < minimum || product[key] > maximum)) fail(`${product.name}: ${key} geçersiz.`);
    }
    if (product.bestsellerRank != null) {
      if (ranks.has(product.bestsellerRank)) fail('En çok satan öncelikleri benzersiz olmalı (1–5).');
      ranks.add(product.bestsellerRank);
    }
    if (product.sharePage && !/^urunler\/[a-z\d-]+\.html$/i.test(product.sharePage)) fail(`${product.name}: ürün adresi geçersiz.`);
    const page = effectivePage(product);
    if (pages.has(page)) fail('İki ürün aynı adresi kullanamaz.');
    pages.add(page);
    if (old.has(product.id) && effectivePage(old.get(product.id)) !== page) fail(`${product.name}: mevcut ürün adresi değiştirilemez.`);
    const image = localImagePath(product.image);
    const embedded = typeof product.image === 'string' && /^data:image\/(?:webp|png|jpeg|gif|avif);base64,[A-Za-z0-9+/]+={0,2}$/u.test(product.image);
    if (!image && !(allowEmbedded && embedded)) fail(`${product.name}: fotoğraf için assets/ dosyası veya yüklenmiş görsel kullanın; dış URL otomatik indirilmez.`);
    if (image && checkFiles) {
      const base = path.resolve(root || '.');
      const filename = path.resolve(base, image);
      if (!filename.startsWith(base + path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) fail(`${product.name}: görsel dosyası bulunamadı (${image}).`);
      if (!fs.realpathSync(filename).startsWith(fs.realpathSync(base) + path.sep)) fail(`${product.name}: görsel proje dışına çıkıyor.`);
    }
  }
  for (const product of old.values()) if (!ids.has(product.id)) fail(`${product.name}: mevcut ürünü silmek yerine pasifleştirin; ürün adresi korunmalı.`);
  for (const pkg of packages) for (const [id] of pkg.items || []) {
    if (!data.products.some((product) => product.id === id && product.active !== false)) fail(`Paket "${pkg.id}": "${id}" ürünü bulunamadı veya pasif.`);
  }
  return data;
}

export function serializeCatalog(catalog) {
  return `window.FUAR_CATALOG = ${JSON.stringify(catalog, null, 2)};\n`;
}

export function releaseManifest(source, catalog, generatedAt = new Date().toISOString()) {
  return { schema: 1, revision: catalog.revision, sourceSha256: sourceSha256(source), generatedAt, productCount: catalog.products.length };
}
