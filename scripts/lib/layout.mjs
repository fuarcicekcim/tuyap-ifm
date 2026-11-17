import { SITE, CONTACT, DELIVERY, VENUES, FAIR_DAYS, PRICING, RIBBON } from '../../src/config/site-settings.js';
import { esc, icon, trDay } from './html.mjs';
import { INTRO_BOOT, INTRO_CRITICAL_CSS } from './intro-boot.mjs';
import { BRAND_PATHS } from './brand-icons.mjs';

const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400;1,500&family=Playfair+Display:ital,wght@0,500;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap';

export const waLink = (text = 'Merhaba, fuar standına çiçek siparişi vermek istiyorum.') =>
  `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text)}`;

const NAV = [
  ['/fuar-paketleri.html', 'Fuar Paketleri'],
  ['/#urunler', 'Ürünler'],
  ['/#kurumsal', 'Kurumsal'],
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
    <p class="topbar__msgs">
      <a class="topbar__msg topbar__call" href="tel:${CONTACT.phoneE164}" data-track="phone_click" data-track-location="topbar"><span class="topbar__call-icon"><img class="topbar__phone3d" src="/assets/icons/telefon-3d.webp" width="76" height="72" alt="" decoding="async"></span><span class="topbar__long"><b class="topbar__247">7/24</b> · <u>${esc(CONTACT.phoneDisplay)}</u></span><span class="topbar__short"><b class="topbar__247">7/24</b> Arayın</span></a>
      <span class="topbar__msg"><img class="topbar__bolt" src="/assets/icons/simsek-3d.webp" width="36" height="64" alt="" decoding="async"><span class="topbar__long">TÜYAP ve İFM’ye <strong>${DELIVERY.minutes} Dakikada</strong> Standa Teslimat</span><span class="topbar__short">TÜYAP &amp; İFM’ye <strong>${DELIVERY.minutes} dk’da</strong> teslimat</span></span>
    </p>
    <span class="topbar__extra">
      <span>${icon('receipt-text')}Kurumsal e-Fatura</span>
    </span>
  </div>
</div>
<header class="header">
  <div class="wrap">
    <a class="brand" href="/" aria-label="${esc(SITE.name)} ana sayfa">
      <img class="brand__logo" src="/assets/brand/logo-yatay-360.webp" srcset="/assets/brand/logo-yatay-360.webp 360w, /assets/brand/logo-yatay-540.webp 540w" sizes="(min-width: 1024px) 225px, 192px" width="720" height="240" alt="${esc(SITE.name)}" decoding="async" fetchpriority="high">
    </a>
    <nav class="nav" aria-label="Ana menü">
      <ul>${NAV.map(([href, label]) => `<li><a href="${href}">${esc(label)}</a></li>`).join('')}</ul>
    </nav>
    <div class="header__actions">
      <a class="shiny header__wa" href="${waLink()}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-location="header"><span><img class="wa3d" src="/assets/icons/whatsapp-3d.webp" width="96" height="96" alt="" decoding="async">WhatsApp</span></a>
      <button class="cart-btn" type="button" data-drawer-open aria-label="Sipariş sepetini aç">${icon('shopping-bag')}<span class="cart-btn__label">Sepet</span><span class="cart-btn__count" data-cart-count data-count="0">0</span></button>
    </div>
  </div>
</header>`;
}

function dock() {
  return `
<div class="dock" role="region" aria-label="Hızlı sipariş">
  <a class="btn btn--ghost-light" href="tel:${CONTACT.phoneE164}" data-track="phone_click" data-track-location="dock">${icon('phone')}Ara</a>
  <a class="btn btn--wa" href="${waLink()}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-location="dock"><img class="wa3d wa3d--dock" src="/assets/icons/whatsapp-3d.webp" width="96" height="96" alt="" decoding="async">WhatsApp’la Sipariş</a>
</div>`;
}

// Sağ alttaki yüzen iletişim kümesi: WhatsApp (asıl kanal, en altta ve biraz büyük), Instagram, Haritalar.
// Haritalar bağlantısı (CONTACT.maps) boşsa o düğme hiç çizilmez; uydurma adres/bağlantı konmaz.
// Mobilde WhatsApp zaten alt çubukta ("WhatsApp'la Sipariş") olduğundan küme yalnızca diğerlerini gösterir (CSS).
// Düğmeler yalnızca simgedir: erişilebilir ad aria-label'dadır, yandaki etiket süs ve ipucudur (aria-hidden).
function fab() {
  const glyph = (path, extra = '') => `<svg class="fab__glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${extra}<path d="${path}"/></svg>`;
  const igGradient = '<defs><linearGradient id="fab-ig" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#833ab4"/><stop offset=".55" stop-color="#e1306c"/><stop offset="1" stop-color="#f56040"/></linearGradient></defs>';
  // Yukarıdan aşağıya sıra: Haritalar, Instagram, WhatsApp. i = beliriş sırası (alttan yukarı).
  const items = [
    CONTACT.maps && { id: 'maps', href: CONTACT.maps, label: 'Haritalar’da bulun', track: 'maps_click', svg: glyph(BRAND_PATHS.googlemaps) },
    CONTACT.instagram && { id: 'ig', href: CONTACT.instagram, label: 'Instagram’da takip edin', track: 'instagram_click', svg: glyph(BRAND_PATHS.instagram, igGradient) },
    { id: 'wa', href: waLink(), label: 'WhatsApp’tan yazın', track: 'whatsapp_click', svg: glyph(BRAND_PATHS.whatsapp) },
  ].filter(Boolean);
  return `
<nav class="fab" data-fab aria-label="Hızlı iletişim">
  <ul class="fab__list">${items.map((it, n) => `
    <li class="fab__item fab__item--${it.id}" style="--i:${items.length - 1 - n}">
      <a class="fab__btn" href="${esc(it.href)}" target="_blank" rel="noopener" aria-label="${esc(it.label)}" data-track="${it.track}" data-track-location="fab">${it.svg}<span class="fab__tip" aria-hidden="true">${esc(it.label)}</span></a>
    </li>`).join('')}
  </ul>
</nav>`;
}

