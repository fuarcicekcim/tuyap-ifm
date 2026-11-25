// Talep verisi ile tekrar gönderim kimliği ayrıdır. Yeni depoya müşteri verisi yazılmaz.
const memory = new Map();
export function deliveryDayLabel(value) {
  const text = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(`${text}T12:00:00+03:00`);
  if (!Number.isFinite(date.getTime())) return text;
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', weekday: 'long' }).format(date);
}
export function venueId(value) {
  const text = String(value || '').toLocaleLowerCase('tr-TR');
  if (text.includes('her ikisi')) return 'both';
  if (text.includes('tüyap') || text.includes('tuyap')) return 'tuyap';
  if (text.includes('ifm') || text.includes('ıfm') || text.includes('iḟm') || text.includes('i̇fm')) return 'ifm';
  return 'other';
}
function uuid() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
async function fingerprint(text) {
  if (crypto.subtle) return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), n => n.toString(16).padStart(2, '0')).join('');
  // LAN HTTP'de Web Crypto bulunmayabilir. Bu özet yalnız aynı cihazdaki tekrarları
  // eşler; güvenlik kararı değildir. Sunucu tam payload SHA-256'sını ayrıca denetler.
  let a = 2166136261, b = 5381;
  for (let n = 0; n < text.length; n++) { a = Math.imul(a ^ text.charCodeAt(n), 16777619); b = Math.imul(b, 33) ^ text.charCodeAt(n); }
  return `local-${(a >>> 0).toString(16)}-${(b >>> 0).toString(16)}-${text.length}`;
}
export async function requestIdentity(kind, payload, referenceFactory = () => `FC-${Date.now().toString(36).toUpperCase()}`) {
  const key = `fc-request-identity-v2:${kind}`;
  const hash = await fingerprint(JSON.stringify(payload));
  let previous = memory.get(key);
  try { previous = JSON.parse(sessionStorage.getItem(key) || 'null') || previous; } catch { /* memory fallback */ }
  if (previous?.fingerprint === hash && /^[a-f\d-]{36}$/i.test(previous.id || '')) return previous;
  const identity = { fingerprint: hash, id: uuid(), reference: referenceFactory() };
  memory.set(key, identity);
  try { sessionStorage.setItem(key, JSON.stringify(identity)); } catch { /* No PII fallback persists. */ }
  return identity;
}
export function forgetRequestIdentity(kind) {
  const key = `fc-request-identity-v2:${kind}`;
  memory.delete(key);
  try { sessionStorage.removeItem(key); } catch { /* optional */ }
}
function base(data, type) {
  return { payload_version: 2, request_type: type,
    customer: { name: data.adsoyad || '', company: data.firma || '', phone: data.telefon || '', email: data.eposta || '', billing_company: data.fatura_unvan || '', tax_office: data.vergi_dairesi || '', tax_number: data.vergi_no || '' },
    event: { venue: venueId(data.merkez), fair_name: data.fuar_adi || data.fuar_diger || '' },
    notes: data.not || '',
  };
}
export function orderIntake(data, resolvedLines) {
  const payload = { ...base(data, 'order_request'), items: [], deliveries: [], quote: { details: '', budget: '' } };
  let previousDelivery = null;
  for (const row of resolvedLines) {
    let deliveryId = previousDelivery;
    if (!row.same || !deliveryId) {
      deliveryId = `stop-${row.line.key}`;
      payload.deliveries.push({ delivery_id: deliveryId, venue: payload.event.venue, fair_name: payload.event.fair_name,
        hall_no: row.salon || '', stand_no: row.stant || '', recipient_company: row.firma || '', recipient_name: '', recipient_phone: '',
        requested_date: /^\d{4}-\d{2}-\d{2}$/.test(data.tarih || '') ? data.tarih : null,
        requested_date_label: deliveryDayLabel(data.tarih),
        requested_slot: data.saat || '', scheduled_at: null, time_zone: 'Europe/Istanbul', notes: '' });
      previousDelivery = deliveryId;
    }
    if (!row.line.id || !row.line.name) continue;
    const d = row.line.d || {};
    const only = d.ribbonMode === 'logo-only';
    payload.items.push({ line_key: row.line.key, product_id: row.line.id, qty: row.line.qty, delivery_id: deliveryId,
      package_name: row.line.pkg || '', ribbon: { mode: only ? 'logo-only' : 'text', text: only ? '' : String(d.kart || '').trim() || 'İyi Fuarlar',
        color: only ? null : ['black','blue','red'].includes(d.ribbonColor) ? d.ribbonColor : 'black',
        logo_file_name: d.logo?.name || '', logo_status: 'not_uploaded' } });
  }
  return payload;
}
export function quoteIntake(data) {
  return { ...base(data, 'quote_request'), items: [], deliveries: [], quote: { details: data.stant || '', budget: data.butce || '' } };
}
