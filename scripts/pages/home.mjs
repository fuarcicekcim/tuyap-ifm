import { SITE, DELIVERY, PRICING, FAIR_DAYS, CONTACT, VENUES } from '../../src/config/site-settings.js';
import { PACKAGES } from '../../src/config/packages.js';
import { esc, icon, trRange, tlPrice } from '../lib/html.mjs';
import { card, thumb } from './products.mjs';
import { graph, businessNode, faqNode } from '../lib/seo.mjs';
import { page, waLink } from '../lib/layout.mjs';
import { CATEGORIES } from '../lib/catalog.mjs';

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
        <button class="btn btn--gold" type="button" data-drawer-open data-track-location="hero" data-magnetic>${icon('shopping-bag')}Sipariş Oluştur</button>
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


function packages(catalog) {
  const byId = new Map(catalog.products.map((p) => [p.id, p]));
  const cards = PACKAGES.map((pkg) => {
    const items = pkg.items.map(([id, qty]) => {
      const p = byId.get(id);
      if (!p) throw new Error(`Paket "${pkg.id}": "${id}" ürünü products-data.js'te yok veya pasif.`);
      return { p, qty };
    });
    const net = items.reduce((s, { p, qty }) => s + p.price * qty, 0);
    const gross = Math.round(net * (100 + PRICING.vatRate)) / 100;
    const count = items.reduce((n, { qty }) => n + qty, 0);
    const ids = items.map(({ p, qty }) => `${p.id}:${qty}`).join(',');
    return `
<article class="pkg${pkg.recommended ? ' pkg--rec' : ''}" data-reveal>
  ${pkg.recommended ? '<p class="pkg__flag">Önerimiz</p>' : ''}
  <div class="pkg__media" aria-hidden="true">
    ${items.slice(0, 3).map(({ p }) => `<img src="${thumb(p.image)}" width="400" height="600" alt="" loading="lazy" decoding="async">`).join('')}
  </div>
  <div class="pkg__body">
    <p class="pkg__count">${count} ürün · tek kurulum</p>
    <h3 class="pkg__title">${esc(pkg.name)}</h3>
    <p class="pkg__fit">${esc(pkg.fit)}</p>
    <p class="pkg__lead">${esc(pkg.lead)}</p>
    <ul class="pkg__items">
      ${items.map(({ p, qty }) => `<li><a href="${p.page}">${qty > 1 ? `${qty} × ` : ''}${esc(p.name)}</a><span data-price-id="${p.id}">${tlPrice(p.price)}</span></li>`).join('')}
    </ul>
    <div class="pkg__price">
      <p><strong data-pkg-sum="${ids}">${tlPrice(net)}</strong><span>+ %${PRICING.vatRate} KDV</span></p>
      <p class="pkg__gross">KDV dahil <span data-pkg-gross="${ids}">${tlPrice(gross)}</span> · standa teslimat dahil</p>
    </div>
    <button class="btn${pkg.recommended ? ' btn--gold' : ''} pkg__add" type="button" data-pkg="${ids}" data-pkg-name="${esc(pkg.name)}" data-track-location="packages">${icon('shopping-bag')}<span>Paketi ekle</span></button>
  </div>
</article>`;
  });
  return `
<section class="section packages" id="paketler" aria-labelledby="paket-baslik">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">Fuar paketleri</p>
      <h2 id="paket-baslik" data-split>Standınız için <em>hazır düzenler.</em></h2>
      <p class="section-head__lead">Her paket, katalogdaki ürünlerin bir araya getirilmiş hâlidir; paket fiyatı içindeki ürünlerin toplamıdır. Ürünler standınıza bir kez kurulur. Paketi ekledikten sonra sipariş çekmecesinde ürün çıkarabilir veya adet değiştirebilirsiniz.</p>
    </div>
    <div class="pkg-grid">${cards.join('')}</div>
    <p class="packages__note">Size özel bir düzen mi gerekiyor? <a href="/teklif.html" data-track="corporate_quote_click" data-track-location="packages">Kurumsal teklif isteyin</a> veya ürünleri tek tek seçin.</p>
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
    preload: `<link rel="preload" as="image" href="/assets/hero/tuyap-orkide-768.webp" imagesrcset="/assets/hero/tuyap-orkide-768.webp 768w, /assets/hero/tuyap-orkide.webp 1536w" imagesizes="(min-width: 1024px) 40vw, 100vw" fetchpriority="high">`,
    jsonld: schema(),
    body: hero() + trust() + packages(catalog) + products(catalog) + corporate() + steps() + faq() + closing(),
  });
}
