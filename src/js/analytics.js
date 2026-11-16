// GA4 / Google Ads olayları. Ölçüm kimliği site-settings.js'te boşsa olaylar sessizce yok sayılır.
export function track(name, params = {}) {
  if (typeof window.gtag === 'function') window.gtag('event', name, params);
}
