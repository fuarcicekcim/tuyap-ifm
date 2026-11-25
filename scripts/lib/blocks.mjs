import { DELIVERY, PRICING, CONTACT } from '../../src/config/site-settings.js';
import { esc, icon, trRange } from './html.mjs';
import { renderDiscountRibbon, renderProductPrice } from './price-markup.mjs';
import { waLink } from './layout.mjs';
import { breadcrumbs } from './seo.mjs';
import { awardBadge } from './award-badge.mjs';

export function pageHero({ eyebrow, title, lead, crumbs, image, imageAlt, ctas = true, priceCategory, catalogAnchor, whatsappText }) {
  return `
<section class="phero${image ? ' phero--media' : ''}">
  <div class="wrap phero__grid">
    <div class="phero__copy">
      ${crumbs ? breadcrumbs(crumbs) : ''}
      ${eyebrow ? `<p class="eyebrow"${priceCategory ? ` data-price-category="${esc(priceCategory)}"` : ''}>${esc(eyebrow)}</p>` : ''}
      <h1 data-split>${title}</h1>
      ${lead ? `<p class="phero__lead">${lead}</p>` : ''}
      ${ctas ? `<div class="phero__ctas">
        ${catalogAnchor
          ? `<a class="btn btn--gold" href="#${esc(catalogAnchor)}">${icon('shopping-bag')}Ürünleri Gör</a>`
          : `<button class="btn btn--gold" type="button" data-drawer-open data-track-location="page-hero" data-magnetic>${icon('shopping-bag')}Sipariş Oluştur</button>`}
        <a class="btn btn--ghost-light" href="${waLink(whatsappText)}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-location="page-hero">${icon('message-circle')}WhatsApp</a>
      </div>` : ''}
    </div>
    ${image ? `<figure class="phero__media"><img src="${image}.webp" srcset="${image}-768.webp 768w, ${image}.webp 1536w" sizes="(min-width: 1024px) 38vw, 100vw" width="1536" height="1024" alt="${esc(imageAlt)}" fetchpriority="high" decoding="async"></figure>` : ''}
  </div>
</section>`;
}

// items: [[başlık, html, değiştirici?]] — değiştirici 'wide' ise öğe iki sütunlu düzende (telefon/tablet) tüm satırı kaplar.
export const facts = (items) => `
<section class="facts" aria-label="Özet bilgiler">
  <div class="wrap"><dl class="facts__list">${items.map(([k, v, mod]) => `<div class="facts__item${mod ? ` facts__item--${mod}` : ''}" data-reveal><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl></div>
</section>`;

// sections: [{ id?, title, html }] — html güvenli, betik içinde yazılmış içeriktir.
export const prose = (sections, aside = '') => `
<section class="section prose-wrap">
  <div class="wrap prose-grid">
    <div class="prose">${sections.map((s) => `<section${s.id ? ` id="${s.id}"` : ''}><h2>${s.title}</h2>${s.html}</section>`).join('')}</div>
    ${aside ? `<aside class="prose-aside">${aside}</aside>` : ''}
  </div>
</section>`;

export const orderAside = (title = 'Siparişi şimdi oluşturun') => `
<div class="aside-card">
  <p class="eyebrow">${esc(DELIVERY.promise)}</p>
  <p class="aside-card__title">${esc(title)}</p>
  <ul class="aside-card__list">
    <li>${icon('truck')}Standa teslimat fiyata dahil</li>
    <li>${icon('camera')}Fotoğraflı teslim onayı</li>
    <li>${icon('receipt-text')}Kurumsal e-Fatura</li>
  </ul>
  <button class="btn btn--gold" type="button" data-drawer-open data-track-location="aside">${icon('shopping-bag')}Sipariş Oluştur</button>
  <a class="btn btn--ghost" href="tel:${CONTACT.phoneE164}" data-track="phone_click" data-track-location="aside">${icon('phone')}${esc(CONTACT.phoneDisplay)}</a>
</div>`;

export function cardAdd(p) {
  if (p.inStock === false) return '<span class="stock-note">Stokta yok</span>';
  return `<button class="card__add" type="button" data-add="${p.id}" aria-label="${esc(p.name)} ürününü siparişe ekle">${icon('plus')}<span>Siparişe ekle</span></button>`;
}

export function productStrip(products, { id, title = 'Standa en çok yakışanlar', eyebrow = 'Koleksiyondan', link = '/#urunler', linkText = 'Tüm koleksiyon' } = {}) {
  return `
