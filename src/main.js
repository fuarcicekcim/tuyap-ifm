import { runIntro } from './js/intro.js';
import { track } from './js/analytics.js';
import { initReveal } from './js/reveal.js';
import { initHero } from './js/hero.js';
import { initFairOffer } from './js/fair-offer.js';
import { initHeader } from './js/header.js';
import { initDrawer } from './js/drawer.js';
import { initMobileMenu } from './js/mobile-menu.js';
import { initCatalog } from './js/catalog.js';
import { refreshPrices } from './js/prices.js';
import { initQuote } from './js/quote.js';
import { initFooter } from './js/footer.js';
import { initFab } from './js/fab.js';
import { initAwardBadge } from './js/award-badge.js';

// Açılış (preloader) masaüstünde hareket paketinin (GSAP) yüklenmesini de bekler; böylece perde açılınca
// hero başlığı önce düz görünüp sonradan yeniden animasyona girmez. Söz, aşağıda loadMotion atar.
let motionReady = Promise.resolve();
runIntro({ motion: () => motionReady });
initHero();
initHeader();
initDrawer();
initMobileMenu();
const products = initCatalog();
refreshPrices(products);
// Canlı katalog katmanı yalnız sayfada yapılandırması varsa (VITE_LIVE_CATALOG_ENABLED ile derlendiyse) ve ayrı bir
// parça olarak indirilir; kapalıyken ana pakete ve ilk boyamaya hiçbir maliyeti yoktur. Statik içerik her zaman yedektir.
if (document.getElementById('live-catalog-config')) {
  import('./js/live-catalog.js').then((module) => module.initLiveCatalog(products)).catch(() => { /* statik katalogla devam */ });
}
initFairOffer(products);
initQuote();
initFooter();
initFab();
initAwardBadge();

const DESKTOP = '(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-track]');
  if (el) track(el.dataset.track, { location: el.dataset.trackLocation || '' });

  // Ana sayfadayken logo sayfayı yeniden yüklemez; yumuşakça en üste kaydırır.
  const brand = e.target.closest('a.brand');
  if (brand && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0
      && /^\/(index\.html)?$/.test(location.pathname)) {
    e.preventDefault();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (window.__lenis) window.__lenis.scrollTo(0, { duration: 1.1 });
    else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  }
});

// GSAP + Lenis yalnızca masaüstünde indirilir; mobilde hafif IntersectionObserver kullanılır.
const desktop = window.matchMedia(DESKTOP);
let motionLoaded = false;
const loadMotion = () => {
  if (motionLoaded || !desktop.matches) return;
  motionLoaded = true;
  motionReady = import('./js/motion.js').then((m) => m.initMotion());
};
loadMotion();
desktop.addEventListener('change', loadMotion);
if (!desktop.matches) initReveal();
