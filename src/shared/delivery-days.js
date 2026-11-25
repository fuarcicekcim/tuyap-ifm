// Teslim günleri: derleme (scripts/lib/layout.mjs) ve tarayıcı (src/js/drawer.js, fair-offer.js) aynı kuralı kullanır.
// Tarihler her zaman İstanbul saatine göre "YYYY-AA-GG" biçimindedir; tarayıcının saat dilimi sonucu değiştirmez.

export const ROLLING_DELIVERY_DAYS = 7;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
export const isIsoDay = (value) => ISO_DAY.test(String(value || ''));

export function istanbulToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addDays(iso, offset) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + offset * 86400000).toISOString().slice(0, 10);
}

// Fuar günlerinden bugün ve sonrası kalır; hiç kalmadıysa bugünden itibaren `rolling` gün döner.
export function deliveryDays(today, fairDays = [], rolling = ROLLING_DELIVERY_DAYS) {
  const upcoming = fairDays.filter((day) => isIsoDay(day) && day >= today);
  if (upcoming.length) return upcoming;
  return Array.from({ length: rolling }, (_, offset) => addDays(today, offset));
}
