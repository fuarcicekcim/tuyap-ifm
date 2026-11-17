import { PRICING } from '../config/site-settings.js';

// Sepet satırları: aynı ürün farklı standlara gidebileceği için her satırın kendi
// anahtarı (key) ve teslimat bilgisi (d: salon, stant, firma, kart, same) vardır.
const KEY = 'fc-cart-v1';
const listeners = new Set();
let items = load();

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
  add(product, qty = 1, pkg = '', silent = false) {
    const found = items.find((i) => i.id === product.id);
    if (found) {
      found.qty = Math.min(found.qty + qty, 99);
      if (pkg && !found.pkg) found.pkg = pkg;
    } else {
      items = [...items, { key: newKey(product.id), id: product.id, name: product.name, price: product.price, image: product.image, cat: product.cat, qty: Math.min(qty, 99), d: {}, ...(pkg ? { pkg } : {}) }];
    }
    if (!silent) save();
  },
  addMany(list, pkg) {
    list.forEach(({ product, qty }) => this.add(product, qty, pkg, true));
    save();
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
    const copy = { ...src, key: newKey(src.id), qty: 1, d: { same: false } };
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
    const net = items.reduce((s, i) => s + i.price * i.qty, 0);
    const vat = Math.round(net * PRICING.vatRate) / 100;
    return { net, vat, gross: net + vat };
  },
  subscribe(fn) { listeners.add(fn); fn(items); return () => listeners.delete(fn); },
};

export const tl = (n) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(n) + ' TL';
