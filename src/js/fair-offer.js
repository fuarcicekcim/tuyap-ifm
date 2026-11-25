import { FAIR_DAYS } from '../config/site-settings.js';

export function initFairOffer(products) {
  const offer = document.querySelector('[data-fair-offer]');
  const hero = document.querySelector('[data-hero]');
  if (!hero || !offer || location.hash) return;

  const pricing = globalThis.FuarPricing;
  const cartCampaign = JSON.parse(document.getElementById('cart-discount-data')?.textContent || 'null');
  if (!cartCampaign) return;
  const available = [...products.values()].filter(product => product.inStock !== false);
  if (!available.length || !available.every(({ basePrice, discount }) =>
    basePrice > 0 && discount?.previousPrice === basePrice
    && discount.price === pricing.discountedPrice(basePrice, 15))) return;

  function campaignActive() {
    const date = pricing.today();
    return FAIR_DAYS.days.includes(date) && pricing.resolveCartDiscount(cartCampaign, date)
      && available.every(({ discount }) => discount.startsOn <= date && date <= discount.endsOn);
  }

  const sessionKey = `fc-fair-offer:v2:${FAIR_DAYS.activeFairPage}:${cartCampaign.startsOn}:${cartCampaign.endsOn}`;
  try { if (sessionStorage.getItem(sessionKey)) return; } catch { /* Özel gezinmede tek sayfa gösterimi. */ }

  const html = document.documentElement;
  const blocked = () => ['intro-on', 'intro-leaving', 'menu-locked', 'drawer-locked']
    .some(state => html.classList.contains(state));
  let previousY = window.scrollY;
  const onScroll = () => {
    const down = window.scrollY > previousY;
    previousY = window.scrollY;
    if (!down || location.hash || hero.getBoundingClientRect().bottom > 0 || blocked()
      || html.dataset.catalogRelease === 'mismatch' || !campaignActive()) return;

    offer.hidden = false;
    window.removeEventListener('scroll', onScroll);
    try { sessionStorage.setItem(sessionKey, '1'); } catch { /* Bu sayfada tekrar açılmaz. */ }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  const close = () => {
    const restoreFocus = offer.contains(document.activeElement);
    offer.hidden = true;
    if (restoreFocus) document.querySelector('#urunler [data-filter]')?.focus({ preventScroll: true });
  };

  offer.querySelector('[data-fair-offer-close]').addEventListener('click', close);
  offer.querySelector('[data-fair-offer-catalog]').addEventListener('click', close);
  offer.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
  });
}

