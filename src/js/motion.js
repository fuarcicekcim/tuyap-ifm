import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

const DESKTOP = '(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

export let lenis = null;

function initLenis() {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true, prevent: (node) => !!node.closest?.('[data-drawer]') });
  window.__lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(tick);
    lenis.destroy();
    lenis = null;
    window.__lenis = null;
  };
}

function initSplitHeadings() {
  const splits = [];
  document.querySelectorAll('[data-split]').forEach((el) => {
    const split = SplitText.create(el, { type: 'lines', mask: 'lines', autoSplit: true, onSplit: (self) =>
      gsap.from(self.lines, {
        yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.08,
        scrollTrigger: el.closest('.hero') ? undefined : { trigger: el, start: 'top 85%', once: true },
      }),
    });
    splits.push(split);
  });
  return () => splits.forEach((s) => s.revert());
}

function initParallax() {
  document.querySelectorAll('[data-parallax]').forEach((el) => {
    const amount = parseFloat(el.dataset.parallax) || 10;
    gsap.fromTo(el, { yPercent: -amount / 2, scale: 1.08 }, {
      yPercent: amount / 2, ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}

function initMagnetic() {
  const cleanups = [];
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    const move = (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.25);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
    };
    const leave = () => { xTo(0); yTo(0); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    cleanups.push(() => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      gsap.set(el, { x: 0, y: 0 });
    });
  });
  return () => cleanups.forEach((c) => c());
}

function initReveals(distance) {
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      opacity: 0, y: distance, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}

export function initMotion() {
  const mm = gsap.matchMedia();

  mm.add(DESKTOP, () => {
    document.documentElement.classList.add('has-motion');
    const offLenis = initLenis();
    const offSplit = initSplitHeadings();
    const offMagnetic = initMagnetic();
    initParallax();
    initReveals(40);
    return () => {
      offLenis(); offSplit(); offMagnetic();
      document.documentElement.classList.remove('has-motion');
    };
  });

  return mm;
}
