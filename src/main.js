import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import { track } from './js/analytics.js';
import { initReveal } from './js/reveal.js';
import { initDrawer } from './js/drawer.js';
import { initCatalog } from './js/catalog.js';
import './styles/sections.css';
import './styles/drawer.css';

initDrawer();
initCatalog();

const DESKTOP = '(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-track]');
  if (el) track(el.dataset.track, { location: el.dataset.trackLocation || '' });
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
