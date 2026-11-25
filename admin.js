(() => {
  'use strict';

  const store = window.FuarStore;
  const auth = window.FuarAuth;
  const get = (id) => document.getElementById(id);
  const sessionKey = 'fuar-admin-session';
  // Giriş şifresi kodda tutulmaz: sunucudaki config.php şifresiyle api/katalog-kaydet.php üzerinden doğrulanır.
  const loginUrl = 'api/katalog-kaydet.php';
  const isLocalHost = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || location.hostname.endsWith('.localhost');
  let adminPassword = ''; // Yalnızca bellekte tutulur; çıkışta veya sayfa yenilenince silinir (yayın penceresini doldurmak için).
  const themeKey = 'fuar-admin-theme';
  const sidebarKey = 'fuar-admin-sidebar';
  const mobileSidebar = window.matchMedia('(max-width: 600px)');
  const titles = {
    overview: ['Genel Bakış', 'Kataloğunuz, vitrin öncelikleri ve kayıt durumu bir arada.'],
    products: ['Ürün Yönetimi', 'Vitrindeki ürünleri, fiyatları ve fotoğrafları düzenleyin.'],
    categories: ['Kategoriler & Rozetler', 'Kategori yapısını inceleyin, ürün rozetlerini düzenleyin.'],
    settings: ['Fuar & İletişim Ayarları', 'Merkezi proje ayarlarının salt okunur özeti.'],
  };
  let data;
  let selectedImage = '';
  let imageVersion = 0;
  let editingSnapshot = '';
  let toastTimer;
  let confirmAction;
  let returnFocus;
  let writing = false;
  let localPreview = false;
  let checking = false;
  let checkedAt = '';
  let checkError = '';
  let serverStatus = null;
  let publicSource = null;
  let published = null;
  let exportedContent = '';
  let serverDraftContent = '';
  let sourceHash = '';
  let pageHash = '';
  let reviewedDraftHash = '';
  let editorState = '';
  let editorRanking = '';
  let bulkCampaign;
  let cartDiscountSnapshot;
  let cartDiscountDateDraft = null;
  let savedView = preference('fuar-admin-view', 'overview');
  const filterKey = 'fuar-admin-filters';
  const protectedIds = new Set(window.FUAR_ADMIN_META?.protectedProductIds || []);
  const activity = [];

  function content(catalog) {
    const clean = store.normalize(catalog);
    delete clean.revision;
    delete clean.updatedAt;
    return JSON.stringify(clean);
  }

  function orderedProducts(catalog) {
    if (!store.homeOrder) return catalog.products;
    return [...store.homeOrder(catalog), ...catalog.products.filter(product => product.active === false)];
  }

  function rankOf(product, catalog = data) {
    return store.bestsellerRank?.(product, catalog) ?? null;
  }

  function timestamp(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Istanbul' }).format(date) : 'Henüz yok';
  }

  function download(text, filename, type = 'application/json;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = node('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function api(action, password, payload = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(loginUrl, {
        method: 'POST', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(auth?.enabled ? { Authorization: `Bearer ${await auth.token()}` } : {}) },
        body: JSON.stringify({ eylem: action, ...(!auth?.enabled ? { sifre: password } : {}), ...payload }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        const error = new Error(result?.error || `Sunucu işlemi doğrulanamadı (${response.status}).`);
        error.status = response.status;
        throw error;
      }
      return result;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Sunucu yanıtı zaman aşımına uğradı. Kayıt sonucunu durumu kontrol ederek doğrulayın.');
      throw error;
    } finally { clearTimeout(timer); }
  }

  function publishStatus(message, error = false) {
    const target = get('publish-status');
    if (!target) return;
    target.textContent = message;
    target.classList.toggle('is-error', error);
  }

  function renderCatalogStatus() {
    if (!data || !get('catalog-status-text')) return;
    const draft = store.draftInfo?.() || {};
    const changed = content(data) !== content(publicSource || store.defaults());
    const saved = changed && serverDraftContent === content(data);
    const current = Boolean(published?.sourceSha256 && published.sourceSha256 === sourceHash && pageHash === sourceHash);
    let state = checking ? 'checking' : draft.stale ? 'error' : changed ? saved ? 'saved' : 'dirty' : current ? 'current' : 'local';
    if (checkError && !changed && !draft.stale) state = 'error';
    document.querySelector('.publish-banner').dataset.state = state;
    get('catalog-status-text').textContent = checking ? 'Katalog durumu kontrol ediliyor' : draft.stale ? 'Önceki sürümden bir taslağınız var' : changed ? saved ? 'Sunucu taslağınız kaydedildi' : 'Bu cihazda düzenlemeler var' : current ? 'Bu adresin vitrin sürümü doğrulandı' : 'Katalog bu cihazda hazır';
    get('catalog-status-detail').textContent = draft.stale ? 'Eski düzenlemeleriniz korunuyor. Yeni bir değişiklikten önce yedeğini indirin veya taslağı kurtarın.' : changed ? saved ? 'Canlı vitrin henüz değişmedi. Yayın için aynı katalogdan derleme ve yükleme gerekir.' : (window.FuarLive?.catalogNote ?? 'Düzenlemeler tarayıcıda saklanıyor; henüz vitrinde yayımlanmadı.') : checkError || (localPreview ? 'Yerel önizleme. Sunucuya kayıt için PHP destekli ortam gerekir.' : current ? 'Kaynak katalog ile derlenmiş vitrin aynı sürüme ait.' : 'Yayın doğrulaması için katalog manifesti kontrol edilmeli.');
    get('catalog-revision').textContent = `${publicSource?.revision || data.revision} · ${checkedAt ? `Kontrol: ${timestamp(checkedAt)}` : 'Henüz kontrol edilmedi'}`;
    get('catalog-check-button').disabled = checking;
    get('catalog-check-button').setAttribute('aria-busy', String(checking));
    const area = get('catalog-readiness');
    area?.replaceChildren();
    for (const [title, value, note] of [
      ['Bu cihaz', draft.stale ? 'Eski taslak korunuyor' : changed ? 'Yayımlanmamış düzenleme' : 'Kaynakla aynı', data.updatedAt ? `Son kayıt: ${timestamp(data.updatedAt)}` : 'Ürünleri düzenleyerek başlayın.'],
      ['Sunucu taslağı', serverStatus?.draft ? 'Özel yedek var' : localPreview ? 'Yerel önizleme' : 'Henüz doğrulanmadı', serverStatus?.draft ? `Kayıt: ${timestamp(serverStatus.draft.updatedAt)}` : 'Sunucu kaydı vitrini değiştirmez.'],
      ['Bu adresin vitrini', current ? 'Sürüm eşleşiyor' : published ? 'Sürümler farklı' : 'Manifest doğrulanamadı', published ? `Derleme: ${timestamp(published.generatedAt)}` : 'Derleme ve yükleme sonrası doğrulanır.'],
    ]) {
      const card = node('article', 'readiness-item');
      card.append(node('span', 'readiness-title', title), node('strong', 'readiness-value', value), node('p', 'readiness-note', note));
      area?.append(card);
    }
    if (draft.stale) {
      const actions = node('div', 'draft-recovery');
      const backup = node('button', 'admin-button admin-button--quiet', 'Eski taslağı indir');
      backup.type = 'button';
      backup.onclick = () => {
        const savedDraft = store.getSavedDraft?.();
        if (!savedDraft) {
          const raw = store.rawSavedDraft?.();
          if (raw) { download(raw, 'fuar-okunamayan-taslak.txt', 'text/plain;charset=utf-8'); return; }
          return notify('Taslak okunamadı. Tarayıcı verilerini silmeyin.', true);
        }
        download(JSON.stringify(savedDraft, null, 2), 'fuar-eski-taslak.json');
      };
      const recover = node('button', 'admin-button admin-button--primary', 'Taslağı kurtar');
      recover.type = 'button';
      recover.onclick = () => requestConfirmation('Önceki taslağı kurtar', 'Eski ürün düzenlemeleri bu cihazda yeniden açılacak. Yeni katalogla farklarını yayınlamadan önce gözden geçirin.', 'Taslağı kurtar', () => {
        try { writing = true; data = store.recoverSavedDraft(); render(); notify('Taslak bu cihazda kurtarıldı. Vitrin değişmedi.'); }
        catch (error) { notify(error.message, true); }
        finally { writing = false; }
      });
      actions.append(backup, recover);
      area?.append(actions);
    }
    const downloadServer = get('download-server-draft-button');
    if (downloadServer) downloadServer.disabled = localPreview;
    const saveServer = get('publish-server-button');
    if (saveServer && !saveServer.hasAttribute('aria-busy')) saveServer.disabled = localPreview;
  }

  async function checkCatalog(password = adminPassword) {
    if (checking) return false;
    checking = true;
    checkError = '';
    sourceHash = '';
    pageHash = '';
    renderCatalogStatus();
    try {
      const [sourceResponse, manifestResponse, pageResponse] = await Promise.all([
        fetch(`products-data.js?check=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(12000) }),
        fetch(`catalog-release.json?check=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(12000) }),
        fetch(`./?catalog-check=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(12000) }),
      ]);
      if (!sourceResponse.ok) throw new Error('Kaynak katalog okunamadı.');
      const text = await sourceResponse.text();
      publicSource = store.normalize(store.parseSource(text));
      if (crypto.subtle) sourceHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))).map(byte => byte.toString(16).padStart(2, '0')).join('');
      const release = manifestResponse.ok ? await manifestResponse.json().catch(() => null) : null;
      published = release?.schema === 1 && /^[a-f0-9]{64}$/.test(release.sourceSha256 || '') ? release : null;
      if (pageResponse.ok) pageHash = new DOMParser().parseFromString(await pageResponse.text(), 'text/html').querySelector('meta[name="catalog-source-sha256"]')?.content || '';
      if ((password || auth?.enabled) && !localPreview) {
        serverStatus = await api('durum', password);
        // PHP hash is available on LAN HTTP where Web Crypto is not available.
        if (!sourceHash && serverStatus.source?.sha256) sourceHash = serverStatus.source.sha256;
      }
      checkedAt = new Date().toISOString();
      return true;
    } catch (error) {
      checkError = 'Durum doğrulanamadı. Düzenlemeleriniz bu cihazda korunuyor.';
      publishStatus(error.message, true);
      return false;
    } finally { checking = false; renderCatalogStatus(); }
  }

  function editorValue() {
    return JSON.stringify({ fields: Array.from(get('product-form').elements).filter(el => el.id && !['product-file', 'product-id'].includes(el.id) && !['submit', 'button'].includes(el.type) && (!el.closest('#product-discount-fields') || get('product-discount-enabled').checked)).map(el => [el.id, el.type === 'checkbox' ? el.checked : el.value]), selectedImage });
  }

  function node(tag, className = '', text = '') {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
  }

  function icon(name) {
    const element = node('i');
    element.dataset.lucide = name;
    element.setAttribute('aria-hidden', 'true');
    return element;
  }

  function refreshIcons() {
    window.lucide?.createIcons();
  }

  function preference(key, fallback) {
    try { return localStorage.getItem(key) ?? fallback; }
    catch { return fallback; }
  }

  function savePreference(key, value) {
    try { localStorage.setItem(key, value); }
    catch { /* Theme and layout preferences are optional. */ }
  }

  function notify(message, error = false) {
    const toast = get('toast');
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle('is-error', error);
    toast.hidden = false;
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 5000);
  }

  function openDialog(dialog) {
    returnFocus = document.activeElement;
    dialog.showModal();
  }

  function closeDialog(dialog) {
    if (dialog.id === 'product-dialog' && editorState && editorValue() !== editorState) {
      requestConfirmation('Düzenlemeyi kapat', 'Kaydedilmemiş ürün değişiklikleri var. Bu düzenlemeden vazgeçmek istiyor musunuz?', 'Vazgeç ve kapat', () => {
        editorState = '';
        imageVersion += 1;
        dialog.close();
      });
      return;
    }
    if (dialog.id === 'product-dialog') imageVersion += 1;
    dialog.close();
    if (returnFocus?.isConnected) returnFocus.focus();
  }

  function requestConfirmation(title, description, actionText, action) {
    get('confirm-title').textContent = title;
    get('confirm-description').textContent = description;
    get('confirm-action').textContent = actionText;
    confirmAction = action;
    openDialog(get('confirm-dialog'));
  }

  function categoryName(id) {
    return data.categories.find((category) => category.id === id)?.name || id;
  }

  function badgeName(id) {
    return data.badges.find((badge) => badge.id === id)?.name || '';
  }

  function productPricing(product) {
    return globalThis.FuarPricing?.resolve(product) || { price: product.price, previousPrice: null, discount: null };
  }

  function discountRange(discount) {
    const date = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value.split('-').reverse().join('.') : '—';
    return `${date(discount.startsOn)} – ${date(discount.endsOn)}`;
  }

  function priceBlock(product) {
    const resolved = productPricing(product);
    const block = node('div', `admin-price${resolved.discount ? ' has-discount' : ''}`);
    const numbers = node('div', 'admin-price__numbers');
    if (resolved.discount && resolved.previousPrice != null) {
      const previous = node('del', 'admin-price__previous', store.formatPrice(resolved.previousPrice));
      previous.setAttribute('aria-label', `İndirim öncesi fiyat ${store.formatPrice(resolved.previousPrice)}`);
      numbers.append(previous);
    }
    const current = node('strong', 'admin-price__current', store.formatPrice(resolved.price));
    current.setAttribute('aria-label', `${resolved.discount ? 'İndirimli' : 'Normal'} fiyat ${store.formatPrice(resolved.price)}`);
    numbers.append(current);
    block.append(numbers);
    if (product.discount) {
      block.append(node('small', 'admin-price__normal', `Normal fiyat: ${store.formatPrice(product.price)}`));
      const today = globalThis.FuarPricing?.today() || '';
      const state = resolved.discount ? 'İndirim geçerli' : product.active === false ? 'Ürün satışa kapalı' : today && today < product.discount.startsOn ? 'İndirim planlandı' : 'İndirim süresi doldu';
      block.append(node('small', 'admin-price__state', `${state} · ${discountRange(product.discount)}`));
      if (!resolved.discount) block.append(node('small', 'admin-price__scheduled', `İndirimli fiyat: ${store.formatPrice(product.discount.price)}`));
    }
    return block;
  }

  function editorDiscount() {
    const amount = id => get(id).value.trim() === '' ? NaN : Number(get(id).value);
    return {
      price: amount('product-discount-price'), previousPrice: amount('product-discount-previous-price'),
      startsOn: get('product-discount-start').value, endsOn: get('product-discount-end').value,
    };
  }

  function updateDiscountPreview() {
    const enabled = get('product-discount-enabled').checked;
    const fields = get('product-discount-fields');
    fields.hidden = !enabled;
    fields.disabled = !enabled;
    get('product-discount-enabled').setAttribute('aria-expanded', String(enabled));
    get('product-discount-disabled-note').hidden = enabled;
    const preview = get('product-price-preview');
    preview.replaceChildren();
    const normal = get('product-price').value;
    if (normal === '' || !Number.isFinite(Number(normal)) || Number(normal) < 0) {
      preview.append(node('p', 'discount-preview-hint', 'Önizleme için normal fiyatı girin.'));
      return;
    }
    const product = { price: Number(normal) };
    if (enabled) {
      const discount = editorDiscount();
      if ([discount.price, discount.previousPrice].some(value => !Number.isFinite(value)) || !discount.startsOn || !discount.endsOn) {
        preview.append(priceBlock(product), node('p', 'discount-preview-hint', 'İndirimli fiyatı, önceki fiyatı ve tarihleri doldurun.'));
        return;
      }
      product.discount = discount;
      const error = globalThis.FuarPricing?.validate(product) || (!globalThis.FuarPricing ? 'Fiyat önizlemesi yüklenemedi. Sayfayı yenileyin.' : '');
      if (error) {
        preview.append(priceBlock({ price: product.price }), node('p', 'discount-preview-hint is-error', error));
        return;
      }
    }
    preview.append(priceBlock(product));
  }

  function campaignSnapshot(products) {
    return JSON.stringify(products.map(({ id, price, discount, active }) => [id, price, discount ?? null, active]));
  }

  function renderBulkDiscount() {
    const pricing = globalThis.FuarPricing;
    const products = data.products.filter(product => product.price > 0 && product.discount);
    const campaign = products[0]?.discount;
    const buttons = [...document.querySelectorAll('[data-bulk-rate]')];
    const selected = campaign && pricing ? buttons.filter(button => {
      const rate = Number(button.dataset.bulkRate);
      return products.every(({ price, discount }) => discount
        && discount.previousPrice === price
        && discount.price === pricing.discountedPrice(price, rate)
        && discount.startsOn === campaign.startsOn
        && discount.endsOn === campaign.endsOn);
    }) : [];
    const current = selected.length === 1 ? selected[0] : null;
    for (const button of buttons) {
      if (button === current) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
    const feedback = get('bulk-discount-feedback');
    feedback.hidden = !current;
    feedback.textContent = current
      ? `${products.length} ürün · %${current.dataset.bulkRate} indirim · ${discountRange(campaign)}`
      : '';
  }

  function openBulkDiscount(rate) {
    const pricing = globalThis.FuarPricing;
    if (!pricing) return notify('Fiyat doğrulaması yüklenemedi. Sayfayı yenileyin.', true);
    const { products } = store.read();
    const eligible = products.filter(product => product.price > 0);
    if (!eligible.length) return notify('İndirim uygulanabilecek bir ürün fiyatı bulunamadı.', true);

    const replaced = eligible.filter(product => product.discount).length;
    const hidden = eligible.filter(product => product.active === false).length;
    const skipped = products.length - eligible.length;
    const today = pricing.today();
    bulkCampaign = { rate, snapshot: campaignSnapshot(products) };
    get('bulk-discount-form').reset();
    get('bulk-discount-start').value = today;
    get('bulk-discount-end').value = today;
    get('bulk-discount-error').textContent = '';
    get('bulk-discount-dialog-title').textContent = `%${rate} toplu indirim`;
    get('bulk-discount-summary').textContent = `${eligible.length} ürünün normal fiyatı üzerinden %${rate} indirim hesaplanacak.`;
    const impact = [
      hidden ? `${hidden} gizli ürün de kapsama dahil.` : '',
      replaced ? `${replaced} üründeki önceki indirim ayarı güncellenecek.` : '',
      skipped ? `Sıfır fiyatlı ${skipped} ürün atlanacak.` : '',
    ].filter(Boolean).join(' ');
    get('bulk-discount-impact').textContent = impact;
    get('bulk-discount-impact').hidden = !impact;
    get('bulk-discount-submit-label').textContent = `%${rate} indirimi taslağa uygula`;
    openDialog(get('bulk-discount-dialog'));
  }

  function cartCampaignKey(campaign) {
    return JSON.stringify(campaign ? { startsOn: campaign.startsOn, endsOn: campaign.endsOn } : null);
  }

  function defaultCartCampaign(catalog) {
    const today = globalThis.FuarPricing?.today() || '';
    const products = catalog.products.filter(product => product.active !== false && product.price > 0);
    const first = products[0]?.discount;
    if (first && first.startsOn <= today && today <= first.endsOn && products.every(product => product.discount?.startsOn === first.startsOn && product.discount?.endsOn === first.endsOn)) {
      return { startsOn: first.startsOn, endsOn: first.endsOn };
    }
    return { startsOn: today, endsOn: today };
  }

  function renderCartDiscount() {
    const campaign = data.cartDiscount || null;
    const key = cartCampaignKey(campaign);
    if (key !== cartDiscountSnapshot) {
      cartDiscountSnapshot = key;
      cartDiscountDateDraft = null;
    }
    const enabled = Boolean(campaign);
    const selectedDates = cartDiscountDateDraft || campaign || defaultCartCampaign(data);
    const toggle = get('cart-discount-enabled');
    toggle.checked = enabled;
    get('cart-discount-toggle-label').textContent = enabled ? 'Açık' : 'Kapalı';
    const dates = get('cart-discount-dates');
    dates.hidden = !enabled;
    dates.disabled = !enabled;
    get('cart-discount-start').value = selectedDates.startsOn;
    get('cart-discount-end').value = selectedDates.endsOn;
    get('cart-discount-save').disabled = !enabled || cartCampaignKey(selectedDates) === key;
    const today = globalThis.FuarPricing?.today() || '';
    const active = enabled && Boolean(globalThis.FuarPricing?.resolveCartDiscount?.(campaign));
    const state = !enabled ? 'off' : active ? 'active' : today && today < campaign.startsOn ? 'planned' : 'expired';
    get('cart-discount-form').dataset.state = state;
    get('cart-discount-status').textContent = { off: 'Kapalı', active: 'Bugün geçerli', planned: 'Planlandı', expired: 'Süresi doldu' }[state];
    const changed = key !== cartCampaignKey((publicSource || store.defaults()).cartDiscount);
    const source = changed ? 'Bu cihazdaki taslak · Vitrin henüz değişmedi.' : 'Kaynak katalogdaki ayar.';
    get('cart-discount-feedback').textContent = cartDiscountDateDraft && cartCampaignKey(cartDiscountDateDraft) !== key
      ? 'Tarih değişikliği henüz kaydedilmedi.'
      : enabled ? `${discountRange(campaign)} · ${source}` : `Sepette ek indirim uygulanmaz. ${source}`;
  }

  function changeCartDiscount(enabled, dates = null) {
    const next = store.read();
    if (cartCampaignKey(next.cartDiscount) !== cartDiscountSnapshot) throw new Error('Sepet indirimi başka bir sekmede değişti. Güncel ayarı kontrol edip yeniden deneyin.');
    if (enabled) {
      const campaign = dates || defaultCartCampaign(next);
      const pricing = globalThis.FuarPricing;
      if (!pricing?.validateCartDiscount) throw new Error('Sepet indirimi doğrulaması yüklenemedi. Sayfayı yenileyin.');
      const error = pricing.validateCartDiscount(campaign);
      if (error) throw new Error(error);
      next.cartDiscount = campaign;
    } else delete next.cartDiscount;
    commit(next, enabled ? dates ? 'Sepet indirimi tarihleri güncellendi.' : 'Sepette %5 indirim açıldı.' : 'Sepette %5 indirim kapatıldı.');
    cartDiscountDateDraft = null;
    get('cart-discount-error').textContent = '';
    renderCartDiscount();
  }

  function applyBulkDiscount(event) {
    event.preventDefault();
    if (!bulkCampaign || !get('bulk-discount-form').reportValidity()) return;
    const error = get('bulk-discount-error');
    error.textContent = '';
    const { rate, snapshot } = bulkCampaign;
    const pricing = globalThis.FuarPricing;
    const startsOn = get('bulk-discount-start').value;
    const endsOn = get('bulk-discount-end').value;
    try {
      const next = store.read();
      if (campaignSnapshot(next.products) !== snapshot) {
        throw new Error('Katalog başka bir sekmede değişti. Pencereyi kapatıp oranı yeniden seçin.');
      }
      let count = 0;
      for (const product of next.products) {
        if (product.price <= 0) continue;
        product.discount = { price: pricing.discountedPrice(product.price, rate), previousPrice: product.price, startsOn, endsOn };
        const validation = pricing.validate(product);
        if (validation) throw new Error(validation);
        count += 1;
      }
      const message = `${count} ürüne %${rate} indirim uygulandı.`;
      commit(next, message);
      const feedback = get('bulk-discount-feedback');
      feedback.textContent = `${message} ${discountRange({ startsOn, endsOn })} · Katalog taslağı`;
      feedback.hidden = false;
      closeDialog(get('bulk-discount-dialog'));
    } catch (failure) {
      error.textContent = failure.message;
    }
  }

  function record(message) {
    activity.unshift({ message, time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) });
    activity.splice(6);
  }

  function commit(next, message) {
    if (store.draftInfo?.().stale) throw new Error('Önce önceki taslağınızı indirin veya Genel Bakış bölümünden kurtarın.');
    writing = true;
    try { data = store.save(next); }
    finally { writing = false; }
    record(message);
    render();
    // Canlı yayın katmanı açıksa (admin-live.js) ipucu oradan gelir: "Canlıya al"a basılana kadar vitrin değişmez.
    notify(`${message} ${window.FuarLive?.hint?.() ?? 'Bu cihazdaki taslağa kaydedildi; vitrin değişmedi.'}`);
  }

  function productPhoto(product, className) {
    const img = node('img', className);
    img.alt = product.alt || product.name;
    img.loading = 'lazy';
    img.src = store.assetUrl(product.image);
    img.addEventListener('error', () => { img.src = './assets/brand-plant-crest.png'; }, { once: true });
    return img;
  }

  function renderStats() {
    const active = data.products.filter((product) => product.active);
    get('stat-active').textContent = active.length;
    get('stat-green').textContent = active.filter((product) => product.category !== 'wreaths').length;
    get('stat-wreath').textContent = active.filter((product) => product.category === 'wreaths').length;
    get('stat-regions').textContent = Object.values(data.settings.regions).filter(Boolean).length;
  }

  function renderOverview() {
    const preview = get('overview-products');
    preview.replaceChildren();
    for (const product of orderedProducts(data).filter((item) => item.active).slice(0, 4)) {
      const card = node('article', 'mini-card');
      card.append(productPhoto(product, 'mini-card-image'));
      const copy = node('div', 'mini-card-copy');
      copy.append(node('strong', '', product.name), priceBlock(product));
      const edit = node('button', 'text-button', 'Düzenle');
      edit.type = 'button';
      edit.setAttribute('aria-label', `${product.name} ürününü düzenle`);
      edit.addEventListener('click', () => editProduct(product.id));
      copy.append(edit);
      card.append(copy);
      preview.append(card);
    }
    if (!preview.children.length) preview.append(node('p', 'muted', 'Vitrinde aktif ürün bulunmuyor. Ürün Yönetimi bölümünden ürün ekleyebilirsiniz.'));

    const categories = get('overview-category-list');
    categories.replaceChildren();
    for (const category of data.categories) {
      const count = data.products.filter((product) => product.active && product.category === category.id).length;
      const row = node('div', 'category-summary-row');
      row.append(node('span', '', category.name), node('strong', '', `${count} ürün`));
      categories.append(row);
    }

    const log = get('activity-list');
    log.replaceChildren();
    if (!activity.length) {
      log.append(node('li', 'activity-empty', 'Bu oturumda henüz değişiklik yapılmadı.'));
    }
    for (const item of activity) {
      const row = node('li', 'activity-item');
      row.append(node('span', '', item.message), node('time', '', item.time));
      log.append(row);
    }
  }

  function renderProducts() {
    const search = get('product-search').value.trim().toLocaleLowerCase('tr-TR');
    const category = get('product-filter').value;
    const status = get('product-status-filter')?.value || 'all';
    const sorting = get('product-sort')?.value || 'catalog';
    const shown = orderedProducts(data).filter((product) => {
      const matchesName = product.name.toLocaleLowerCase('tr-TR').includes(search);
      const matchesStatus = status === 'all'
        || (status === 'active' && product.active)
        || (status === 'inactive' && !product.active)
        || (status === 'out-of-stock' && product.inStock === false);
      return matchesName && matchesStatus && (!category || category === 'all' || product.category === category);
    });
    if (sorting === 'price-asc') shown.sort((a, b) => productPricing(a).price - productPricing(b).price);
    if (sorting === 'price-desc') shown.sort((a, b) => productPricing(b).price - productPricing(a).price);
    if (sorting === 'name') shown.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    get('product-count').textContent = `${shown.length} / ${data.products.length} ürün`;
    get('products-empty').hidden = shown.length > 0;
    const body = get('products-body');
    body.replaceChildren();

    for (const product of shown) {
      const row = node('tr');
      const productCell = node('td');
      const productInfo = node('div', 'product-cell');
      const copy = node('div', 'product-meta');
      copy.append(node('strong', '', product.name));
      const rank = rankOf(product);
      copy.append(node('small', 'product-order-note', rank ? `Öne çıkan · ${rank}. sırada` : product.sortOrder != null ? `Vitrin sırası · ${product.sortOrder}` : 'Otomatik vitrin sırası'));
      productInfo.append(productPhoto(product, 'product-thumb'), copy);
      productCell.append(productInfo);
      const price = node('td');
      price.append(priceBlock(product));
      const badge = node('td');
      badge.append(node('span', product.badge ? 'badge-chip' : 'muted', badgeName(product.badge) || '—'));
      const status = node('td');
      const statusButton = node('button', `status-toggle ${product.active ? 'is-active' : 'is-inactive'}`, product.active ? 'Aktif' : 'Gizli');
      statusButton.type = 'button';
      statusButton.dataset.action = 'toggle';
      statusButton.dataset.id = product.id;
      statusButton.setAttribute('aria-label', `${product.name} ürününü ${product.active ? 'gizle' : 'aktifleştir'}`);
      statusButton.setAttribute('aria-pressed', String(product.active));
      const states = node('div', 'product-status');
      states.append(statusButton);
      if (product.inStock === false) states.append(node('span', 'status-pill is-out-of-stock', 'Stokta yok'));
      status.append(states);
      const actions = node('td');
      const buttons = node('div', 'row-actions');
      for (const [action, label, glyph] of [['edit', 'Düzenle', 'pencil'], ['delete', 'Sil', 'trash-2']]) {
        const button = node('button', action === 'delete' ? 'row-action row-action--danger' : 'row-action');
        button.type = 'button';
        button.dataset.action = action;
        button.dataset.id = product.id;
        button.setAttribute('aria-label', `${product.name} ürününü ${label.toLocaleLowerCase('tr-TR')}`);
        button.append(icon(glyph), node('span', '', label));
        buttons.append(button);
      }
      actions.append(buttons);
      row.append(productCell, node('td', '', categoryName(product.category)), price, badge, status, actions);
      ['Ürün', 'Kategori', 'Fiyat', 'Rozet', 'Durum', 'İşlemler'].forEach((label, index) => { row.children[index].dataset.label = label; });
      body.append(row);
    }
    refreshIcons();
    savePreference(filterKey, JSON.stringify({ search: get('product-search').value, category, status: get('product-status-filter')?.value || 'all', sort: sorting }));
  }

  function populateSelect(select, entries, emptyLabel) {
    const selected = select.value;
    select.replaceChildren();
    if (emptyLabel) select.append(new Option(emptyLabel, ''));
    for (const entry of entries) select.append(new Option(entry.name, entry.id));
    if ([...select.options].some((option) => option.value === selected)) select.value = selected;
  }

  function renderTaxonomy() {
    for (const [type, items] of [['categories', data.categories], ['badges', data.badges]]) {
      const fields = get(`${type}-fields`);
      fields.replaceChildren();
      for (const item of items) {
        const label = node('label', 'field');
        const input = node('input', 'form-input');
        input.name = `${type}-${item.id}`;
        input.dataset.id = item.id;
        input.required = true;
        input.maxLength = type === 'categories' ? 50 : 70;
        input.value = item.name;
        if (type === 'categories') { input.readOnly = true; input.setAttribute('aria-readonly', 'true'); }
        label.append(node('span', 'field-label', item.name), input);
        fields.append(label);
      }
    }
  }

  function renderSettings() {
    const settings = window.FUAR_ADMIN_META?.settings || store.defaults().settings;
    get('setting-whatsapp').value = settings.whatsapp;
    get('setting-vat').value = settings.vat;
    get('setting-announcement').value = settings.announcement;
    get('setting-region-tuyap').checked = settings.regions.tuyap;
    get('setting-region-ifm').checked = settings.regions.ifm;
    get('settings-form').querySelectorAll('input,button[type="submit"]').forEach(el => { el.disabled = true; });
  }

  // ---- En çok satanlar (1–5): ana sayfa sırası ve "En Çok Satan" madalyası bu seçimden gelir.
  const BESTSELLER_SLOTS = 5;
  let bestsellerSelection = null;
  let bestsellerSignature = '';

  function currentBestsellers(catalog = data) {
    const slots = Array(BESTSELLER_SLOTS).fill('');
    for (const product of catalog.products) {
      const rank = rankOf(product, catalog);
      if (product.active !== false && Number.isInteger(rank) && rank >= 1 && rank <= BESTSELLER_SLOTS) slots[rank - 1] = product.id;
    }
    return slots;
  }

  function renderBestsellers() {
    const list = get('bestsellers-slots');
    if (!list) return;
    const saved = currentBestsellers();
    const signature = saved.join('|');
    if (bestsellerSelection === null || signature !== bestsellerSignature) {
      bestsellerSelection = [...saved];
      bestsellerSignature = signature;
    }
    const sellable = orderedProducts(data).filter(product => product.active !== false);
    list.replaceChildren();
    bestsellerSelection.forEach((id, index) => {
      const item = node('li', `bestsellers__slot${id ? '' : ' is-empty'}`);
      const head = node('div', 'bestsellers__slot-head');
      head.append(node('span', 'bestsellers__rank', String(index + 1)), node('span', 'bestsellers__slot-label', `${index + 1}. sıra`));
      item.append(head);
      const chosen = data.products.find(product => product.id === id);
      if (chosen) item.append(productPhoto(chosen, 'bestsellers__thumb'));
      const select = node('select', 'bestsellers__select');
      select.dataset.bestsellerSlot = String(index);
      select.setAttribute('aria-label', `${index + 1}. sıradaki ürün`);
      select.append(new Option(index === 0 ? 'Ürün seçin' : '— Boş —', ''));
      for (const product of sellable) select.append(new Option(`${product.name}${product.inStock === false ? ' (stokta yok)' : ''}`, product.id));
      select.value = id;
      item.append(select);
      list.append(item);
    });
    const dirty = bestsellerSelection.join('|') !== bestsellerSignature;
    get('bestsellers-save').disabled = !dirty;
    get('bestsellers-reset').disabled = !dirty;
  }

  function changeBestsellerSlot(index, id) {
    const previous = bestsellerSelection[index];
    const other = id ? bestsellerSelection.indexOf(id) : -1;
    if (other >= 0 && other !== index) bestsellerSelection[other] = previous;
    bestsellerSelection[index] = id;
    get('bestsellers-error').textContent = '';
    renderBestsellers();
    get('bestsellers-slots').querySelector(`[data-bestseller-slot="${index}"]`)?.focus();
  }

  function saveBestsellers(event) {
    event.preventDefault();
    const error = get('bestsellers-error');
    error.textContent = '';
    const chosen = [...bestsellerSelection];
    const filled = chosen.filter(Boolean);
    if (!filled.length) { error.textContent = 'En az bir ürün seçin.'; return; }
    const gap = chosen.findIndex((id, index) => !id && chosen.slice(index + 1).some(Boolean));
    if (gap >= 0) { error.textContent = `${gap + 1}. sıra boş kalamaz; sıralar 1'den başlayarak dolu olmalı.`; return; }
    try {
      const next = store.read();
      if (currentBestsellers(next).join('|') !== bestsellerSignature) throw new Error('Katalog başka bir sekmede değişti. Sayfayı yenileyip sıralamayı yeniden seçin.');
      for (const id of filled) {
        const product = next.products.find(item => item.id === id);
        if (!product || product.active === false) throw new Error('Seçilen ürünlerden biri artık yayında değil. Sıralamayı yeniden seçin.');
      }
      for (const product of next.products) {
        const index = chosen.indexOf(product.id);
        product.bestsellerRank = index >= 0 ? index + 1 : null;
        if (index >= 0) product.badge = 'best-seller';
        else if (product.badge === 'best-seller') product.badge = '';
      }
      commit(next, `En çok satan sıralaması güncellendi (${filled.length} ürün).`);
    } catch (failure) {
      error.textContent = failure.message;
    }
  }

  function render() {
    renderStats();
    renderOverview();
    populateSelect(get('product-filter'), data.categories, 'Tüm kategoriler');
    renderProducts();
    renderBulkDiscount();
    renderBestsellers();
    renderCartDiscount();
    renderTaxonomy();
    renderSettings();
    renderCatalogStatus();
    refreshIcons();
  }

  function setView(view) {
    if (!titles[view]) return;
    for (const panel of document.querySelectorAll('[data-panel]')) panel.hidden = panel.dataset.panel !== view;
    for (const option of document.querySelectorAll('[data-view]')) {
      const selected = option.dataset.view === view;
      option.classList.toggle('is-selected', selected);
      if (selected) option.setAttribute('aria-current', 'page');
      else option.removeAttribute('aria-current');
    }
    [get('page-title').textContent, get('page-subtitle').textContent] = titles[view];
    savedView = view;
    savePreference('fuar-admin-view', view);
    setMobileMenu(false);
  }

  function setMobileMenu(open) {
    get('dashboard').classList.toggle('is-sidebar-open', open);
    get('mobile-menu-toggle').setAttribute('aria-expanded', String(open));
    get('sidebar').inert = mobileSidebar.matches && !open;
    document.querySelector('.admin-main').inert = mobileSidebar.matches && open;
  }

  function setTheme(dark) {
    document.documentElement.classList.toggle('dark', dark);
    get('theme-toggle').setAttribute('aria-label', dark ? 'Açık temaya geç' : 'Koyu temaya geç');
    get('theme-toggle').setAttribute('aria-pressed', String(dark));
    get('theme-toggle').replaceChildren(icon(dark ? 'sun' : 'moon'));
    savePreference(themeKey, dark ? 'dark' : 'light');
    refreshIcons();
  }

  function showDashboard() {
    data = store.read();
    render();
    get('lock-screen').hidden = true;
    get('dashboard').hidden = false;
    get('dashboard').classList.add('is-entering');
    setView(titles[savedView] ? savedView : 'overview');
    get('page-title').setAttribute('tabindex', '-1');
    get('page-title').focus({ preventScroll: true });
    void checkCatalog();
    window.dispatchEvent(new CustomEvent('fuar-admin', { detail: 'ready' }));
  }

  function lock(endSession = true) {
    if (auth?.enabled && endSession) void auth.signOut().catch(() => {});
    imageVersion += 1;
    editorState = '';
    localPreview = false;
    serverStatus = null;
    serverDraftContent = '';
    reviewedDraftHash = '';
    try { sessionStorage.removeItem(sessionKey); }
    catch { /* Clearing the visible panel still locks this page. */ }
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    setMobileMenu(false);
    adminPassword = '';
    get('publish-password').value = '';
    get('dashboard').hidden = true;
    get('lock-screen').hidden = false;
    get('login-input').value = '';
    if (get('login-email')) get('login-email').value = '';
    get('login-error').textContent = '';
    get('local-preview-button').hidden = true;
    get('login-input').focus();
    window.dispatchEvent(new CustomEvent('fuar-admin', { detail: 'locked' }));
  }

  function unlock() {
    try { sessionStorage.setItem(sessionKey, 'unlocked'); }
    catch { notify('Oturum depolaması kapalı. Sayfa yenilendiğinde yeniden giriş gerekecek.'); }
    showDashboard();
  }

  // Şifreyi sunucuya doğrulatır. ok: şifre doğru; denied: sunucu reddetti (hatalı şifre, çok deneme, ayar eksik);
  // unreachable/unavailable: sunucuya ulaşılamadı veya bu ortamda PHP yok (yerel önizleme gibi).
  async function verifyPassword(password) {
    let response;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      response = await fetch(loginUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ eylem: 'giris', sifre: password })
      });
    } catch {
      clearTimeout(timer);
      return { status: 'unreachable', message: 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.' };
    }
    const result = await response.json().catch(() => null);
    clearTimeout(timer);
    if (result && typeof result.ok === 'boolean') {
      return response.ok && result.ok ? { status: 'ok' } : { status: 'denied', message: result.error || 'Giriş reddedildi.' };
    }
    return { status: 'unavailable', message: `Bu ortamda giriş doğrulanamıyor. Sunucuda PHP ve config.php gerekir. (Sunucu yanıtı: ${response.status})` };
  }

  function previewImage(src) {
    const valid = store.validateImage(src);
    get('product-preview').hidden = !valid;
    get('product-preview-empty').hidden = valid;
    if (valid) get('product-preview').src = store.assetUrl(src);
    else get('product-preview').removeAttribute('src');
  }

  function editProduct(id = '') {
    data = store.read();
    const product = data.products.find((item) => item.id === id);
    get('product-form').reset();
    get('product-id').value = product?.id || '';
    get('product-name').value = product?.name || '';
    populateSelect(get('product-category'), data.categories);
    get('product-category').value = product?.category || data.categories[0].id;
    populateSelect(get('product-badge'), data.badges, 'Yok');
    get('product-badge').value = product?.badge || '';
    get('product-price').value = product?.price ?? '';
    get('product-discount-enabled').checked = Boolean(product?.discount);
    get('product-discount-price').value = product?.discount?.price ?? '';
    get('product-discount-previous-price').value = product?.discount?.previousPrice ?? '';
    get('product-discount-start').value = product?.discount?.startsOn || '';
    get('product-discount-end').value = product?.discount?.endsOn || '';
    get('product-active').checked = product?.active ?? true;
    get('product-out-of-stock').checked = product?.inStock === false;
    get('product-sort-order').value = product?.sortOrder ?? '';
    get('product-bestseller-rank').value = product ? rankOf(product) ?? '' : '';
    editorRanking = get('product-bestseller-rank').value;
    selectedImage = product?.image || '';
    get('product-image').value = selectedImage.startsWith('data:') ? '' : selectedImage;
    get('product-image').placeholder = selectedImage.startsWith('data:') ? 'Yüklü fotoğrafı değiştirmek için URL veya yol yazın' : './assets/products/urun.jpg veya https://…';
    get('product-form-error').textContent = '';
    get('save-product-button').removeAttribute('aria-busy');
    if (get('product-photo-status')) get('product-photo-status').textContent = '';
    get('save-product-button').disabled = false;
    const heading = get('product-dialog').querySelector('h2');
    if (heading) heading.textContent = product ? 'Ürünü düzenle' : 'Yeni ürün ekle';
    imageVersion += 1;
    editingSnapshot = product ? JSON.stringify(product) : '';
    previewImage(selectedImage);
    updateDiscountPreview();
    openDialog(get('product-dialog'));
    editorState = editorValue();
  }

  async function uploadImage(file) {
    if (!file) return;
    const version = ++imageVersion;
    const error = get('product-form-error');
    get('save-product-button').disabled = false;
    error.textContent = '';
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      error.textContent = 'JPG, PNG, WebP veya GIF formatında fotoğraf seçin.';
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      error.textContent = 'Lütfen 12 MB veya daha küçük bir fotoğraf seçin.';
      return;
    }
    get('save-product-button').disabled = true;
    get('save-product-button').setAttribute('aria-busy', 'true');
    if (get('product-photo-status')) get('product-photo-status').textContent = 'Fotoğraf hazırlanıyor…';
    try {
      const encoded = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Fotoğraf okunamadı. Lütfen yeniden seçin.'));
        reader.readAsDataURL(file);
      });
      const photo = new Image();
      photo.src = encoded;
      await photo.decode();
      if (!photo.naturalWidth || !photo.naturalHeight || photo.naturalWidth * photo.naturalHeight > 40_000_000) throw new Error('Fotoğraf en fazla 40 megapiksel olabilir. Daha küçük bir kopyasını seçin.');
      const scale = Math.min(1, 1200 / Math.max(photo.naturalWidth, photo.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(photo.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(photo.naturalHeight * scale));
      canvas.getContext('2d').drawImage(photo, 0, 0, canvas.width, canvas.height);
      if (version !== imageVersion) return;
      selectedImage = canvas.toDataURL('image/webp', 0.86);
      get('product-image').value = '';
      get('product-image').placeholder = `${file.name} yüklendi. Değiştirmek için başka URL yazabilirsiniz.`;
      previewImage(selectedImage);
    } catch (failure) {
      if (version === imageVersion) error.textContent = failure.message || 'Fotoğraf yüklenemedi.';
    } finally {
      if (version === imageVersion) {
        get('save-product-button').disabled = false;
        get('save-product-button').removeAttribute('aria-busy');
        if (get('product-photo-status')) get('product-photo-status').textContent = error.textContent ? '' : 'Fotoğraf hazır. Ürünü kaydederek taslağa ekleyin.';
      }
    }
  }

  function exportData() {
    data = store.read();
    refreshExport();
    if (adminPassword && !get('publish-password').value) get('publish-password').value = adminPassword;
    openDialog(get('export-dialog'));
  }

  function refreshExport() {
    const latest = store.read();
    const key = content(latest);
    if (exportedContent !== key || !get('export-code').value) {
      get('export-code').value = store.exportSource(latest);
      exportedContent = key;
    }
    return { source: get('export-code').value, content: key };
  }

  if (!store) {
    get('login-error').textContent = 'Ürün verisi yüklenemedi. İnternet bağlantınızı kontrol edip sayfayı yenileyin.';
    return;
  }

  get('login-input').addEventListener('input', (event) => {
    get('login-error').textContent = '';
    event.target.removeAttribute('aria-invalid');
  });

  get('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = get('login-input');
    const submit = get('login-submit');
    const password = input.value;
    if (!password || submit.disabled) return;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    get('login-error').textContent = '';
    let result;
    if (auth?.enabled) {
      try {
        await auth.signIn(get('login-email').value, password);
        await api('durum', '');
        result = { status: 'ok' };
      } catch (error) {
        await auth.signOut().catch(() => {});
        result = { status: 'denied', message: error.message || 'Giriş doğrulanamadı.' };
      }
    } else result = await verifyPassword(password);
    submit.disabled = false;
    submit.removeAttribute('aria-busy');
    if (result.status !== 'ok') {
      get('login-error').textContent = result.message;
      // Yalnızca bu bilgisayardaki (localhost) önizlemede, sunucu hiç yanıt vermiyorsa yerel açılış sunulur.
      get('local-preview-button').hidden = !(!auth?.enabled && isLocalHost && result.status !== 'denied');
      if (result.status === 'denied') {
        input.setAttribute('aria-invalid', 'true');
        get('login-form').classList.remove('is-shaking');
        void get('login-form').offsetWidth;
        get('login-form').classList.add('is-shaking');
        input.select();
      }
      return;
    }
    adminPassword = auth?.enabled ? '' : password;
    input.value = '';
    unlock();
  });

  // Yerel önizleme (localhost, PHP yok): giriş doğrulanamaz ve yayınlama da çalışmaz; düzenleme ve dışa aktarma kullanılabilir.
  get('local-preview-button').addEventListener('click', () => {
    if (auth?.enabled || !isLocalHost) return;
    localPreview = true;
    get('login-input').value = '';
    get('login-error').textContent = '';
    get('local-preview-button').hidden = true;
    unlock();
    notify('Yerel önizleme: düzenleme ve indirme açık; sunucu kaydı kapalı.');
  });

  get('logout-button').addEventListener('click', lock);
  get('theme-toggle').addEventListener('click', () => setTheme(!document.documentElement.classList.contains('dark')));
  get('sidebar-toggle').addEventListener('click', () => {
    const collapsed = get('dashboard').classList.toggle('is-collapsed');
    get('sidebar-toggle').setAttribute('aria-expanded', String(!collapsed));
    get('sidebar-toggle').setAttribute('aria-label', collapsed ? 'Kenar menüsünü genişlet' : 'Kenar menüsünü daralt');
    savePreference(sidebarKey, collapsed ? 'collapsed' : 'expanded');
  });
  get('mobile-menu-toggle').addEventListener('click', () => {
    const open = !get('dashboard').classList.contains('is-sidebar-open');
    setMobileMenu(open);
    if (open) get('sidebar').querySelector('[data-view]').focus();
  });
  get('sidebar-scrim').addEventListener('click', () => {
    setMobileMenu(false);
    get('mobile-menu-toggle').focus();
  });
  mobileSidebar.addEventListener('change', () => setMobileMenu(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && get('dashboard').classList.contains('is-sidebar-open')) {
      setMobileMenu(false);
      get('mobile-menu-toggle').focus();
    }
  });

  for (const option of document.querySelectorAll('[data-view]')) option.addEventListener('click', () => setView(option.dataset.view));
  for (const close of document.querySelectorAll('[data-close-dialog]')) close.addEventListener('click', () => closeDialog(get(close.dataset.closeDialog)));
  get('product-dialog').addEventListener('cancel', event => {
    event.preventDefault();
    closeDialog(get('product-dialog'));
  });
  get('product-dialog').addEventListener('close', () => { imageVersion += 1; editorState = ''; });
  window.addEventListener('beforeunload', event => {
    if (get('product-dialog').open && editorState && editorValue() !== editorState) { event.preventDefault(); event.returnValue = ''; }
  });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !get('dashboard').hidden && !document.querySelector('dialog[open]')) {
      event.preventDefault();
      setView('products');
      get('product-search').focus();
    }
  });
  get('confirm-action').addEventListener('click', () => {
    const action = confirmAction;
    confirmAction = null;
    closeDialog(get('confirm-dialog'));
    action?.();
  });
  get('product-search').addEventListener('input', renderProducts);
  get('product-filter').addEventListener('change', renderProducts);
  get('product-status-filter')?.addEventListener('change', renderProducts);
  get('product-sort')?.addEventListener('change', renderProducts);
  get('clear-product-filters')?.addEventListener('click', () => {
    get('product-search').value = '';
    get('product-filter').value = '';
    get('product-status-filter').value = 'all';
    get('product-sort').value = 'catalog';
    renderProducts();
    get('product-search').focus();
  });
  get('add-product-button').addEventListener('click', () => editProduct());
  for (const button of document.querySelectorAll('[data-bulk-rate]')) {
    button.addEventListener('click', () => openBulkDiscount(Number(button.dataset.bulkRate)));
  }
  get('bulk-discount-form').addEventListener('submit', applyBulkDiscount);
  get('bestsellers-slots').addEventListener('change', (event) => {
    const select = event.target.closest('[data-bestseller-slot]');
    if (select) changeBestsellerSlot(Number(select.dataset.bestsellerSlot), select.value);
  });
  get('bestsellers-form').addEventListener('submit', saveBestsellers);
  get('bestsellers-reset').addEventListener('click', () => {
    bestsellerSelection = [...currentBestsellers()];
    get('bestsellers-error').textContent = '';
    renderBestsellers();
  });
  get('bulk-discount-dialog').addEventListener('cancel', (event) => {
    event.preventDefault();
    closeDialog(get('bulk-discount-dialog'));
  });
  get('bulk-discount-dialog').addEventListener('close', () => { bulkCampaign = null; });
  get('cart-discount-enabled').addEventListener('change', event => {
    try { changeCartDiscount(event.target.checked); }
    catch (error) {
      renderCartDiscount();
      get('cart-discount-error').textContent = error.message;
    }
  });
  for (const id of ['cart-discount-start', 'cart-discount-end']) {
    get(id).addEventListener('input', () => {
      cartDiscountDateDraft = { startsOn: get('cart-discount-start').value, endsOn: get('cart-discount-end').value };
      get('cart-discount-error').textContent = '';
      get('cart-discount-save').disabled = cartCampaignKey(cartDiscountDateDraft) === cartDiscountSnapshot;
      get('cart-discount-feedback').textContent = 'Tarih değişikliği henüz kaydedilmedi.';
    });
  }
  get('cart-discount-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!get('cart-discount-form').reportValidity()) return;
    try { changeCartDiscount(true, { startsOn: get('cart-discount-start').value, endsOn: get('cart-discount-end').value }); }
    catch (error) { get('cart-discount-error').textContent = error.message; }
  });

  get('products-body').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    data = store.read();
    const product = data.products.find((item) => item.id === button.dataset.id);
    if (!product) return;
    if (button.dataset.action === 'edit') return editProduct(product.id);
    if (button.dataset.action === 'delete') {
      if (store.defaults().products.some(item => item.id === product.id)) {
        return notify('Mevcut ürün adresini korumak için ürün silinmez. Pakette kullanılmıyorsa ürünü gizleyebilirsiniz.', true);
      }
      requestConfirmation('Ürünü sil', `“${product.name}” ürününü bu tarayıcıdaki katalogdan silmek istediğinize emin misiniz?`, 'Ürünü sil', () => {
        try {
          const next = store.read();
          next.products = next.products.filter((item) => item.id !== product.id);
          commit(next, `${product.name} silindi.`);
        } catch (failure) { notify(failure.message, true); }
      });
      return;
    }
    try {
      const next = store.read();
      const item = next.products.find((candidate) => candidate.id === product.id);
      if (item.active && protectedIds.has(item.id)) return notify('Bu ürün bir fuar paketinde kullanılıyor. Gizlemek için önce paket içeriğinin düzenlenmesi gerekir.', true);
      item.active = !item.active;
      commit(next, `${product.name} ${item.active ? 'aktifleştirildi.' : 'vitrinden gizlendi.'}`);
    } catch (failure) { notify(failure.message, true); }
  });

  get('product-image').addEventListener('input', (event) => {
    imageVersion += 1;
    get('save-product-button').disabled = false;
    get('save-product-button').removeAttribute('aria-busy');
    selectedImage = event.target.value.trim();
    previewImage(selectedImage);
  });
  get('product-file').addEventListener('change', (event) => uploadImage(event.target.files[0]));
  get('product-preview').addEventListener('error', () => {
    get('product-preview').hidden = true;
    get('product-preview-empty').hidden = false;
    get('product-form-error').textContent = 'Fotoğraf önizlenemedi. Bağlantıyı ve dosya yolunu kontrol edin.';
  });
  get('product-discount-enabled').addEventListener('change', () => {
    if (get('product-discount-enabled').checked) {
      const today = globalThis.FuarPricing?.today();
      if (today) {
        if (!get('product-discount-start').value) get('product-discount-start').value = today;
        if (!get('product-discount-end').value) get('product-discount-end').value = today;
      }
    }
    updateDiscountPreview();
  });
  for (const id of ['product-price', 'product-discount-price', 'product-discount-previous-price', 'product-discount-start', 'product-discount-end']) {
    get(id).addEventListener('input', updateDiscountPreview);
    get(id).addEventListener('change', updateDiscountPreview);
  }
  for (const name of ['dragenter', 'dragover']) get('product-dropzone').addEventListener(name, (event) => {
    event.preventDefault();
    get('product-dropzone').classList.add('is-dragging');
  });
  for (const name of ['dragleave', 'drop']) get('product-dropzone').addEventListener(name, (event) => {
    event.preventDefault();
    get('product-dropzone').classList.remove('is-dragging');
  });
  get('product-dropzone').addEventListener('drop', (event) => uploadImage(event.dataTransfer.files[0]));

  get('product-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const error = get('product-form-error');
    error.textContent = '';
    const name = get('product-name').value.trim();
    const price = Number(get('product-price').value);
    if (!name || !Number.isFinite(price) || price < 0) {
      error.textContent = 'Ürün adını ve geçerli bir fiyatı girin.';
      return;
    }
    if (!store.validateImage(selectedImage)) {
      error.textContent = 'Bir ürün fotoğrafı seçin veya geçerli bir görsel yolu girin.';
      return;
    }
    if (/^https?:\/\//i.test(selectedImage) || (!selectedImage.startsWith('data:') && /[?#]/.test(selectedImage))) {
      error.textContent = 'Yayın için fotoğrafı dosya olarak yükleyin veya assets/ altında mevcut bir dosya yolu girin. Uzak bağlantılar otomatik indirilmez.';
      return;
    }
    try {
      const next = store.read();
      const id = get('product-id').value;
      const old = next.products.find((product) => product.id === id);
      if (id && JSON.stringify(old) !== editingSnapshot) {
        error.textContent = 'Bu ürün başka bir sekmede değiştirildi. Pencereyi kapatıp ürünü yeniden açın.';
        return;
      }
      const category = get('product-category').value;
      const imageChanged = old?.image !== selectedImage;
      if (old?.active && !get('product-active').checked && protectedIds.has(old.id)) throw new Error('Bu ürün bir fuar paketinde kullanılıyor. Önce paket içeriği düzenlenmeli.');
      const rankText = get('product-bestseller-rank').value;
      const orderText = get('product-sort-order').value;
      if (rankText && (!Number.isInteger(Number(rankText)) || Number(rankText) < 1 || Number(rankText) > 5)) throw new Error('En çok satan önceliği 1 ile 5 arasında olmalı.');
      if (orderText && (!Number.isInteger(Number(orderText)) || Number(orderText) < 0 || Number(orderText) > 1_000_000)) throw new Error('Vitrin sırası 0 ile 1.000.000 arasında tam sayı olmalı.');
      const rankingChanged = rankText !== editorRanking;
      if (rankingChanged && !store.hasManagedRanking(next)) {
        const ranks = next.products.map(item => rankOf(item, next));
        next.products.forEach((item, index) => { item.bestsellerRank = ranks[index]; });
      }
      if (rankingChanged && rankText) {
        const conflict = next.products.find(item => item.id !== id && item.bestsellerRank === Number(rankText));
        if (conflict) throw new Error(`${rankText}. sıra “${conflict.name}” ürününde. Önce o ürünün önceliğini değiştirin veya kaldırın.`);
      }
      const selectedBadge = get('product-badge').value;
      if (selectedBadge === 'best-seller' && !rankText && !rankingChanged) throw new Error('En çok satan rozeti için 1–5 arasında bir öncelik seçin.');
      const product = {
        ...old,
        id: id || crypto.randomUUID(),
        name,
        category,
        price,
        discount: get('product-discount-enabled').checked ? editorDiscount() : null,
        image: selectedImage,
        alt: imageChanged || old?.name !== name ? name : old?.alt || name,
        label: old?.category === category ? old.label : '',
        badge: rankText ? 'best-seller' : rankingChanged && selectedBadge === 'best-seller' ? '' : selectedBadge,
        active: get('product-active').checked,
        inStock: !get('product-out-of-stock').checked,
        sharePage: old?.sharePage || `urunler/${id || ''}.html`,
        ...(orderText || Object.hasOwn(old || {}, 'sortOrder') ? { sortOrder: orderText ? Number(orderText) : null } : {}),
        ...(rankingChanged || Object.hasOwn(old || {}, 'bestsellerRank') ? { bestsellerRank: rankText ? Number(rankText) : null } : {}),
      };
      const discountError = globalThis.FuarPricing?.validate(product);
      if (discountError) throw new Error(discountError);
      if (product.discount && !globalThis.FuarPricing) throw new Error('Fiyat doğrulaması yüklenemedi. Sayfayı yenileyin; düzenlemenizi önce yedekleyin.');
      if (!old) product.sharePage = `urunler/${product.id}.html`;
      if (old) next.products[next.products.findIndex((item) => item.id === id)] = product;
      else next.products.push(product);
      commit(next, `${name} ${old ? 'güncellendi.' : 'eklendi.'}`);
      editorState = '';
      closeDialog(get('product-dialog'));
    } catch (failure) { error.textContent = failure.message; }
  });

  get('categories-form').addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const next = store.read();
      for (const type of ['badges']) {
        for (const item of next[type]) {
          const input = get(`${type}-fields`).querySelector(`[data-id="${item.id}"]`);
          const name = input.value.trim();
          if (!name) throw new Error('Kategori ve rozet adları boş bırakılamaz.');
          if (type === 'categories' && item.name !== name) {
            for (const product of next.products.filter(product => product.category === item.id)) product.label = '';
          }
          item.name = name;
        }
      }
      commit(next, 'Kategori ve rozet adları güncellendi.');
    } catch (failure) { notify(failure.message, true); }
  });

  get('settings-form').addEventListener('submit', (event) => {
    event.preventDefault();
    get('settings-error').textContent = 'Bu ayarlar merkezi proje dosyasından yönetilir; bu aşamada panelden değiştirilemez.';
  });

  window.addEventListener('online', () => { if (!get('dashboard').hidden) void checkCatalog(); });
  window.addEventListener('offline', () => {
    checkError = 'Bağlantı kesildi. Bu cihazdaki taslak korunuyor; sunucu kaydı doğrulanamaz.';
    renderCatalogStatus();
    publishStatus(checkError, true);
  });

  get('export-button').addEventListener('click', exportData);
  get('catalog-check-button')?.addEventListener('click', () => void checkCatalog());
  get('publish-server-button')?.addEventListener('click', async () => {
    const button = get('publish-server-button');
    const password = get('publish-password').value;
    if (button.disabled || localPreview) return;
    if (!password && !auth?.enabled) { publishStatus('Yönetici şifresini girin.', true); get('publish-password').focus(); return; }
    if (store.draftInfo?.().stale) return publishStatus('Önce eski taslağınızı Genel Bakış bölümünden indirin veya kurtarın.', true);
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    publishStatus('Sunucu durumu kontrol ediliyor…');
    try {
      const before = await api('durum', password);
      if (before.source?.revision !== store.defaults().revision) throw new Error('Kaynak katalog siz çalışırken değişti. Önce taslağınızı indirin, ardından sayfayı yenileyip sürümleri karşılaştırın.');
      // A different remote draft must be reviewed, never overwritten by a fresh automatic status read.
      if (before.draft?.sha256 && before.draft.sha256 !== reviewedDraftHash) {
        serverStatus = before;
        throw new Error('Sunucuda başka bir taslak var veya başka oturum değiştirdi. Önce sunucu taslağını indirin ve inceleyin.');
      }
      const snapshot = refreshExport();
      publishStatus('Özel sunucu taslağı kaydediliyor…');
      const result = await api('taslak-kaydet', password, { kaynak: snapshot.source, expectedSourceSha256: before.source.sha256, expectedDraftSha256: before.draft?.sha256 || null });
      serverStatus = result;
      serverDraftContent = snapshot.content;
      reviewedDraftHash = result.draft?.sha256 || '';
      adminPassword = auth?.enabled ? '' : password;
      publishStatus('Sunucu taslağı kaydedildi. Vitrin değişmedi; katalog aynı sürümden derlenip yüklendiğinde yayımlanır.');
      notify('Özel sunucu taslağı kaydedildi. Canlı vitrin değişmedi.');
    } catch (error) {
      publishStatus(`Kayıt doğrulanamadı: ${error.message}`, true);
      notify('Sunucu kaydı doğrulanamadı. Düzenlemeleriniz bu cihazda korunuyor.', true);
    } finally {
      button.removeAttribute('aria-busy');
      button.disabled = localPreview;
      renderCatalogStatus();
    }
  });
  get('download-data-button').addEventListener('click', () => {
    download(refreshExport().source, 'products-data.js', 'text/javascript;charset=utf-8');
    publishStatus('Katalog indirildi. Önce yerel içe aktarma ve derleme gerekir; bu dosyayı tek başına canlı siteye yüklemeyin.');
  });
  get('export-json-button')?.addEventListener('click', () => { download(JSON.stringify(store.parseSource(refreshExport().source), null, 2), 'fuar-katalog-taslak.json'); publishStatus('JSON yedeği indirildi. Taslağınız ve ürün fotoğraflarınız dosyada korunur.'); });
  get('download-server-draft-button')?.addEventListener('click', async () => {
    const button = get('download-server-draft-button');
    const password = get('publish-password').value || adminPassword;
    if ((!password && !auth?.enabled) || localPreview) { publishStatus('Sunucu taslağı için yönetici şifresini girin.', true); return; }
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    try {
      const result = await api('taslak-indir', password);
      download(result.kaynak, 'fuar-sunucu-taslagi.js', 'text/javascript;charset=utf-8');
      serverDraftContent = content(store.parseSource(result.kaynak));
      reviewedDraftHash = result.draft?.sha256 || '';
      serverStatus = await api('durum', password);
      publishStatus('Sunucu taslağı indirildi. Bu cihazdaki ürünler değiştirilmedi.');
    } catch (error) { publishStatus(error.message, true); }
    finally { button.disabled = localPreview; button.removeAttribute('aria-busy'); renderCatalogStatus(); }
  });
  get('copy-data-button').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(refreshExport().source);
      notify('Güncel veri kodu panoya kopyalandı.');
    } catch {
      const details = get('export-code').closest('details');
      if (details) details.open = true;
      get('export-code').focus();
      get('export-code').select();
      notify('Tarayıcı panoya erişemedi. Seçilen kodu Ctrl+C veya Kopyala ile kopyalayabilirsiniz.');
    }
  });
  get('reset-button').addEventListener('click', () => requestConfirmation(
    'Varsayılan ürünlere dön',
    'Bu cihazdaki taslak kaldırılarak sayfanın kaynak kataloğu yüklenecek. Sunucu taslağı ve canlı vitrin değişmez. Önce yedeğinizi indirmeniz önerilir.',
    'Varsayılana sıfırla',
    () => {
      try {
        writing = true;
        try { data = store.reset(); }
        finally { writing = false; }
        record('Varsayılan katalog yüklendi.');
        render();
        notify('Varsayılan ürünler ve ayarlar yüklendi.');
      } catch (failure) { notify(failure.message, true); }
    },
  ));

  // Canlı yayın katmanı taslağı canlı değerlerle eşitlediğinde (başka cihazdaki değişiklikler) liste yeniden çizilir.
  window.addEventListener('fuar-live-draft-changed', () => {
    if (get('dashboard').hidden) return;
    data = store.read();
    render();
  });

  store.subscribe(() => {
    if (writing || window.__fuarLiveWriting || get('dashboard').hidden) return;
    data = store.read();
    render();
    if (get('export-dialog').open) { refreshExport(); publishStatus('Katalog başka sekmede değişti. İndirilecek veri güncellendi; sunucu kaydından önce inceleyin.'); }
    notify('Katalog başka bir sekmede güncellendi.');
  });

  setTheme(preference(themeKey, 'light') === 'dark');
  try {
    const filters = JSON.parse(preference(filterKey, '{}'));
    get('product-search').value = filters.search || '';
    // Category options are populated on the first render.
    if (filters.category) get('product-filter').append(new Option('', filters.category));
    get('product-filter').value = filters.category || '';
    get('product-status-filter').value = ['all', 'active', 'inactive', 'out-of-stock'].includes(filters.status) ? filters.status : 'all';
    get('product-sort').value = ['catalog', 'price-asc', 'price-desc', 'name'].includes(filters.sort) ? filters.sort : 'catalog';
  } catch { /* Preferences do not prevent login. */ }
  const collapsed = preference(sidebarKey, 'expanded') === 'collapsed';
  get('dashboard').classList.toggle('is-collapsed', collapsed);
  get('sidebar-toggle').setAttribute('aria-expanded', String(!collapsed));
  let remembered = false;
  try { remembered = sessionStorage.getItem(sessionKey) === 'unlocked'; }
  catch { /* Giriş yine çalışır; yalnızca sayfa yenilenince yeniden giriş gerekir. */ }
  if (auth?.enabled) {
    get('login-email-field').hidden = false;
    get('login-email').disabled = false;
    get('login-email').required = true;
    get('login-note').textContent = 'Yalnız davetli yöneticiler giriş yapabilir. Şifreniz tarayıcıda saklanmaz.';
    get('publish-password').closest('label').hidden = true;
    auth.subscribe(user => { if (!user && !get('dashboard').hidden) lock(false); });
    void auth.restore().then(async user => {
      if (!user) return;
      await api('durum', '');
      showDashboard();
    }).catch(() => { get('login-error').textContent = 'Oturum doğrulanamadı. Yeniden giriş yapın.'; });
  }
  else if (remembered && isLocalHost) { localPreview = true; showDashboard(); }
  else get('login-input').focus();
  refreshIcons();
})();
