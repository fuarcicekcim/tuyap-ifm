const heroGallery = document.querySelector('[data-hero-gallery]');

if (heroGallery) {
  const slides = [...heroGallery.querySelectorAll('.hero-slide')];
  const toggle = heroGallery.querySelector('.hero-gallery__toggle');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let previous;
  let timer;
  let paused = motion.matches;

  function scheduleSlide() {
    window.clearTimeout(timer);
    if (!paused && !document.hidden) timer = window.setTimeout(advanceSlide, 3000);
  }

  function advanceSlide() {
    for (let offset = 1; offset < slides.length; offset += 1) {
      const nextIndex = (current + offset) % slides.length;
      const nextSlide = slides[nextIndex];
      if (!nextSlide.complete || !nextSlide.naturalWidth) continue;

      previous?.classList.remove('is-previous');
      previous = slides[current];
      previous.classList.replace('is-current', 'is-previous');
      previous.setAttribute('aria-hidden', 'true');
      current = nextIndex;
      nextSlide.removeAttribute('aria-hidden');
      nextSlide.classList.add('is-current');
      break;
    }

    scheduleSlide();
  }

  function setPaused(value) {
    paused = value;
    toggle.classList.toggle('is-paused', paused);
    toggle.setAttribute('aria-label', paused ? 'Görsel geçişini başlat' : 'Görsel geçişini durdur');
    scheduleSlide();
  }

  toggle.addEventListener('click', () => setPaused(!paused));
  motion.addEventListener('change', () => setPaused(motion.matches));
  document.addEventListener('visibilitychange', scheduleSlide);
  toggle.hidden = false;
  setPaused(paused);
}
