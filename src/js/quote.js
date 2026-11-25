import { CONTACT } from '../config/site-settings.js';
import { normalizeTrPhone } from './drawer.js';
import { track } from './analytics.js';
import { submitRequest, openWhatsAppWindow, navigateWhatsAppWindow, showSubmissionStatus } from './submission.js';
import { quoteIntake, requestIdentity, forgetRequestIdentity } from './request-intake.js';

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
    btn.setAttribute('aria-busy', 'true');
    status.textContent = 'Talebiniz gönderiliyor…';
    const waWin = openWhatsAppWindow();
    const controls = [];
    let opened = false;
    try {
      const data = Object.fromEntries(new FormData(form));
      const lines = ['*Kurumsal teklif talebi · Fuar Çiçekçim*', '', `Firma: ${data.firma}`, `Yetkili: ${data.adsoyad}`, `Telefon: ${data.telefon}`];
      if (data.eposta) lines.push(`E-posta: ${data.eposta}`);
      lines.push('', `Fuar: ${data.fuar_adi || '-'} (${data.merkez})`, `Stantlar ve günler:\n${data.stant}`, `Bütçe: ${data.butce}`);
      if (data.not) lines.push(`Not: ${data.not}`);
      const waUrl = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
      controls.push(...[...form.querySelectorAll('input, select, textarea')].map((el) => [el, el.disabled]));
      controls.forEach(([el]) => { el.disabled = true; });
      const structured = quoteIntake(data);
      const identity = await requestIdentity('quote', structured);
      const result = await submitRequest({ ...data, ...structured, client_request_id: identity.id, request_reference: identity.reference, tur: 'teklif', sayfa: location.href });
      opened = navigateWhatsAppWindow(waWin, waUrl);
      showSubmissionStatus(status, result, waUrl, { location: 'quote_result' });
      if (result.kind === 'sent') { forgetRequestIdentity('quote'); form.reset(); }
      // Ölçümdeki bir hata talebin sonucunu veya formun kilidini değiştirmemeli.
      try {
        if (result.kind === 'sent') track('corporate_quote_submit', { budget: data.butce, venue: data.merkez });
        if (opened) track('whatsapp_click', { location: 'quote_submit' });
      } catch { /* Ölçüm isteğe bağlıdır. */ }
    } catch {
      if (!opened) { try { waWin?.close(); } catch { /* Pencere kapanmış olabilir. */ } }
      status.textContent = 'Talebiniz hazırlanamadı. Bilgileriniz korunuyor. Lütfen yeniden deneyin.';
    } finally {
      controls.forEach(([el, disabled]) => { el.disabled = disabled; });
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      sending = false;
    }
  });
}
