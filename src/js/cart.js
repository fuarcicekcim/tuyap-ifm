import { PRICING } from '../config/site-settings.js';

const KEY = 'fc-cart-v1';
const listeners = new Set();
let items = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((i) => i && i.id && i.qty > 0) : [];
  } catch {
    return [];
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* gizli sekme vb. */ }
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
      items = [...items, { id: product.id, name: product.name, price: product.price, image: product.image, cat: product.cat, qty: Math.min(qty, 99), ...(pkg ? { pkg } : {}) }];
    }
    if (!silent) save();
  },
  addMany(list, pkg) {
    list.forEach(({ product, qty }) => this.add(product, qty, pkg, true));
    save();
  },
  setQty(id, qty) {
    items = qty > 0 ? items.map((i) => (i.id === id ? { ...i, qty: Math.min(qty, 99) } : i)) : items.filter((i) => i.id !== id);
    save();
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
