import { SITE, DELIVERY, PRICING, FAIR_DAYS, CONTACT, VENUES } from '../../src/config/site-settings.js';
import { esc, icon, trRange } from '../lib/html.mjs';
import { card } from './products.mjs';
import { graph, businessNode, faqNode } from '../lib/seo.mjs';
import { page, waLink } from '../lib/layout.mjs';
import { CATEGORIES, stockLast } from '../lib/catalog.mjs';
import { homeProductOrder } from '../lib/catalog-release.mjs';

// Hero sahneleri: tam ekran, sırayla değişen stant görselleri. İlk sahne LCP görselidir.
const SCENES = [
  { img: '/assets/hero/tuyap-orkide', pos: '58% 40%', no: '01', title: 'Çift dallı orkide', where: 'Karşılama bankosu · TÜYAP',
    alt: 'TÜYAP’ta bir fuar standının karşılama bankosunda firma adlı şeritli beyaz orkide ve pastel aranjman' },
  { img: '/assets/hero/ifm-ferforje', pos: '56% 35%', no: '02', title: 'Ayaklı ferforje', where: 'Açılış tebriği · İFM',
    alt: 'İFM’de bir standın girişinde firma adlı şeritli ayaklı ferforje çiçek aranjmanı' },
  { img: '/assets/hero/tuyap-saksi', pos: '48% 45%', no: '03', title: 'Hediye paketli bitkiler', where: 'Stant yeşillendirme · TÜYAP',
    alt: 'TÜYAP’ta bir standda firma adlı şeritle hediye paketlenmiş kauçuk ve kırmızı antoryum' },
];

function hero() {
  return `
<section class="hero" aria-labelledby="hero-baslik" data-hero>
  <div class="hero__stage">
    ${SCENES.map((s, i) => `<div class="hero__scene${i === 0 ? ' is-active' : ''}" data-scene="${i}">
      <img ${i === 0 ? `src="${s.img}.webp" srcset="${s.img}-768.webp 768w, ${s.img}.webp 1536w" fetchpriority="high"` : `data-src="${s.img}.webp" data-srcset="${s.img}-768.webp 768w, ${s.img}.webp 1536w"`}
        sizes="100vw" width="1536" height="1024" alt="${esc(s.alt)}" decoding="async" style="object-position:${s.pos}">
    </div>`).join('')}
  </div>
  <div class="hero__veil" aria-hidden="true"></div>

  <div class="wrap hero__inner">
    <div class="hero__copy">
      <h1 id="hero-baslik" data-split>TÜYAP ve İFM’de <em>standa çiçek gönderin.</em></h1>
      <div class="hero__cta">
        <a class="shiny hero__catalog" href="#urunler" data-track-location="hero-cta"><span>${icon('shopping-bag')}Çiçekleri ve fiyatları gör</span></a>
        <a class="shiny hero__wa" href="${waLink()}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-location="hero-cta"><span><img class="wa3d" src="/assets/icons/whatsapp-3d.webp" width="96" height="96" alt="" decoding="async">WhatsApp’la sipariş</span></a>
      </div>
      ${trust('hero')}
    </div>
  </div>
</section>`;
}

// Aktif fuar kartı: hero'da değil, ürün listesinin altındaki ayrı bölümde (masaüstü ve mobil).
function nextFair(titleId) {
  const venue = VENUES.find((v) => v.id === FAIR_DAYS.activeFairVenue);
  const mon = new Intl.DateTimeFormat('tr-TR', { month: 'long', timeZone: 'Europe/Istanbul' });
  const days = FAIR_DAYS.days;
  const first = days[0];
  const last = days[days.length - 1];
  return `<div class="hero__fair" role="group" aria-labelledby="${titleId}">
        <p class="hero__fair-date" aria-label="${trRange(days)} ${first.slice(0, 4)}"><strong>${Number(first.slice(8))}–${Number(last.slice(8))}</strong><span>${esc(mon.format(new Date(`${first}T12:00:00+03:00`)))}</span></p>
        <div class="hero__fair-body">
          <small>Sıradaki fuar · ${esc(venue.short)}</small>
          <h2 id="${titleId}">${esc(FAIR_DAYS.activeFairName)}</h2>
          <p class="hero__fair-links"><button type="button" data-drawer-open data-fair="${esc(FAIR_DAYS.activeFairName)}" data-venue="${esc(venue.name)}" data-track-location="home-fair" aria-label="${esc(FAIR_DAYS.activeFairName)} için sipariş ver" title="Bu fuar için sipariş"><span class="hero__fair-action-label">Bu fuar için sipariş</span><span class="hero__fair-action-compact" aria-hidden="true">Sipariş ver</span>${icon('arrow-right', 'icon hero__fair-arrow')}${icon('shopping-bag', 'icon hero__fair-bag')}</button><a href="${FAIR_DAYS.activeFairPage}">Fuar sayfası</a></p>
        </div>
        <a class="hero__fair-logos" href="${FAIR_DAYS.activeFairPage}" aria-label="${esc(FAIR_DAYS.activeFairName)} sayfası">
          <img src="/assets/fuar/avrasya-pencere-kapi-logo.webp" width="440" height="174" alt="Avrasya Pencere &amp; Kapı Fuarı logosu" decoding="async">
          <img src="/assets/fuar/avrasya-cam-logo.webp" width="366" height="174" alt="Avrasya Cam Fuarı logosu" decoding="async">
        </a>
      </div>`;
}


