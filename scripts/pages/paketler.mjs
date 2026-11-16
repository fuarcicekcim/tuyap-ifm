import { DELIVERY, PRICING } from '../../src/config/site-settings.js';
import { PACKAGES } from '../../src/config/packages.js';
import { esc, icon, tlPrice } from '../lib/html.mjs';
import { page } from '../lib/layout.mjs';
import { graph, businessNode, breadcrumbNode, faqNode } from '../lib/seo.mjs';
import { pageHero, faqBlock, ctaBand } from '../lib/blocks.mjs';
import { thumb } from './products.mjs';

export const PACKAGES_PATH = '/fuar-paketleri.html';

// Paket fiyatı = içindeki ürünlerin products-data.js'teki güncel fiyat toplamı (kullanıcı kararı 2026-11-16).
function resolve(pkg, byId) {
  const items = pkg.items.map(([id, qty]) => {
    const p = byId.get(id);
    if (!p) throw new Error(`Paket "${pkg.id}": "${id}" ürünü products-data.js'te yok veya pasif.`);
    return { p, qty };
  });
  const net = items.reduce((s, { p, qty }) => s + p.price * qty, 0);
  return {
    items,
    net,
    gross: Math.round(net * (100 + PRICING.vatRate)) / 100,
    count: items.reduce((n, { qty }) => n + qty, 0),
    ids: items.map(({ p, qty }) => `${p.id}:${qty}`).join(','),
  };
}

function pkgCard(pkg, byId) {
  const { items, net, gross, count, ids } = resolve(pkg, byId);
  return `
<article class="pkg${pkg.recommended ? ' pkg--rec' : ''}" id="${pkg.id}" data-reveal>
  ${pkg.recommended ? '<p class="pkg__flag">Önerimiz</p>' : ''}
  <div class="pkg__media" aria-hidden="true">
    ${items.slice(0, 3).map(({ p }, i) => `<img src="${thumb(p.image)}" width="400" height="600" alt="" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async">`).join('')}
  </div>
  <div class="pkg__body">
    <p class="pkg__count">${count} ürün · tek kurulum</p>
    <h2 class="pkg__title">${esc(pkg.name)}</h2>
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
}

export const PACKAGE_FAQ = [
  ['Paket fiyatı nasıl belirleniyor?', 'Paket fiyatı, içindeki ürünlerin katalogdaki fiyatlarının toplamıdır. Ürünleri tek tek seçseniz de aynı tutarı ödersiniz; paket, standınıza uygun ürünleri tek tıkla bir araya getirir.'],
  ['Paketteki ürünleri değiştirebilir miyim?', 'Evet. Paketi ekledikten sonra sipariş çekmecesinde ürün çıkarabilir, adet değiştirebilir veya koleksiyondan başka ürün ekleyebilirsiniz.'],
  ['Ürünler fuar boyunca yenileniyor mu?', 'Hayır. Paketteki ürünler standınıza bir kez kurulur. Fuar süresince solan çiçek değişimi istiyorsanız WhatsApp’tan yazın.'],
  ['Fiyata KDV ve teslimat dahil mi?', `Fiyatlar KDV hariçtir; %${PRICING.vatRate} KDV eklenir. TÜYAP ve İFM’de standa teslimat fiyata dahildir. Her kartta KDV dahil tutarı da görürsünüz.`],
  ['Kuşağa firma adımız yazılıyor mu?', 'Evet. Kuşak yazısını sipariş sırasında yazarsınız; çekmecede anında önizlemesini görürsünüz.'],
  ['Birden fazla stand için paket alabilir miyim?', 'Evet. Aynı paketi birden fazla kez ekleyip her teslimatın salon ve stant bilgisini WhatsApp’ta netleştirebilir veya kurumsal teklif isteyebilirsiniz.'],
];

export function paketler(catalog) {
  const byId = new Map(catalog.products.map((p) => [p.id, p]));
  const crumbs = [['Ana sayfa', '/'], ['Fuar paketleri', PACKAGES_PATH]];
  const body = pageHero({
    eyebrow: 'Fuar paketleri',
    title: 'Standınız için <em>hazır düzenler.</em>',
    lead: `Karşılama bankosundan ada standa, iş ortağı tebriğinden VIP alana kadar ${PACKAGES.length} hazır paket. Paket fiyatı içindeki ürünlerin toplamıdır; ürünler standınıza bir kez kurulur ve ${DELIVERY.minutes} dakikada standa teslim edilir.`,
    crumbs,
    image: '/assets/hero/tuyap-saksi',
    imageAlt: 'TÜYAP’ta bir standda firma adlı kuşakla hediye paketlenmiş kauçuk ve kırmızı antoryum',
  }) + `
<section class="section packages" aria-label="Paketler">
  <div class="wrap">
    <div class="pkg-grid">${PACKAGES.map((pkg) => pkgCard(pkg, byId)).join('')}</div>
    <p class="packages__note">Size özel bir düzen mi gerekiyor? <a href="/teklif.html" data-track="corporate_quote_click" data-track-location="packages">Kurumsal teklif isteyin</a> veya <a href="/#urunler">ürünleri tek tek seçin</a>.</p>
  </div>
</section>` + faqBlock(PACKAGE_FAQ, 'Paketler hakkında <em>sorular.</em>') + ctaBand();

  return page({
    path: PACKAGES_PATH,
    title: 'Fuar Paketleri | Stant Çiçek Paketleri | Fuar Çiçekçim',
    description: `TÜYAP ve İFM standları için hazır fuar çiçek paketleri: karşılama, stant, prestij ve açılış tebrik paketi. Fiyatlar ürün toplamı, ${DELIVERY.promise}.`,
    jsonld: graph(businessNode(), breadcrumbNode(crumbs), faqNode(PACKAGE_FAQ)),
    body,
  });
}
