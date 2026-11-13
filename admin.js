(() => {
  'use strict';

  const store = window.FuarStore;
  const get = (id) => document.getElementById(id);
  const sessionKey = 'fuar-admin-session';
  const themeKey = 'fuar-admin-theme';
  const sidebarKey = 'fuar-admin-sidebar';
  const mobileSidebar = window.matchMedia('(max-width: 600px)');
  const titles = {
    overview: ['Genel Bakış', 'Ürünleriniz ve fuar teslimat bölgeleriniz bir arada.'],
    products: ['Ürün Yönetimi', 'Vitrindeki ürünleri, fiyatları ve fotoğrafları düzenleyin.'],
    categories: ['Kategoriler & Rozetler', 'Vitrinde görünen kategori ve rozet adlarını yönetin.'],
    settings: ['Fuar & İletişim Ayarları', 'Sipariş hattını, KDV oranını ve duyuru metnini düzenleyin.'],
  };
  let data;
  let selectedImage = '';
  let imageVersion = 0;
  let editingSnapshot = '';
  let toastTimer;
  let confirmAction;
  let returnFocus;
  let writing = false;
  const activity = [];

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

  function record(message) {
    activity.unshift({ message, time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) });
    activity.splice(6);
  }

  function commit(next, message) {
    writing = true;
    try { data = store.save(next); }
    finally { writing = false; }
    record(message);
    render();
    notify(`${message} Bu tarayıcıdaki vitrin güncellendi.`);
  }

  function productPhoto(product, className) {
    const img = node('img', className);
    img.alt = product.alt || product.name;
    img.loading = 'lazy';
    img.src = store.assetUrl(product.image);
    img.addEventListener('error', () => { img.src = './flower.svg'; }, { once: true });
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
    for (const product of data.products.filter((item) => item.active).slice(0, 4)) {
      const card = node('article', 'mini-card');
      card.append(productPhoto(product, 'mini-card-image'));
      const copy = node('div', 'mini-card-copy');
      copy.append(node('strong', '', product.name), node('span', '', store.formatPrice(product.price)));
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
    const shown = data.products.filter((product) => {
      const matchesName = product.name.toLocaleLowerCase('tr-TR').includes(search);
      return matchesName && (!category || category === 'all' || product.category === category);
    });
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
      productInfo.append(productPhoto(product, 'product-thumb'), copy);
      productCell.append(productInfo);
      const price = node('td');
      price.append(node('strong', '', store.formatPrice(product.price)), node('small', 'table-vat', `+ %${data.settings.vat} KDV`));
      const badge = node('td');
      badge.append(node('span', product.badge ? 'badge-chip' : 'muted', badgeName(product.badge) || '—'));
      const status = node('td');
      const statusButton = node('button', `status-toggle ${product.active ? 'is-active' : 'is-inactive'}`, product.active ? 'Aktif' : 'Gizli');
      statusButton.type = 'button';
      statusButton.dataset.action = 'toggle';
      statusButton.dataset.id = product.id;
      statusButton.setAttribute('aria-label', `${product.name} ürününü ${product.active ? 'gizle' : 'aktifleştir'}`);
      statusButton.setAttribute('aria-pressed', String(product.active));
      status.append(statusButton);
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
      body.append(row);
    }
    refreshIcons();
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
        label.append(node('span', 'field-label', item.name), input);
        fields.append(label);
      }
    }
  }

  function renderSettings() {
    get('setting-whatsapp').value = data.settings.whatsapp;
    get('setting-vat').value = data.settings.vat;
    get('setting-announcement').value = data.settings.announcement;
    get('setting-region-tuyap').checked = data.settings.regions.tuyap;
    get('setting-region-ifm').checked = data.settings.regions.ifm;
  }

  function render() {
    renderStats();
    renderOverview();
    populateSelect(get('product-filter'), data.categories, 'Tüm kategoriler');
    renderProducts();
    renderTaxonomy();
    renderSettings();
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
    setMobileMenu(false);
  }

  function setMobileMenu(open) {
    get('dashboard').classList.toggle('is-sidebar-open', open);
    get('mobile-menu-toggle').setAttribute('aria-expanded', String(open));
    get('sidebar').inert = mobileSidebar.matches && !open;
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
    setView('overview');
    get('page-title').setAttribute('tabindex', '-1');
    get('page-title').focus({ preventScroll: true });
  }

  function lock() {
    try { sessionStorage.removeItem(sessionKey); }
    catch { /* Clearing the visible panel still locks this page. */ }
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    setMobileMenu(false);
    get('dashboard').hidden = true;
    get('lock-screen').hidden = false;
    get('pin-input').value = '';
    get('pin-error').textContent = '';
    get('pin-input').focus();
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
    get('product-active').checked = product?.active ?? true;
    selectedImage = product?.image || '';
    get('product-image').value = selectedImage.startsWith('data:') ? '' : selectedImage;
    get('product-image').placeholder = selectedImage.startsWith('data:') ? 'Yüklü fotoğrafı değiştirmek için URL veya yol yazın' : './assets/products/urun.jpg veya https://…';
    get('product-form-error').textContent = '';
    get('save-product-button').disabled = false;
    const heading = get('product-dialog').querySelector('h2');
    if (heading) heading.textContent = product ? 'Ürünü düzenle' : 'Yeni ürün ekle';
    imageVersion += 1;
    editingSnapshot = product ? JSON.stringify(product) : '';
    previewImage(selectedImage);
    openDialog(get('product-dialog'));
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
      if (version === imageVersion) get('save-product-button').disabled = false;
    }
  }

  function exportData() {
    data = store.read();
    get('export-code').value = store.exportSource(data);
    openDialog(get('export-dialog'));
  }

  if (!store) {
    get('pin-error').textContent = 'Ürün verisi yüklenemedi. İnternet bağlantınızı kontrol edip sayfayı yenileyin.';
    return;
  }

  get('pin-input').addEventListener('input', (event) => {
    event.target.value = event.target.value.replace(/\D/g, '').slice(0, 4);
    get('pin-error').textContent = '';
    event.target.removeAttribute('aria-invalid');
  });

  get('pin-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (get('pin-input').value !== '0406') {
      get('pin-error').textContent = 'Hatalı PIN Kodu!';
      get('pin-input').setAttribute('aria-invalid', 'true');
      get('pin-form').classList.remove('is-shaking');
      void get('pin-form').offsetWidth;
      get('pin-form').classList.add('is-shaking');
      get('pin-input').select();
      return;
    }
    try { sessionStorage.setItem(sessionKey, 'unlocked'); }
    catch { notify('Oturum depolaması kapalı. Sayfa yenilendiğinde yeniden giriş gerekecek.'); }
    showDashboard();
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
  get('confirm-action').addEventListener('click', () => {
    const action = confirmAction;
    confirmAction = null;
    closeDialog(get('confirm-dialog'));
    action?.();
  });
  get('product-search').addEventListener('input', renderProducts);
  get('product-filter').addEventListener('change', renderProducts);
  get('add-product-button').addEventListener('click', () => editProduct());

  get('products-body').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    data = store.read();
    const product = data.products.find((item) => item.id === button.dataset.id);
    if (!product) return;
    if (button.dataset.action === 'edit') return editProduct(product.id);
    if (button.dataset.action === 'delete') {
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
      item.active = !item.active;
      commit(next, `${product.name} ${item.active ? 'aktifleştirildi.' : 'vitrinden gizlendi.'}`);
    } catch (failure) { notify(failure.message, true); }
  });

  get('product-image').addEventListener('input', (event) => {
    imageVersion += 1;
    get('save-product-button').disabled = false;
    selectedImage = event.target.value.trim();
    previewImage(selectedImage);
  });
  get('product-file').addEventListener('change', (event) => uploadImage(event.target.files[0]));
  get('product-preview').addEventListener('error', () => {
    get('product-preview').hidden = true;
    get('product-preview-empty').hidden = false;
    get('product-form-error').textContent = 'Fotoğraf önizlenemedi. Bağlantıyı ve dosya yolunu kontrol edin.';
  });
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
      const previewChanged = imageChanged || old?.name !== name || old?.price !== price;
      const product = {
        ...old,
        id: id || crypto.randomUUID(),
        name,
        category,
        price,
        image: selectedImage,
        alt: imageChanged || old?.name !== name ? name : old.alt,
        label: old?.category === category ? old.label : '',
        badge: get('product-badge').value,
        active: get('product-active').checked,
        sharePage: previewChanged ? '' : old.sharePage,
      };
      if (old) next.products[next.products.findIndex((item) => item.id === id)] = product;
      else next.products.push(product);
      commit(next, `${name} ${old ? 'güncellendi.' : 'eklendi.'}`);
      closeDialog(get('product-dialog'));
    } catch (failure) { error.textContent = failure.message; }
  });

  get('categories-form').addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const next = store.read();
      for (const type of ['categories', 'badges']) {
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
    get('settings-error').textContent = '';
    try {
      const next = store.read();
      next.settings.whatsapp = get('setting-whatsapp').value.replace(/[\s()+-]/g, '');
      next.settings.vat = Number(get('setting-vat').value);
      next.settings.announcement = get('setting-announcement').value.trim();
      next.settings.regions = { tuyap: get('setting-region-tuyap').checked, ifm: get('setting-region-ifm').checked };
      commit(next, 'Fuar ve iletişim ayarları kaydedildi.');
    } catch (failure) { get('settings-error').textContent = failure.message; }
  });

  get('export-button').addEventListener('click', exportData);
  get('download-data-button').addEventListener('click', () => {
    const blob = new Blob([get('export-code').value], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = node('a');
    link.href = url;
    link.download = 'products-data.js';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('products-data.js indirildi. Tüm ziyaretçilere yayınlamak için bu dosyayı GitHub deponuza yükleyin.');
  });
  get('copy-data-button').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(get('export-code').value);
      notify('Güncel veri kodu panoya kopyalandı.');
    } catch {
      get('export-code').focus();
      get('export-code').select();
      notify('Tarayıcı panoya erişemedi. Seçilen kodu Ctrl+C veya Kopyala ile kopyalayabilirsiniz.');
    }
  });
  get('reset-button').addEventListener('click', () => requestConfirmation(
    'Varsayılan ürünlere dön',
    'Bu tarayıcıdaki ürün ve ayar değişiklikleri kaldırılarak sitede yayınlanan varsayılan katalog yüklenecek.',
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

  store.subscribe(() => {
    if (writing || get('dashboard').hidden) return;
    data = store.read();
    render();
    notify('Katalog başka bir sekmede güncellendi.');
  });

  setTheme(preference(themeKey, matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') === 'dark');
  const collapsed = preference(sidebarKey, 'expanded') === 'collapsed';
  get('dashboard').classList.toggle('is-collapsed', collapsed);
  get('sidebar-toggle').setAttribute('aria-expanded', String(!collapsed));
  let remembered = false;
  try { remembered = sessionStorage.getItem(sessionKey) === 'unlocked'; }
  catch { /* A PIN entry still works with session storage unavailable. */ }
  if (remembered) showDashboard();
  else get('pin-input').focus();
  refreshIcons();
})();
