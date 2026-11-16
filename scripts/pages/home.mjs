import { DELIVERY, PRICING, FAIR_DAYS } from '../../src/config/site-settings.js';
import { esc, icon } from '../lib/html.mjs';
import { page, waLink } from '../lib/layout.mjs';

const HERO_IMG = '/assets/hero/tuyap-orkide';

function hero() {
  return `
<section class="hero" aria-labelledby="hero-baslik">
  <div class="wrap hero__grid">
    <div class="hero__copy">
      <p class="eyebrow hero__eyebrow">TÜYAP &amp; İFM fuar çiçekçisi</p>
      <h1 id="hero-baslik" data-split>Standınızın ilk <em>izlenimi,</em> bizden.</h1>
      <p class="hero__lead">Açılış çelengi, logolu kuşaklı VIP orkide ve stant aranjmanı. Firmanızın adıyla hazırlanır, sipariş onayından itibaren ${DELIVERY.minutes} dakikada standınıza teslim edilir.</p>
      <div class="hero__ctas">
        <button class="btn btn--gold" type="button" data-drawer-open data-track="drawer_open" data-track-location="hero" data-magnetic>${icon('shopping-bag')}Sipariş Oluştur</button>
        <a class="btn btn--ghost-light" href="${waLink()}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-location="hero" data-magnetic>${icon('message-circle')}WhatsApp’tan Yazın</a>
      </div>
      <p class="hero__note">${esc(DELIVERY.condition)} ${esc(PRICING.deliveryIncluded)}</p>
    </div>
    <figure class="hero__media">
      <div class="hero__frame">
        <img src="${HERO_IMG}.webp" srcset="${HERO_IMG}-768.webp 768w, ${HERO_IMG}.webp 1536w" sizes="(min-width: 1024px) 40vw, 100vw"
          width="1536" height="1024" alt="TÜYAP’ta bir fuar standının karşılama bankosunda firma adlı kuşaklı beyaz orkide ve pastel aranjman"
          fetchpriority="high" decoding="async" data-parallax="8">
        <div class="hero__seal"><strong>${DELIVERY.minutes} dk</strong><span>Sipariş onayından standınıza</span></div>
      </div>
      <figcaption class="hero__caption"><span>Kuşaklı VIP orkide · stant karşılama bankosu</span><span>${esc(FAIR_DAYS.activeFairName)}</span></figcaption>
    </figure>
  </div>
</section>`;
}

function trust() {
  const items = [
    ['truck', 'Standa doğrudan teslimat', 'TÜYAP ve İFM’de salon ve stant numaranıza'],
    ['camera', 'Fotoğraflı teslim onayı', 'Teslimat fotoğrafı WhatsApp’tan iletilir'],
    ['receipt-text', 'Kurumsal e-Fatura', 'Firma ünvanınıza düzenlenir'],
    ['message-circle', '7/24 WhatsApp hattı', 'Sipariş ve ödeme tek yazışmada netleşir'],
  ];
  return `
<section class="trust" aria-label="Neden Fuar Çiçekçim">
  <div class="wrap">
    <ul class="trust__list">
      ${items.map(([ic, t, s]) => `<li class="trust__item" data-reveal>${icon(ic)}<strong>${esc(t)}</strong><span>${esc(s)}</span></li>`).join('')}
    </ul>
  </div>
</section>`;
}

export function home() {
  return page({
    path: '/',
    title: 'Fuar Çiçekçim | TÜYAP ve İFM Fuar Çiçekçisi – Standa Çelenk, Orkide, Aranjman',
    description: `TÜYAP ve İFM fuar standlarına açılış çelengi, kuşaklı VIP orkide, stant aranjmanı ve saksı bitkisi. ${DELIVERY.promise}, fotoğraflı teslim onayı ve kurumsal e-Fatura.`,
    preload: `<link rel="preload" as="image" href="/assets/hero/tuyap-orkide-768.webp" imagesrcset="/assets/hero/tuyap-orkide-768.webp 768w, /assets/hero/tuyap-orkide.webp 1536w" imagesizes="(min-width: 1024px) 40vw, 100vw" fetchpriority="high">`,
    body: hero() + trust(),
  });
}
