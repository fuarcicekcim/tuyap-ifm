import { SITE, DELIVERY, PRICING, FAIR_DAYS, CONTACT, VENUES } from '../../src/config/site-settings.js';
import { esc, icon, trRange } from '../lib/html.mjs';
import { card } from './products.mjs';
import { graph, businessNode, faqNode } from '../lib/seo.mjs';
import { page, waLink } from '../lib/layout.mjs';
import { CATEGORIES } from '../lib/catalog.mjs';

// Hero sahneleri: tam ekran, sırayla değişen stant görselleri. İlk sahne LCP görselidir.
const SCENES = [
  { img: '/assets/hero/tuyap-orkide', pos: '58% 40%', no: '01', title: 'Kuşaklı VIP orkide', where: 'Karşılama bankosu · TÜYAP',
    alt: 'TÜYAP’ta bir fuar standının karşılama bankosunda firma adlı kuşaklı beyaz orkide ve pastel aranjman' },
  { img: '/assets/hero/ifm-ferforje', pos: '56% 35%', no: '02', title: 'Ayaklı ferforje', where: 'Açılış tebriği · İFM',
    alt: 'İFM’de bir standın girişinde firma adlı kuşaklı ayaklı ferforje çiçek aranjmanı' },
  { img: '/assets/hero/tuyap-saksi', pos: '48% 45%', no: '03', title: 'Hediye paketli bitkiler', where: 'Stant yeşillendirme · TÜYAP',
    alt: 'TÜYAP’ta bir standda firma adlı kuşakla hediye paketlenmiş kauçuk ve kırmızı antoryum' },
];

function hero() {
  const venue = VENUES.find((v) => v.id === FAIR_DAYS.activeFairVenue);
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
      <p class="eyebrow hero__eyebrow">7/24 sipariş · TÜYAP &amp; İFM fuar çiçekçisi</p>
      <h1 id="hero-baslik" data-split>TÜYAP ve İFM’de standınıza <em>${DELIVERY.minutes} dakikada</em> çiçek.</h1>
      <p class="hero__lead">Kuşaklı VIP orkide, açılış çelengi ve stant bitkileri; firmanızın adıyla hazırlanır, salon ve stant numaranıza teslim edilir, fotoğrafla onaylanır.</p>
      <div class="hero__ctas">
        <button class="btn btn--gold btn--lg" type="button" data-drawer-open data-track-location="hero" data-magnetic>${icon('shopping-bag')}Sipariş Oluştur</button>
        <a class="btn btn--ghost-light btn--lg" href="${waLink()}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-location="hero" data-magnetic>${icon('message-circle')}WhatsApp’tan Yazın</a>
      </div>
      <p class="hero__eta" aria-live="off">
        <span class="hero__live" aria-hidden="true"></span>
        <span>Şimdi onaylarsanız standınızda</span>
        <strong>≈ <time data-eta>--:--</time></strong>
        <span class="hero__eta-fair">· ${esc(FAIR_DAYS.activeFairName)}, ${trRange(FAIR_DAYS.days)} · ${esc(venue.short)}</span>
      </p>
      <p class="hero__note">${esc(DELIVERY.condition)} ${esc(PRICING.deliveryIncluded)}</p>
    </div>
  </div>

  <div class="wrap hero__rail" role="group" aria-label="Sahneler">
    ${SCENES.map((s, i) => `<button class="hero__chapter${i === 0 ? ' is-active' : ''}" type="button" data-goto="${i}" aria-pressed="${i === 0}">
      <span class="hero__chapter-bar"><i></i></span>
      <span class="hero__chapter-no">${s.no}</span>
      <span class="hero__chapter-text"><strong>${esc(s.title)}</strong><small>${esc(s.where)}</small></span>
    </button>`).join('')}
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


function products(catalog) {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, catalog.products.filter((p) => p.category === c.id).length]));
  const tabs = [['all', 'Tümü', catalog.products.length], ...CATEGORIES.map((c) => [c.id, c.name, counts[c.id]])];
  return `
<section class="section products" id="urunler" aria-labelledby="urunler-baslik">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">Koleksiyon · ${catalog.products.length} ürün</p>
      <h2 id="urunler-baslik" data-split>Fuarda fark edilen <em>çiçekler.</em></h2>
      <p class="section-head__lead">Fiyatlar KDV hariçtir; %${PRICING.vatRate} KDV eklenir. ${esc(PRICING.deliveryIncluded)} Birden fazla ürünü tek siparişte birleştirebilirsiniz.</p>
    </div>
    <div class="filters" role="tablist" aria-label="Kategoriye göre filtrele">
      ${tabs.map(([id, name, n], i) => `<button class="filters__tab" type="button" role="tab" aria-selected="${i === 0}" data-filter="${id}">${esc(name)}<span>${n}</span></button>`).join('')}
    </div>
    <div class="grid" data-grid>
      ${catalog.products.map(card).join('')}
    </div>
    <div class="grid-more"><button class="btn btn--ghost" type="button" data-more hidden>Daha fazla göster</button></div>
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
      <p>Bayilerinize, iş ortaklarınıza veya kendi standlarınıza aynı anda çiçek gönderecekseniz ürünleri sepete ekleyin; her teslimatın salon, stant ve kuşak yazısını WhatsApp yazışmasında birlikte netleştirelim. Tüm siparişler için tek kurumsal e-Fatura düzenlenir.</p>
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
    ['Ürünü ve kuşak yazısını seçin', 'Çelenk, orkide veya aranjmanı sepete ekleyin. Firma adınızı ve mesajınızı yazın; kuşak önizlemesini anında görün.'],
    ['WhatsApp’ta onaylayın', `Sipariş özetiniz WhatsApp’a düzenli bir mesaj olarak düşer. Stok ve teslim saatini teyit eder, ödemeyi aynı yazışmada netleştiririz.`],
    ['Standınıza teslim edelim', `Onaydan itibaren ${DELIVERY.minutes} dakikada salon ve stant numaranıza teslim ederiz. Teslimat fotoğrafı WhatsApp’tan size iletilir.`],
  ];
  return `
