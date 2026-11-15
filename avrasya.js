(() => {
  'use strict';

  const store = window.FuarStore;
  if (!store) return;

  const form = document.querySelector('#event-order-form');
  const productSelect = form.elements.product;
  const orderLink = document.querySelector('#event-whatsapp');
  const status = document.querySelector('#event-order-status');
  const cards = [...document.querySelectorAll('[data-product-id]')];
  let catalog = store.read();

  function availableProducts() {
    return catalog.products.filter(product => product.active && product.id !== 'cenaze-celengi');
  }

  function field(name, fallback) {
    return form.elements[name].value.trim() || fallback;
  }

  function updateMessage() {
    const product = availableProducts().find(item => item.id === productSelect.value);
    const productLabel = product
      ? `${product.name} (${store.formatPrice(product.price)} + %${catalog.settings.vat} KDV)`
      : productSelect.value === 'consult' ? 'Ürün seçimi için destek istiyorum' : '[Ürün tercihinizi yazın]';
    const dateOption = form.elements.date.selectedOptions[0];
    const date = form.elements.date.value ? dateOption.textContent : '[Teslimat gününü yazın]';
    const message = [
      'Merhaba, 21–24 Kasım 2026 TÜYAP için çiçek siparişi planlamak istiyorum.',
      '',
      `Fuar adı: ${field('fair', 'Avrasya Pencere, Kapı ve Cam Fuarları')}`,
      'Teslimat yeri: TÜYAP Fuar ve Kongre Merkezi, İstanbul',
      `Salon / stant no: ${field('stand', '[Salon ve stant numaranızı yazın]')}`,
      `Ürün tercihi: ${productLabel}`,
      `Kart / çelenk yazısı: ${field('card', 'Kart yazısı istemiyorum.')}`,
      `Teslimat zamanı: ${date} / ${field('time', '[İstediğiniz saat aralığını yazın]')}`,
      '',
      'Stok, toplam tutar ve teslimat uygunluğunu teyit edebilir misiniz?'
    ];
    if (product?.sharePage) message.push('', `Ürün bağlantısı: ${store.assetUrl(product.sharePage)}`);
    orderLink.href = `https://wa.me/${catalog.settings.whatsapp}?text=${encodeURIComponent(message.join('\n'))}`;
  }

  function syncCatalog() {
    const previous = productSelect.value;
    const products = availableProducts();
    productSelect.replaceChildren(new Option('Bir ürün seçin', ''));
    for (const product of products) {
      productSelect.add(new Option(`${product.name} · ${store.formatPrice(product.price)} + %${catalog.settings.vat} KDV`, product.id));
    }
    productSelect.add(new Option('Ürün seçimi için destek istiyorum', 'consult'));
    if (previous === 'consult' || products.some(product => product.id === previous)) productSelect.value = previous;
    else if (previous) status.textContent = 'Seçtiğiniz ürün artık katalogda yok. Lütfen başka bir ürün seçin.';

    let visibleCount = 0;
    for (const card of cards) {
      const product = products.find(item => item.id === card.dataset.productId);
      card.hidden = !product;
      if (!product) continue;
      visibleCount += 1;
      const image = card.querySelector('img');
      image.src = store.assetUrl(product.image);
      image.alt = product.alt;
      card.querySelector('h3 a').textContent = product.name;
      card.querySelector('.event-product__price span').textContent = store.formatPrice(product.price);
      card.querySelector('.event-product__price small').textContent = `+ %${catalog.settings.vat} KDV`;
      const destination = store.assetUrl(product.sharePage || './#urunler');
      card.querySelector('.event-product__photo').href = destination;
      card.querySelector('.event-product__photo').setAttribute('aria-label', `${product.name} ürününü incele`);
      card.querySelector('h3 a').href = destination;
    }
    document.querySelector('#event-products-empty').hidden = visibleCount !== 0;
    const phone = document.querySelector('[data-event-phone]');
    phone.href = `tel:+${catalog.settings.whatsapp}`;
    phone.textContent = catalog.settings.whatsapp.replace(/^90(\d{3})(\d{3})(\d{4})$/, '+90 $1 $2 $3');
    updateMessage();
  }

  document.querySelector('#event-products').addEventListener('click', event => {
    const link = event.target.closest('[data-select-product]');
    if (!link) return;
    const product = availableProducts().find(item => item.id === link.dataset.selectProduct);
    if (!product) return;
    productSelect.value = product.id;
    status.textContent = `${product.name} seçildi. Salon / stant ve teslimat bilgilerini ekleyin.`;
    updateMessage();
    form.elements.stand.focus({ preventScroll: true });
  });

  form.addEventListener('input', () => {
    status.textContent = '';
    updateMessage();
  });
  form.addEventListener('change', updateMessage);
  form.addEventListener('submit', event => {
    event.preventDefault();
    orderLink.click();
  });
  orderLink.addEventListener('click', event => {
    for (const name of ['stand', 'time']) {
      const input = form.elements[name];
      input.setCustomValidity(input.value.trim() ? '' : 'Lütfen bu alanı doldurun.');
    }
    if (!form.reportValidity()) {
      event.preventDefault();
      return;
    }
    updateMessage();
  });
  for (const name of ['stand', 'time']) {
    form.elements[name].addEventListener('input', event => event.target.setCustomValidity(''));
  }

  store.subscribe(data => {
    catalog = data;
    syncCatalog();
  });
  syncCatalog();
})();
