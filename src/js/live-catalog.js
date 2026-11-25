// Canlı katalog katmanı: panelden (telefon dahil) yapılan fiyat, stok, aç/kapat, sıralama, rozet ve indirim
// değişiklikleri Plesk'e yükleme gerektirmeden sayfalara yansır.
//
// Çalışma: sayfa her zaman statik HTML + statik katalogla açılır (ilk boyama, SEO ve hata durumunda yedek).
// Ardından Supabase'teki `fc_live_products` satırları (herkese açık okuma) alınır; satırı olan ürünün durumu
// TAM olarak bu satırdan gelir, satırı olmayan ürün statik değerinde kalır. Ağ/yanıt hatasında hiçbir şey değişmez.
// Kurallar (doğrulama, uygulama) live-rules.js'te, sıralama src/shared/product-order.js'te (derlemeyle ortak) durur.
// Yapılandırma sayfaya yalnız VITE_LIVE_CATALOG_ENABLED=true ile derlenirse yazılır; yoksa bu modül hiçbir şey yapmaz.
import { syncPrices } from './prices.js';
import { refreshCatalogView } from './catalog.js';
import { bindAwardBadge } from './award-badge.js';
import { awardBadge } from '../shared/award-badge.js';
import { homeProductOrder, stockLast, categoryDisplayOrder, VIP_MIN_PRICE } from '../shared/product-order.js';
import { LIVE_SELECT, parseRows, applyRow, isAvailable, stateSignature, orderSignature } from './live-rules.js';

const TIMEOUT_MS = 6000;   // Yavaş bağlantıda sayfa statik haliyle kalır.
const STALE_MS = 90_000;   // Sekmeye dönüşte bundan eskiyse yeniden okunur.

function readConfig() {
  try {
    const raw = JSON.parse(document.getElementById('live-catalog-config')?.textContent || 'null');
    if (!raw || typeof raw.url !== 'string' || !/^https:\/\/[a-z\d-]+\.supabase\.co$/i.test(raw.url)
      || typeof raw.key !== 'string' || raw.key.length < 20) return null;
    return { url: raw.url, key: raw.key, badges: raw.badges && typeof raw.badges === 'object' ? raw.badges : {} };
  } catch {
    return null;
  }
}

