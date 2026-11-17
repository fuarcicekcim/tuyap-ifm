// Açılış (preloader) zaman çizelgesi. Yalnızca <html class="intro-on"> ise çalışır
// (oturumdaki ilk sayfa, hareket azaltma kapalı). GSAP'a bağlı değildir; mobilde de hafif kalır.
const EASE_IO = 'cubic-bezier(.76, 0, .24, 1)';
const EASE_OUT = 'cubic-bezier(.22, 1, .36, 1)';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const anim = (el, frames, opts) => (el ? el.animate(frames, { fill: 'forwards', ...opts }).finished.catch(() => {}) : Promise.resolve());

export function runIntro() {
  const html = document.documentElement;
  const root = document.querySelector('[data-intro]');
  const done = () => {
    try { sessionStorage.setItem('fc-intro', '1'); } catch { /* gizli sekme */ }
    html.classList.remove('intro-on');
    root?.remove();
    window.__lenis?.start();
    window.dispatchEvent(new Event('fc:intro-done'));
  };
  if (!html.classList.contains('intro-on') || !root) { root?.remove(); return; }
  window.__lenis?.stop();

  const imgs = [...root.querySelectorAll('.intro__frame img')];
  const countEl = root.querySelector('[data-intro-count]');
  const frame = root.querySelector('.intro__frame');
  const meta = [...root.querySelectorAll('.intro__mask > span')];
  const lines = [...root.querySelectorAll('.intro__line > span')];
  const mono = root.querySelector('.intro__mono');

  // 1) Fotoğraflar hızla değişir.
  let i = 0;
  const flip = setInterval(() => {
    imgs[i].classList.remove('is-on');
    imgs[i].style.opacity = '0';
    i = (i + 1) % imgs.length;
    imgs[i].style.opacity = '1';
    imgs[i].classList.add('is-on');
  }, 140);

  // 2) Sayaç 0 → 100 (yumuşak hızlanma/yavaşlama); sayfa yüklenmediyse 99'da en fazla ~1,6 sn bekler.
  const loaded = document.readyState === 'complete' ? Promise.resolve()
    : Promise.race([new Promise((r) => window.addEventListener('load', r, { once: true })), wait(2500)]);
  const DUR = 900;
  const start = performance.now();
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const counted = new Promise((resolve) => {
    const tick = (now) => {
      const t = Math.min((now - start) / DUR, 1);
      countEl.textContent = String(Math.min(Math.round(ease(t) * 100), 99));
      if (t < 1) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });

  Promise.all([counted, loaded]).then(async () => {
    countEl.textContent = '100';
    await wait(100);
    clearInterval(flip);

    // 3) Kart yukarı doğru kırpılır, üst yazılar maskeye geri kayar.
    meta.forEach((el) => anim(el, [{ transform: 'none' }, { transform: 'translateY(-110%)' }], { duration: 450, easing: EASE_IO }));
    await anim(frame, [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }], { duration: 500, easing: EASE_IO });

    // 4) Monogram ve dev marka yazısı maskeden yükselir.
    anim(mono, [{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: EASE_OUT });
    anim(mono?.querySelector('i'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 600, easing: EASE_IO });
    await Promise.all(lines.map((el, n) => anim(el, [{ transform: 'translateY(110%)' }, { transform: 'none' }], { duration: 650, delay: n * 60, easing: EASE_OUT })));
    await wait(150);

    // 5) Yazı yukarı çıkarken perde kalkar; altta sayfa (hero) açılır.
    html.classList.add('intro-leaving');
    lines.forEach((el, n) => anim(el, [{ transform: 'none' }, { transform: 'translateY(-110%)' }], { duration: 550, delay: n * 50, easing: EASE_IO }));
    anim(mono, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
    // Perde kalkmaya başlarken hero animasyonları başlar (aynı anda hissedilsin).
    setTimeout(() => {
      html.classList.remove('intro-on');
      html.classList.add('intro-after');
      window.dispatchEvent(new Event('fc:intro-reveal'));
    }, 200);
    await anim(root, [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }], { duration: 750, delay: 100, easing: EASE_IO });
    html.classList.remove('intro-leaving');
    setTimeout(() => html.classList.remove('intro-after'), 1200);
    done();
  });
}
