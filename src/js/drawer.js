import { CONTACT, DELIVERY, PRICING, SITE } from '../config/site-settings.js';
import { cart, tl } from './cart.js';
import { syncPrices } from './prices.js';
import { track } from './analytics.js';
import { saveRibbonLogo, getRibbonLogo, deleteRibbonLogo, RIBBON_LOGO_ACCEPT } from './ribbon-logo.js';
import { submitRequest, openWhatsAppWindow, navigateWhatsAppWindow, showSubmissionStatus } from './submission.js';
import { orderIntake, requestIdentity, forgetRequestIdentity, deliveryDayLabel } from './request-intake.js';
import { ROLLING_DELIVERY_DAYS, addDays, deliveryDays, isIsoDay, istanbulToday } from '../shared/delivery-days.js';

const root = document.querySelector('[data-drawer]');
const panel = root?.querySelector('.drawer');
const form = root?.querySelector('[data-order-form]');
const scroller = root?.querySelector('.drawer__scroll');
const content = root?.querySelector('.drawer__content');
const foot = root?.querySelector('.drawer__foot');
const submitBtn = root?.querySelector('[data-order-submit]');
const statusEl = root?.querySelector('[data-order-status]');
let lastFocus = null;
let sending = false;
let pendingDrawerClose = null;

const drawerEntryKey = 'fuarCartDrawer';
const isDrawerEntry = () => history.state?.[drawerEntryKey] === true;
const isDrawerOpen = () => root?.classList.contains('is-open');

function addDrawerEntry(url) {
  if (isDrawerEntry()) return;
  try {
    history.pushState({ ...history.state, [drawerEntryKey]: true }, '', url);
  } catch { /* Geçmiş kısıtlıysa sepet ekran üzerinden açılıp kapanabilir. */ }
}

// From Uiverse.io by SpatexDEV - https://uiverse.io/SpatexDEV/blue-eagle-63
// MIT License, Copyright (c) SpatexDEV
// "Logo ekle" düğmesinin simgesi. Özgün SVG'deki geçersiz stroke="#fffffff" değerleri kaldırıldı; çizgi rengi zaten currentColor'dan gelir.
const LOGO_ADD_ICON = '<svg aria-hidden="true" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path stroke-width="2" d="M13.5 3H12H8C6.34315 3 5 4.34315 5 6V18C5 19.6569 6.34315 21 8 21H11M13.5 3L19 8.625M13.5 3V7.625C13.5 8.17728 13.9477 8.625 14.5 8.625H19M19 8.625V11.8125" stroke-linejoin="round" stroke-linecap="round"></path><path stroke-linejoin="round" stroke-linecap="round" stroke-width="2" d="M17 15V18M17 21V18M17 18H14M17 18H20"></path></svg>';
const logoAddText = (pending, logo) => (pending ? 'Logo hazırlanıyor…' : logo ? 'Logoyu değiştir' : 'Logo ekle');
const setLogoAddText = (box, text) => { box.querySelector('[data-logo-add-label]').textContent = text; };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Teslim günü listesi derlemede bir kez yazılır; sayfa günler sonra açılsa da geçmiş gün kalmasın diye bugüne göre yeniden kurulur.
// Fuar sayfasında fuarın kalan günleri, diğer sayfalarda bugünden itibaren 7 gün; seçili gün hâlâ listedeyse korunur.
function refreshDeliveryDays() {
  const select = form?.elements.tarih;
  if (!select || select.tagName !== 'SELECT') return;
  const today = istanbulToday();
  if (select.dataset.today === today) return;
  select.dataset.today = today;
  const fairDays = (select.dataset.fairDays || '').split(',').filter(isIsoDay);
  const days = deliveryDays(today, fairDays, Number(select.dataset.rollingDays) || ROLLING_DELIVERY_DAYS);
  const previous = select.value;
  const other = [...select.options].find((option) => !isIsoDay(option.value));
  const relative = { [today]: 'Bugün', [addDays(today, 1)]: 'Yarın' };
  select.replaceChildren(...days.map((day) => {
    const label = deliveryDayLabel(day);
    return new Option(relative[day] ? `${relative[day]} · ${label}` : label, day);
  }), ...(other ? [other] : []));
  if ([...select.options].some((option) => option.value === previous)) select.value = previous;
}

// Fuar adı boş bırakıldıysa öne çıkan fuarın adı yalnızca fuar dönemi (kurulum günü dahil) içinde önceden doldurulur.
function prefillActiveFair() {
  const input = form?.elements.fuar_adi;
  const { activeFair, activeFrom, activeTo } = input?.dataset || {};
  if (!activeFair || input.value.trim() || input.dataset.touched) return;
  const today = istanbulToday();
  if (activeFrom <= today && today <= activeTo) input.value = activeFair;
}

function showDrawer(source) {
  if (!root || isDrawerOpen()) return;
  refreshDeliveryDays();
  syncPrices();
  lastFocus = document.activeElement;
  root.inert = false;
  root.classList.add('is-open');
  document.documentElement.classList.add('drawer-locked');
  window.__lenis?.stop();
  panel.querySelector('.drawer__close').focus({ preventScroll: true });
  track('drawer_open', { location: source });
}

export function openDrawer(source = '') {
  if (!root || isDrawerOpen() || pendingDrawerClose) return;
  addDrawerEntry();
  showDrawer(source);
}

