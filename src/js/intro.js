// Açılış (preloader) davranışı — "Çift kapı". Görünüm ve kurallar: styles/intro.css başı.
// Yalnızca <html class="intro-on"> ise çalışır (karar: scripts/lib/intro-boot.mjs). GSAP'a bağlı değildir
// (Web Animations API kullanır); mobilde de hafif kalır.
//
// İlerleme GERÇEKTİR: beş görev bittikçe ağırlıkları kadar artar (yazı tipleri, amblem, ilk büyük görsel,
// sayfanın yüklenmesi, masaüstünde hareket paketi). Üstüne iki sınır biner:
//   • en az gösterim süresi: marka anı okunsun, perde göz kırpar gibi geçmesin
//   • en çok bekleme: yavaş bağlantıda bile perde takılı kalmaz; süre dolunca kalan işler beklenmez
//
// Sayfanın diğer bölümleriyle sözleşme (değişmedi): <html> sınıfları intro-on / intro-leaving / intro-after,
// 'fc:intro-reveal' (hero metni başlasın), 'fc:intro-done' olayları, window.__lenis durdur/başlat.

const EASE_IO = 'cubic-bezier(.76, 0, .24, 1)';

// Süreler (ms). "short": dönen ziyaretçi ve iç sayfalar. pace: giriş animasyonlarının hız çarpanı.
const TIMING = {
  full: { min: 1350, hold: 260, doors: 1000, reveal: 170, max: 3800, fail: 7500, pace: 1 },
  short: { min: 650, hold: 120, doors: 650, reveal: 110, max: 2300, fail: 5000, pace: 0.6 },
};

// Yazı tipleri sayfa açılmadan yüklenir: hero başlığı ilk boyamada yedek yazı tipiyle çıkıp sonradan
// "zıplamasın" (CLS ve göz kırpma). Türkçe karakterler latin-ext alt kümesini de çağırır.
const TR_TEXT = 'Fuar Çiçekçim İyi ışğş';
const FONTS = [
  '500 1em "Playfair Display"', 'italic 500 1em "Playfair Display"',
  '500 1em "Cormorant Garamond"', 'italic 500 1em "Cormorant Garamond"',
  '400 1em "Plus Jakarta Sans"', '600 1em "Plus Jakarta Sans"',
];

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Bir sonraki karedeki ilerleme (0–1). Saf fonksiyondur; tarayıcısız test edilir.
 * real: biten görevlerin ağırlık toplamı · min/max: en az gösterim ve en çok bekleme (ms)
 * forced: "Atla" basıldı · cap: ?intro=hold incelemesinde üst sınır.
 */
export function nextProgress({ p, dt, elapsed, real, min, max, forced = false, cap = 1 }) {
  const rush = forced || elapsed >= max;
  const done = real > 0.9999 ? 1 : real; // ağırlık toplamı kayan noktada 0,99999… çıkabilir
  const target = rush ? 1 : Math.min(done, ease(Math.min(Math.max(elapsed, 0) / min, 1)), cap);
  let next = p + (target - p) * (1 - Math.exp(-dt / (rush ? 70 : 150)));
  // Son yaklaşımda üstel yavaşlama sayacı oyalamasın: hedef 1 ise en az doğrusal hızla ilerle.
  if (target >= 1) next = Math.max(next, p + dt / 600);
  if (target >= 1 && next > 0.997) next = 1;
  return Math.min(1, Math.max(p, next)); // asla geri gitmez
}

function imgReady(img) {
  if (!img) return Promise.resolve();
  if (img.loading === 'lazy') img.loading = 'eager';
  const loaded = img.complete ? Promise.resolve()
    : new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); });
  return loaded.then(() => (img.decode ? img.decode() : null)).catch(() => {});
}

const fontsReady = () => (document.fonts?.load
  ? Promise.all(FONTS.map((f) => document.fonts.load(f, TR_TEXT).catch(() => {})))
  : Promise.resolve());

