import { CONTACT, PRICING } from '../config/site-settings.js';
import { cart } from './cart.js';

const pricing = globalThis.FuarPricing;
let syncCampaigns = () => {};

export function syncPrices() {
  syncCampaigns();
}

function updateDiscountDisplays(products, campaigns) {
  for (const el of document.querySelectorAll('[data-price-id]')) {
    const product = products.get(el.dataset.priceId);
    if (product?.discount) el.textContent = pricing.format(product.price);
  }
  for (const el of document.querySelectorAll('[data-product-price]')) {
    const product = products.get(el.dataset.productPrice);
    if (!product?.discount) continue;
    const active = campaigns.has(product.id);
    el.dataset.discountActive = String(active);
    for (const detail of el.querySelectorAll('[data-price-previous], [data-price-saving]')) {
      detail.hidden = !active;
    }
  }
  for (const badge of document.querySelectorAll('[data-price-discount-percent]')) {
    const id = badge.dataset.priceDiscountPercent;
    badge.hidden = !campaigns.has(id) || pricing.percent(products.get(id).discount) < 1;
  }
  for (const el of document.querySelectorAll('[data-pkg-sum]')) {
    const items = el.dataset.pkgSum.split(',').map((item) => {
      const [id, qty] = item.split(':');
      return { price: products.get(id)?.price, qty: Number(qty) };
    });
    if (items.some(({ price }) => price === undefined)) continue;
    el.textContent = pricing.format(pricing.totals(items, PRICING.vatRate).net);
  }
  for (const el of document.querySelectorAll('[data-price-category]')) {
    const items = [...products.values()].filter((product) => product.category === el.dataset.priceCategory);
    const available = items.filter(product => product.inStock !== false);
    if (available.length) el.textContent = `${items.length} ürün · ${pricing.format(Math.min(...available.map((p) => p.price)))}’den başlayan fiyatlar`;
  }
  for (const el of document.querySelectorAll('[data-price-whatsapp]')) {
    const product = products.get(el.dataset.priceWhatsapp);
    if (!product?.discount) continue;
    const message = `Merhaba, ${product.name} (${pricing.format(product.price)}) için fuar standına sipariş vermek istiyorum.`;
    el.href = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
  }
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const structured = JSON.parse(script.textContent);
      const node = structured['@graph']?.find((entry) => entry['@type'] === 'Product');
      const product = products.get(node?.sku);
      if (!node?.offers || !product?.discount) continue;
      node.offers.price = product.price.toFixed(2);
      node.offers.priceSpecification.price = node.offers.price;
      if (campaigns.has(product.id)) node.offers.priceValidUntil = product.discount.endsOn;
      else delete node.offers.priceValidUntil;
      script.textContent = JSON.stringify(structured);
    } catch { /* Statik yapılandırılmış veri korunur. */ }
  }
}

export function refreshPrices(products) {
  const configured = [...products.values()].filter((product) => product.discount);
  const cartDiscount = JSON.parse(document.getElementById('cart-discount-data')?.textContent || 'null');
  if (configured.length || cartDiscount) {
    let lastDate = '';
    syncCampaigns = () => {
      const today = pricing.today();
      if (lastDate === today) return;
      lastDate = today;
      const campaigns = new Set();
      for (const product of configured) {
        const current = pricing.resolve({ ...product, price: product.basePrice }, today);
        product.price = current.price;
        if (current.discount) campaigns.add(product.id);
      }
      const cartDiscountActive = pricing.resolveCartDiscount(cartDiscount, today);
      for (const notice of document.querySelectorAll('[data-cart-campaign]')) {
        notice.hidden = !cartDiscountActive;
        const id = notice.dataset.cartCampaignProduct;
        if (id) notice.textContent = campaigns.has(id) ? 'Sepette ek %5' : 'Sepette %5';
      }
      if (configured.length) updateDiscountDisplays(products, campaigns);
      cart.reconcileCatalog(products, cartDiscountActive);
    };
    syncPrices();
    window.addEventListener('pageshow', syncPrices);
    document.addEventListener('visibilitychange', syncPrices);
    setInterval(syncPrices, 60_000);
  }

  // Fiyatlar her zaman HTML ile aynı katalog sürümünden okunur.
  const run = async () => {
    let state = 'unavailable';
    try {
      const expected = document.querySelector('meta[name="catalog-source-sha256"]')?.content;
      if (!expected || !globalThis.crypto?.subtle) throw new Error('Sürüm bilgisi yok.');
      const [manifestResponse, sourceResponse] = await Promise.all([
        fetch('/catalog-release.json', { cache: 'no-store' }),
        fetch('/products-data.js', { cache: 'no-store' }),
      ]);
      if (!manifestResponse.ok || !sourceResponse.ok) throw new Error('Sürüm doğrulanamadı.');
      const [manifest, source] = await Promise.all([manifestResponse.json(), sourceResponse.text()]);
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
      const actual = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
      state = actual === expected && manifest?.sourceSha256 === expected ? 'verified' : 'mismatch';
    } catch { /* Bağlantı hatasında statik içerik ve aynı sürüm fiyatları korunur. */ }
    document.documentElement.dataset.catalogRelease = state;
    document.dispatchEvent(new CustomEvent('catalog:release-state', { detail: { state } }));
  };
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2000);
}
