import { SITE, DELIVERY, PRICING, VENUES } from '../../src/config/site-settings.js';
import { esc, icon, tlPrice } from '../lib/html.mjs';
import { renderDiscountRibbon, renderProductPrice } from '../lib/price-markup.mjs';
import { page, waLink } from '../lib/layout.mjs';
import { graph, businessNode, breadcrumbNode, faqNode, breadcrumbs, abs } from '../lib/seo.mjs';
import { cardAdd, productStrip, faqBlock, ctaBand, pageHero } from '../lib/blocks.mjs';
import { CATEGORIES, categoryDisplayOrder } from '../lib/catalog.mjs';
import { awardBadge } from '../lib/award-badge.mjs';

const M = DELIVERY.minutes;

// Kategoriye özgü, doğrulanmış bilgilere dayanan metinler.
export const CATEGORY_COPY = {
  wreaths: {
    title: 'Fuar <em>çelengi.</em>',
    lead: 'Stant önünde ilk bakışta görülen tebrik. Tek ve çift katlı çelenkler; firma adınız ve mesajınız şeritte.',
    use: 'Açılış günü stant girişine, iş ortaklarınızın standına tebrik veya lansman alanına',
    body: '<p>Fuar çelengi, standın önünde ziyaretçinin ilk gördüğü tebriktir. Bu yüzden şerit yazısı kısa, firma adı net olmalıdır. Şeride firma logonuzu bastırabilir, mesajı Türkçe, İngilizce veya iki dilli yazdırabilirsiniz.</p><p>Çelenkleri kurulum gününde ya da açılış sabahı standa yerleştiriyoruz; fuar sırasında verilen siparişlerde süre onaydan itibaren ' + M + ' dakikadır.</p>',
    faq: [
      ['Çelenk şeridine ne yazılır?', 'En yaygın kullanım “Başarılı bir fuar dileriz — Firma Adı” biçimindedir. Şeride firma logonuz da basılabilir.'],
      ['Çelengi ne zaman teslim etmelisiniz?', 'Açılış kurdelesine yetişmesi için kurulum günü veya açılış sabahı teslimatı öneririz.'],
    ],
  },
  orchids: {
    title: '<em>Orkideler.</em>',
    lead: 'Karşılama bankosu ve iş ortağı tebrikleri için çok dallı orkideler. Şeritli, kartlı, firma adınızla.',
    use: 'Karşılama bankosuna, yönetici tebriklerine ve VIP alanlara',
    body: '<p>Orkide, fuar salonunun kuru havasında ve suni ışığında birkaç gün boyunca formunu koruyan en uygun tebrik çiçeklerindendir. Dal sayısı arttıkça görünürlük de artar: iki dallı orkide standart bir tebrik, altı ve sekiz dallı orkideler ise yönetim düzeyinde veya ada standlarda tercih edilir.</p><p>Şeride logonuzu bastırabilir, yazıyı Türkçe, İngilizce veya iki dilli hazırlatabilirsiniz.</p>',
    faq: [
      ['Orkide fuar boyunca dayanır mı?', 'Orkideler fuar koşullarında birkaç gün formunu korur. Fuar süresince solan çiçek olursa değiştiriyoruz.'],
      ['Orkideye logo basılabilir mi?', 'Evet. Logonuzu WhatsApp’tan gönderin; saten şeride logonuz ve mesajınız basılır.'],
    ],
  },
  ferforje: {
    title: 'Ferforje <em>aranjman.</em>',
    lead: 'Stant girişinde uzaktan görülen ayaklı ferforje aranjmanlar; firma adınız ve mesajınız şeritte.',
    use: 'Açılış günü stant girişine, iş ortaklarınızın standına tebrik veya lansman alanına',
    body: '<p>Ayaklı ferforje aranjmanlar, standın girişinde göz hizasında durduğu için kalabalık fuar koridorlarında bile fark edilir. Şeride firma logonuzu bastırabilir, mesajı Türkçe, İngilizce veya iki dilli yazdırabilirsiniz.</p><p>Ferforjeleri kurulum gününde ya da açılış sabahı standa yerleştiriyoruz; fuar sırasında verilen siparişlerde süre onaydan itibaren ' + M + ' dakikadır.</p>',
    faq: [
      ['Ferforje şeridine ne yazılır?', 'En yaygın kullanım “Başarılı bir fuar dileriz — Firma Adı” biçimindedir. Şeride firma logonuz da basılabilir.'],
      ['Ferforje ne zaman teslim edilmeli?', 'Açılış kurdelesine yetişmesi için kurulum günü veya açılış sabahı teslimatı öneririz.'],
    ],
  },
  arrangements: {
    title: '<em>Aranjmanlar.</em>',
    lead: 'Toplantı masaları ve karşılama alanı için orkide, lilyum, gül ve gerbera aranjmanları.',
    use: 'Toplantı masalarına, karşılama alanına ve fuar içi kokteyllere',
    body: '<p>Stant aranjmanları, standın içinde misafirleri karşılayan çiçeklerdir; kendi standınız için ya da iş ortağınıza tebrik olarak gönderilebilir. Kesme çiçekli aranjmanlar açılış günü için idealdir; uzun fuarlarda solan çiçekleri fuar süresince değiştiriyoruz.</p><p>Fuar içi lansman, kokteyl veya sahne çiçeklendirmesi için <a href="/teklif.html">kurumsal teklif</a> isteyebilirsiniz.</p>',
    faq: [
      ['Aranjman stant renklerime uygun hazırlanabilir mi?', 'Renk tercihinizi sipariş notuna veya WhatsApp’a yazın; içerik ve renkleri siparişte birlikte teyit ederiz.'],
      ['Kesme çiçekler kaç gün dayanır?', 'Açılış günü için idealdir; fuar boyunca solan çiçekleri değiştiriyoruz.'],
    ],
  },
  plants: {
    title: 'Saksı <em>bitkileri.</em>',
    lead: 'Boş köşeleri, görüşme alanlarını ve geçişleri yeşillendiren hediye paketli saksı bitkileri. Fuar süresince kiralama seçeneğiyle.',
    use: 'Stant köşelerine, görüşme alanlarına ve geçişlere',
    body: '<p>Saksı bitkileri standa hacim ve yeşillik katar; klimalı salon koşullarına iyi uyum sağlayan türleri seçiyoruz. Bitkileri satın alabilir veya fuar süresince kiralayabilirsiniz; kiralama fiyatı için WhatsApp’tan yazın.</p><p>Hediye paketli saksı bitkileri iş ortaklarına tebrik olarak da gönderilebilir; şeride firma adınız yazılır.</p>',
    faq: [
      ['Saksı bitkisi kiralayabilir miyim?', 'Evet. Fuar süresince kiralama seçeneğimiz var; adet ve fuar tarihlerini yazın, fiyat verelim.'],
      ['Bitkiler hediye paketli mi geliyor?', 'Evet. Saksı bitkileri hediye paketli ve şeritli hazırlanır.'],
    ],
  },
};

