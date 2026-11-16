import { cart } from './cart.js';
import { openDrawer } from './drawer.js';
import { track } from './analytics.js';

const PAGE = 8;

export function initCatalog() {
  const grid = document.querySelector('[data-grid]');
  const dataEl = document.getElementById('catalog-data');
  if (!grid || !dataEl) return;
  const products = new Map(JSON.parse(dataEl.textContent).map((p) => [p.id, p]));
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

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    const product = products.get(btn.dataset.add);
    if (!product) return;
    const firstAdd = cart.count === 0;
    cart.add(product);
    track('add_to_cart', { item_id: product.id, item_name: product.name, value: product.price, currency: 'TRY' });
    btn.classList.add('is-added');
    btn.querySelector('span').textContent = 'Eklendi';
    setTimeout(() => { btn.classList.remove('is-added'); btn.querySelector('span').textContent = 'Siparişe ekle'; }, 1600);
    if (firstAdd) openDrawer('add_to_cart');
  });

  apply();
}
