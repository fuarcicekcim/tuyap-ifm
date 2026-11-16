import { CONTACT } from '../config/site-settings.js';
import { normalizeTrPhone } from './drawer.js';
import { track } from './analytics.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function setError(input, msg) {
  const field = input.closest('.field, .consent');
  field?.classList.toggle('has-error', !!msg);
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  let note = field?.querySelector('.field__error');
  if (msg && field && !note) {
    note = document.createElement('p');
    note.className = 'field__error';
    note.id = `q-${input.name}-hata`;
    field.append(note);
    input.setAttribute('aria-describedby', note.id);
  }
  if (note) note.textContent = msg || '';
}

export function initQuote() {
  const form = document.querySelector('[data-quote-form]');
  if (!form) return;
  const btn = form.querySelector('[data-quote-submit]');
  const status = form.querySelector('[data-quote-status]');
  let sending = false;

  form.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true') setError(e.target, ''); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    const f = form.elements;
    const errors = [];
    const check = (el, msg) => { setError(el, msg); if (msg) errors.push(el); };
    check(f.firma, f.firma.value.trim() ? '' : 'Firma adını yazın.');
    check(f.adsoyad, f.adsoyad.value.trim() ? '' : 'Yetkili adını yazın.');
    const phone = normalizeTrPhone(f.telefon.value);
    check(f.telefon, phone ? '' : 'Geçerli bir Türkiye telefon numarası yazın.');
    if (phone) f.telefon.value = phone;
    check(f.eposta, !f.eposta.value || f.eposta.checkValidity() ? '' : 'E-posta adresini kontrol edin.');
    check(f.stant, f.stant.value.trim() ? '' : 'En az bir stant ve teslim gününü yazın.');
    check(f.kvkk, f.kvkk.checked ? '' : 'Devam etmek için KVKK onayı gerekli.');
    if (errors.length) { status.textContent = 'Lütfen işaretli alanları kontrol edin.'; errors[0].focus(); return; }

    sending = true;
    btn.disabled = true;
    status.textContent = 'Talebiniz gönderiliyor…';
    const data = Object.fromEntries(new FormData(form));
    const lines = ['*Kurumsal teklif talebi · Fuar Çiçekçim*', '', `Firma: ${data.firma}`, `Yetkili: ${data.adsoyad}`, `Telefon: ${data.telefon}`];
    if (data.eposta) lines.push(`E-posta: ${data.eposta}`);
    lines.push('', `Fuar: ${data.fuar_adi || '-'} (${data.merkez})`, `Stantlar ve günler:\n${data.stant}`, `Bütçe (KDV hariç): ${data.butce}`);
    if (data.not) lines.push(`Not: ${data.not}`);
    const waUrl = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
    const waWin = window.open('', '_blank');
    await Promise.race([
      fetch('/teklif-gonder.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, tur: 'teklif', sayfa: location.href }), keepalive: true }).catch(() => null),
      new Promise((r) => setTimeout(r, 4000)),
    ]);
    track('corporate_quote_submit', { budget: data.butce, venue: data.merkez });
    if (waWin) { waWin.opener = null; waWin.location.href = waUrl; } else window.location.href = waUrl;
    status.innerHTML = `Talebiniz iletildi. WhatsApp açılmadıysa <a href="${esc(waUrl)}" target="_blank" rel="noopener">buraya dokunun</a>.`;
    form.reset();
    btn.disabled = false;
    sending = false;
  });
}