export const thumb = (img, w = 400) => img.replace(/\.(?:webp|png|jpe?g|gif|avif)$/i, `-${w}.webp`);
const fuarImg = (p) => p.fuarImage;

export function card(p, i = 9) {
  return `
<article class="card${i === 0 ? ' card--feature' : ''}" data-product-id="${p.id}" data-cat="${p.category}"${p.vip ? ' data-vip' : ''}${p.badgeId === 'best-seller' ? ` data-best="${p.bestsellerRank ?? 50}"` : ''}${p.inStock === false ? ' data-oos' : ''}>
  <a class="card__media" href="${p.page}" tabindex="-1" aria-hidden="true">
    <img src="${thumb(p.image)}" srcset="${thumb(p.image)} 400w, ${p.image} 800w" sizes="(min-width: 1024px) ${i === 0 ? '46vw' : '22vw'}, (min-width: 768px) 30vw, 46vw" width="800" height="1200" alt="${esc(p.alt)}" loading="${i < 4 ? 'eager' : 'lazy'}" decoding="async">
    ${p.badgeId === 'best-seller' ? awardBadge({ rank: p.bestsellerRank }) : p.badge ? `<span class="card__badge">${esc(p.badge)}</span>` : ''}
    ${renderDiscountRibbon(p)}
  </a>
  <div class="card__body">
    <h3 class="card__title"><a href="${p.page}">${esc(p.name)}</a></h3>
    ${renderProductPrice(p)}
    ${cardAdd(p)}
  </div>
</article>`;
}

