(() => {
  'use strict';

  const storageKey = 'fuar-cicekcim:tuyap-ifm:catalog:v1';
  const defaultCatalog = structuredClone(window.FUAR_CATALOG);
  const listeners = new Set();
  const currency = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
  const categoryIds = defaultCatalog.categories.map(category => category.id);
  const badgeIds = defaultCatalog.badges.map(badge => badge.id);
  const siteBase = new URL('./', document.querySelector('script[src*="catalog-store.js"]').src);

  function validateImage(value) {
    if (typeof value !== 'string' || !value.trim()) return false;
    if (/^data:image\/(?:jpeg|png|webp|gif|avif);base64,[a-z\d+/=\s]+$/i.test(value)) return true;
    if (/^https?:\/\//i.test(value)) {
      try { return !new URL(value).username && !new URL(value).password; }
      catch { return false; }
    }
    return /^(?:\.\/)?assets\/[a-z\d_./%?=&+()\-\s]+$/i.test(value) && !value.includes('..');
  }

  function text(value, label, maximum = 180) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum) {
      throw new Error(`${label} alanını kontrol edin.`);
    }
    return value.trim();
  }

  function normalize(catalog) {
    if (!catalog || !Array.isArray(catalog.products)) throw new Error('Ürün verisi okunamadı.');
    const settings = catalog.settings;
    const whatsapp = String(settings?.whatsapp ?? '').replace(/[\s()+\-]/g, '');
    const vat = Number(settings?.vat);
    if (!/^[1-9]\d{6,14}$/.test(whatsapp)) throw new Error('WhatsApp numarasını ülke koduyla yazın.');
    if (!Number.isFinite(vat) || vat < 0 || vat > 100) throw new Error('KDV oranı 0 ile 100 arasında olmalı.');
    const categories = categoryIds.map(id => ({
      id, name: text(catalog.categories?.find(category => category.id === id)?.name, 'Kategori adı', 60)
    }));
    const badges = badgeIds.map(id => ({
      id, name: text(catalog.badges?.find(badge => badge.id === id)?.name, 'Rozet adı', 70)
    }));
    const ids = new Set();
    const products = catalog.products.map(product => {
      const id = text(product.id, 'Ürün kimliği', 90);
      if (!/^[a-z\d][a-z\d-]*$/i.test(id) || ids.has(id)) throw new Error('Ürün kimlikleri benzersiz olmalı.');
      ids.add(id);
      const price = Number(product.price);
      if (!Number.isFinite(price) || price < 0 || price > 1_000_000_000) throw new Error('Geçerli bir ürün fiyatı yazın.');
      if (!categoryIds.includes(product.category)) throw new Error('Bir ürün kategorisi seçin.');
      if (!validateImage(product.image)) throw new Error('Görsel için assets/ yolu, HTTPS bağlantısı veya yüklenen fotoğraf kullanın.');
      const name = text(product.name, 'Ürün adı', 100);
      return {
        id, name, category: product.category, price: Math.round(price * 100) / 100,
        image: product.image.trim(), alt: String(product.alt || name).slice(0, 200),
        label: String(product.label || '').slice(0, 80),
        badge: badgeIds.includes(product.badge) ? product.badge : '',
        active: product.active !== false,
        sharePage: /^urunler\/[a-z\d-]+\.html$/.test(product.sharePage || '') ? product.sharePage : '',
        cover: product.cover === true
      };
    });
    return {
      schema: 1,
      revision: String(catalog.revision || defaultCatalog.revision),
      categories, badges, products,
      settings: {
        whatsapp, vat,
        announcement: text(settings.announcement, 'Duyuru metni', 180),
        regions: { tuyap: settings.regions?.tuyap !== false, ifm: settings.regions?.ifm !== false }
      },
      updatedAt: String(catalog.updatedAt || '')
    };
  }

  function read() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved?.baseRevision === defaultCatalog.revision) return normalize(saved.data);
    } catch { /* Private browsing or an invalid draft falls back to the published catalog. */ }
    return structuredClone(defaultCatalog);
  }

  function notify(data) {
    for (const listener of listeners) listener(structuredClone(data));
  }

  function save(data) {
    const clean = normalize(data);
    clean.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(storageKey, JSON.stringify({ baseRevision: defaultCatalog.revision, data: clean }));
    } catch {
      throw new Error('Tarayıcıya kaydedilemedi. Depolama iznini kontrol edin veya daha küçük bir fotoğraf / görsel bağlantısı kullanın.');
    }
    notify(clean);
    return structuredClone(clean);
  }

  function reset() {
    localStorage.removeItem(storageKey);
    const data = structuredClone(defaultCatalog);
    notify(data);
    return data;
  }

  function exportSource(data) {
    const clean = normalize(data);
    clean.revision = `catalog-${Date.now()}`;
    return `window.FUAR_CATALOG = ${JSON.stringify(clean, null, 2)};\n`;
  }

  function assetUrl(path) { return new URL(path, siteBase).href; }
  function formatPrice(value) { return `₺${currency.format(value)}`; }

  function orderUrl(product, data = read()) {
    const fields = ['Fuar adı:', 'Salon / stant no:', 'Alıcı firma:', 'Alıcı adı / telefon:', 'Adet:', 'Kart / çelenk yazısı:'];
    let message = `Merhaba, Fuar Çiçekçim’den ${product.name} (${currency.format(product.price)} TL + %${data.settings.vat} KDV) siparişi vermek istiyorum.\n\n${fields.join('\n')}`;
    let photo = product.sharePage ? assetUrl(product.sharePage) : '';
    if (!photo && !product.image.startsWith('data:')) photo = assetUrl(product.image);
    if (photo) message += `\n\nÜrün fotoğrafı: ${photo}`;
    return `https://wa.me/${data.settings.whatsapp}?text=${encodeURIComponent(message)}`;
  }

  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) notify(read());
  });

  window.FuarStore = Object.freeze({
    read, save, reset, exportSource, validateImage, normalize, formatPrice, assetUrl, orderUrl,
    defaults: () => structuredClone(defaultCatalog),
    subscribe(callback) { listeners.add(callback); return () => listeners.delete(callback); }
  });
})();
