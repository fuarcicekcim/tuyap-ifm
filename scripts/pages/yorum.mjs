import { SITE } from '../../src/config/site-settings.js';
import { esc } from '../lib/html.mjs';

const pageUrl = `${SITE.url}/yorum/`;
const reviewUrl = 'https://g.page/r/CRk-yEic3q6CEAE/review';
const title = 'Siparişiniz nasıldı?';
const description = 'Deneyiminizi Google’da paylaşın, fuara çiçek göndereceklere yol gösterin.';
const previewImage = `${SITE.url}/assets/og/fuar-cicekcim-og.jpg`;

export function yorum() {
  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#173628">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(pageUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="${esc(SITE.locale)}">
  <meta property="og:site_name" content="${esc(SITE.name)}">
  <meta property="og:title" content="${esc(title)} 🌸">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(pageUrl)}">
  <meta property="og:image" content="${esc(previewImage)}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Fuar Çiçekçim marka görseli">
  <script>window.location.replace(${JSON.stringify(reviewUrl)});</script>
  <link rel="icon" href="/assets/brand/crest-80.webp" type="image/webp">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&amp;family=Plus+Jakarta+Sans:wght@400;600;700&amp;display=swap">
  <style>
    :root {
      color-scheme: light;
      --forest: #173628;
      --forest-hover: #1f4434;
      --cream: #f7f5f0;
      --paper: #fbfaf7;
      --muted: #5d625e;
      --gold: #c5a059;
      --display: 'Cormorant Garamond', Georgia, serif;
      --ui: 'Plus Jakarta Sans', system-ui, sans-serif;
    }

    *, *::before, *::after { box-sizing: border-box; }

    body {
      display: grid;
      min-height: 100vh;
      min-height: 100svh;
      place-items: center;
      margin: 0;
      padding: clamp(1rem, 4vw, 3rem);
      background: radial-gradient(ellipse at top, var(--forest-hover), var(--forest) 72%);
      color: var(--forest);
      font-family: var(--ui);
      text-align: center;
    }

    .review {
      width: min(100%, 37rem);
      padding: clamp(1.9rem, 7vw, 4.25rem) clamp(1.25rem, 6vw, 4rem);
      border: 1px solid var(--gold);
      background: var(--paper);
      box-shadow: 0 1rem 3rem rgb(0 0 0 / 18%);
    }

    .review__mark {
      display: block;
      width: clamp(5rem, 20vw, 6.75rem);
      height: auto;
      margin: 0 auto 0.65rem;
    }

    .review__brand {
      margin: 0;
      font-family: var(--display);
      font-size: 1.5rem;
      font-weight: 700;
    }

    h1 {
      margin: 1.3rem 0 0.6rem;
      font-family: var(--display);
      font-size: clamp(2.5rem, 8vw, 3.85rem);
      font-weight: 600;
      letter-spacing: -0.025em;
      line-height: 0.98;
      text-wrap: balance;
    }

    .review__description {
      max-width: 30ch;
      margin: 0.95rem auto 1.65rem;
      color: var(--muted);
      line-height: 1.65;
    }

    .review__action {
      display: inline-flex;
      min-height: 3.3rem;
      align-items: center;
      justify-content: center;
      gap: 0.7rem;
      padding: 0.7rem 1.3rem;
      background: var(--forest);
      color: var(--cream);
      font-weight: 700;
      text-decoration: none;
    }

    .review__action:hover { background: var(--forest-hover); }

    .review__home {
      display: table;
      margin: 1.25rem auto 0;
      color: var(--forest);
      font-size: 0.875rem;
      text-underline-offset: 0.22em;
    }

    a:focus-visible {
      outline: 2px solid var(--forest);
      outline-offset: 4px;
    }
  </style>
</head>
<body>
  <main class="review" aria-labelledby="review-title">
    <img class="review__mark" src="/assets/brand/crest-320.webp" width="320" height="289" alt="">
    <p class="review__brand">${esc(SITE.name)}</p>
    <h1 id="review-title">Deneyiminizi paylaşın</h1>
    <p class="review__description">Google yorum ekranı açılmazsa aşağıdaki bağlantıya dokunun.</p>
    <a class="review__action" href="${esc(reviewUrl)}">
      Google’da yorum bırak <span aria-hidden="true">↗</span>
    </a>
    <a class="review__home" href="/">Ana sayfaya dön</a>
  </main>
</body>
</html>`;
}
