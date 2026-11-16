// Alt bilgideki TÜYAP fotoğrafı sayfa kaydırıldıkça hafifçe kayar (paralaks).
// Yalnızca alt bilgi görünürken çalışır; hareket azaltma tercihinde kapalıdır.
export function initFooter() {
  const root = document.querySelector('[data-footer]');
  if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const items = [...root.querySelectorAll('[data-depth]')];
  if (!items.length) return;

  let visible = false;
  let raf = 0;
  const update = () => {
    raf = 0;
    const r = root.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height))); // 0: yeni giriyor, 1: tamamen geçti
    for (const el of items) el.style.setProperty('--py', `${((0.5 - p) * Number(el.dataset.depth)).toFixed(1)}px`);
  };
  const onScroll = () => { if (visible && !raf) raf = requestAnimationFrame(update); };

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) update(); }).observe(root);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
}
