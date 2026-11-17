import { CONTACT, DELIVERY, PRICING, RIBBON } from '../config/site-settings.js';
import { cart, tl } from './cart.js';
import { track } from './analytics.js';

const root = document.querySelector('[data-drawer]');
const panel = root?.querySelector('.drawer');
const form = root?.querySelector('[data-order-form]');
const submitBtn = root?.querySelector('[data-order-submit]');
const statusEl = root?.querySelector('[data-order-status]');
let lastFocus = null;
let sending = false;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function openDrawer(source = '') {
  if (!root || root.classList.contains('is-open')) return;
  lastFocus = document.activeElement;
  root.inert = false;
  root.classList.add('is-open');
  document.documentElement.classList.add('drawer-locked');
  window.__lenis?.stop();
  panel.querySelector('.drawer__close').focus({ preventScroll: true });
  track('drawer_open', { location: source });
}

export function closeDrawer() {
  if (!root?.classList.contains('is-open')) return;
  root.classList.remove('is-open');
  root.inert = true;
  document.documentElement.classList.remove('drawer-locked');
  window.__lenis?.start();
  lastFocus?.focus?.({ preventScroll: true });
}

// Sepet boşken (yalnızca not ile sipariş) tek bir genel teslimat kutusu gösterilir.
const general = { key: '_genel', qty: 0, d: {} };
const lines = () => (cart.items.length ? cart.items : [general]);
const ribbonText = (v) => String(v || '').trim() || 'İyi Fuarlar';

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

const standLabel = (s) => [s.salon && `Salon ${s.salon}`, s.stant && `Stant ${s.stant}`].filter(Boolean).join(' / ');

