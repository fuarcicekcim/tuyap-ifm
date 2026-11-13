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
const filters = [...document.querySelectorAll('.filter-button')];
const catalogStatus = document.querySelector('#catalog-status');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const cardTemplate = productGrid.querySelector('.product-card').cloneNode(true);
const factoryCategories = window.FuarStore.defaults().categories;
let selectedCategory = 'all';
let catalog = window.FuarStore.read();

function applyCategory(animate = false) {
  let count = 0;
  for (const product of productGrid.querySelectorAll('.product-card')) {
    product.classList.remove('is-entering');
    product.hidden = selectedCategory !== 'all' && product.dataset.category !== selectedCategory;
    if (!product.hidden) count += 1;
  }
  if (animate && !reducedMotion.matches) {
    void productGrid.offsetWidth;
    for (const product of productGrid.querySelectorAll('.product-card:not([hidden])')) product.classList.add('is-entering');
  }
  for (const filter of filters) {
    const active = filter.dataset.filter === selectedCategory;
    filter.classList.toggle('is-active', active);
    filter.setAttribute('aria-pressed', String(active));
  }
  document.querySelector('#catalog-empty').hidden = count !== 0;
  catalogStatus.textContent = `${count} ürün gösteriliyor.`;
}

function syncSettings() {
  const settings = catalog.settings;
  for (const link of document.querySelectorAll('a[href^="https://wa.me/"]')) {
    const url = new URL(link.href);
    url.pathname = `/${settings.whatsapp}`;
    link.href = url.href;
  }
  const number = settings.whatsapp.replace(/^90(\d{3})(\d{3})(\d{4})$/, '+90 $1 $2 $3');
  for (const link of document.querySelectorAll('a[href^="tel:"]')) {
    link.href = `tel:+${settings.whatsapp}`;
    const label = link.querySelector('.announcement-phone-number');
    if (label) label.textContent = number;
    else if (!link.querySelector('svg')) link.textContent = number;
  }
  document.querySelector('[data-announcement-text]').textContent = settings.announcement;
  document.querySelector('[data-vat-summary]').textContent = `Ürün kartlarında belirtilen fiyatlara %${settings.vat} KDV eklenir. Aktif fuar bölgelerine standa teslimat ürün fiyatına dahildir. Şirket bilgilerinizi paylaştığınızda kurumsal e-Fatura düzenleriz.`;
  const regionNames = [settings.regions.tuyap && 'TÜYAP', settings.regions.ifm && 'İFM'].filter(Boolean);
  const delivery = regionNames.length ? `${regionNames.join(' ve ')} teslimatı dahil` : 'Teslimatı WhatsApp’tan planlayalım';
  for (const line of productGrid.querySelectorAll('.product-assurance')) line.textContent = delivery;
  const destination = settings.regions.ifm ? `${settings.regions.tuyap ? 'TÜYAP ve ' : ''}İFM’ye` : settings.regions.tuyap ? 'TÜYAP’a' : 'Fuar standınıza';
  document.querySelector('.hero h1').firstChild.textContent = destination;
  const deliveryAnnouncement = document.querySelector('.announcement-delivery');
  deliveryAnnouncement.textContent = regionNames.length ? `⚡ ${destination} 90 Dakikada Standa Teslimat` : 'Teslimatı birlikte planlayalım';
  const venueNavigation = document.querySelector('.nav-venue');
  const venueIcon = venueNavigation.querySelector('svg');
  venueNavigation.replaceChildren(venueIcon, document.createTextNode(` ${regionNames.join(' & ') || 'Teslimat'}`));
  document.querySelector('.trust-item:first-child strong').textContent = regionNames.length ? '90 dakikada standa teslimat' : 'Teslimatı birlikte planlayalım';
  document.querySelector('.trust-item:first-child small').textContent = regionNames.length ? `${regionNames.join(' ve ')} · Sipariş onayıyla` : 'WhatsApp üzerinden iletişim';
  for (const element of document.querySelectorAll('[data-region]')) element.hidden = !settings.regions[element.dataset.region];
  document.querySelector('#teslimat .section-index').textContent = regionNames.join(' & ') || 'FUAR TESLİMATI';
  document.querySelector('.delivery-note').textContent = regionNames.length ? `${destination} 90 dakikada standa teslimat, ürünün stokta ve fuar girişinin uygun olduğu siparişlerde geçerlidir. Süre sipariş onayından başlar. Teslimat fotoğrafını WhatsApp’tan paylaşırız.` : 'Fuar ve stant bilgilerinizi paylaşın, teslimat seçeneklerini birlikte planlayalım.';
  document.querySelector('.proof-card strong').textContent = `${regionNames.length} aktif fuar merkezi`;
  document.querySelector('.proof-card span').textContent = regionNames.length ? `${regionNames.join(' ve ')} stantlarına teslimat` : 'Teslimat için bizimle iletişime geçin';
  document.querySelector('.footer-contact span').textContent = `7/24 açık${regionNames.length ? ` · ${regionNames.join(' & ')}` : ''}`;
  document.querySelector('.contact > p:not(.contact-hours)').textContent = 'Fuar etkinliğinizi ve ihtiyaçlarınızı anlatın, size uygun çiçek çözümlerini birlikte planlayalım.';
  document.querySelector('[data-delivery-summary]').textContent = `Fuar Çiçekçim 7/24 açıktır. ${regionNames.length ? `Stok ve fuar girişi uygunsa ${destination} sipariş onayından itibaren 90 dakikada teslimat yaparız.` : 'Teslimat seçenekleri için bizimle iletişime geçebilirsiniz.'} Teslimat aralığını sipariş sırasında teyit ederiz.`;
  updateHeader();
}

