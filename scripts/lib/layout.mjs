import { SITE, CONTACT, DELIVERY, VENUES } from '../../src/config/site-settings.js';
import { esc, icon } from './html.mjs';

const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap';

export const waLink = (text = 'Merhaba, fuar standına çiçek siparişi vermek istiyorum.') =>
  `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text)}`;

const NAV = [
  ['/#urunler', 'Ürünler'],
  ['/#paketler', 'Fuar Paketleri'],
  [VENUES[0].page, 'TÜYAP'],
  [VENUES[1].page, 'İFM'],
  ['/#nasil-calisir', 'Nasıl Çalışır'],
  ['/#sss', 'SSS'],
];

function header() {
  return `
<a class="skip-link" href="#icerik">İçeriğe geç</a>
<div class="topbar">
  <div class="wrap">
    <span><strong>${esc(DELIVERY.promise)}</strong> · TÜYAP &amp; İFM</span>
    <span class="topbar__extra">
      <span>7/24 WhatsApp sipariş</span>
      <span>Kurumsal e-Fatura</span>
      <a href="tel:${CONTACT.phoneE164}" data-track="phone_click" data-track-location="topbar">${esc(CONTACT.phoneDisplay)}</a>
    </span>
  </div>
</div>
<header class="header">
  <div class="wrap">
    <a class="brand" href="/" aria-label="${esc(SITE.name)} ana sayfa">
      <img src="/assets/brand/crest-80.webp" width="40" height="36" alt="" decoding="async">
      <span class="brand__name">Fuar <em>Çiçekçim</em></span>
    </a>
    <nav class="nav" aria-label="Ana menü">
      <ul>${NAV.map(([href, label]) => `<li><a href="${href}">${esc(label)}</a></li>`).join('')}</ul>
    </nav>
    <div class="header__actions">
      <a class="btn btn--ghost header__wa" href="${waLink()}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-location="header" data-magnetic>${icon('message-circle')}WhatsApp</a>
      <button class="cart-btn" type="button" data-drawer-open aria-label="Sipariş sepetini aç">${icon('shopping-bag')}<span class="cart-btn__count" data-cart-count data-count="0">0</span></button>
    </div>
  </div>
</header>`;
}

function dock() {
  return `
<div class="dock" role="region" aria-label="Hızlı sipariş">
  <a class="btn btn--ghost-light" href="tel:${CONTACT.phoneE164}" data-track="phone_click" data-track-location="dock">${icon('phone')}Ara</a>
  <a class="btn btn--wa" href="${waLink()}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-location="dock">${icon('message-circle')}WhatsApp’la Sipariş</a>
</div>`;
}

function footer() {
  const year = new Date().getFullYear();
  return `
<footer class="footer">
  <div class="wrap">
    <div class="footer__grid">
      <div>
        <p class="footer__brand">Fuar <em>Çiçekçim</em></p>
        <p>TÜYAP ve İstanbul Fuar Merkezi’ndeki standlara çelenk, orkide, aranjman ve saksı bitkisi. ${esc(DELIVERY.promise)}.</p>
      </div>
      <div>
        <h2>Fuar Merkezleri</h2>
        <ul>${VENUES.map((v) => `<li><a href="${v.page}">${esc(v.short)} fuar çiçekçisi</a></li>`).join('')}<li><a href="/fuar-takvimi.html">Fuar takvimi</a></li></ul>
      </div>
      <div>
        <h2>Kurumsal</h2>
        <ul><li><a href="/hakkimizda.html">Hakkımızda</a></li><li><a href="/teklif.html">Kurumsal teklif</a></li><li><a href="/blog/">Rehberler</a></li><li><a href="/kvkk.html">KVKK aydınlatma metni</a></li></ul>
      </div>
      <div>
        <h2>İletişim</h2>
        <ul>
          <li><a href="tel:${CONTACT.phoneE164}" data-track="phone_click" data-track-location="footer">${esc(CONTACT.phoneDisplay)}</a></li>
          <li><a href="${waLink()}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-location="footer">WhatsApp sipariş hattı (7/24)</a></li>
          <li><a href="mailto:${CONTACT.email}">${esc(CONTACT.email)}</a></li>
          <li>${esc(SITE.address.district)}, ${esc(SITE.address.city)}</li>
        </ul>
      </div>
    </div>
    <div class="footer__bottom">
      <span>© ${year} ${esc(SITE.name)}</span>
      <a href="${CONTACT.instagram}" target="_blank" rel="noopener">Instagram @fuarcicekcim</a>
    </div>
  </div>
</footer>`;
}

export function page({ path, title, description, body, jsonld = '', preload = '', robots = 'index, follow', ogImage = '/assets/og/fuar-cicekcim-og.jpg' }) {
  const canonical = SITE.url + path;
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#0A1F17">
<meta property="og:type" content="website">
<meta property="og:locale" content="${SITE.locale}">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE.url}${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/brand/crest-80.webp" type="image/webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="${FONT_CSS}">
<link rel="stylesheet" href="${FONT_CSS}">
${preload}
${jsonld}
<script type="module" src="/src/main.js"></script>
</head>
<body>
${header()}
<main id="icerik">
${body}
</main>
${footer()}
${dock()}
</body>
</html>
`;
}