function shipBlock(l, n) {
  const d = l.d || {};
  const same = n > 0 && d.same !== false;
  const id = `ln${n}`;
  const title = l.name ? `${n + 1}. ürünün teslimatı` : 'Teslimat noktası';
  return `
    <div class="ship" data-line="${esc(l.key)}">
      <p class="ship__title">${esc(title)}</p>
      ${n > 0 ? `<label class="ship__same"><input type="checkbox" data-line-same${same ? ' checked' : ''}><span>Üstteki ürünle aynı stant <small data-same-label></small></span></label>` : ''}
      <div class="ship__stand"${same ? ' hidden' : ''}>
        <div class="field-row">
          <label class="field"><span>Salon no</span><input name="salon-${id}" data-line-field="salon" value="${esc(d.salon || '')}" autocomplete="off" maxlength="20" placeholder="Örn. 5"></label>
          <label class="field"><span>Stant no <b aria-hidden="true">*</b></span><input name="stant-${id}" data-line-field="stant" value="${esc(d.stant || '')}" autocomplete="off" maxlength="40" placeholder="Örn. B12"></label>
        </div>
        <label class="field"><span>Teslim alacak firma <b aria-hidden="true">*</b></span><input name="firma-${id}" data-line-field="firma" value="${esc(d.firma || '')}" autocomplete="off" maxlength="120" placeholder="Standın sahibi firma"></label>
      </div>
      <div class="ribbon ribbon--sm" aria-hidden="true"><span class="ribbon__tail"></span><span class="ribbon__band"><span class="ribbon__text" data-ribbon-preview>${esc(ribbonText(d.kart))}</span></span><span class="ribbon__tail ribbon__tail--end"></span></div>
      <label class="field"><span>Şerit yazısı</span><input name="kart-${id}" data-line-field="kart" value="${esc(d.kart || '')}" maxlength="${RIBBON.maxChars}" autocomplete="off" placeholder="Örn. ATLAS TASARIM · İyi Fuarlar"></label>
      <p class="field__hint"><span data-ribbon-count>${(d.kart || '').length}</span>/${RIBBON.maxChars} karakter · Türkçe karakterler doğru basılır</p>
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

function renderCart(items) {
  const list = root.querySelector('[data-cart-list]');
  list.innerHTML = items.map((i, n) => `
    <li class="cart-item">
      <img src="${esc(i.image)}" width="64" height="96" alt="" loading="lazy">
      <div class="cart-item__info">
        <p class="cart-item__cat">${esc(i.pkg ? `${i.pkg} · ${i.cat || ''}` : i.cat || '')}</p>
        <p class="cart-item__name">${esc(i.name)}</p>
        <p class="cart-item__price">${tl(i.price * i.qty)} <small>+ KDV</small></p>
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
  const t = cart.totals();
  root.querySelector('[data-total-net]').textContent = tl(t.net);
  root.querySelector('[data-total-vat]').textContent = tl(t.vat);
  root.querySelector('[data-total-gross]').textContent = tl(t.gross);
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
  resolveStands().forEach((r) => {
    if (r.same) return;
    const box = root.querySelector(`[data-line="${CSS.escape(r.line.key)}"]`);
    const stant = box?.querySelector('[data-line-field="stant"]');
    const firma = box?.querySelector('[data-line-field="firma"]');
    if (stant) check(stant, r.stant ? '' : 'Stant numarasını yazın.');
    if (firma) check(firma, r.firma ? '' : 'Teslim alacak firmayı yazın.');
  });
  check(f.firma, f.firma.value.trim() ? '' : 'Sipariş veren firmayı yazın.');
  check(f.adsoyad, f.adsoyad.value.trim() ? '' : 'Yetkili adını yazın.');
  const phone = normalizeTrPhone(f.telefon.value);
  check(f.telefon, phone ? '' : 'Geçerli bir Türkiye telefon numarası yazın (05XX XXX XX XX).');
  if (phone) f.telefon.value = phone;
  check(f.eposta, !f.eposta.value || f.eposta.checkValidity() ? '' : 'E-posta adresini kontrol edin.');
  const vno = f.vergi_no.value.replace(/\D/g, '');
  check(f.vergi_no, !f.vergi_no.value || vno.length === 10 || vno.length === 11 ? '' : 'Vergi no 10, TC kimlik no 11 hane olmalı.');
  check(f.kvkk, f.kvkk.checked ? '' : 'Devam etmek için KVKK onayı gerekli.');
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
  const lines = [`*Yeni sipariş · Fuar Çiçekçim*`, `Sipariş no: ${no}`, ''];
  lines.push(cart.items.length ? '*Ürünler ve teslimat*' : '*Teslimat*');
  res.forEach((r, n) => {
    const i = r.line;
    if (i.name) lines.push(`*${n + 1}) ${i.qty} × ${i.name}*${i.pkg ? ` (${i.pkg})` : ''} — ${tl(i.price * i.qty)}`);
    lines.push(`   Stant: ${standLabel(r) || '-'}`, `   Teslim alacak: ${r.firma || '-'}`, `   Şerit: ${(i.d.kart || '').trim() || '-'}`);
  });
  if (cart.items.length) lines.push('', `Ara toplam (KDV hariç): ${tl(totals.net)}`, `KDV %${PRICING.vatRate}: ${tl(totals.vat)}`, `*Toplam (KDV dahil): ${tl(totals.gross)}*`);
  lines.push('', '*Fuar*',
    `Fuar merkezi: ${data.merkez}`,
    `Fuar: ${data.fuar_adi || '-'}`,
    `Gün / saat: ${data.tarih} · ${data.saat}`, '',
    '*Sipariş veren*',
    `Firma: ${data.firma}`, `Yetkili: ${data.adsoyad}`, `Telefon: ${data.telefon}`);
  if (data.eposta) lines.push(`E-posta: ${data.eposta}`);
  if (data.fatura_unvan || data.vergi_no) lines.push('', '*Fatura*', `Ünvan: ${data.fatura_unvan || '-'}`, `Vergi dairesi: ${data.vergi_dairesi || '-'}`, `Vergi / TC no: ${data.vergi_no || '-'}`);
  if (data.not) lines.push('', `Not: ${data.not}`);
  lines.push('', PRICING.paymentNote);
  return lines.join('\n');
}