function hideDrawer() {
  if (!isDrawerOpen()) return;
  root.classList.remove('is-open');
  root.inert = true;
  const html = document.documentElement;
  html.classList.remove('drawer-locked');
  if (!['menu-locked', 'intro-on', 'intro-leaving'].some(name => html.classList.contains(name))) window.__lenis?.start();
  lastFocus?.focus?.({ preventScroll: true });
}

function closeDrawer(destination) {
  if (sending || !isDrawerOpen() || pendingDrawerClose) return;
  if (isDrawerEntry()) {
    // Kapat düğmesi de sepetin geçici geçmiş adımını geri alır.
    pendingDrawerClose = { destination };
    history.back();
  } else {
    hideDrawer();
    if (destination) location.assign(destination);
  }
}

function restoreDrawerFromHistory() {
  const destination = pendingDrawerClose?.destination;
  pendingDrawerClose = null;
  if (isDrawerEntry()) {
    showDrawer('history');
  } else {
    hideDrawer();
    if (destination) location.assign(destination);
  }
}

// Sepet boşken (yalnızca not ile sipariş) tek bir genel teslimat kutusu gösterilir.
const general = { key: '_genel', qty: 0, d: {} };
const lines = () => (cart.items.length ? cart.items : [general]);
const ribbonText = (v) => String(v || '').trim() || 'İyi Fuarlar';
const ribbonPreviewText = (v) => String(v || '').trim() || 'Fuar Çiçekçim';
const logoOnly = (d) => d?.ribbonMode === 'logo-only';
const ribbonSummary = (d) => logoOnly(d) ? 'Sadece logo (yazı basılmayacak)' : ribbonText(d?.kart);
const logoPosition = (d) => logoOnly(d) ? 'Şeridin ortasında' : 'Yazının solunda ve sağında';
const RIBBON_COLORS = [
  { id: 'black', name: 'Siyah', hex: '#111111' },
  { id: 'blue', name: 'Mavi', hex: '#1e3a8a' },
  { id: 'red', name: 'Kırmızı', hex: '#c62828' },
];
const ribbonColor = (d) => RIBBON_COLORS.find((c) => c.id === d?.ribbonColor) || RIBBON_COLORS[0];
const ribbonLogo = (d) => d?.logo && typeof d.logo.id === 'string' && typeof d.logo.name === 'string' ? d.logo : null;
const pendingLogos = new Map();
const findLine = (key) => key === general.key ? general : cart.items.find((i) => i.key === key);
const lineBox = (key) => root.querySelector(`[data-line="${CSS.escape(key)}"]`);

// "Üstteki ürünle aynı stant" seçili satırlar stant bilgisini bir önceki satırdan alır.
function resolveStands() {
  let prev = null;
  return lines().map((l, n) => {
    const same = n > 0 && l.d.same !== false;
    const st = same && prev ? prev : { salon: (l.d.salon || '').trim(), stant: (l.d.stant || '').trim(), firma: (l.d.firma || '').trim() };
    prev = st;
    return { line: l, same, salon: st.salon, stant: st.stant, firma: st.firma };
  });
}

const standLabel = (s) => [s.salon && `Hol ${s.salon}`, s.stant && `Stant ${s.stant}`].filter(Boolean).join(' / ');

