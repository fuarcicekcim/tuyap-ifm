const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#main-nav');

function setMenuOpen(open) {
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
  navigation.classList.toggle('is-open', open);
}

menuToggle.addEventListener('click', () => {
  setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
});

navigation.addEventListener('click', (event) => {
  if (event.target.closest('a')) setMenuOpen(false);
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
const catalogUrl = document.querySelector('link[rel="canonical"]').href;

for (const product of products) {
  const link = product.querySelector('.buy-button');
  const name = product.querySelector('h3').textContent.trim();
  const price = product.querySelector('.product-amount').textContent.trim().replace(/^₺\s*/, '');
  const tax = product.querySelector('.product-price small').textContent.trim();
  const photo = new URL(product.querySelector('.product-photo img').getAttribute('src'), catalogUrl);
  const url = new URL(link.href);
  const template = url.searchParams.get('text');
  const fields = template.split('\n\n')[1];
  const message = `Merhaba, Fuar Çiçekçim’den ${name} (${price} TL ${tax}) siparişi vermek istiyorum.`;

  url.searchParams.set('text', `${message}\n\n${fields}\n\nÜrün fotoğrafı: ${photo.href}`);
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
