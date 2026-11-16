import { cart } from './cart.js';

const tl = (n) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n) + ' TL';

// İçerik ilk HTML'de hazır gelir; burada yalnızca sunucudaki güncel fiyatlar üzerine yazılır.
// İleride Supabase bağlanınca kaynak bu fonksiyonda değişecek.
function loadLatest() {
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = `/products-data.js?t=${Math.floor(Date.now() / 300000)}`;
    s.async = true;
    s.onload = () => resolve(window.FUAR_CATALOG || null);
    s.onerror = () => resolve(null);
    document.head.append(s);
  });
}

export function refreshPrices(products) {
  const run = async () => {
    const data = await loadLatest();
    if (!data?.products) return;
    const latest = new Map(data.products.filter((p) => p.active !== false).map((p) => [p.id, Number(p.price)]));
    document.querySelectorAll('[data-price-id]').forEach((el) => {
      const price = latest.get(el.dataset.priceId);
      if (price && el.textContent !== tl(price)) el.textContent = tl(price);
    });
    products.forEach((p, id) => { if (latest.has(id)) p.price = latest.get(id); });
    cart.items.forEach((i) => { if (latest.has(i.id) && latest.get(i.id) !== i.price) cart.setPrice(i.id, latest.get(i.id)); });
  };
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2000);
}