export function initLiveCatalog(products) {
  const config = readConfig();
  if (!config || !products?.size) return;
  const pricing = globalThis.FuarPricing;

  // Statik durumun kopyası: satır silinirse/değişirse ürün buradan eski haline döner.
  const base = new Map([...products].map(([id, product]) => [id, structuredClone(product)]));
  const applied = new Map([...products].map(([id, product]) => [id, stateSignature(product)]));
  const orderApplied = new Map([...products].map(([id, product]) => [id, orderSignature(product)]));
  const css = (id) => CSS.escape(id);

  // ---- DOM güncellemeleri ----

  // Düğmenin yanındaki "Stokta yok" notunu oluşturur/gösterir/gizler. Düğme ile not birlikte bulunur, biri `hidden` olur.
  function syncNote(button, available, text) {
    let note = button.nextElementSibling?.matches('[data-stock-note]') ? button.nextElementSibling : null;
    if (!note && !available) {
      note = document.createElement(button.closest('.pdp__ctas, .pkg__body') ? 'p' : 'span');
      note.className = 'stock-note';
      note.dataset.stockNote = '';
      button.after(note);
    }
    if (!note) return;
    note.textContent = text;
    note.hidden = available;
  }

  function setBadge(media, product, withLabel) {
    if (!media) return;
    media.querySelectorAll('.award-badge, .card__badge').forEach((node) => node.remove());
    let node = null;
    if (product.badgeId === 'best-seller') {
      const holder = document.createElement('template');
      holder.innerHTML = awardBadge({ rank: product.bestsellerRank ?? null });
      node = holder.content.firstElementChild;
    } else if (withLabel && product.badgeId && config.badges[product.badgeId]) {
      node = document.createElement('span');
      node.className = 'card__badge';
      node.textContent = config.badges[product.badgeId];
    }
    if (!node) return;
    (media.querySelector('img') || media.firstChild)?.after(node);
    if (node.classList.contains('award-badge')) bindAwardBadge(node);
  }

  function renderProduct(id) {
    const product = products.get(id);
    const available = isAvailable(product);
    const inactive = product.active === false;
    const best = product.badgeId === 'best-seller';
    const noteText = inactive ? 'Bu ürün şu anda satışa kapalı.' : 'Stokta yok';

    for (const el of document.querySelectorAll(`[data-product-id="${css(id)}"]`)) {
      if (el.classList.contains('card')) {
        el.toggleAttribute('data-oos', product.inStock === false);
        el.toggleAttribute('data-inactive', inactive);
        el.toggleAttribute('data-vip', Number(product.basePrice ?? product.price) >= VIP_MIN_PRICE);
        if (best) el.dataset.best = String(product.bestsellerRank ?? 50); else delete el.dataset.best;
        // Süzgeçli ızgarada görünürlüğü catalog.js yönetir; statik (kategori) ızgarada burada gizlenir.
        if (el.closest('[data-grid="static"]')) el.hidden = inactive;
        setBadge(el.querySelector('.card__media'), product, true);
      } else if (el.classList.contains('mini')) {
        el.hidden = inactive;
        setBadge(el.querySelector('.mini__media'), product, false);
      }
    }

    for (const button of document.querySelectorAll(`[data-add="${css(id)}"]`)) {
      button.hidden = !available;
      if (!button.classList.contains('dock__add')) syncNote(button, available, noteText);
    }

    // Ürün sayfasındaki büyük "En çok satan" rozeti.
    const price = document.querySelector(`.pdp [data-product-price="${css(id)}"]`);
    const info = price?.closest('.pdp__info');
    if (info) {
      info.querySelector('.pdp__award')?.remove();
      if (best) {
        const holder = document.createElement('div');
        holder.className = 'pdp__award';
        holder.innerHTML = awardBadge({ size: 'lg', rank: product.bestsellerRank ?? null });
        info.querySelector('.eyebrow')?.before(holder);
        holder.querySelectorAll('.award-badge').forEach(bindAwardBadge);
      }
    }
  }

  // Paket düğmesi: pakette satışa kapalı ürün varsa gizlenir, hangi ürünlerin eksik olduğu yazılır.
  function renderPackages() {
    for (const button of document.querySelectorAll('[data-pkg]')) {
      const items = button.dataset.pkg.split(',').map((entry) => products.get(entry.split(':')[0]));
      const missing = items.filter((product) => !isAvailable(product));
      const names = missing.map((product) => product?.name).filter(Boolean).join(', ');
      button.hidden = missing.length > 0;
      syncNote(button, missing.length === 0, `Stokta yok${names ? ` · ${names}` : ''}`);
    }
  }

  // Ana sayfa ızgarası ve kategori sayfası dizilimi: derlemeyle aynı kural (src/shared/product-order.js).
  function reorder() {
    const active = [...products.values()].filter((product) => product.active !== false);
    refreshCatalogView({
      home: stockLast(homeProductOrder(active)).map((product) => product.id),
      rank: [...active].sort((a, b) => b.price - a.price).map((product) => product.id),
    });
    for (const grid of document.querySelectorAll('[data-grid="static"]')) {
      const cards = [...grid.querySelectorAll('.card[data-product-id]')];
      const byId = new Map(cards.map((card) => [card.dataset.productId, card]));
      const sorted = categoryDisplayOrder(cards.map((card) => products.get(card.dataset.productId)).filter(Boolean));
      grid.append(...sorted.map((product) => byId.get(product.id)));
    }
  }

  // ---- Veri uygulama ----

  function applyRows(list) {
    const rows = parseRows(list, pricing);
    const changed = [];
    let orderChanged = false;
    for (const [id, product] of products) {
      // Önce statik duruma dön (satır silinmiş olabilir), sonra varsa canlı satırı uygula. Nesne kimliği korunur.
      for (const key of Object.keys(product)) delete product[key];
      Object.assign(product, structuredClone(base.get(id)));
      const row = rows.get(id);
      if (row) applyRow(product, row, pricing);
      const signature = stateSignature(product);
      if (signature !== applied.get(id)) { applied.set(id, signature); changed.push(id); }
      const order = orderSignature(product);
      if (order !== orderApplied.get(id)) { orderApplied.set(id, order); orderChanged = true; }
    }
    if (!changed.length) return 0;
    syncPrices(true);   // fiyat, indirim, WhatsApp iletisi, yapılandırılmış veri ve sepet
    changed.forEach(renderProduct);
    renderPackages();
    if (orderChanged) reorder();
    return changed.length;
  }

  // ---- Okuma ----

  let lastFetch = 0;
  let busy = false;
  async function load() {
    if (busy) return;
    busy = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${config.url}/rest/v1/fc_live_products?select=${LIVE_SELECT}`, {
        headers: { apikey: config.key, Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const list = await response.json();
      if (!Array.isArray(list)) throw new Error('Beklenmeyen yanıt');
      lastFetch = Date.now();
      applyRows(list);
    } catch (error) {
      console.debug('[canlı katalog] statik katalogla devam ediliyor:', error?.message || error);
    } finally {
      clearTimeout(timer);
      busy = false;
    }
  }

  load();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastFetch > STALE_MS) load();
  });
  window.addEventListener('pageshow', (event) => { if (event.persisted) load(); });

  // Yalnız geliştirme sunucusunda: ağ olmadan satır uygulamayı denemek için (üretim derlemesinde yoktur).
  if (import.meta.env?.DEV) window.__fcLive = { applyRows, products };
}