function shipBlock(l, n) {
  const d = l.d || {};
  const same = n > 0 && d.same !== false;
  const id = `ln${n}`;
  const title = l.name ? `${n + 1}. ürünün teslimatı` : 'Teslimat noktası';
  const color = ribbonColor(d);
  const logo = ribbonLogo(d);
  const only = logoOnly(d);
  const pending = pendingLogos.has(l.key);
  return `
    <div class="ship" data-line="${esc(l.key)}">
      <p class="ship__title">${esc(title)}</p>
      ${n > 0 ? `<label class="ship__same"><input type="checkbox" data-line-same${same ? ' checked' : ''}><span>Üstteki ürünle aynı stant <small data-same-label></small></span></label>` : ''}
      <div class="ship__stand"${same ? ' hidden' : ''}>
        <div class="field-row">
          <label class="field"><span>Hol no <b aria-hidden="true">*</b></span><input aria-required="true" name="salon-${id}" data-line-field="salon" value="${esc(d.salon || '')}" autocomplete="off" maxlength="20" placeholder="Örn. 5"></label>
          <label class="field"><span>Stant no <b aria-hidden="true">*</b></span><input name="stant-${id}" data-line-field="stant" value="${esc(d.stant || '')}" autocomplete="off" maxlength="40" placeholder="Örn. B12"></label>
        </div>
        ${n === 0 ? '<div data-stand-help-slot></div>' : ''}
        <label class="field"><span>Teslim alacak firma <b aria-hidden="true">*</b></span><input name="firma-${id}" data-line-field="firma" value="${esc(d.firma || '')}" autocomplete="off" maxlength="120" placeholder="Standın sahibi firma"></label>
      </div>
      <label class="field ribbon-text-field" data-ribbon-text-field${only ? ' hidden' : ''}><span>Şerit yazısı</span><input name="kart-${id}" data-line-field="kart" value="${esc(d.kart || '')}" autocomplete="off" placeholder="Örn: Fuar Çiçekçim"${only ? ' disabled' : ''}></label>
      <div class="ribbon ribbon--sm${only ? ' ribbon--logo-only' : ''}" style="--ribbon-ink:${color.hex}" aria-hidden="true"><span class="ribbon__tail"></span><span class="ribbon__band"><img class="ribbon__logo" data-ribbon-logo alt="" hidden><span class="ribbon__text" data-ribbon-preview${only ? ' hidden' : ''}>${esc(ribbonPreviewText(d.kart))}</span><span class="ribbon__empty" data-ribbon-empty${only && !logo ? '' : ' hidden'}>Logonuz burada görünecek</span><img class="ribbon__logo" data-ribbon-logo alt="" hidden></span><span class="ribbon__tail ribbon__tail--end"></span></div>
      <fieldset class="ribbon-mode"><legend class="sr-only">Şerit düzeni</legend><label><input type="radio" name="ribbon-mode-${id}" data-ribbon-mode value="text"${only ? '' : ' checked'}><span>Yazılı şerit</span></label><label><input type="radio" name="ribbon-mode-${id}" data-ribbon-mode value="logo-only"${only ? ' checked' : ''}><span>Sadece logo</span></label></fieldset>
      <div class="ribbon-tools">
        <div class="ribbon-logo-actions">
          <button class="ribbon-logo-add" type="button" data-logo-add${pending ? ' disabled aria-busy="true"' : ''}>${LOGO_ADD_ICON}<span data-logo-add-label>${logoAddText(pending, logo)}</span></button>
          <button class="ribbon-logo-remove" type="button" data-logo-remove${logo ? '' : ' hidden'}${pending ? ' disabled' : ''}>Kaldır</button>
          <input type="file" data-logo-file accept="${RIBBON_LOGO_ACCEPT}" hidden>
        </div>
        <fieldset class="ribbon-colors"${only ? ' hidden' : ''}><legend class="sr-only">Yazı rengi</legend>${RIBBON_COLORS.map((c) => `<label class="ribbon-color" style="--swatch:${c.hex}" title="${c.name}"><input type="radio" name="ribbon-color-${id}" data-ribbon-color value="${c.id}" aria-label="${c.name}"${c.id === color.id ? ' checked' : ''}><span aria-hidden="true"></span></label>`).join('')}</fieldset>
      </div>
      <p class="ribbon-logo-name" data-logo-name${logo ? '' : ' hidden'}>${logo ? esc(logo.name) : ''}</p>
      <p class="ribbon-logo-hint" data-logo-hint${logo ? '' : ' hidden'}>Logo iki yanda görünür. Dosyanızı açılan WhatsApp sohbetine de ekleyin.</p>
      <p class="ribbon-logo-error" data-logo-error role="alert" hidden></p>
      ${l.qty > 1 ? `<button type="button" class="ship__split" data-line-split="${esc(l.key)}">${l.qty} adet aynı standa gidiyor · <u>1 adedini başka standa gönder</u></button>` : ''}
    </div>`;
}

function refreshSameLabels() {
  const res = resolveStands();
  root.querySelectorAll('[data-line]').forEach((el) => {
    const idx = res.findIndex((x) => x.line.key === el.dataset.line);
    const label = el.querySelector('[data-same-label]');
    if (label && idx > 0) {
      const p = res[idx - 1];
      const txt = [standLabel(p), p.firma].filter(Boolean).join(' · ');
      label.textContent = txt ? `(${txt})` : '';
    }
  });
}

// Hol/stant yardımı: numarayı bilmeyen müşteri fuarın resmî katılımcı listesine gider. Gösterilecek grup fuar adındaki
// sözcüklere, yoksa seçili fuar merkezine göre belirlenir (şablon ve bağlantılar sunucuda üretilir: scripts/lib/layout.mjs).
const helpTemplate = root?.querySelector('[data-stand-help-template]');
function refreshStandHelp() {
  if (!root || !form) return;
  const name = String(form.elements.fuar_adi?.value || '').toLocaleLowerCase('tr-TR');
  const venue = form.elements.merkez ? ([...form.elements.merkez].find((r) => r.checked)?.value || '') : '';
  root.querySelectorAll('[data-stand-help]').forEach((help) => {
    const groups = [...help.querySelectorAll('[data-help-group]')];
    const chosen = groups.find((g) => g.dataset.helpMatch && g.dataset.helpMatch.split('|').some((k) => name.includes(k)))
      || groups.find((g) => g.dataset.helpVenue === venue);
    groups.forEach((g) => { g.hidden = g !== chosen; });
    help.hidden = !chosen;
  });
}
function mountStandHelp() {
  if (!helpTemplate) return;
  root.querySelectorAll('[data-stand-help-slot]').forEach((slot) => { slot.replaceChildren(helpTemplate.content.cloneNode(true)); });
  refreshStandHelp();
}

// Kurumsal fatura bilgisi girilmişse fiyatlara KDV eklenir; girilmemişse tutar KDV'siz gösterilir ve gönderilir.
const INVOICE_FIELDS = ['fatura_unvan', 'vergi_dairesi', 'vergi_no'];
const hasInvoice = (values) => INVOICE_FIELDS.some((name) => String(values?.[name] ?? '').trim() !== '');
function refreshTax() {
  const vat = root.querySelector('[data-total-vat]');
  if (vat) vat.hidden = !hasInvoice(Object.fromEntries(new FormData(form)));
}