function renderCatalog(nextCatalog) {
  catalog = nextCatalog;
  const fragment = document.createDocumentFragment();
  for (const [index, product] of catalog.products.filter(product => product.active).entries()) {
    const card = cardTemplate.cloneNode(true);
    card.dataset.category = product.category;
    card.dataset.productId = product.id;
    const photo = card.querySelector('.product-photo');
    photo.classList.toggle('product-photo--cover', product.cover);
    const image = photo.querySelector('img');
    image.src = window.FuarStore.assetUrl(product.image);
    image.alt = product.alt || product.name;
    image.loading = index < 3 ? 'eager' : 'lazy';
    const badge = card.querySelector('.product-badge');
    const badgeName = catalog.badges.find(badge => badge.id === product.badge)?.name;
    if (badgeName) badge.replaceChildren(document.createTextNode(badgeName));
    else badge.remove();
    const category = catalog.categories.find(category => category.id === product.category);
    const factoryName = factoryCategories.find(category => category.id === product.category)?.name;
    card.querySelector('.product-type').textContent = product.label && category.name === factoryName ? product.label : category.name.toLocaleUpperCase('tr-TR');
    card.querySelector('h3').textContent = product.name;
    card.querySelector('.product-amount').textContent = window.FuarStore.formatPrice(product.price);
    card.querySelector('.product-price small').textContent = `+ %${catalog.settings.vat} KDV`;
    const link = card.querySelector('.buy-button');
    link.href = window.FuarStore.orderUrl(product, catalog);
    link.setAttribute('aria-label', `Hemen sipariş ver: ${product.name}, ${window.FuarStore.formatPrice(product.price)} + %${catalog.settings.vat} KDV`);
    fragment.append(card);
  }
  productGrid.replaceChildren(fragment);
  for (const filter of filters) {
    const category = catalog.categories.find(category => category.id === filter.dataset.filter);
    if (category) filter.textContent = category.name;
  }
  syncSettings();
  applyCategory();
}

renderCatalog(catalog);
window.FuarStore.subscribe(renderCatalog);
window.addEventListener('pageshow', () => renderCatalog(window.FuarStore.read()));

for (const button of filters) {
  button.addEventListener('click', () => {
    if (button.dataset.filter === selectedCategory) return;
    selectedCategory = button.dataset.filter;
    applyCategory(true);
  });
}

productGrid.addEventListener('animationend', (event) => {
  if (event.animationName === 'product-enter') event.target.classList.remove('is-entering');
});
