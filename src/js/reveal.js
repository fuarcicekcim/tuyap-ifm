// Mobil görünme efekti: yalnızca opacity/transform, ekranda zaten görünen öğeler gizlenmez.
export function initReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const items = [...document.querySelectorAll('[data-reveal]')];
  const vh = window.innerHeight;
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  for (const el of items) {
    if (el.getBoundingClientRect().top < vh) continue;
    el.classList.add('reveal-pending');
    io.observe(el);
  }
}
