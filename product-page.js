(() => {
  'use strict';
  const store = window.FuarStore;
  const productId = location.pathname.split('/').pop().replace(/\.html$/, '');
  const article = document.querySelector('.product-detail');
  const title = article.querySelector('h1');
  const price = article.querySelector('.product-detail__price');
  const image = article.querySelector('.product-detail__photo');
  const delivery = article.querySelector('.product-detail__delivery');
  const order = article.querySelector('.product-detail__order');

  function render(data) {
    const product = data.products.find(product => product.id === productId);
    const available = product?.active === true;
    price.hidden = !available;
    order.hidden = !available;
    image.hidden = !product;
    if (!available) {
      title.textContent = product?.name || 'Ürün şu anda yayında değil';
      delivery.textContent = 'Güncel seçenekleri ürün kataloğundan inceleyebilirsiniz.';
      return;
    }
    title.textContent = product.name;
    document.title = `${product.name} | Fuar Çiçekçim`;
    image.src = store.assetUrl(product.image);
    image.alt = product.alt || product.name;
    price.replaceChildren(document.createTextNode(`${store.formatPrice(product.price)} `));
    const tax = document.createElement('small');
    tax.textContent = `+ %${data.settings.vat} KDV`;
    price.append(tax);
    order.href = store.orderUrl(product, data);
    const regions = [data.settings.regions.tuyap && 'TÜYAP', data.settings.regions.ifm && 'İFM'].filter(Boolean);
    delivery.textContent = regions.length ? `${regions.join(' ve ')} teslimatı dahil` : 'Teslimatı WhatsApp’tan planlayalım';
  }

  render(store.read());
  store.subscribe(render);
})();
