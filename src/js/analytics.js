import { ANALYTICS } from '../config/site-settings.js';

// GA4 + Google Ads (gtag.js).
// - Kimlikler site-settings.js'te boşsa hiçbir şey yüklenmez, olaylar sessizce yok sayılır.
// - gtag kuyruğu hemen kurulur; ilk tıklamalar kaybolmaz. gtag.js dosyası ise sayfa yüklendikten
//   sonra boşta indirilir (LCP ve INP etkilenmesin diye).

const ids = [ANALYTICS.ga4Id, ANALYTICS.adsId].filter(Boolean);

export function initAnalytics() {
  if (!ids.length || window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); }; // gtag.js arguments nesnesi bekler
  window.gtag('js', new Date());
  ids.forEach((id) => window.gtag('config', id));

  const load = () => {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ids[0])}`;
    document.head.append(s);
  };
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(load, { timeout: 3000 }) : setTimeout(load, 1500));
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
}

export function track(name, params = {}) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
  const label = ANALYTICS.conversions?.[name];
  if (ANALYTICS.adsId && label) {
    const conv = { send_to: `${ANALYTICS.adsId}/${label}` };
    if (params.value) { conv.value = params.value; conv.currency = params.currency || 'TRY'; }
    if (params.order_id) conv.transaction_id = params.order_id;
    window.gtag('event', 'conversion', conv);
  }
}
