import '../../catalog-pricing.js';
import { PRICING } from '../config/site-settings.js';

// Sepet satırları: aynı ürün farklı standlara gidebileceği için her satırın kendi
// anahtarı (key) ve teslimat bilgisi (d: salon, stant, firma, kart, same, ribbonMode, ribbonColor, logo) vardır.
const KEY = 'fc-cart-v1';
const listeners = new Set();
let items = load();
let cartDiscountActive = false;
const pricing = globalThis.FuarPricing;
const canAdd = product => Boolean(product && product.inStock !== false);

const newKey = (id) => `${id}~${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw)
      ? raw.filter((i) => i && i.id && i.qty > 0).map((i) => ({ ...i, key: i.key || newKey(i.id), d: i.d || {} }))
      : [];
  } catch {
    return [];
  }
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* gizli sekme vb. */ }
}

function save() {
  persist();
  listeners.forEach((fn) => fn(items));
}

export const cart = {
  get items() { return items; },
  get count() { return items.reduce((n, i) => n + i.qty, 0); },
  // Sepetteki şerit, logo ve teslimat bilgilerini koruyarak tek yayımlanmış
  // katalog sürümüne uyarlar. Kapanan ürün silinmez; kullanıcıya gösterilir.
  reconcileCatalog(products, discountActive = cartDiscountActive) {
    let changed = cartDiscountActive !== discountActive;
    cartDiscountActive = discountActive;
    items = items.map((item) => {
      const product = products.get(item.id);
      const next = product
        ? { ...item, name: product.name, price: product.price, image: product.image, ...(product.page ? { page: product.page } : {}), cat: product.cat, unavailable: !canAdd(product) }
        : { ...item, unavailable: true };
      if (JSON.stringify(next) !== JSON.stringify(item)) changed = true;
      return next;
    });
    if (changed) save();
  },
  add(product, qty = 1, pkg = '', silent = false) {
    if (!canAdd(product)) return false;
    const found = items.find((i) => i.id === product.id);
    if (found) {
      found.unavailable = false;
      found.qty = Math.min(found.qty + qty, 99);
      if (pkg && !found.pkg) found.pkg = pkg;
    } else {
      items = [...items, { key: newKey(product.id), id: product.id, name: product.name, price: product.price, image: product.image, ...(product.page ? { page: product.page } : {}), cat: product.cat, qty: Math.min(qty, 99), d: {}, ...(pkg ? { pkg } : {}) }];
    }
    if (!silent) save();
    return true;
  },
  addMany(list, pkg) {
    if (!list.length || list.some(({ product }) => !canAdd(product))) return false;
    list.forEach(({ product, qty }) => this.add(product, qty, pkg, true));
    save();
    return true;
  },
  setQty(key, qty) {
    items = qty > 0 ? items.map((i) => (i.key === key ? { ...i, qty: Math.min(qty, 99) } : i)) : items.filter((i) => i.key !== key);
    save();
  },
  // Bir adedi ayrı satıra böler (başka standa gönderim için); yeni satır hemen altına gelir.
  split(key) {
    const idx = items.findIndex((i) => i.key === key);
    const src = items[idx];
    if (!src || src.qty < 2) return;
    const copy = { ...src, key: newKey(src.id), qty: 1, d: {
      same: false,
      kart: src.d.kart || '',
      ribbonMode: src.d.ribbonMode === 'logo-only' ? 'logo-only' : 'text',
      ribbonColor: src.d.ribbonColor || 'black',
      ...(src.d.logo ? { logo: { ...src.d.logo } } : {}),
    } };
    items = [...items.slice(0, idx), { ...src, qty: src.qty - 1 }, copy, ...items.slice(idx + 1)];
    save();
  },
  // Yazarken sepeti yeniden çizmemek için yalnızca kaydeder (odak kaybolmaz).
  setDelivery(key, field, value, rerender = false) {
    const it = items.find((i) => i.key === key);
    if (!it) return;
    it.d = { ...it.d, [field]: value };
    if (rerender) save(); else persist();
  },
  setPrice(id, price) {
    items = items.map((i) => (i.id === id ? { ...i, price } : i));
    save();
  },
  clear() { items = []; save(); },
  totals() {
    const subtotal = pricing.totals(items, PRICING.vatRate);
    if (!cartDiscountActive) return { ...subtotal, subtotal: subtotal.net, discount: 0 };
    const priced = items.map(item => ({
      qty: item.qty,
      price: item.unavailable ? item.price : pricing.discountedPrice(item.price, 5),
    }));
    const totals = pricing.totals(priced, PRICING.vatRate);
    return { ...totals, subtotal: subtotal.net, discount: Math.round((subtotal.net - totals.net) * 100) / 100 };
  },
  subscribe(fn) { listeners.add(fn); fn(items); return () => listeners.delete(fn); },
};

export const tl = globalThis.FuarPricing.format;
