const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#main-nav');
const siteHeader = document.querySelector('.site-header');
const announcement = document.querySelector('.site-announcement');
const compactHeader = window.matchMedia('(max-width: 1160px)');

function updateHeader() {
  siteHeader.classList.toggle('is-scrolled', window.scrollY >= announcement.offsetHeight);
}

updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });
window.addEventListener('resize', updateHeader);

function setMenuOpen(open) {
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
  navigation.classList.toggle('is-open', open);
}

menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  setMenuOpen(open);
  if (open) navigation.querySelector('a').focus();
});

navigation.addEventListener('click', (event) => {
  if (!compactHeader.matches) return;

  const link = event.target.closest('a');
  if (!link) return;

  setMenuOpen(false);
  const section = document.getElementById(link.hash.slice(1));
  if (section) {
    section.tabIndex = -1;
    section.focus({ preventScroll: true });
  }
});

compactHeader.addEventListener('change', () => {
  const focusedInNavigation = navigation.contains(document.activeElement);
  setMenuOpen(false);
  if (compactHeader.matches && focusedInNavigation) menuToggle.focus();
});

document.addEventListener('click', (event) => {
  if (!siteHeader.contains(event.target)) setMenuOpen(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
    setMenuOpen(false);
    menuToggle.focus();
  }
});

const productGrid = document.querySelector('.product-grid');
const products = [...productGrid.querySelectorAll('.product-card')];
const filters = [...document.querySelectorAll('.filter-button')];
const catalogStatus = document.querySelector('#catalog-status');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

for (const product of products) {
  const link = product.querySelector('.buy-button');
  const name = product.querySelector('h3').textContent.trim();
  const price = product.querySelector('.product-amount').textContent.trim().replace(/^₺\s*/, '');
  const tax = product.querySelector('.product-price small').textContent.trim();
  const url = new URL(link.href);
  const template = url.searchParams.get('text');
  const details = template.slice(template.indexOf('\n\n') + 2);
  const message = `Merhaba, Fuar Çiçekçim’den ${name} (${price} TL ${tax}) siparişi vermek istiyorum.`;

  url.searchParams.set('text', `${message}\n\n${details}`);
  link.href = url.href;
  link.setAttribute('aria-label', `Hemen sipariş ver: ${name}, ${price} TL ${tax}`);
}

for (const button of filters) {
  button.addEventListener('click', () => {
    if (button.getAttribute('aria-pressed') === 'true') return;

    for (const filter of filters) {
      const active = filter === button;
      filter.classList.toggle('is-active', active);
      filter.setAttribute('aria-pressed', String(active));
    }

    const category = button.dataset.filter;
    const visible = [];
    for (const product of products) {
      product.classList.remove('is-entering');
      product.hidden = category !== 'all' && product.dataset.category !== category;
      if (!product.hidden) visible.push(product);
    }

    if (!reducedMotion.matches) {
      // Restart the entrance animation even if the next filter shares visible cards.
      void productGrid.offsetWidth;
      for (const product of visible) product.classList.add('is-entering');
    }

    catalogStatus.textContent = `${button.textContent.trim()}: ${visible.length} ürün gösteriliyor.`;
  });
}

productGrid.addEventListener('animationend', (event) => {
  if (event.animationName === 'product-enter') event.target.classList.remove('is-entering');
});
