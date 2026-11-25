import { esc } from './html.mjs';
import '../../catalog-pricing.js';

const campaignDates = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});

// İndirimi olmayan ürünlerde de gizli bir iskelet çizilir: canlı katalog katmanı (src/js/live-catalog.js)
// sonradan indirim tanımlarsa metni doldurup görünür yapar. İndirimli ürünlerin çıktısı değişmez.
export function renderDiscountRibbon(product) {
  const percentage = product.discount ? globalThis.FuarPricing.percent(product.discount) : 0;
  const hidden = product.activeDiscount && percentage > 0 ? '' : ' hidden';
  return `<span class="discount-ribbon" data-price-discount-percent="${esc(product.id)}" aria-hidden="true"${hidden}><span>${product.discount ? `%${percentage} indirim` : ''}</span></span>`;
}

export function renderProductPrice(product, { detailed = false } = {}) {
  const pricing = globalThis.FuarPricing;
  const discount = product.discount;
  const active = Boolean(product.activeDiscount);
  const hidden = active ? '' : ' hidden';
  const id = esc(product.id);
  const current = `<strong class="product-price__current" data-price-id="${id}">${esc(pricing.format(product.price))}</strong>`;
  const previous = discount
    ? `<del class="product-price__previous" data-price-previous aria-label="İndirim öncesi fiyat ${esc(pricing.format(discount.previousPrice))}"${hidden}>${esc(pricing.format(discount.previousPrice))}</del>`
    : '<del class="product-price__previous" data-price-previous hidden></del>';
  const percentage = discount ? pricing.percent(discount) : 0;
  const badge = `<span class="${detailed ? 'product-price__badge' : 'sr-only'}" data-price-discount-percent="${id}"${discount && active && percentage > 0 ? '' : ' hidden'}>${discount ? `%${percentage} indirim` : ''}</span>`;
  const cartDiscount = product.cartDiscount;
  const cartHidden = pricing.resolveCartDiscount(cartDiscount) ? '' : ' hidden';
  const cartBadge = cartDiscount ? `<span class="product-price__cart-badge" data-cart-campaign data-cart-campaign-product="${id}"${cartHidden}>${active ? 'Sepette ek %5' : 'Sepette %5'}</span>` : '';
  const className = detailed ? 'pdp__price product-price' : 'card__price product-price product-price--compact';

  let contents;
  if (detailed) {
    const sharedPeriod = discount && cartDiscount && discount.startsOn === cartDiscount.startsOn
      && discount.endsOn === cartDiscount.endsOn;
    const conditions = `
      <span class="product-price__saving" data-price-saving${hidden}>${discount ? `${esc(pricing.format(pricing.saving(discount)))} avantaj` : ''}</span>`;
    const cartPeriod = cartDiscount && !sharedPeriod ? `<span class="product-price__cart-period" data-cart-campaign${cartHidden}>Sepet indirimi ${esc(campaignDates.formatRange(new Date(cartDiscount.startsOn), new Date(cartDiscount.endsOn)))}</span>` : '';
    contents = `${previous}${badge}${cartBadge}
      <span class="product-price__line">${current}</span>
      ${conditions}${cartPeriod}`;
  } else {
    contents = `<span class="product-price__line">${current}${previous}</span>${badge}${cartBadge}`;
  }

  return `<div class="${className}" data-product-price="${id}" data-discount-active="${active}">${contents}</div>`;
}
