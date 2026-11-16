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

function renderCart(items) {
  const list = root.querySelector('[data-cart-list]');
  list.innerHTML = items.map((i) => `
    <li class="cart-item">
      <img src="${esc(i.image)}" width="64" height="96" alt="" loading="lazy">
      <div class="cart-item__info">
        <p class="cart-item__cat">${esc(i.cat || '')}</p>
        <p class="cart-item__name">${esc(i.name)}</p>
        <p class="cart-item__price">${tl(i.price * i.qty)} <small>+ KDV</small></p>
      </div>
      <div class="qty" role="group" aria-label="${esc(i.name)} adedi">
        <button type="button" data-qty="${esc(i.id)}" data-step="-1" aria-label="Azalt">−</button>
        <output aria-live="polite">${i.qty}</output>
        <button type="button" data-qty="${esc(i.id)}" data-step="1" aria-label="Artır">+</button>
      </div>
    </li>`).join('');
  root.querySelector('[data-cart-empty]').hidden = items.length > 0;
  const t = cart.totals();
  root.querySelector('[data-total-net]').textContent = tl(t.net);
  root.querySelector('[data-total-vat]').textContent = tl(t.vat);
  root.querySelector('[data-total-gross]').textContent = tl(t.gross);
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = cart.count;
    el.dataset.count = cart.count;
  });
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
  check(f.stant, f.stant.value.trim() ? '' : 'Stant numarasını yazın.');
  check(f.firma, f.firma.value.trim() ? '' : 'Teslim alacak firmayı yazın.');
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

function buildMessage(no, data, totals) {
  const lines = [`*Yeni sipariş · Fuar Çiçekçim*`, `Sipariş no: ${no}`, ''];
  if (cart.items.length) {
    lines.push('*Ürünler*');
    cart.items.forEach((i) => lines.push(`• ${i.qty} × ${i.name} — ${tl(i.price * i.qty)}`));
    lines.push(`Ara toplam (KDV hariç): ${tl(totals.net)}`, `KDV %${PRICING.vatRate}: ${tl(totals.vat)}`, `*Toplam (KDV dahil): ${tl(totals.gross)}*`, '');
  }
  lines.push('*Teslimat*',
    `Fuar merkezi: ${data.merkez}`,
    `Fuar: ${data.fuar_adi || '-'}`,
    `Salon / stant: ${data.salon || '-'} / ${data.stant}`,
    `Gün / saat: ${data.tarih} · ${data.saat}`,
    `Kuşak yazısı: ${data.kart || '-'}`, '',
    '*İletişim*',
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
  const message = buildMessage(no, data, totals);
  const waUrl = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
  // Pencere tıklama anında açılır; aksi halde tarayıcı açılır pencere engelleyicisine takılır.
  const waWin = window.open('', '_blank');

  const payload = {
    ...data,
    tur: 'siparis',
    siparis_no: no,
    stant: [data.salon && `Salon ${data.salon}`, `Stant ${data.stant}`].filter(Boolean).join(' / '),
    urunler: cart.items.map((i) => `${i.qty} × ${i.name} (${tl(i.price * i.qty)} + KDV)`),
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

  track('order_submit', { value: totals.gross, currency: 'TRY', items: cart.count, order_id: no });
  if (waWin) { waWin.opener = null; waWin.location.href = waUrl; }
  else window.location.href = waUrl;

  cart.clear();
  form.reset();
  updateRibbon();
  statusEl.innerHTML = `Siparişiniz WhatsApp’a aktarıldı (no: <strong>${esc(no)}</strong>). Pencere açılmadıysa <a href="${esc(waUrl)}" target="_blank" rel="noopener">buraya dokunun</a>.`;
  submitBtn.disabled = false;
  submitBtn.removeAttribute('aria-busy');
  sending = false;
}

function updateRibbon() {
  const input = root.querySelector('[data-ribbon-input]');
  const text = input.value.slice(0, RIBBON.maxChars);
  root.querySelector('[data-ribbon-preview]').textContent = text.trim() || 'İyi Fuarlar';
  root.querySelector('[data-ribbon-count]').textContent = text.length;
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
      const item = cart.items.find((i) => i.id === q.dataset.qty);
      if (item) cart.setQty(item.id, item.qty + Number(q.dataset.step));
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

  root.querySelector('[data-ribbon-input]').addEventListener('input', updateRibbon);
  form.addEventListener('submit', submit);
  form.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true') setError(e.target, ''); });
  root.querySelector('.drawer__note')?.setAttribute('title', DELIVERY.condition);
  if (location.hash === '#siparis') openDrawer('link');
}