function tier(price) {
  if (price >= 7000) return 'Ada standlar, VIP alanlar ve yönetim düzeyindeki tebrikler için gösterişli bir seçim.';
  if (price >= 3000) return 'Karşılama bankosu ve iş ortağı tebrikleri için dengeli bir seçim.';
  return 'Masalar, köşeler ve birden fazla standa toplu gönderimler için ekonomik bir seçim.';
}

export function productPage(p, catalog) {
  const cat = CATEGORIES.find((c) => c.id === p.category);
  const copy = CATEGORY_COPY[p.category];
  const related = catalog.products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
  const crumbs = [['Ana sayfa', '/'], [cat.name, `/kategori/${cat.slug}.html`], [p.name, p.page]];
  const long = `${p.name} | ${cat.name} | Fuar Çiçekçim`;
  const title = long.length <= 62 ? long : `${p.name} | Fuar Çiçekçim`;
  const description = `${p.discount ? `${p.name}.` : `${p.name}: ${tlPrice(p.price)}.`} TÜYAP ve İFM’de standa teslimat dahil, ${DELIVERY.promise}. Şeritte firma adı ve logo, e-Fatura.`;
  const shareImg = p.shareImage || p.image;
  const available = p.active !== false && p.inStock !== false;
  const whatsappUrl = waLink(!available
    ? `Merhaba, ${p.name} ürününün yeniden satışa açılması hakkında bilgi almak istiyorum.`
    : `Merhaba, ${p.name} (${tlPrice(p.price)}) için fuar standına sipariş vermek istiyorum.`);
  const productNode = {
    '@type': 'Product',
    '@id': `${abs(p.page)}#urun`,
    name: p.name,
    image: [abs(p.image), ...(fuarImg(p) ? [abs(fuarImg(p))] : [])],
    description: `${p.name} (${cat.name}). ${tier(p.basePrice)} TÜYAP ve İFM’de standa teslim.`,
    category: cat.name,
    sku: p.id,
    brand: { '@type': 'Brand', name: SITE.name },
    offers: {
      '@type': 'Offer',
      url: abs(p.page),
      priceCurrency: 'TRY',
      price: p.price.toFixed(2),
      ...(p.activeDiscount ? { priceValidUntil: p.activeDiscount.endsOn } : {}),
      priceSpecification: { '@type': 'UnitPriceSpecification', price: p.price.toFixed(2), priceCurrency: 'TRY' },
      availability: !available ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${SITE.url}/#isletme` },
      areaServed: VENUES.map((v) => v.name),
    },
  };
  const body = `
<section class="pdp">
  <div class="wrap pdp__grid">
    <div class="pdp__gallery">
      <figure class="pdp__main"><img src="${p.image}" width="800" height="1200" alt="${esc(p.alt)}" fetchpriority="high" decoding="async"></figure>
      ${fuarImg(p) ? `<figure class="pdp__alt"><img src="${thumb(fuarImg(p), 600)}" srcset="${thumb(fuarImg(p), 600)} 600w, ${fuarImg(p)} 1000w" sizes="(min-width: 1024px) 25vw, 50vw" width="1000" height="1500" alt="${esc(p.name)} örnek firma şeridiyle temsili fuar standı görünümü" loading="lazy" decoding="async"><figcaption>Temsili fuar görünümü · Şeritteki firma adı örnektir</figcaption></figure>` : ''}
    </div>
    <div class="pdp__info">
      ${breadcrumbs(crumbs)}
      ${p.badgeId === 'best-seller' ? `<div class="pdp__award">${awardBadge({ size: 'lg', rank: p.bestsellerRank })}</div>` : ''}
      <p class="eyebrow">${esc(cat.name)}</p>
      <h1>${esc(p.name)}</h1>
      ${renderProductPrice(p, { detailed: true })}
      <p class="pdp__lead">${esc(tier(p.basePrice))} ${esc(copy.use)} uygundur.</p>
      <div class="pdp__ctas">
        <button class="btn btn--gold" type="button" data-add="${p.id}" data-open-drawer data-magnetic${available ? '' : ' hidden'}>${icon('shopping-bag')}<span>Siparişe ekle</span></button>${available ? '' : `<p class="stock-note" data-stock-note>${p.active === false ? 'Bu ürün şu anda satışa kapalı.' : 'Stokta yok'}</p>`}
        <a class="btn btn--wa" href="${esc(whatsappUrl)}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-location="product" data-price-whatsapp="${p.id}">${icon('message-circle')}WhatsApp’tan sor</a>
      </div>
      <ul class="pdp__values">
        <li>${icon('truck')}<span><strong>${esc(DELIVERY.promise)}</strong> TÜYAP ve İFM’de salon ve stant numarasına</span></li>
        <li>${icon('type')}<span><strong>Şeritte firma adınız</strong> logo baskısı; Türkçe, İngilizce veya iki dilli</span></li>
        <li>${icon('camera')}<span><strong>Fotoğraflı teslim onayı</strong> WhatsApp’tan iletilir</span></li>
        <li>${icon('receipt-text')}<span><strong>Kurumsal e-Fatura</strong> havale/EFT, kredi kartı veya teslimatta nakit</span></li>
      </ul>
      <p class="pdp__note">Boy, kap ve çiçek içeriği siparişte teyit edilir. ${esc(DELIVERY.condition)}</p>
      <div class="pdp__about"><h2>Bu ürün hakkında</h2>${copy.body}</div>
    </div>
  </div>
</section>`
    + (related.length ? productStrip(related, { eyebrow: cat.name, title: 'Benzer <em>ürünler.</em>', link: `/kategori/${cat.slug}.html`, linkText: `Tüm ${cat.name} ürünleri` }) : '')
    + ctaBand();
  return page({
    path: p.page, title, description, ogImage: shareImg,
    productOrder: available ? { id: p.id, whatsappUrl } : undefined,
    preload: `<link rel="preload" as="image" href="${p.image}" fetchpriority="high">`,
    jsonld: graph(productNode, breadcrumbNode(crumbs)),
    body,
  });
}