async function submit(e) {
  e.preventDefault();
  if (sending) return;
  const errors = validate();
  if (errors.length) {
    statusEl.textContent = 'Lütfen işaretli alanları kontrol edin.';
    errors[0].focus();
    return;
  }
  sending = true;
  submitBtn.disabled = true;
  submitBtn.setAttribute('aria-busy', 'true');
  statusEl.textContent = 'Siparişiniz hazırlanıyor…';

  const data = Object.fromEntries(new FormData(form));
  const totals = cart.totals();
  const no = orderNumber();
  const res = resolveStands();
  const message = buildMessage(no, data, totals, res);
  const waUrl = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
  // Pencere tıklama anında açılır; aksi halde tarayıcı açılır pencere engelleyicisine takılır.
  const waWin = window.open('', '_blank');

  const payload = {
    ...data,
    tur: 'siparis',
    siparis_no: no,
    stant: [...new Set(res.map((r) => [standLabel(r), r.firma].filter(Boolean).join(' · ')))].join('; '),
    kart: res.map((r, n) => `${n + 1}) ${(r.line.d.kart || '').trim() || '-'}`).join(' | '),
    urunler: res.filter((r) => r.line.name).map((r) => `${r.line.qty} × ${r.line.name}${r.line.pkg ? ` [${r.line.pkg}]` : ''} (${tl(r.line.price * r.line.qty)} + KDV) → ${standLabel(r)} · ${r.firma}`),
    ara_toplam: tl(totals.net),
    kdv: tl(totals.vat),
    toplam: tl(totals.gross),
    sayfa: location.href,
  };
  const timeout = new Promise((r) => setTimeout(r, 4000));
  await Promise.race([
    fetch('/teklif-gonder.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(() => null),
    timeout,
  ]);

  track('order_submit', { value: totals.gross, currency: 'TRY', item_count: cart.count, order_id: no });
  if (waWin) { waWin.opener = null; waWin.location.href = waUrl; }
  else window.location.href = waUrl;

  general.d = {};
  cart.clear();
  form.reset();
  statusEl.innerHTML = `Siparişiniz WhatsApp’a aktarıldı (no: <strong>${esc(no)}</strong>). Pencere açılmadıysa <a href="${esc(waUrl)}" target="_blank" rel="noopener">buraya dokunun</a>.`;
  submitBtn.disabled = false;
  submitBtn.removeAttribute('aria-busy');
  sending = false;
}

export function initDrawer() {
  if (!root) return;
  cart.subscribe(renderCart);

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-drawer-open]');
    if (opener) {
      e.preventDefault();
      if (opener.dataset.fair) form.elements.fuar_adi.value = opener.dataset.fair;
      const venue = [...form.elements.merkez].find((r) => opener.dataset.venue?.startsWith(r.value));
      if (venue) venue.checked = true;
      openDrawer(opener.dataset.trackLocation || '');
      return;
    }
    if (e.target.closest('[data-drawer-close]')) {
      const link = e.target.closest('a[href]');
      closeDrawer();
      if (!link) e.preventDefault();
      return;
    }
    const q = e.target.closest('[data-qty]');
    if (q) {
      const item = cart.items.find((i) => i.key === q.dataset.qty);
      if (item) cart.setQty(item.key, item.qty + Number(q.dataset.step));
      return;
    }
    const sp = e.target.closest('[data-line-split]');
    if (sp) {
      const at = cart.items.findIndex((i) => i.key === sp.dataset.lineSplit);
      cart.split(sp.dataset.lineSplit);
      // Yeni açılan satırın stant alanına odaklan.
      root.querySelectorAll('[data-cart-list] [data-line]')[at + 1]?.querySelector('[data-line-field="stant"]')?.focus();
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
      value = value.slice(0, RIBBON.maxChars);
      box.querySelector('[data-ribbon-preview]').textContent = ribbonText(value);
      box.querySelector('[data-ribbon-count]').textContent = value.length;
    }
    setLine(box.dataset.line, field, value);
    if (input.getAttribute('aria-invalid') === 'true') setError(input, '');
    if (field !== 'kart') refreshSameLabels();
  });
  panel.addEventListener('change', (e) => {
    const cb = e.target.closest('[data-line-same]');
    if (!cb) return;
    const box = cb.closest('[data-line]');
    box.querySelector('.ship__stand').hidden = cb.checked;
    setLine(box.dataset.line, 'same', cb.checked);
    refreshSameLabels();
    if (!cb.checked) box.querySelector('[data-line-field="stant"]')?.focus();
  });
  form.addEventListener('submit', submit);
  form.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true') setError(e.target, ''); });
  root.querySelector('.drawer__note')?.setAttribute('title', DELIVERY.condition);

  // Mobilde form doldurulurken (aşağı kaydırma veya klavye açık) alt alan tek satır toplam + butona küçülür.
  const scroller = root.querySelector('.drawer__scroll');
  const foot = root.querySelector('.drawer__foot');
  if (scroller && foot) {
    let focused = false;
    const update = () => foot.classList.toggle('is-compact', focused || scroller.scrollTop > 48);
    scroller.addEventListener('scroll', update, { passive: true });
    form.addEventListener('focusin', (e) => { focused = e.target.matches('input:not([type=checkbox]):not([type=radio]), textarea, select'); update(); });
    form.addEventListener('focusout', () => { focused = false; requestAnimationFrame(update); });
  }

  if (location.hash === '#siparis') openDrawer('link');
}
