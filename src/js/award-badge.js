// "En çok satan" rozeti: yalnızca masaüstünde (ince işaretçi, hareket azaltma kapalı) fareyle hafif eğilir ve
// holografik parlama imlecin altında kayar. Dokunmatik cihazlarda ve hareket azaltmada hiçbir şey çalışmaz.
const DESKTOP = '(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
const MAX_TILT = 9; // derece

const bound = new WeakSet();

// Tek rozeti bağlar; canlı katalog katmanı (live-catalog.js) sonradan eklediği rozetler için de çağırır.
export function bindAwardBadge(el) {
  if (bound.has(el)) return;
  bound.add(el);
  const mq = window.matchMedia(DESKTOP);
  let frame = 0;
  const reset = () => {
    cancelAnimationFrame(frame);
    el.style.removeProperty('--rx'); el.style.removeProperty('--ry');
    el.style.removeProperty('--hx'); el.style.removeProperty('--hy');
  };
  el.addEventListener('pointermove', (e) => {
    if (!mq.matches || e.pointerType === 'touch') return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      el.style.setProperty('--ry', `${((px - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${((0.5 - py) * 2 * MAX_TILT * 0.7).toFixed(2)}deg`);
      el.style.setProperty('--hx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--hy', `${(py * 100).toFixed(1)}%`);
    });
  });
  el.addEventListener('pointerleave', reset);
}

export function initAwardBadge() {
  document.querySelectorAll('.award-badge').forEach(bindAwardBadge);
}
