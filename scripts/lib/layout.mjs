import { SITE, CONTACT, DELIVERY, VENUES, FAIR_DAYS, PRICING, RIBBON } from '../../src/config/site-settings.js';
import { esc, icon, trDay } from './html.mjs';

const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap';

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
      <a class="topbar__msg topbar__call" href="tel:${CONTACT.phoneE164}" data-track="phone_click" data-track-location="topbar"><span class="topbar__call-icon">${icon('phone')}<span class="topbar__live" aria-hidden="true"></span></span><span class="topbar__long">7/24 Telefon Hattımız Açık · <u>${esc(CONTACT.phoneDisplay)}</u></span><span class="topbar__short">7/24 Hat Açık</span></a>
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
      </section>

      <form class="order" id="siparis-formu" data-order-form novalidate>
        <fieldset class="order__set">
          <legend>Teslimat</legend>
          <div class="choices">${venueOpts}</div>
          <label class="field"><span>Fuar adı</span><input name="fuar_adi" autocomplete="off" value="${esc(FAIR_DAYS.activeFairName)}" maxlength="200"></label>
          <div class="field-row">
            <label class="field"><span>Salon no</span><input name="salon" inputmode="text" autocomplete="off" maxlength="20" placeholder="Örn. 5"></label>
            <label class="field"><span>Stant no <b aria-hidden="true">*</b></span><input name="stant" required autocomplete="off" maxlength="40" placeholder="Örn. B12"></label>
          </div>
          <div class="field-row">
            <label class="field"><span>Teslim günü</span><select name="tarih">${dayOpts}<option value="Diğer (nota yazıldı)">Diğer gün (nota yazın)</option></select></label>
            <label class="field"><span>Saat aralığı</span><select name="saat"><option value="En kısa sürede">En kısa sürede (${DELIVERY.minutes} dk)</option>${slotOpts}</select></label>
          </div>
        </fieldset>

        <fieldset class="order__set">
          <legend>Kuşak yazısı</legend>
          <div class="ribbon" aria-hidden="true"><span class="ribbon__tail"></span><span class="ribbon__band"><span class="ribbon__text" data-ribbon-preview>İyi Fuarlar</span></span><span class="ribbon__tail ribbon__tail--end"></span></div>
          <label class="field"><span>Kuşakta yazacak metin</span><input name="kart" maxlength="${RIBBON.maxChars}" autocomplete="off" placeholder="Örn. ATLAS TASARIM · İyi Fuarlar" data-ribbon-input aria-describedby="kusak-sayac"></label>
          <p class="field__hint" id="kusak-sayac"><span data-ribbon-count>0</span>/${RIBBON.maxChars} karakter · Türkçe karakterler doğru basılır</p>
        </fieldset>

        <fieldset class="order__set">
          <legend>İletişim</legend>
          <label class="field"><span>Teslim alacak firma <b aria-hidden="true">*</b></span><input name="firma" required autocomplete="organization" maxlength="120"></label>
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
        <ul>${VENUES.map((v) => `<li><a href="${v.page}">${esc(v.short)} fuar çiçekçisi</a></li>`).join('')}<li><a href="/fuar-cicekcisi.html">Fuar çiçekçisi</a></li><li><a href="/fuar-takvimi.html">Fuar takvimi</a></li><li><a href="/teslimat-sureci.html">Teslimat süreci</a></li></ul>
        <h2 class="footer__h2-gap">Koleksiyon</h2>
        <ul><li><a href="/kategori/acilis-fuar-celengi.html">Açılış &amp; fuar çelengi</a></li><li><a href="/kategori/vip-orkide.html">VIP orkide</a></li><li><a href="/kategori/stant-aranjmani.html">Stant aranjmanı</a></li><li><a href="/kategori/saksi-bitkisi.html">Saksı bitkisi</a></li></ul>
      </div>
      <div>
        <h2>Kurumsal</h2>
        <ul><li><a href="/fuar-paketleri.html">Fuar paketleri</a></li><li><a href="/hizmetler.html">Hizmetler</a></li><li><a href="/teklif.html">Kurumsal teklif</a></li><li><a href="/hakkimizda.html">Hakkımızda</a></li><li><a href="/sss.html">Sık sorulan sorular</a></li><li><a href="/blog/">Rehberler</a></li><li><a href="/blog/fuar-cicegi-fiyatlari-2026.html">Fiyat rehberi</a></li><li><a href="/iletisim.html">İletişim</a></li><li><a href="/kvkk.html">KVKK aydınlatma metni</a></li></ul>
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

let catalogJson = '[]';
export function setCatalogData(products) {
  catalogJson = JSON.stringify(products.map(({ id, name, price, image, categoryName }) => ({ id, name, price, image, cat: categoryName }))).replace(/</g, '\\u003c');
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
${drawer()}
<script type="application/json" id="catalog-data">${catalogJson}</script>
</body>
</html>
`;
}
