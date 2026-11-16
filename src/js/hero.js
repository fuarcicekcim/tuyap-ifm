import { DELIVERY } from '../config/site-settings.js';
import { track } from './analytics.js';

// Ana sayfa hero'su: sahne geçişi (ilerleme çubuğunun bitişiyle tetiklenir) + canlı teslim saati.
// Hareket azaltma tercihinde otomatik geçiş yoktur (CSS animasyonu kapalı → animationend gelmez).

function initEta(root) {
  const el = root.querySelector('[data-eta]');
  if (!el) return;
  const fmt = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
  const tick = () => {
    const t = new Date(Date.now() + DELIVERY.minutes * 60000);
    el.textContent = fmt.format(t);
    el.dateTime = t.toISOString();
  };
  tick();
  setInterval(tick, 20000);
}

export function initHero() {
  const root = document.querySelector('[data-hero]');
  if (!root) return;
  initEta(root);

  const scenes = [...root.querySelectorAll('[data-scene]')];
  const chapters = [...root.querySelectorAll('[data-goto]')];
  let current = 0;

  // İlk sahne LCP; diğerleri sayfa yüklendikten sonra indirilir.
  const loadRest = () => scenes.slice(1).forEach((s) => {
    const img = s.querySelector('img');
    if (img.dataset.src) { img.srcset = img.dataset.srcset; img.src = img.dataset.src; delete img.dataset.src; }
  });
  if (document.readyState === 'complete') loadRest();
  else window.addEventListener('load', loadRest, { once: true });

  // Sonraki görsel hazır değilse önce yüklenip çözülmesini bekle (boş perde açılmasın).
  const ready = (i) => {
    const img = scenes[i].querySelector('img');
    if (img.complete && img.naturalWidth) return Promise.resolve();
    return (img.decode ? img.decode() : new Promise((r) => img.addEventListener('load', r, { once: true }))).catch(() => {});
  };

  const show = (next) => {
    if (next === current) return;
    loadRest();
    ready(next).then(() => swap(next));
  };

  const swap = (next) => {
    if (next === current) return;
    const prev = scenes[current];
    scenes.forEach((s) => s.classList.remove('is-leaving'));
    prev.classList.remove('is-active');
    prev.classList.add('is-leaving');
    // Eski sahne, yenisinin geçişi (perde/opaklık) bitince kaldırılır; geçiş yoksa yedek süreyle.
    const incoming = scenes[next];
    let done = false;
    const finish = () => { if (done) return; done = true; incoming.removeEventListener('transitionend', onEnd); prev.classList.remove('is-leaving'); };
    const onEnd = (e) => { if (e.target === incoming) finish(); };
    incoming.addEventListener('transitionend', onEnd);
    setTimeout(finish, reduced ? 0 : 4000);
    incoming.classList.add('is-active');
    chapters.forEach((c, i) => {
      c.classList.toggle('is-active', i === next);
      c.classList.toggle('is-done', i < next);
      c.setAttribute('aria-pressed', String(i === next));
    });
    current = next;
  };

  // Zamanlayıcı: duraklatılınca kalan süre korunur; CSS ilerleme çubuğu aynı anda durur.
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DUR = (parseFloat(getComputedStyle(root).getPropertyValue('--scene')) || 7) * 1000;
  let timer = 0; let remaining = DUR; let startedAt = 0; let paused = false;
  const stop = () => { clearTimeout(timer); timer = 0; };
  const run = () => {
    stop();
    if (reduced || paused) return;
    startedAt = performance.now();
    timer = setTimeout(() => { remaining = DUR; show((current + 1) % scenes.length); run(); }, remaining);
  };

  chapters.forEach((c, i) => {
    c.addEventListener('click', () => { show(i); remaining = DUR; run(); track('hero_scene', { scene: i + 1 }); });
  });
  run();

  // Fare şeridin üzerindeyken, sekme gizliyken veya klavye odağı şeritteyken dur.
  const pause = (on) => {
    if (on === paused) return;
    paused = on;
    if (on) { root.dataset.paused = ''; if (timer) { remaining -= performance.now() - startedAt; stop(); } }
    else { delete root.dataset.paused; run(); }
  };
  const rail = root.querySelector('.hero__rail');
  rail.addEventListener('pointerenter', () => pause(true));
  rail.addEventListener('pointerleave', () => pause(false));
  rail.addEventListener('focusin', () => pause(true));
  rail.addEventListener('focusout', () => pause(false));
  document.addEventListener('visibilitychange', () => pause(document.hidden));
}