<section class="section section--dark steps" id="nasil-calisir" aria-labelledby="adim-baslik">
  <div class="wrap">
    <div class="section-head section-head--dark">
      <p class="eyebrow">Nasıl çalışıyoruz</p>
      <h2 id="adim-baslik" data-split>Üç adımda <em>standınızda.</em></h2>
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
  ['Hangi fuar merkezlerine teslimat yapıyorsunuz?', `${VENUES.map((v) => `${v.name} (${v.district})`).join(' ve ')}. Siparişte salon ve stant numaranızı yazmanız yeterlidir.`],
  ['Fiyatlara KDV ve teslimat dahil mi?', `Ürün fiyatları KDV hariçtir; %${PRICING.vatRate} KDV eklenir. TÜYAP ve İFM’ye standa teslimat fiyata dahildir. Sipariş çekmecesinde KDV hariç ve KDV dahil toplamı birlikte görürsünüz.`],
  ['Ödemeyi nasıl yapıyorum?', 'Sitede online ödeme alınmaz. Sipariş özetiniz WhatsApp’a iletilir; ödeme yöntemi ve onay aynı yazışmada netleşir.'],
  ['Kurumsal fatura kesiyor musunuz?', 'Evet. Firma ünvanı, vergi dairesi ve vergi numaranızı sipariş sırasında veya WhatsApp’tan paylaştığınızda kurumsal e-Fatura düzenleriz.'],
  ['Kuşağa ne yazabilirim?', 'Firma adınızı ve kısa bir mesajı (ör. “İyi Fuarlar”, “Hayırlı Olsun”) yazabilirsiniz. Türkçe karakterler doğru basılır; yazıyı sipariş sırasında kuşak önizlemesinde görürsünüz.'],
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

function closing() {
  return `
<section class="closing" aria-labelledby="kapanis-baslik">
  <div class="wrap closing__inner">
    <p class="eyebrow">${esc(FAIR_DAYS.activeFairName)} · ${trRange(FAIR_DAYS.days)} · ${esc(VENUES.find((v) => v.id === FAIR_DAYS.activeFairVenue).short)}</p>
    <h2 id="kapanis-baslik" data-split>Fuar sabahı standınız <em>hazır olsun.</em></h2>
    <p class="closing__lead">Siparişinizi şimdi oluşturun; ${esc(DELIVERY.promise)}, fotoğraflı onayla.</p>
    <div class="closing__ctas">
      <button class="btn btn--gold" type="button" data-drawer-open data-track-location="closing" data-magnetic>${icon('shopping-bag')}Sipariş Oluştur</button>
      <a class="btn btn--ghost-light" href="tel:${CONTACT.phoneE164}" data-track="phone_click" data-track-location="closing" data-magnetic>${icon('phone')}${esc(CONTACT.phoneDisplay)}</a>
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
    description: `TÜYAP ve İFM fuar standlarına açılış çelengi, kuşaklı VIP orkide, stant aranjmanı ve saksı bitkisi. ${DELIVERY.promise}, fotoğraflı teslim onayı ve kurumsal e-Fatura.`,
    preload: `<link rel="preload" as="image" href="/assets/hero/tuyap-orkide-768.webp" imagesrcset="/assets/hero/tuyap-orkide-768.webp 768w, /assets/hero/tuyap-orkide.webp 1536w" imagesizes="100vw" fetchpriority="high">`,
    jsonld: schema(),
    body: hero() + trust() + products(catalog) + corporate() + steps() + faq() + closing(),
  });
}