function renderCart(items) {
  const list = root.querySelector('[data-cart-list]');
  list.innerHTML = items.map((i, n) => `
    <li class="cart-item">
      <img src="${esc(i.image)}" width="64" height="96" alt="" loading="lazy">
      <div class="cart-item__info">
        <p class="cart-item__cat">${esc(i.pkg ? `${i.pkg} · ${i.cat || ''}` : i.cat || '')}</p>
        <p class="cart-item__name">${esc(i.name)}</p>
        ${i.unavailable ? '<p class="field__error" role="status">Bu ürün şu anda satışa kapalı. Adedini sıfırlayarak sepetten çıkarın; şerit ve teslimat bilgileriniz bu sırada korunur.</p>' : ''}
        <p class="cart-item__price">${tl(i.price * i.qty)}</p>
      </div>
      <div class="qty" role="group" aria-label="${esc(i.name)} adedi">
        <button type="button" data-qty="${esc(i.key)}" data-step="-1" aria-label="Azalt">−</button>
        <output aria-live="polite">${i.qty}</output>
        <button type="button" data-qty="${esc(i.key)}" data-step="1" aria-label="Artır">+</button>
      </div>
      ${shipBlock(i, n)}
    </li>`).join('');
  root.querySelector('[data-cart-empty]').hidden = items.length > 0;
  root.querySelector('[data-general-ship]').innerHTML = items.length ? '' : shipBlock(general, 0);
  refreshSameLabels();
  mountStandHelp();
  root.querySelectorAll('[data-line]').forEach((box) => { void refreshRibbonLogo(box); });
  const t = cart.totals();
  const hasDiscount = t.discount > 0;
  root.querySelector('[data-total-before-discount]').hidden = !hasDiscount;
  root.querySelector('[data-total-discount-row]').hidden = !hasDiscount;
  root.querySelector('[data-total-net]').textContent = tl(t.net);
  root.querySelector('[data-total-subtotal]').textContent = tl(t.subtotal);
  root.querySelector('[data-total-discount]').textContent = `−${tl(t.discount)}`;
  refreshTax();
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    const grew = cart.count > Number(el.dataset.count || 0);
    el.textContent = cart.count;
    el.dataset.count = cart.count;
    // Ürün eklenince rozet kısa bir 'zıplama' yapar (hareket azaltmada yok).
    if (grew && !matchMedia('(prefers-reduced-motion: reduce)').matches) el.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.3,1.6,.5,1)' });
  });
}

function setLine(key, field, value) {
  if (key === general.key) general.d = { ...general.d, [field]: value };
  else cart.setDelivery(key, field, value);
}

function logoError(box, message = '') {
  if (!box) return;
  const note = box.querySelector('[data-logo-error]');
  note.textContent = message;
  note.hidden = !message;
}

function refreshRibbonDesign(box) {
  const d = findLine(box.dataset.line)?.d || {};
  const only = logoOnly(d);
  const logo = ribbonLogo(d);
  box.querySelector('.ribbon').classList.toggle('ribbon--logo-only', only);
  const text = box.querySelector('[data-ribbon-preview]');
  text.hidden = only;
  text.textContent = ribbonPreviewText(d.kart);
  box.querySelector('[data-ribbon-empty]').hidden = !only || !!logo;
  box.querySelector('[data-ribbon-text-field]').hidden = only;
  box.querySelector('[data-line-field="kart"]').disabled = only;
  box.querySelector('.ribbon-colors').hidden = only;
  box.querySelectorAll('[data-ribbon-color]').forEach((input) => { input.disabled = only; });
  box.querySelector('[data-logo-hint]').textContent = only
    ? 'Logo şeridin ortasında görünür; yazı basılmayacak. Dosyanızı açılan WhatsApp sohbetine de ekleyin.'
    : 'Logo iki yanda görünür. Dosyanızı açılan WhatsApp sohbetine de ekleyin.';
}

async function refreshRibbonLogo(box) {
  refreshRibbonDesign(box);
  const logo = ribbonLogo(findLine(box.dataset.line)?.d);
  const images = box.querySelectorAll('[data-ribbon-logo]');
  images.forEach((img) => { img.hidden = true; img.removeAttribute('src'); });
  box.querySelector('[data-logo-name]').textContent = logo?.name || '';
  box.querySelector('[data-logo-name]').hidden = !logo;
  box.querySelector('[data-logo-hint]').hidden = !logo;
  box.querySelector('[data-logo-remove]').hidden = !logo;
  setLogoAddText(box, logoAddText(pendingLogos.has(box.dataset.line), logo));
  if (!logo) return;
  try {
    const saved = await getRibbonLogo(logo.id);
    if (!box.isConnected || ribbonLogo(findLine(box.dataset.line)?.d)?.id !== logo.id) return;
    if (!saved?.preview) throw new Error('Logo bu tarayıcıda bulunamadı. Lütfen yeniden ekleyin.');
    const only = logoOnly(findLine(box.dataset.line)?.d);
    images.forEach((img, index) => { img.src = saved.preview; img.hidden = only && index > 0; });
  } catch (error) {
    if (box.isConnected && ribbonLogo(findLine(box.dataset.line)?.d)?.id === logo.id) logoError(box, error.message || 'Logo gösterilemedi. Lütfen yeniden ekleyin.');
  }
}

