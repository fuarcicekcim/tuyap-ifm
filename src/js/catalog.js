import { cart } from './cart.js';
import { openDrawer } from './drawer.js';
import { track } from './analytics.js';
import { syncPrices } from './prices.js';

// İlk açılışta ve her "Daha fazla göster" tıkında hedef ürün sayısı; gerçek sayı, ızgarada boş hücre kalmayacak şekilde yukarı yuvarlanır.
const FIRST = 12;
const MORE = 16;

function readProducts() {
  try { return new Map(JSON.parse(document.getElementById('catalog-data')?.textContent || '[]').map((p) => [p.id, p])); } catch { return new Map(); }
}

function initFilters(products) {
  const grid = document.querySelector('[data-grid]');
  const more = document.querySelector('[data-more]');
  // Kategori sayfalarındaki statik ızgarada filtre sekmeleri ve "Daha fazla göster" düğmesi yoktur; yapılacak bir şey kalmaz.
  // (Eskiden burada `more` boşken addEventListener çağrılıyor, hata bu sayfalarda "Siparişe ekle"yi ve sonraki kodu durduruyordu.)
  if (!grid || !more) return;
  // Canlı katalog katmanı (live-catalog.js) kart sırasını ve durumlarını sonradan değiştirebilir; bu yüzden `let`.
  let cards = [...grid.querySelectorAll('.card')];
  let ranks = new Map([...products.keys()].map((id, index) => [id, index]));
  const rank = (card) => ranks.get(card.dataset.productId) ?? Number.MAX_SAFE_INTEGER;
  // Kategori sekmeleri: stokta olanlar önce, başta "En çok satan" etiketliler (sıraya göre), stokta olmayanlar en sonda.
  const bestKey = (card) => (card.dataset.best ? Number(card.dataset.best) : 99);
  const sortForCategory = () => [...cards].sort((a, b) => ('oos' in a.dataset) - ('oos' in b.dataset) || bestKey(a) - bestKey(b) || rank(a) - rank(b));
  let categoryOrder = sortForCategory();
  let currentOrder = cards;
  let filter = 'all';
  let extra = 0;
  const wide = window.matchMedia('(min-width: 1024px)');
  // Masaüstünde "Tümü" görünümünde ilk kart 2 sütun x 2 satır yer kaplar (sections.css .grid--all .card--feature).
  const columns = () => getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 2;
  const fit = (count, total, feature) => {
    if (count >= total) return total;
    const cols = columns();
    const base = feature ? 2 * (cols - 2) + 1 : 0;
    return Math.min(total, count <= base ? base : base + Math.ceil((count - base) / cols) * cols);
  };

  const apply = () => {
    const ordered = filter === 'all' ? cards : categoryOrder;
    if (ordered !== currentOrder) {
      const fragment = document.createDocumentFragment();
      ordered.forEach((card) => fragment.append(card));
      grid.append(fragment);
      currentOrder = ordered;
    }
    // Satışa kapatılmış (data-inactive) ürünler hiçbir sekmede görünmez; sayfada kalır, canlıda yeniden açılabilir.
    const visible = ordered.filter((c) => !('inactive' in c.dataset) && (filter === 'all' || (filter === 'vip' ? 'vip' in c.dataset : c.dataset.cat === filter)));
    cards.forEach((c) => { c.hidden = true; });
    const limit = fit(FIRST + extra, visible.length, filter === 'all' && wide.matches && cards.some((c) => c.classList.contains('card--feature')));
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
      extra = 0;
      apply();
    });
  });
  more.addEventListener('click', () => { extra += MORE; apply(); });
  // Pencere genişliği sütun sayısını değiştirirse boş hücre kalmaması için yeniden hesapla.
  wide.addEventListener('change', () => apply());
  window.matchMedia('(min-width: 768px)').addEventListener('change', () => apply());
  // Canlı katalog katmanı sıra/durum değiştirdiğinde: kartları yeni sıraya diz (`home`: ana sayfa sırası, `rank`: fiyata göre
  // kategori sırası) ve görünümü yeniden uygula. Bilinmeyen kartlar sona gider.
  viewRefresh = ({ home, rank: byPrice }) => {
    const byId = new Map(cards.map((card) => [card.dataset.productId, card]));
    const known = new Set(home);
    cards = [...home.map((id) => byId.get(id)).filter(Boolean), ...cards.filter((card) => !known.has(card.dataset.productId))];
    ranks = new Map(byPrice.map((id, index) => [id, index]));
    categoryOrder = sortForCategory();
    currentOrder = null;
    apply();
  };
  if (grid.dataset.grid !== 'static') apply();
}

// Ana sayfadaki ızgara filtresinin dışarıdan (canlı katalog katmanından) yenilenmesi; ızgara yoksa hiçbir şey yapmaz.
let viewRefresh = () => {};
export const refreshCatalogView = (order) => viewRefresh(order);

export function initCatalog() {
  const products = readProducts();
  if (document.getElementById('catalog-data')) cart.reconcileCatalog(products);
  initFilters(products);

  const pageNotice = document.querySelector('body > [data-cart-notice]');
  const drawer = document.querySelector('[data-drawer]');
  const drawerNotice = drawer?.querySelector('[data-cart-notice]');
  let currentNotice;
  let noticeTimer;

  const showAddedNotice = () => {
    const notice = drawer?.classList.contains('is-open') ? drawerNotice : pageNotice;
    if (!notice) return;
    clearTimeout(noticeTimer);
    currentNotice?.classList.remove('is-visible');
    const count = document.createElement('span');
    count.className = 'sr-only';
    count.textContent = ` Sepette ${cart.count} ürün var.`;
    notice.replaceChildren('Sepete eklendi.', count);
    notice.classList.add('is-visible');
    currentNotice = notice;
    noticeTimer = setTimeout(() => notice.classList.remove('is-visible'), 2400);
  };

  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-pkg], [data-add], [data-price-whatsapp]')) return;
    syncPrices();
    const previousCount = cart.count;
    const pkgBtn = e.target.closest('[data-pkg]');
    if (pkgBtn) {
      const list = pkgBtn.dataset.pkg.split(',').map((s) => {
        const [id, qty] = s.split(':');
        return { product: products.get(id), qty: Number(qty) || 1 };
      });
      const name = pkgBtn.dataset.pkgName;
      if (!cart.addMany(list, name)) return;
      const value = list.reduce((s, x) => s + x.product.price * x.qty, 0);
      track('add_to_cart', { item_list_name: name, value, currency: 'TRY', items: list.map((x) => ({ item_id: x.product.id, item_name: x.product.name, quantity: x.qty, price: x.product.price })) });
      const label = pkgBtn.querySelector('span');
      if (label) { label.textContent = 'Pakete eklendi'; setTimeout(() => { label.textContent = 'Paketi ekle'; }, 1600); }
      openDrawer('add_package');
      if (cart.count > previousCount) showAddedNotice();
      return;
    }
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    const product = products.get(btn.dataset.add);
    if (!cart.add(product)) return;
    track('add_to_cart', { item_id: product.id, item_name: product.name, value: product.price, currency: 'TRY' });
    const label = btn.querySelector('span');
    btn.classList.add('is-added');
    if (label) label.textContent = 'Eklendi';
    setTimeout(() => { btn.classList.remove('is-added'); if (label) label.textContent = 'Siparişe ekle'; }, 1600);
    if (!previousCount || btn.dataset.openDrawer !== undefined) openDrawer('add_to_cart');
    if (cart.count > previousCount) showAddedNotice();
  });

  return products;
}