function drawer() {
  const venueOpts = VENUES.map((v) => `
      <label class="choice"><input type="radio" name="merkez" value="${esc(v.short)}" required${v.id === FAIR_DAYS.activeFairVenue ? ' checked' : ''}><span><strong>${esc(v.short)}</strong><small>${esc(v.name.replace(/ \(İFM\)$/, ''))}</small></span></label>`).join('');
  const dayOpts = FAIR_DAYS.days.map((d) => `<option value="${esc(trDay(d))}">${esc(trDay(d))}</option>`).join('');
  const slotOpts = FAIR_DAYS.timeSlots.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
  return `
<div class="drawer-root" data-drawer inert>
  <div class="drawer__scrim" data-drawer-close></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-baslik">
    <header class="drawer__head">
      <div><p class="eyebrow">${esc(DELIVERY.promise)}</p><h2 id="drawer-baslik">Siparişiniz</h2></div>
      <button class="drawer__close" type="button" data-drawer-close aria-label="Sipariş çekmecesini kapat">${icon('x')}</button>
    </header>
    <div class="drawer__scroll">
      <section class="drawer__cart" aria-label="Sepetteki ürünler">
        <ul class="cart-list" data-cart-list></ul>
        <p class="cart-empty" data-cart-empty>Henüz ürün eklemediniz. <a href="/#urunler" data-drawer-close>Koleksiyona göz atın</a> ya da istediğiniz ürünü aşağıdaki not alanına yazın.</p>
        <div data-general-ship></div>
      </section>

      <form class="order" id="siparis-formu" data-order-form novalidate>
        <fieldset class="order__set">
          <legend>Fuar ve teslim zamanı</legend>
          <p class="field__hint order__lead">Tüm ürünler için geçerlidir. Stant, teslim alacak firma ve şerit yazısını yukarıda her ürünün altına yazın.</p>
          <div class="choices">${venueOpts}</div>
          <label class="field"><span>Fuar adı</span><input name="fuar_adi" autocomplete="off" value="${esc(FAIR_DAYS.activeFairName)}" maxlength="200"></label>
          <div class="field-row">
            <label class="field"><span>Teslim günü</span><select name="tarih">${dayOpts}<option value="Diğer (nota yazıldı)">Diğer gün (nota yazın)</option></select></label>
            <label class="field"><span>Saat aralığı</span><select name="saat"><option value="En kısa sürede">En kısa sürede (${DELIVERY.minutes} dk)</option>${slotOpts}</select></label>
          </div>
        </fieldset>

        <fieldset class="order__set">
          <legend>Sipariş veren</legend>
          <label class="field"><span>Firma adı <b aria-hidden="true">*</b></span><input name="firma" required autocomplete="organization" maxlength="120"></label>
          <label class="field"><span>Yetkili ad soyad <b aria-hidden="true">*</b></span><input name="adsoyad" required autocomplete="name" maxlength="120"></label>
          <label class="field"><span>Telefon <b aria-hidden="true">*</b></span><input name="telefon" type="tel" required inputmode="tel" autocomplete="tel" maxlength="20" placeholder="05XX XXX XX XX"></label>
          <label class="field"><span>E-posta</span><input name="eposta" type="email" inputmode="email" autocomplete="email" maxlength="120"></label>
          <details class="invoice">
            <summary>${icon('receipt-text')}Kurumsal fatura bilgisi <small>(isteğe bağlı)</small></summary>
            <label class="field"><span>Firma ünvanı</span><input name="fatura_unvan" autocomplete="organization" maxlength="160"></label>
            <div class="field-row">
              <label class="field"><span>Vergi dairesi</span><input name="vergi_dairesi" maxlength="60"></label>
              <label class="field"><span>Vergi / TC no</span><input name="vergi_no" inputmode="numeric" maxlength="11"></label>
            </div>
          </details>
          <label class="field"><span>Not</span><textarea name="not" rows="3" maxlength="800" placeholder="Katalog dışı ürün, birden fazla stant veya gün, özel istekler…"></textarea></label>
          <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        </fieldset>

        <label class="consent"><input type="checkbox" name="kvkk" required><span><a href="/kvkk.html" target="_blank" rel="noopener">KVKK aydınlatma metnini</a> okudum; sipariş için iletişim bilgilerimin işlenmesini kabul ediyorum.</span></label>
        <p class="order__status" role="status" aria-live="polite" data-order-status></p>
      </form>
    </div>
    <footer class="drawer__foot">
      <dl class="totals">
        <div><dt>Ara toplam <small>(KDV hariç)</small></dt><dd data-total-net>0 TL</dd></div>
        <div><dt>KDV %${PRICING.vatRate}</dt><dd data-total-vat>0 TL</dd></div>
        <div class="totals__grand"><dt>Toplam <small>(KDV dahil)</small></dt><dd data-total-gross>0 TL</dd></div>
      </dl>
      <button class="btn btn--wa drawer__submit" type="submit" form="siparis-formu" data-order-submit>${icon('message-circle')}WhatsApp’ta Siparişi Gönder</button>
      <p class="drawer__note">${icon('shield-check')}${esc(PRICING.paymentNote)} Teslimat fiyata dahildir.</p>
    </footer>
  </aside>
</div>`;
}