async function discardUnusedLogo(id) {
  if (!id || [general, ...cart.items].some((line) => ribbonLogo(line.d)?.id === id)) return;
  try { await deleteRibbonLogo(id); } catch { /* Önizleme kaldırıldı; eski yerel dosya daha sonra temizlenebilir. */ }
}

async function addRibbonLogo(input) {
  const file = input.files?.[0];
  const box = input.closest('[data-line]');
  if (!file || !box || pendingLogos.has(box.dataset.line)) return;
  const key = box.dataset.line;
  const previous = ribbonLogo(findLine(key)?.d);
  const token = {};
  pendingLogos.set(key, token);
  logoError(box);
  box.querySelector('[data-logo-add]').disabled = true;
  box.querySelector('[data-logo-add]').setAttribute('aria-busy', 'true');
  setLogoAddText(box, logoAddText(true));
  box.querySelector('[data-logo-remove]').disabled = true;
  try {
    const logo = await saveRibbonLogo(file);
    if (!findLine(key) || pendingLogos.get(key) !== token) { await discardUnusedLogo(logo.id); return; }
    setLine(key, 'logo', logo);
    const current = lineBox(key);
    if (current) await refreshRibbonLogo(current);
    await discardUnusedLogo(previous?.id);
  } catch (error) {
    logoError(lineBox(key), error.message || 'Logo eklenemedi. Lütfen yeniden deneyin.');
  } finally {
    if (pendingLogos.get(key) === token) pendingLogos.delete(key);
    const current = lineBox(key);
    if (current) {
      current.querySelector('[data-logo-add]').disabled = false;
      current.querySelector('[data-logo-add]').removeAttribute('aria-busy');
      setLogoAddText(current, logoAddText(false, ribbonLogo(findLine(key)?.d)));
      current.querySelector('[data-logo-remove]').disabled = false;
      current.querySelector('[data-logo-file]').value = '';
    }
  }
}

async function validateRibbonLogos() {
  for (const line of lines()) {
    const logo = ribbonLogo(line.d);
    if (!logo) {
      if (logoOnly(line.d)) { logoError(lineBox(line.key), 'Sadece logo için bir logo dosyası ekleyin.'); return false; }
      continue;
    }
    try {
      if (!(await getRibbonLogo(logo.id))?.preview) throw new Error();
    } catch {
      const box = lineBox(line.key);
      logoError(box, 'Logo bulunamadı. Yeniden ekleyin veya kaldırın.');
      return false;
    }
  }
  return true;
}

// Türkiye numarası: başındaki +90 / 0 atılınca 10 hane ve 2–5 ile başlamalı.
export function normalizeTrPhone(value) {
  let d = String(value).replace(/\D/g, '');
  if (d.startsWith('90') && d.length === 12) d = d.slice(2);
  if (d.startsWith('0') && d.length === 11) d = d.slice(1);
  return /^[2-5]\d{9}$/.test(d) ? `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}` : null;
}

function setError(input, msg) {
  const field = input.closest('.field, .consent, .choices');
  field?.classList.toggle('has-error', !!msg);
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  let note = field?.querySelector('.field__error');
  if (msg && field && !note) {
    note = document.createElement('p');
    note.className = 'field__error';
    note.id = `${input.name}-hata`;
    field.append(note);
    input.setAttribute('aria-describedby', note.id);
  }
  if (note) note.textContent = msg || '';
}

function validate() {
  const f = form.elements;
  const errors = [];
  const check = (input, msg) => { setError(input, msg); if (msg) errors.push(input); };
  if (f.tarih.type === 'date') check(f.tarih, f.tarih.value ? '' : 'Teslim gününü seçin.');
  lines().forEach((line) => {
    if (logoOnly(line.d) && !ribbonLogo(line.d)) {
      const box = lineBox(line.key);
      logoError(box, 'Sadece logo için bir logo dosyası ekleyin.');
      const add = box?.querySelector('[data-logo-add]');
      if (add) errors.push(add);
    }
  });
  resolveStands().forEach((r) => {
    if (r.same) return;
    const box = root.querySelector(`[data-line="${CSS.escape(r.line.key)}"]`);
    const salon = box?.querySelector('[data-line-field="salon"]');
    const stant = box?.querySelector('[data-line-field="stant"]');
    const firma = box?.querySelector('[data-line-field="firma"]');
    if (salon) check(salon, r.salon ? '' : 'Hol numarasını yazın.');
    if (stant) check(stant, r.stant ? '' : 'Stant numarasını yazın.');
    if (firma) check(firma, r.firma ? '' : 'Teslim alacak firmayı yazın.');
  });
  const vno = f.vergi_no.value.replace(/\D/g, '');
  check(f.vergi_no, !f.vergi_no.value || vno.length === 10 || vno.length === 11 ? '' : 'Vergi no 10, TC kimlik no 11 hane olmalı.');
  if (!cart.items.length && !f.not.value.trim()) {
    check(f.not, 'Sepet boş. Ürün ekleyin ya da istediğiniz ürünü nota yazın.');
  } else setError(f.not, '');
  return errors;
}