// variant: 'desktop' (hero altı şerit, ≥1024 px), 'hero' (başlık yanındaki mobil kart), 'card' (ürün listesinin altındaki kart, her genişlikte).
function trust(variant = 'desktop') {
  const compact = variant === 'hero' || variant === true;
  const isCard = variant === 'card';
  const titleId = isCard ? 'neden-baslik-urunler' : compact ? 'neden-baslik-mobil' : 'neden-baslik';
  const items = [
    ['zap', `${DELIVERY.minutes} dakikada standa teslimat`, 'TÜYAP ve İFM'],
    ['camera', 'Teslimatta fotoğraf onayı', 'WhatsApp üzerinden'],
    ['receipt-text', 'Kurumsal e-Fatura', 'Şirket bilgilerinize düzenlenir'],
    ['leaf', 'Doğrudan seradan', 'Taze ve bakımlı bitkiler'],
  ];
  return `
<section class="trust${isCard ? ' trust--card' : compact ? ' trust--hero' : ' trust--desktop'}" aria-labelledby="${titleId}">
  <div class="${compact || isCard ? 'trust__inner' : 'wrap trust__inner'}">
    <h2 class="trust__title" id="${titleId}">Neden Fuar <em>Çiçekçim?</em></h2>
    <ul class="trust__list">
      ${items.map(([ic, t, s]) => `<li class="trust__item"><span class="trust__icon">${icon(ic)}</span><span class="trust__text"><strong>${esc(t)}</strong><small>${esc(s)}</small></span></li>`).join('')}
    </ul>
  </div>
</section>`;
}


function fairOffer() {
  const venue = VENUES.find(v => v.id === FAIR_DAYS.activeFairVenue);
  return `
<aside class="fair-offer" data-fair-offer aria-labelledby="fair-offer-title" data-lenis-prevent hidden>
  <div class="fair-offer__panel">
    <button class="fair-offer__close" type="button" data-fair-offer-close aria-label="Kampanya kartını kapat">${icon('x')}</button>
    <img class="fair-offer__art" src="/assets/hero/fuar-kampanyasi.webp" width="768" height="402" loading="lazy" decoding="async" alt="">
    <div class="fair-offer__content">
      <p class="eyebrow">${esc(venue.short)} · ${esc(trRange(FAIR_DAYS.days))}</p>
      <h2 id="fair-offer-title">Fuara özel <em>çifte indirim</em></h2>
      <ul class="fair-offer__rates">
        <li><strong>%15</strong><span>Tüm çiçeklerde indirim</span></li>
        <li><strong>+ %5</strong><span>Sepette ek indirim</span></li>
      </ul>
      <a class="btn fair-offer__cta" href="#urunler" data-fair-offer-catalog>Çiçekleri keşfet${icon('arrow-right')}</a>
    </div>
  </div>
</aside>`;
}

function products(catalog) {
  const tabs = [['all', 'Tümü'], ...CATEGORIES.map((c) => [c.id, c.name]), ['vip', 'VİP']];
  return `
<section class="section products" id="urunler" aria-labelledby="urunler-baslik">
  ${fairOffer()}
  <div class="wrap">
    <h2 class="sr-only" id="urunler-baslik">Fuar çiçekleri ve fiyatları</h2>
    <div class="products__bar">
      <div class="filters" role="tablist" aria-label="Kategoriye göre filtrele">
        ${tabs.map(([id, name], i) => `<button class="filters__tab" type="button" role="tab" aria-selected="${i === 0}" data-filter="${id}">${esc(name)}</button>`).join('')}
      </div>
    </div>
    <div class="grid" data-grid>
      ${stockLast(homeProductOrder(catalog.products)).map(card).join('')}
    </div>
    <div class="grid-more"><button class="btn btn--ghost" type="button" data-more hidden>Daha fazla göster</button></div>
    ${trust('card')}
  </div>
</section>`;
}

