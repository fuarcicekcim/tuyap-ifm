import { ANALYTICS, SITE } from '../config/site-settings.js';

// Google etiketi ortak HTML şablonunun <head> bölümünde başlatılır.
// Özel etkinlikler yalnızca ölçüm açıkken ve site alan adında gönderilir.

const ids = [ANALYTICS.ga4Id, ANALYTICS.adsId].filter(Boolean);

function measurementAllowed() {
  if (ANALYTICS.enabled !== true) return false;
  try {
    const site = new URL(SITE.url);
    if (!['http:', 'https:'].includes(site.protocol) || !site.hostname) return false;
    const hostname = window.location.hostname.toLowerCase();
    const canonical = site.hostname.toLowerCase();
    return hostname === canonical || hostname === canonical.replace(/^www\./, '');
  } catch { return false; }
}

export function track(name, params = {}) {
  if (!measurementAllowed() || !ids.length || typeof window.gtag !== 'function') return;
  try {
    window.gtag('event', name, params);
    const label = ANALYTICS.conversions?.[name];
    if (ANALYTICS.adsId && label) {
      const conv = { send_to: `${ANALYTICS.adsId}/${label}` };
      if (params.value) { conv.value = params.value; conv.currency = params.currency || 'TRY'; }
      if (params.order_id) conv.transaction_id = params.order_id;
      window.gtag('event', 'conversion', conv);
    }
  } catch { /* Ölçümdeki bir sorun sepete ekleme veya siparişi engellemez. */ }
}
