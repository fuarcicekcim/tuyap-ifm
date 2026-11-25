(() => {
  'use strict';

  const storageKey = 'fuar-cicekcim:tuyap-ifm:catalog:v1';
  const defaultCatalog = structuredClone(window.FUAR_CATALOG);
  const listeners = new Set();
  const currency = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
  const categoryIds = defaultCatalog.categories.map(category => category.id);
  const badgeIds = defaultCatalog.badges.map(badge => badge.id);
  const siteBase = new URL('./', document.querySelector('script[src*="catalog-store.js"]').src);
  const legacyBestsellers = ['iki-dalli-beyaz-orkide', 'yucca-iki-govde', 'seflera', 'beyaz-lilyum-prestij-ferforje', 'antoryum'];

  function validateImage(value) {
    if (typeof value !== 'string' || !value.trim()) return false;
    if (/^data:image\/(?:jpeg|png|webp|gif|avif);base64,[a-z\d+/=\s]+$/i.test(value)) return true;
    if (/^https?:\/\//i.test(value)) {
      try { return !new URL(value).username && !new URL(value).password; }
      catch { return false; }
    }
    let decoded;
    try { decoded = decodeURIComponent(value.replace(/^\.\//, '')); } catch { return false; }
    return /^(?:\.\/)?assets\/[\p{L}\p{N}_./?=&+()\-\s]+$/iu.test(decoded)
      && !/[\\\u0000-\u001f%]/u.test(decoded) && !decoded.split(/[/?#]/).some(part => part === '..' || part === '.');
  }

  function parseSource(source) {
    if (typeof source !== 'string' || source.length > 30 * 1024 * 1024) throw new Error('Katalog metni okunamadı veya çok büyük.');
    const value = source.replace(/^\uFEFF/, '').trim();
    const match = /^window\.FUAR_CATALOG\s*=\s*(\{[\s\S]*\})\s*;?$/.exec(value);
    let parsed;
    try { parsed = JSON.parse(match ? match[1] : value); }
    catch { throw new Error('Katalog geçerli JSON veya window.FUAR_CATALOG = {...}; biçiminde olmalı.'); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Katalog bir JSON nesnesi olmalı.');
    return parsed;
  }

  function hasManagedRanking(catalog = read()) {
    return catalog.products.some(product => Object.hasOwn(product, 'bestsellerRank'));
  }

  function bestsellerRank(product, catalog = read()) {
    if (hasManagedRanking(catalog)) return product.bestsellerRank ?? null;
    const index = legacyBestsellers.indexOf(product.id);
    return index < 0 ? null : index + 1;
  }

  function homeOrder(catalog = read()) {
    const products = catalog.products.filter(product => product.active !== false);
    const featured = products.filter(product => bestsellerRank(product, catalog) != null)
      .sort((a, b) => bestsellerRank(a, catalog) - bestsellerRank(b, catalog));
    const selected = new Set(featured.map(product => product.id));
    const remaining = products.filter(product => !selected.has(product.id)).sort((a, b) => a.price - b.price || a.id.localeCompare(b.id, 'tr'));
    const mixed = [];
    for (let low = 0, high = remaining.length - 1; low <= high;) {
      mixed.push(remaining[low++]);
      if (low <= high) mixed.push(remaining[high--]);
    }
    const fallback = new Map(mixed.map((product, index) => [product.id, index]));
    mixed.sort((a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity) || fallback.get(a.id) - fallback.get(b.id));
    return [...featured, ...mixed];
  }

  function text(value, label, maximum = 180) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum) {
      throw new Error(`${label} alanını kontrol edin.`);
    }
    return value.trim();
  }

  function normalize(catalog) {
    if (!catalog || !Array.isArray(catalog.products)) throw new Error('Ürün verisi okunamadı.');
    const cartDiscount = {};
    if (catalog.cartDiscount != null) {
      if (!globalThis.FuarPricing?.validateCartDiscount) throw new Error('Sepet indirimi doğrulaması yüklenemedi. Sayfayı yenileyin.');
      const cartDiscountError = globalThis.FuarPricing.validateCartDiscount(catalog.cartDiscount);
      if (cartDiscountError) throw new Error(cartDiscountError);
      cartDiscount.cartDiscount = structuredClone(catalog.cartDiscount);
    }
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
    const ranks = new Set();
    const products = catalog.products.map(product => {
      const id = text(product.id, 'Ürün kimliği', 90);
      if (!/^[a-z\d][a-z\d-]*$/i.test(id) || ids.has(id)) throw new Error('Ürün kimlikleri benzersiz olmalı.');
      ids.add(id);
      const price = Number(product.price);
      if (!Number.isFinite(price) || price < 0 || price > 1_000_000_000) throw new Error('Geçerli bir ürün fiyatı yazın.');
      if (!categoryIds.includes(product.category)) throw new Error('Bir ürün kategorisi seçin.');
      if (!validateImage(product.image)) throw new Error('Görsel için assets/ yolu, HTTPS bağlantısı veya yüklenen fotoğraf kullanın.');
      const name = text(product.name, 'Ürün adı', 100);
      if (Object.hasOwn(product, 'inStock') && typeof product.inStock !== 'boolean') throw new Error(`${name}: stok durumu geçersiz.`);
      const discount = {};
      if (product.discount != null) {
        if (!globalThis.FuarPricing) throw new Error('İndirim doğrulaması yüklenemedi. Sayfayı yenileyin.');
        const discountError = globalThis.FuarPricing.validate(product);
        if (discountError) throw new Error(`${name}: ${discountError}`);
        discount.discount = structuredClone(product.discount);
      }
      const ordering = {};
      for (const [key, minimum, maximum] of [['sortOrder', 0, 1_000_000], ['bestsellerRank', 1, 5]]) {
        if (!Object.hasOwn(product, key)) continue;
        if (product[key] !== null && (!Number.isInteger(product[key]) || product[key] < minimum || product[key] > maximum)) throw new Error(`${name}: ürün sıralamasını kontrol edin.`);
        ordering[key] = product[key];
      }
      if (ordering.bestsellerRank != null) {
        if (ranks.has(ordering.bestsellerRank)) throw new Error('En çok satan öncelikleri benzersiz olmalı (1–5).');
        ranks.add(ordering.bestsellerRank);
      }
      return {
        id, name, category: product.category, price: Math.round(price * 100) / 100,
        image: product.image.trim(), alt: String(product.alt || name).slice(0, 200),
        label: String(product.label || '').slice(0, 80),
        badge: badgeIds.includes(product.badge) ? product.badge : '',
        active: product.active !== false,
        ...(product.inStock === false ? { inStock: false } : {}),
        sharePage: /^urunler\/[a-z\d-]+\.html$/.test(product.sharePage || '') ? product.sharePage : '',
        cover: product.cover === true,
        ...ordering,
        ...discount
      };
    });
    return {
      schema: 1,
      revision: String(catalog.revision || defaultCatalog.revision),
      categories, badges, products,
      ...cartDiscount,
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

  function draftInfo() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === null) return { hasDraft: false, stale: false, baseRevision: null, updatedAt: null };
      const saved = JSON.parse(raw);
      return { hasDraft: true, stale: saved?.baseRevision !== defaultCatalog.revision, baseRevision: saved?.baseRevision ?? null, updatedAt: saved?.data?.updatedAt || null };
    } catch { return { hasDraft: true, stale: true, baseRevision: null, updatedAt: null, invalid: true }; }
  }

  function getSavedDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      return saved?.data ? normalize(saved.data) : null;
    } catch { return null; }
  }

  function rawSavedDraft() {
    try { return localStorage.getItem(storageKey); }
    catch { return null; }
  }

  function recoverSavedDraft() {
    const saved = getSavedDraft();
    if (!saved) throw new Error('Tarayıcı taslağı okunamadı; kurtarma için dışa aktarın.');
    return save(saved);
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
    let message = `Merhaba, Fuar Çiçekçim’den ${product.name} (${currency.format(product.price)} TL) siparişi vermek istiyorum.\n\n${fields.join('\n')}`;
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
    parseSource, draftInfo, getSavedDraft, rawSavedDraft, recoverSavedDraft, hasManagedRanking, bestsellerRank, homeOrder,
    defaults: () => structuredClone(defaultCatalog),
    subscribe(callback) { listeners.add(callback); return () => listeners.delete(callback); }
  });
})();