// Alt bilgi: üstte TÜYAP (sol) ve İFM (sağ) fotoğrafları ortada yumuşak geçişle birleşir;
// içerik, fotoğrafların alt kenarına binen buzlu cam bir panelde okunaklı durur.
function footer() {
  const year = new Date().getFullYear();
  const col = (title, links) => `<div class="footer__col"><h2>${title}</h2><ul>${links.map(([href, text]) => `<li><a href="${href}">${text}</a></li>`).join('')}</ul></div>`;
  const tuyap = VENUES.find((v) => v.id === 'tuyap');
  const ifm = VENUES.find((v) => v.id === 'ifm');
  // Adres (NAP): Google profilindeki yazımla aynı; Haritalar bağlantısı varsa dokununca Haritalar'da açılır. Sokak boşsa hiç çizilmez.
  const addrRow = (tag, attrs) => `<${tag} class="footer__address-row"${attrs}>${icon('map-pin')}<span>${esc(SITE.addressLine)}</span></${tag}>`;
  const address = SITE.address.street
    ? `<address class="footer__address">${CONTACT.maps ? addrRow('a', ` href="${esc(CONTACT.maps)}" target="_blank" rel="noopener" data-track="maps_click" data-track-location="footer"`) : addrRow('span', '')}</address>`
    : '';
  return `
<footer class="footer" data-footer>
  <div class="footer__scene">
    <figure class="footer__venue footer__venue--tuyap">
      <img data-depth="-70" src="/assets/footer/tuyap-1600.webp" srcset="/assets/footer/tuyap-900.webp 900w, /assets/footer/tuyap-1600.webp 1600w" sizes="50vw" width="1600" height="800" alt="TÜYAP Fuar ve Kongre Merkezi binası, Büyükçekmece" loading="lazy" decoding="async">
    </figure>
    <figure class="footer__venue footer__venue--ifm">
      <img data-depth="-70" src="/assets/footer/ifm-1280.webp" srcset="/assets/footer/ifm-800.webp 800w, /assets/footer/ifm-1280.webp 1280w" sizes="50vw" width="1280" height="720" alt="İstanbul Fuar Merkezi (İFM) girişi, Yeşilköy" loading="lazy" decoding="async">
    </figure>
    <div class="wrap footer__tags">
      <a class="footer__tag-venue" href="${tuyap.page}">${icon('map-pin')}<span><strong>${esc(tuyap.short)}</strong>${esc(tuyap.district)}</span></a>
      <a class="footer__tag-venue" href="${ifm.page}">${icon('map-pin')}<span><strong>${esc(ifm.short)}</strong>${esc(ifm.district)}</span></a>
    </div>
  </div>

  <div class="wrap">
    <div class="footer__panel">
      <div class="footer__top">
        <div class="footer__intro">
          <p class="footer__brand">Fuar <em>Çiçekçim</em></p>
          <p class="footer__tag">TÜYAP ve İstanbul Fuar Merkezi’ndeki standlara çelenk, orkide, aranjman ve saksı bitkisi. ${esc(DELIVERY.promise)}.</p>
        </div>
        <nav class="footer__cols" aria-label="Alt menü">
          ${col('Fuar merkezleri', [...VENUES.map((v) => [v.page, `${esc(v.short)} fuar çiçekçisi`]), ['/fuar-cicekcisi.html', 'Fuar çiçekçisi'], ['/fuar-takvimi.html', 'Fuar takvimi'], ['/teslimat-sureci.html', 'Teslimat süreci']])}
          ${col('Koleksiyon', [['/kategori/ferforje-aranjman.html', 'Ferforje aranjman'], ['/kategori/stant-aranjmani.html', 'Aranjmanlar'], ['/kategori/saksi-bitkisi.html', 'Saksı bitkileri'], ['/kategori/vip-orkide.html', 'Orkideler'], ['/kategori/acilis-fuar-celengi.html', 'Fuar çelengi'], ['/fuar-paketleri.html', 'Fuar paketleri']])}
          ${col('Kurumsal', [['/hizmetler.html', 'Hizmetler'], ['/teklif.html', 'Kurumsal teklif'], ['/hakkimizda.html', 'Hakkımızda'], ['/sss.html', 'Sık sorulan sorular'], ['/blog/', 'Rehberler'], ['/blog/fuar-cicegi-fiyatlari-2026.html', 'Fiyat rehberi'], ['/iletisim.html', 'İletişim']])}
        </nav>
        <div class="footer__contact">
          <h2>İletişim · 7/24</h2>
          <a class="footer__phone" href="tel:${CONTACT.phoneE164}" data-track="phone_click" data-track-location="footer">${icon('phone')}${esc(CONTACT.phoneDisplay)}</a>
          ${address}
          <ul class="footer__social">
            <li><a href="${waLink()}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-location="footer">WhatsApp</a></li>
            <li><a href="${CONTACT.instagram}" target="_blank" rel="noopener">Instagram</a></li>
            <li><a href="mailto:${CONTACT.email}">E-posta</a></li>
          </ul>
        </div>
      </div>
      <div class="footer__legal">
        <span>© ${year} ${esc(SITE.name)} · ${esc(SITE.address.district)}, ${esc(SITE.address.city)}</span>
        <span class="footer__legal-links"><a href="/kvkk.html">KVKK aydınlatma metni</a><a href="/teslimat-sureci.html">Teslimat koşulları</a></span>
      </div>
    </div>
  </div>
</footer>`;
}