// Müşteri logoları: sürekli kayan şerit (kullanıcının verdiği gerçek müşteri logoları).
const CLIENTS = [
  ['aker-asansor', 'Aker Asansör', 171, 160],
  ['mp-plastik', 'MP Plastik', 209, 160],
  ['saha-asansor', 'Saha Asansör', 422, 160],
  ['temapol', 'Temapol Polimer Plastik', 143, 160],
  ['arsanmak-makina', 'Arsanmak Makina', 480, 134],
  ['deniz-plastik', 'Deniz Plastik', 258, 160],
  ['akko-makina', 'AKKO Makina', 480, 99],
  ['pnr-plastik-elektrik', 'PNR Plastik & Elektrik', 403, 160],
  ['alucorex', 'Alucorex', 262, 160],
];

function clients() {
  // Kare ve geniş logolar göz kararı eşit büyüklükte görünsün: yükseklik en-boy oranına göre ayarlanır.
  const logo = ([file, name, w, h], hidden) => `<li style="--k:${Math.min(1, 1.6 * Math.pow(w / h, -0.45)).toFixed(2)}"><img src="/assets/musteriler/${file}.webp" width="${w}" height="${h}" alt="${hidden ? '' : esc(name)}" loading="lazy" decoding="async"></li>`;
  // Eşit iki grup tek bir rayda ilerler; görsel kopya ekran okuyuculardan gizlenir.
  return `
<section class="clients" aria-labelledby="musteri-baslik" data-clients>
  <div class="wrap clients__head">
    <p class="eyebrow" id="musteri-baslik">Referanslarımız</p>
  </div>
  <div class="clients__marquee">
    <div class="clients__track">
      <ul class="clients__group">${CLIENTS.map((c) => logo(c, false)).join('')}</ul>
      <ul class="clients__group" aria-hidden="true">${CLIENTS.map((c) => logo(c, true)).join('')}</ul>
    </div>
  </div>
</section>`;
}

function corporate() {
  return `
<section class="corporate" id="kurumsal" aria-labelledby="kurumsal-baslik">
  <div class="wrap corporate__grid">
    <div>
      <p class="eyebrow">Kurumsal siparişler</p>
      <h2 id="kurumsal-baslik" data-split>Birden fazla stand, birden fazla gün, <em>tek sipariş.</em></h2>
    </div>
    <div class="corporate__copy" data-reveal>
      <p>Bayilerinize, iş ortaklarınıza veya kendi standlarınıza aynı anda çiçek gönderecekseniz ürünleri sepete ekleyin; sepette her ürünün altına ayrı salon, stant, teslim alacak firma ve şerit yazısı girin. Tüm siparişler için tek kurumsal e-Fatura düzenlenir.</p>
      <div class="corporate__ctas">
        <button class="btn" type="button" data-drawer-open data-track-location="corporate">${icon('shopping-bag')}Siparişi Başlat</button>
        <a class="btn btn--ghost" href="/teklif.html" data-track="corporate_quote_click" data-track-location="corporate">${icon('file-text')}Kurumsal Teklif Al</a>
      </div>
    </div>
  </div>
</section>`;
}

function steps() {
  const list = [
    ['Ürünü ve şerit yazısını seçin', 'Çelenk, orkide veya aranjmanı sepete ekleyin. Firma adınızı ve mesajınızı yazın; şerit önizlemesini anında görün.'],
    ['WhatsApp’ta onaylayın', `Sipariş özetiniz WhatsApp’a düzenli bir mesaj olarak düşer. Stok ve teslim saatini teyit eder, ödemeyi aynı yazışmada netleştiririz.`],
    ['Standa teslim edelim', `Onaydan itibaren ${DELIVERY.minutes} dakikada salon ve stant numarasına teslim ederiz. Teslimat fotoğrafı WhatsApp’tan size iletilir.`],
  ];
  return `
<section class="section section--dark steps" id="nasil-calisir" aria-labelledby="adim-baslik">
  <div class="wrap">
    <div class="section-head section-head--dark">
      <p class="eyebrow">Nasıl çalışıyoruz</p>
      <h2 id="adim-baslik" data-split>Üç adımda <em>standda.</em></h2>
    </div>
    <ol class="steps__list">
      ${list.map(([t, d], i) => `<li class="steps__item" data-reveal><span class="steps__num">0${i + 1}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join('')}
    </ol>
    <div class="steps__cta"><button class="btn btn--gold" type="button" data-drawer-open data-track-location="steps" data-magnetic>${icon('shopping-bag')}Sipariş Oluştur</button></div>
  </div>