<section class="section strip"${id ? ` id="${esc(id)}"` : ''}>
  <div class="wrap">
    <div class="strip__head"><div><p class="eyebrow">${esc(eyebrow)}</p><h2 data-split>${title}</h2></div><a class="strip__link" href="${link}">${esc(linkText)} ${icon('arrow-up-right')}</a></div>
    <div class="strip__list">
      ${products.map((p) => `
      <article class="mini">
        <a class="mini__media" href="${p.page}">
          <img src="${p.image}" width="800" height="1200" alt="${esc(p.alt)}" loading="lazy" decoding="async">
          ${p.badgeId === 'best-seller' ? awardBadge({ rank: p.bestsellerRank }) : ''}
          ${renderDiscountRibbon(p)}
        </a>
        <h3 class="mini__title"><a href="${p.page}">${esc(p.name)}</a></h3>
        ${renderProductPrice(p)}
        ${cardAdd(p)}
      </article>`).join('')}
    </div>
  </div>
</section>`;
}

export const faqBlock = (faq, title = 'Sık sorulan <em>sorular.</em>') => `
<section class="section faq" id="sss" aria-label="Sık sorulan sorular">
  <div class="wrap faq__grid">
    <div class="section-head">
      <p class="eyebrow">Sipariş öncesi</p>
      <h2 data-split>${title}</h2>
      <a class="btn btn--wa" href="${waLink('Merhaba, fuar çiçeği siparişi hakkında bir sorum var.')}" target="_blank" rel="noopener" data-track="whatsapp_click" data-track-location="faq">${icon('message-circle')}Soru Sorun</a>
    </div>
    <div class="faq__list">
      ${faq.map(([q, a]) => `<details class="faq__item"><summary>${esc(q)}${icon('plus', 'icon faq__icon')}</summary><p>${esc(a)}</p></details>`).join('')}
    </div>
  </div>
</section>`;

export function fairList(fairs, venues, { limit = 8, title = 'Yaklaşan <em>fuarlar.</em>' } = {}) {
  const vName = (id) => (id === 'both' ? 'TÜYAP & İFM' : venues[id]?.short || id);
  return `
<section class="section fairs">
  <div class="wrap">
    <div class="strip__head"><div><p class="eyebrow">Fuar takvimi</p><h2 data-split>${title}</h2></div><a class="strip__link" href="/fuar-takvimi.html">Tüm takvim ${icon('arrow-up-right')}</a></div>
    <ol class="fairs__list">
      ${fairs.slice(0, limit).map((f) => `
      <li class="fair" data-reveal>
        <p class="fair__date">${trRange([f.start, f.end])}</p>
        <div><h3 class="fair__name">${f.page ? `<a href="${f.page}">${esc(f.name)}</a>` : esc(f.name)}</h3><p class="fair__meta">${esc(vName(f.venue))} · ${esc(f.sector || '')}</p></div>
        <button class="fair__cta" type="button" data-drawer-open data-fair="${esc(f.name)}" data-venue="${esc(vName(f.venue))}" data-track-location="fair-list">Bu fuar için sipariş ${icon('arrow-up-right')}</button>
      </li>`).join('')}
    </ol>
    <p class="fairs__note">Tarihler organizatör duyurularına göre değişebilir; siparişte teyit ederiz.</p>
  </div>
</section>`;
}

export const ctaBand = (title = 'Fuarınız yaklaşıyor mu? <em>Çiçekleri bugün planlayalım.</em>') => `
<section class="closing" aria-label="Sipariş çağrısı">
  <div class="wrap closing__inner">
    <p class="eyebrow">7/24 sipariş hattı · ${esc(DELIVERY.promise)}</p>
    <h2 data-split>${title}</h2>
    <p class="closing__lead">Fuar adı, salon ve stant numarasını yazın; stok, saat ve tutarı WhatsApp’ta birlikte netleştirelim.</p>
    <div class="closing__ctas">
      <button class="btn btn--gold" type="button" data-drawer-open data-track-location="cta-band" data-magnetic>${icon('shopping-bag')}Sipariş Oluştur</button>
      <a class="btn btn--ghost-light" href="tel:${CONTACT.phoneE164}" data-track="phone_click" data-track-location="cta-band">${icon('phone')}${esc(CONTACT.phoneDisplay)}</a>
    </div>
  </div>
</section>`;
