export function initHeader() {
  const header = document.querySelector('.header');
  if (!header) return;

  let floating = false;
  const update = () => {
    // Ayrı eşikler, küçük kaydırma hareketlerinin geçişi sürekli tersine çevirmesini önler.
    const next = window.scrollY >= (floating ? 44 : 64);
    if (next === floating) return;
    floating = next;
    header.classList.toggle('is-floating', floating);
  };

  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('pageshow', update);
  requestAnimationFrame(() => header.classList.add('is-ready'));
}