</section>`;
}

export const FAQ = [
  ['Teslimat ne kadar sürer?', `TÜYAP ve İFM’ye sipariş onayından itibaren ${DELIVERY.minutes} dakikada standa teslim ederiz. Süre sipariş onayından başlar; ürünün stokta ve fuar girişinin uygun olması gerekir. Fuar günleri için saat aralığı da seçebilirsiniz.`],
  ['Hangi fuar merkezlerine teslimat yapıyorsunuz?', `${VENUES.map((v) => `${v.name} (${v.district})`).join(' ve ')}. Siparişte teslim edilecek standın salon ve stant numarasını yazmanız yeterlidir; kendi standınız da olabilir, müşterinizin veya iş ortağınızın standı da.`],
  ['Fiyatlara teslimat dahil mi?', 'TÜYAP ve İFM’ye standa teslimat fiyata dahildir.'],
  ['Ödemeyi nasıl yapıyorum?', 'Sitede online ödeme alınmaz. Sipariş özetiniz WhatsApp’a iletilir; ödeme yöntemi ve onay aynı yazışmada netleşir.'],
  ['Kurumsal fatura kesiyor musunuz?', 'Evet. Firma ünvanı, vergi dairesi ve vergi numaranızı sipariş sırasında veya WhatsApp’tan paylaştığınızda kurumsal e-Fatura düzenleriz.'],
  ['Şeride ne yazabilirim?', 'Firma adınızı ve kısa bir mesajı (ör. “İyi Fuarlar”, “Hayırlı Olsun”) yazabilirsiniz. Türkçe karakterler doğru basılır; yazıyı sipariş sırasında şerit önizlemesinde görürsünüz.'],
  ['Teslim edildiğini nasıl bileceğim?', 'Teslimattan sonra ürünün standdaki fotoğrafını WhatsApp’tan gönderiyoruz.'],
];

function faq() {
  return `
<section class="section faq" id="sss" aria-labelledby="sss-baslik">
  <div class="wrap faq__grid">
    <div class="section-head">
      <p class="eyebrow">Sık sorulan sorular</p>
      <h2 id="sss-baslik" data-split>Sipariş vermeden <em>önce.</em></h2>
      <p class="section-head__lead">Cevabını bulamadığınız bir soru mu var? WhatsApp’tan yazın, hemen yanıtlayalım.</p>
      <a class="btn btn--wa" href="${waLink('Merhaba, fuar çiçeği siparişi hakkında bir sorum var.')}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-location="faq">${icon('message-circle')}Soru Sorun</a>
    </div>
    <div class="faq__list">
      ${FAQ.map(([q, a]) => `<details class="faq__item"><summary>${esc(q)}${icon('plus', 'icon faq__icon')}</summary><p>${esc(a)}</p></details>`).join('')}
    </div>
  </div>
</section>`;
}

function schema() {
  return graph(
    businessNode(),
    { '@type': 'WebSite', '@id': `${SITE.url}/#site`, url: `${SITE.url}/`, name: SITE.name, inLanguage: 'tr-TR', publisher: { '@id': `${SITE.url}/#isletme` } },
    faqNode(FAQ),
  );
}

export function home(catalog) {
  return page({
    path: '/',
    title: 'Fuar Çiçekçim | TÜYAP ve İFM Fuar Çiçekçisi, Standa Teslim',
    description: `TÜYAP ve İFM fuar standlarına açılış çelengi, şeritli VIP orkide, stant aranjmanı ve saksı bitkisi. ${DELIVERY.promise}, fotoğraflı onay ve kurumsal e-Fatura.`,
    preload: `<link rel="preload" as="image" href="/assets/hero/tuyap-orkide-768.webp" imagesrcset="/assets/hero/tuyap-orkide-768.webp 768w, /assets/hero/tuyap-orkide.webp 1536w" imagesizes="100vw" fetchpriority="high">`,
    jsonld: schema(),
    body: hero()
      + trust() + products(catalog)
      + `<div class="home-fair"><div class="wrap">${nextFair('fuar-baslik')}</div></div>`
      + clients() + corporate() + steps() + faq(),
  });
}