// Sayfanın ilk büyük görseli: ana sayfada hero'nun ilk sahnesi, ürün sayfalarında ana fotoğraf.
const lcpImage = () => document.querySelector('[data-hero] .is-active img') || document.querySelector('main img[fetchpriority="high"]');

export function runIntro(opts = {}) {
  try {
    start(opts);
  } catch {
    // Ne olursa olsun ziyaretçi perdede takılı kalmasın.
    const html = document.documentElement;
    html.classList.remove('intro-on', 'intro-leaving');
    document.querySelector('[data-intro]')?.remove();
    document.body?.removeAttribute('aria-busy');
    window.dispatchEvent(new Event('fc:intro-reveal'));
    window.dispatchEvent(new Event('fc:intro-done'));
    window.__lenis?.start();
  }
}

function start({ motion } = {}) {
  const html = document.documentElement;
  const root = document.querySelector('[data-intro]');
  if (!root) return;
  if (!html.classList.contains('intro-on')) { root.remove(); return; }

  const flags = new Set((html.dataset.introFlags || '').split(','));
  const hold = flags.has('hold');
  const slow = flags.has('slow') ? 4 : 1;
  const cfg = TIMING[html.dataset.introMode === 'short' ? 'short' : 'full'];
  const T = Object.fromEntries(Object.entries(cfg).map(([k, v]) => [k, k === 'pace' ? v : v * slow]));
  const d = (ms) => ms * T.pace * slow; // giriş animasyonu süresi/gecikmesi

  const all = (sel) => [...root.querySelectorAll(sel)];
  const live = root.querySelector('[data-intro-live]');
  const skipBtn = root.querySelector('[data-intro-skip]');
  const counters = all('[data-intro-count]');

  performance.mark('fc-intro-start');
  root.classList.add('is-live');
  document.body.setAttribute('aria-busy', 'true');
  window.__lenis?.stop();
  if (live) live.textContent = 'Fuar Çiçekçim yükleniyor';

  // ---------- Gerçek yükleme görevleri ----------
  const tasks = [];
  const track = (name, w, promise) => {
    const t = { w, done: false };
    tasks.push(t);
    Promise.resolve(promise).catch(() => {}).then(() => { t.done = true; performance.mark(`fc-intro-task-${name}`); });
  };
  track('fonts', 0.25, fontsReady());
  track('crest', 0.05, imgReady(root.querySelector('.intro__crest')));
  track('hero', 0.35, imgReady(lcpImage()));
  track('load', 0.20, document.readyState === 'complete' ? 1 : new Promise((r) => window.addEventListener('load', r, { once: true })));
  // Masaüstünde hero metin animasyonları hareket paketine bağlıdır; hazır olmadan perde açılmasın.
  track('motion', 0.15, Promise.resolve().then(() => motion?.()));

  // ---------- Durum ----------
  // Giriş animasyonları CSS'tedir ve perde ekrana gelir gelmez başlar (JS gecikse de ekran canlı kalır).
  // Süre, perdenin ekrana geldiği andan sayılır; yavaş ağda JS geç başlasa da ziyaretçi boşuna uzun beklemez.
  const firstPaint = performance.getEntriesByName('first-paint')[0]?.startTime;
  const t0 = firstPaint ?? performance.now();
  let last = performance.now();
  let p = 0;
  let shown = -1;
  let skipped = false;
  let released = !hold;
  let exiting = false;
  let finished = false;
  let revealed = false;
  let doors = [];

  const render = (v) => {
    root.style.setProperty('--p', v.toFixed(4));
    const n = Math.round(v * 100);
    if (n !== shown) { shown = n; counters.forEach((c) => { c.textContent = String(n); }); }
  };

  // Hero metni ve fotoğrafı: kapılar açılmaya başlarken harekete geçer (aynı anda hissedilsin).
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    performance.mark('fc-intro-reveal');
    html.classList.remove('intro-on');
    html.classList.add('intro-after');
    window.dispatchEvent(new Event('fc:intro-reveal'));
  };

  const onKey = (e) => { if (e.key === 'Escape') skip(); };

  function cleanup() {
    if (finished) return;
    finished = true;
    performance.mark('fc-intro-done');
    try { sessionStorage.setItem('fc-intro', '1'); localStorage.setItem('fc-seen', '1'); } catch { /* gizli sekme */ }
    reveal();
    html.classList.remove('intro-on', 'intro-leaving');
    html.removeAttribute('data-intro-mode');
    html.removeAttribute('data-intro-flags');
    document.body.removeAttribute('aria-busy');
    document.removeEventListener('keydown', onKey);
    root.remove();
    window.__lenis?.start();
    window.dispatchEvent(new Event('fc:intro-done'));
    setTimeout(() => html.classList.remove('intro-after'), 1300);
  }

  function skip() {
    if (skipped || finished) return;
    skipped = true;
    released = true;
    skipBtn?.setAttribute('hidden', '');
    doors.forEach((a) => a.updatePlaybackRate?.(2.2)); // kapılar zaten açılıyorsa hızlan
  }

  async function exit() {
    if (exiting) return;
    exiting = true;
    performance.mark('fc-intro-complete');
    skipBtn?.setAttribute('hidden', '');
    root.classList.add('is-complete');
    if (live) live.textContent = 'Sayfa hazır';
    await wait(skipped || performance.now() - t0 > T.max ? 60 : T.hold);
    if (finished) return;

    html.classList.add('intro-leaving'); // intro-on kalkınca da perde görünür kalsın
    // "Atla" basıldıysa veya yavaş ağda süre zaten dolduysa kapılar hızlı açılır (ziyaretçi yeterince bekledi).
    const late = performance.now() - t0 > T.max;
    const q = skipped || late ? 0.5 : 1;
    all('.intro__count, .intro__foot').forEach((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260 * slow * q, fill: 'forwards' }));
    doors = all('.intro__panel').map((el, i) => {
      el.style.willChange = 'transform';
      return el.animate(
        [{ transform: 'translate3d(0, 0, 0)' }, { transform: `translate3d(${i ? 101 : -101}%, 0, 0)` }],
        { duration: T.doors * q, easing: EASE_IO, fill: 'forwards' },
      );
    });
    if (skipped) doors.forEach((a) => a.updatePlaybackRate?.(2.2));
    setTimeout(reveal, T.reveal * q);
    await Promise.all(doors.map((a) => a.finished.catch(() => {})));
    cleanup();
  }

  // ---------- Döngü ----------
  const frame = (now) => {
    if (finished || exiting) return;
    const dt = Math.min(Math.max(now - last, 0), 100); // arka plan sekmesinden dönünce sıçrama olmasın
    last = now;
    const real = tasks.reduce((s, t) => s + (t.done ? t.w : 0), 0);
    p = nextProgress({
      p, dt, elapsed: now - t0, real, min: T.min,
      max: released ? T.max : Infinity, forced: skipped, cap: released ? 1 : 0.64,
    });
    render(p);
    if (p < 1) requestAnimationFrame(frame); else exit();
  };
  requestAnimationFrame(frame);

  // ---------- Atla, klavye, inceleme ----------
  document.addEventListener('keydown', onKey);
  skipBtn?.addEventListener('click', skip);
  root.addEventListener('pointerdown', (e) => { if (hold && !e.target.closest('[data-intro-skip]')) released = true; });
  setTimeout(() => {
    if (exiting || finished || !skipBtn) return;
    skipBtn.hidden = false;
    skipBtn.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, fill: 'forwards' });
  }, d(1000));

  // Güvenlik: ne olursa olsun belirli süre sonra perde kalkar (inceleme kipi hariç).
  if (!hold) setTimeout(() => { if (!finished) { exiting = true; cleanup(); } }, T.fail);
}
