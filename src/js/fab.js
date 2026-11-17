// Sağ alttaki yüzen iletişim kümesi (Haritalar, Instagram, WhatsApp). Görünüm: styles/fab.css.
// • Açılış perdesi (preloader) varsa onun bitmesini bekler, sonra alttan yukarı sırayla belirir.
// • Altbilgi ekranın üst %72'sine girince küme çekilir (altbilgide iletişim bilgileri zaten var).
// JS çalışmazsa düğmeler yine de görünür (gizleme yalnızca JS "is-armed" ekleyince başlar).

export function initFab() {
  const fab = document.querySelector('[data-fab]');
  if (!fab) return;

  const reveal = () => requestAnimationFrame(() => fab.classList.add('is-in'));
  fab.classList.add('is-armed');
  if (document.documentElement.classList.contains('intro-on')) {
    window.addEventListener('fc:intro-done', reveal, { once: true });
    setTimeout(reveal, 9000); // güvenlik: perde olaysız kalırsa küme yine de gelir
  } else {
    setTimeout(reveal, 400); // LCP ile yarışmasın diye kısa bir gecikme
  }

  const footer = document.querySelector('.footer');
  if (footer && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => fab.classList.toggle('is-away', e.isIntersecting), { rootMargin: '0px 0px -28% 0px' }).observe(footer);
  }
}