let catalogJson = '[]';
export function setCatalogData(products) {
  catalogJson = JSON.stringify(products.map(({ id, name, price, image, categoryName }) => ({ id, name, price, image, cat: categoryName }))).replace(/</g, '\\u003c');
}

// Açılış (preloader): "Çift kapı". Görünüm: src/styles/intro.css, davranış: src/js/intro.js,
// karar ve ilk boyama CSS'i: scripts/lib/intro-boot.mjs.
// Aynı sahne iki kapının her birinde yarım görünür (kapılar açılırken amblem ve yazı ikiye bölünür);
// bu yüzden sahne iki kez yazılır ve JS ikisini birlikte günceller. Ekran okuyucu için yalnızca
// canlı bölge ve "Atla" düğmesi açıktır; süs olan kapılar aria-hidden'dır.
function introStage() {
  return `
    <div class="intro__stage">
      <div class="intro__medal">
        <svg class="intro__ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle class="intro__track" cx="50" cy="50" r="49.5"/><circle class="intro__arc" cx="50" cy="50" r="49.5" pathLength="100"/><circle class="intro__spin" cx="50" cy="50" r="49.5" pathLength="100"/></svg>
        <span class="intro__plate"><img class="intro__crest intro__crest--ghost" src="/assets/brand/crest-320.webp" width="320" height="289" alt="" decoding="async" loading="lazy"><img class="intro__crest" src="/assets/brand/crest-320.webp" width="320" height="289" alt="" decoding="async" loading="lazy"></span>
      </div>
      <p class="intro__word"><span class="intro__line"><span>Fuar <em>Çiçekçim</em></span></span></p>
      <p class="intro__count"><span data-intro-count>0</span><i>%</i></p>
    </div>`;
}

function intro() {
  const venues = VENUES.map((v) => v.short).join(' · ');
  return `
<div class="intro" data-intro>
  <p class="sr-only" role="status" data-intro-live></p>
  <div class="intro__panel intro__panel--l" aria-hidden="true">${introStage()}
    <p class="intro__foot intro__foot--l">${esc(venues)}</p>
  </div>
  <div class="intro__panel intro__panel--r" aria-hidden="true">${introStage()}
    <p class="intro__foot intro__foot--r">${esc(DELIVERY.promise)}</p>
  </div>
  <button class="intro__skip" type="button" data-intro-skip hidden aria-label="Açılış animasyonunu atla">Atla</button>
</div>`;
}

export function page({ path, title, description, body, jsonld = '', preload = '', robots = 'index, follow', ogImage = '/assets/og/fuar-cicekcim-og.jpg' }) {
  const canonical = SITE.url + path;
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<script>${INTRO_BOOT}</script>
<style>${INTRO_CRITICAL_CSS}</style>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#173628">
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
${intro()}
${header()}
<main id="icerik">
${body}
</main>
${footer()}
${dock()}
${fab()}
${drawer()}
<script type="application/json" id="catalog-data">${catalogJson}</script>
</body>
</html>
`;
}
