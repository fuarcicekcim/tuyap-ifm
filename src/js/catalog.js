import { cart } from './cart.js';
import { openDrawer } from './drawer.js';
import { track } from './analytics.js';

const PAGE = 8;

function readProducts() {
  try { return new Map(JSON.parse(document.getElementById('catalog-data')?.textContent || '[]').map((p) => [p.id, p])); } catch { return new Map(); }
}

function initFilters() {
  const grid = document.querySelector('[data-grid]');
  if (!grid) return;
  const cards = [...grid.querySelectorAll('.card')];
  const more = document.querySelector('[data-more]');
  let filter = 'all';
  let limit = PAGE;

  const apply = () => {
    const visible = cards.filter((c) => filter === 'all' || c.dataset.cat === filter);
    cards.forEach((c) => { c.hidden = true; });
    visible.slice(0, limit).forEach((c) => { c.hidden = false; });
    grid.classList.toggle('grid--all', filter === 'all');
    const rest = visible.length - limit;
    more.hidden = rest <= 0;
    more.textContent = `Daha fazla göster (${rest})`;
  };

  document.querySelectorAll('[data-filter]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      filter = tab.dataset.filter;
      limit = PAGE;
      apply();
    });
  });
  more.addEventListener('click', () => { limit += PAGE * 2; apply(); });
  if (grid.dataset.grid !== 'static') apply();
}

export function initCatalog() {
  const products = readProducts();
  initFilters();

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    const product = products.get(btn.dataset.add);
    if (!product) return;
    const firstAdd = cart.count === 0;
    cart.add(product);
    track('add_to_cart', { item_id: product.id, item_name: product.name, value: product.price, currency: 'TRY' });
    const label = btn.querySelector('span');
    btn.classList.add('is-added');
    if (label) label.textContent = 'Eklendi';
    setTimeout(() => { btn.classList.remove('is-added'); if (label) label.textContent = 'Siparişe ekle'; }, 1600);
    if (firstAdd || btn.dataset.openDrawer !== undefined) openDrawer('add_to_cart');
  });

  return products;
}