function orderNumber() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `FC-${p(d.getDate())}${p(d.getMonth() + 1)}-${p(d.getHours())}${p(d.getMinutes())}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

function buildMessage(no, data, totals, res) {
  const invoice = hasInvoice(data);
  const lines = [`*Yeni sipariş · Fuar Çiçekçim*`, `Sipariş no: ${no}`, ''];
  res.forEach((r, n) => {
    const i = r.line;
    if (n > 0) lines.push('');
    if (i.name) lines.push(`*${n + 1}) ${i.qty} × ${i.name}*${i.pkg ? ` (${i.pkg})` : ''} — ${tl(i.price * i.qty)}`);
    const logo = ribbonLogo(i.d);
    const color = logoOnly(i.d) ? '' : ` (${ribbonColor(i.d).name} Font Rengi)`;
    lines.push(`   ${standLabel(r)}`, `   Teslim alacak: ${r.firma}`, `   Şerit: ${ribbonSummary(i.d)}${color}`, `   Logo: ${logo ? `${logo.name} — ${logoPosition(i.d).toLocaleLowerCase('tr-TR')}` : 'Yok'}`);
    // wa.me yalnızca metin taşır; fotoğraf bağlantı önizlemesiyle görünür. Ham .webp bağlantısını WhatsApp
    // güvenilir önizlemez; ürün sayfasının og:image'ı (assets/share/*.jpg) ise kart olarak önizlenir.
    const photoPath = i.page?.startsWith('/urunler/') ? i.page : i.image?.startsWith('/assets/') ? i.image : '';
    if (i.name && photoPath) {
      lines.push(`   Ürün fotoğrafı: ${new URL(photoPath, SITE.url).href}`);
    }
  });
  if (cart.items.length) {
    lines.push('');
    if (totals.discount > 0) {
      lines.push(`Ürünler${invoice ? ' (KDV hariç)' : ''}: ${tl(totals.subtotal)}`, `Sepette ek %5: −${tl(totals.discount)}`);
    }
    if (invoice) lines.push(`Ara toplam (KDV hariç): ${tl(totals.net)}`, `KDV %${PRICING.vatRate}: ${tl(totals.vat)}`, `*Toplam (KDV dahil): ${tl(totals.gross)}*`);
    else lines.push(`*Toplam: ${tl(totals.net)}*`);
  }
  lines.push('', '*Fuar*',
    `Fuar merkezi: ${data.merkez}`,
    `Fuar: ${data.fuar_adi || '-'}`,
    `Gün / saat: ${deliveryDayLabel(data.tarih)} · ${data.saat}`);
  if (invoice) lines.push('', '*Fatura*', `Ünvan: ${data.fatura_unvan || '-'}`, `Vergi dairesi: ${data.vergi_dairesi || '-'}`, `Vergi / TC no: ${data.vergi_no || '-'}`);
  if (data.not) lines.push('', `Not: ${data.not}`);
  if (res.some((r) => ribbonLogo(r.line.d))) lines.push('', 'Logo dosyaları WhatsApp sohbetine ayrıca eklenecek.');
  lines.push('', PRICING.paymentNote);
  return lines.join('\n');
}

async function submit(e) {
  e.preventDefault();
  if (sending) return;
  if (document.documentElement.dataset.catalogRelease === 'mismatch') {
    statusEl.textContent = 'Katalog güncellenmiş. Siparişi göndermeden önce sayfayı yenileyin; sepet ve şerit bilgileriniz korunur.';
    return;
  }
  if (cart.items.some(item => item.unavailable)) {
    statusEl.textContent = 'Sepetinizde satışa kapalı bir ürün var. Göndermeden önce bu ürünü çıkarın veya farklı bir ürün seçin.';
    return;
  }
  if (pendingLogos.size) { statusEl.textContent = 'Logo hazırlanıyor. Lütfen kısa bir süre bekleyin.'; return; }
  const errors = validate();
  if (errors.length) {
    statusEl.textContent = 'Lütfen işaretli alanları kontrol edin.';
    errors[0].focus();
    return;
  }
  sending = true;
  content.inert = true;
  submitBtn.disabled = true;
  submitBtn.setAttribute('aria-busy', 'true');
  statusEl.textContent = 'Siparişiniz hazırlanıyor…';
  // Logo kaydını denetlemeden önce kullanıcı tıklamasıyla pencere açılır.
  const waWin = openWhatsAppWindow();
  let opened = false;

  try {
    if (!(await validateRibbonLogos())) {
      try { waWin?.close(); } catch { /* Pencere kullanıcı tarafından kapatılmış olabilir. */ }
      statusEl.textContent = 'Lütfen logo seçimini kontrol edin.';
      return;
    }

    const previousTotal = cart.totals().gross;
    syncPrices();
    const totals = cart.totals();
    if (totals.gross !== previousTotal) {
      try { waWin?.close(); } catch { /* Pencere kullanıcı tarafından kapatılmış olabilir. */ }
      statusEl.textContent = 'Sepet fiyatı güncellendi. Tutarı kontrol edip siparişi yeniden gönderin.';
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    const invoice = hasInvoice(data);
    const itemCount = cart.count;
    const res = resolveStands();
    const structured = orderIntake(data, res);
    const identity = await requestIdentity('order', structured, orderNumber);
    const no = identity.reference;
    const message = buildMessage(no, data, totals, res);
    const waUrl = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
    const payload = {
      ...data,
      ...structured,
      tarih: deliveryDayLabel(data.tarih),
      client_request_id: identity.id,
      request_reference: identity.reference,
      tur: 'siparis',
      siparis_no: no,
      stant: [...new Set(res.map((r) => [standLabel(r), r.firma].filter(Boolean).join(' · ')))].join('; '),
      kart: res.map((r, n) => `${n + 1}) ${ribbonSummary(r.line.d)}`).join(' | '),
      seritler: res.map((r) => ({
        urun: r.line.name || 'Genel sipariş',
        duzen: logoOnly(r.line.d) ? 'Sadece logo' : 'Yazılı şerit',
        yazi: logoOnly(r.line.d) ? '' : ribbonText(r.line.d.kart),
        zemin: 'Beyaz',
        yazi_rengi: logoOnly(r.line.d) ? '' : ribbonColor(r.line.d).name,
        logo: ribbonLogo(r.line.d)?.name || '',
        logo_konumu: ribbonLogo(r.line.d) ? logoPosition(r.line.d) : '',
      })),
      urunler: res.filter((r) => r.line.name).map((r) => `${r.line.qty} × ${r.line.name}${r.line.pkg ? ` [${r.line.pkg}]` : ''} (${tl(r.line.price * r.line.qty)}${invoice ? ' + KDV' : ''}) → ${standLabel(r)} · ${r.firma}`),
      ...(totals.discount > 0 ? { urun_ara_toplam: tl(totals.subtotal), sepet_indirimi: tl(totals.discount) } : {}),
      ara_toplam: tl(totals.net),
      kdv: invoice ? tl(totals.vat) : '',
      toplam: invoice ? tl(totals.gross) : tl(totals.net),
      sayfa: location.href,
    };
    const result = await submitRequest(payload);
    if (result.kind === 'product_unavailable') {
      try { waWin?.close(); } catch { /* Pencere kapanmış olabilir. */ }
      statusEl.textContent = result.message || 'Sepette siparişe kapalı bir ürün var. Sepetinizi kontrol edin.';
      return;
    }
    opened = navigateWhatsAppWindow(waWin, waUrl);
    if (result.kind === 'sent') {
      forgetRequestIdentity('order');
      general.d = {};
      cart.clear();
      form.reset();
      delete form.elements.fuar_adi.dataset.touched;
      prefillActiveFair();
      refreshTax();
    }
    showSubmissionStatus(statusEl, result, waUrl, { orderNo: no, location: 'order_result' });
    try {
      if (result.kind === 'sent') track('order_submit', { value: invoice ? totals.gross : totals.net, currency: 'TRY', item_count: itemCount, order_id: no });
      if (opened) track('whatsapp_click', { location: 'order_submit' });
    } catch { /* Ölçüm isteğe bağlıdır. */ }
  } catch {
    if (!opened) { try { waWin?.close(); } catch { /* Pencere kapanmış olabilir. */ } }
    statusEl.textContent = 'Sipariş özeti hazırlanamadı. Bilgileriniz korunuyor. Lütfen yeniden deneyin.';
  } finally {
    content.inert = false;
    submitBtn.disabled = false;
    submitBtn.removeAttribute('aria-busy');
    sending = false;
    root.querySelector('[data-logo-error]:not([hidden])')?.closest('[data-line]')?.querySelector('[data-logo-add]')?.focus();
  }
}

export function initDrawer() {
  if (!root) return;
  refreshDeliveryDays();
  prefillActiveFair();
  cart.subscribe(renderCart);
  form.addEventListener('input', (e) => {
    if (e.target.name !== 'fuar_adi') return;
    e.target.dataset.touched = '1';
    refreshStandHelp();
  });
  form.addEventListener('change', (e) => { if (e.target.name === 'merkez') refreshStandHelp(); });

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-drawer-open]');
    if (opener) {
      e.preventDefault();
      if (opener.dataset.fair) form.elements.fuar_adi.value = opener.dataset.fair;
      const venue = [...form.elements.merkez].find((r) => opener.dataset.venue?.startsWith(r.value));
      if (venue) venue.checked = true;
      refreshStandHelp();
      openDrawer(opener.dataset.trackLocation || '');
      return;
    }
    if (e.target.closest('[data-drawer-close]')) {
      const link = e.target.closest('a[href]');
      if (link && (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey
        || (link.target && link.target !== '_self') || link.hasAttribute('download'))) return;
      e.preventDefault();
      closeDrawer(link?.href);
      return;
    }
    const logoAdd = e.target.closest('[data-logo-add]');
    if (logoAdd) { logoAdd.closest('[data-line]').querySelector('[data-logo-file]').click(); return; }
    const logoRemove = e.target.closest('[data-logo-remove]');
    if (logoRemove) {
      const box = logoRemove.closest('[data-line]');
      const previous = ribbonLogo(findLine(box.dataset.line)?.d);
      setLine(box.dataset.line, 'logo', null);
      logoError(box);
      void refreshRibbonLogo(box);
      void discardUnusedLogo(previous?.id);
      box.querySelector('[data-logo-add]').focus();
      return;
    }
    const q = e.target.closest('[data-qty]');
    if (q) {
      const index = cart.items.findIndex((item) => item.key === q.dataset.qty);
      const item = cart.items[index];
      if (!item) return;
      const step = Number(q.dataset.step);
      const restoreFocus = document.activeElement === q;
      cart.setQty(item.key, item.qty + step);

      // Sepet yeniden çizildiğinde aynı düğmeye, silinen satırda komşu düğmeye dön.
      const nextItem = cart.items[index] ?? cart.items.at(-1);
      const sameItem = nextItem?.key === item.key;
      const nextButton = nextItem && panel.querySelector(`[data-qty="${CSS.escape(nextItem.key)}"][data-step="${step}"]`);
      if (restoreFocus) (nextButton ?? panel.querySelector('.drawer__close')).focus({ preventScroll: sameItem });
      if (sameItem && nextItem.qty !== item.qty && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        nextButton?.parentElement.querySelector('output')?.animate?.([
          { transform: `translateY(${step * 4}px)`, opacity: .55 },
          { transform: 'translateY(0)', opacity: 1 },
        ], { duration: 180, easing: 'ease-out' });
      }
      return;
    }
    const sp = e.target.closest('[data-line-split]');
    if (sp) {
      const at = cart.items.findIndex((i) => i.key === sp.dataset.lineSplit);
      cart.split(sp.dataset.lineSplit);
      // Yeni açılan satırın hol alanına odaklan.
      root.querySelectorAll('[data-cart-list] [data-line]')[at + 1]?.querySelector('[data-line-field="salon"]')?.focus();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!root.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeDrawer();
    if (e.key === 'Tab') {
      const focusables = [...panel.querySelectorAll('a[href], button:not([disabled]), input:not(.hp), select, textarea, summary')].filter((el) => el.offsetParent !== null);
      const first = focusables[0];
      const last = focusables.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Ürün satırlarındaki teslimat alanları: yazarken kaydedilir, sepet yeniden çizilmez (odak korunur).
  panel.addEventListener('input', (e) => {
    const input = e.target.closest('[data-line-field]');
    if (!input) return;
    const box = input.closest('[data-line]');
    const field = input.dataset.lineField;
    let value = input.value;
    if (field === 'kart') {
      box.querySelector('[data-ribbon-preview]').textContent = ribbonPreviewText(value);
    }
    setLine(box.dataset.line, field, value);
    if (input.getAttribute('aria-invalid') === 'true') setError(input, '');
    if (field !== 'kart') refreshSameLabels();
  });
  panel.addEventListener('change', (e) => {
    const mode = e.target.closest('[data-ribbon-mode]');
    if (mode) {
      const box = mode.closest('[data-line]');
      setLine(box.dataset.line, 'ribbonMode', mode.value === 'logo-only' ? 'logo-only' : 'text');
      logoError(box);
      void refreshRibbonLogo(box);
      return;
    }
    const logoFile = e.target.closest('[data-logo-file]');
    if (logoFile) { void addRibbonLogo(logoFile); return; }
    const color = e.target.closest('[data-ribbon-color]');
    if (color) {
      const box = color.closest('[data-line]');
      const selected = ribbonColor({ ribbonColor: color.value });
      setLine(box.dataset.line, 'ribbonColor', selected.id);
      box.querySelector('.ribbon').style.setProperty('--ribbon-ink', selected.hex);
      return;
    }
    const cb = e.target.closest('[data-line-same]');
    if (!cb) return;
    const box = cb.closest('[data-line]');
    box.querySelector('.ship__stand').hidden = cb.checked;
    setLine(box.dataset.line, 'same', cb.checked);
    refreshSameLabels();
    if (!cb.checked) box.querySelector('[data-line-field="salon"]')?.focus();
  });
  form.addEventListener('submit', submit);
  form.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true') setError(e.target, ''); });
  ['input', 'change'].forEach((type) => form.addEventListener(type, (e) => { if (INVOICE_FIELDS.includes(e.target.name)) refreshTax(); }));
  root.querySelector('.drawer__note')?.setAttribute('title', DELIVERY.condition);

  // Mobilde form doldurulurken (aşağı kaydırma veya klavye açık) alt alan tek satır toplam + butona küçülür.
  if (scroller && content && foot) {
    let focused = false;
    const update = () => foot.classList.toggle('is-compact', focused || scroller.scrollTop > 48);
    scroller.addEventListener('scroll', update, { passive: true });
    content.addEventListener('focusin', (e) => { focused = e.target.matches('input:not([type=checkbox]):not([type=radio]), textarea, select'); update(); });
    content.addEventListener('focusout', () => { focused = false; requestAnimationFrame(update); });
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => scroller.style.setProperty('--drawer-foot-height', `${foot.offsetHeight}px`)).observe(foot);
    }
  }

  window.addEventListener('popstate', restoreDrawerFromHistory);
  window.addEventListener('pageshow', event => {
    if (event.persisted) restoreDrawerFromHistory();
  });
  if (isDrawerEntry()) {
    showDrawer('history');
  } else if (location.hash === '#siparis') {
    const linkUrl = location.href;
    try {
      history.replaceState(history.state, '', location.pathname + location.search);
      addDrawerEntry(linkUrl);
    } catch { /* Sipariş bağlantısı, geçmiş kullanılamadığında da sepeti açar. */ }
    showDrawer('link');
  }
}
