import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import { track, initAnalytics } from './js/analytics.js';
import { initReveal } from './js/reveal.js';
import { initHero } from './js/hero.js';
import { initDrawer } from './js/drawer.js';
import { initCatalog } from './js/catalog.js';
import { refreshPrices } from './js/prices.js';
import { initQuote } from './js/quote.js';
import { initFooter } from './js/footer.js';
import './styles/content.css';
import './styles/sections.css';
import './styles/drawer.css';

initAnalytics();
initHero();
initDrawer();
refreshPrices(initCatalog());
initQuote();
initFooter();

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
    if (location.hash) history.replaceState(null, '', location.pathname);
  }
});

// GSAP + Lenis yalnızca masaüstünde indirilir; mobilde hafif IntersectionObserver kullanılır.
const desktop = window.matchMedia(DESKTOP);
let motionLoaded = false;
const loadMotion = () => {
  if (motionLoaded || !desktop.matches) return;
  motionLoaded = true;
  import('./js/motion.js').then((m) => m.initMotion());
};
loadMotion();
desktop.addEventListener('change', loadMotion);
if (!desktop.matches) initReveal();