export function categoryPage(cat, catalog) {
  const copy = CATEGORY_COPY[cat.id];
  const items = categoryDisplayOrder(catalog.products.filter((p) => p.category === cat.id));
  const path = `/kategori/${cat.slug}.html`;
  const crumbs = [['Ana sayfa', '/'], [cat.name, path]];
  const available = items.filter(p => p.inStock !== false);
  const startingPrice = available.length ? tlPrice(Math.min(...available.map(p => p.price))) : '';
  const priceSummary = startingPrice ? `${items.length} ürün · ${startingPrice}’den başlayan fiyatlar` : 'Bu kategoride şu anda satışa açık ürün yok';
  const hasDiscount = items.some((p) => p.discount);
  const body = pageHero({ crumbs, eyebrow: priceSummary, title: copy.title, lead: copy.lead, priceCategory: hasDiscount ? cat.id : undefined })
    + `
<section class="section products">
  <div class="wrap">
    <h2 class="sr-only">${esc(cat.name)} modelleri ve fiyatları</h2>
    <div class="grid" data-grid="static">${items.map((p, i) => card(p, i + 1)).join('')}</div>
    ${items.length ? '' : '<p role="status">Bu kategorideki ürünler şu anda satışa kapalı. Alternatifler için bizimle iletişime geçebilirsiniz.</p>'}
    <div class="prose cat-prose">${copy.body}<p>${esc(PRICING.deliveryIncluded)}</p></div>
  </div>
</section>`
    + faqBlock(copy.faq)
    + ctaBand();
  return page({
    path,
    title: `${cat.name} Fiyatları | TÜYAP & İFM | Fuar Çiçekçim`,
    description: startingPrice ? `${cat.name}: ${items.length} model${hasDiscount ? '' : `, ${startingPrice}’den başlayan fiyatlar`}. TÜYAP ve İFM’de standa teslimat dahil, ${DELIVERY.promise}, şeride firma adı ve logo.` : `${cat.name}: şu anda satışa açık ürün yok. Alternatifler için Fuar Çiçekçim ile iletişime geçebilirsiniz.`,
    jsonld: graph(
      businessNode(),
      breadcrumbNode(crumbs),
      { '@type': 'CollectionPage', url: abs(path), name: cat.name, mainEntity: { '@type': 'ItemList', itemListElement: items.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(p.page), name: p.name })) } },
      faqNode(copy.faq),
    ),
    body,
  });
}
