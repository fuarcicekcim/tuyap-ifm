import * as lucide from 'lucide';

export const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const toPascal = (name) => name.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('');

export function icon(name, cls = 'icon') {
  const node = lucide[toPascal(name)];
  if (!node) throw new Error(`Lucide ikonu bulunamadı: ${name}`);
  const inner = node.map(([tag, attrs]) =>
    `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('');
  return `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;
}

// catalog-pricing.js `format` ile aynı kural: tam lira "4.038 TL", kuruşlu "4.037,50 TL".
export const tlPrice = (n) => (Math.round(n * 100) % 100 === 0
  ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })
  : new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })).format(n) + ' TL';

const trFmt = (opts) => new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', ...opts });
export const trDay = (iso) => trFmt({ day: 'numeric', month: 'long', weekday: 'long' }).format(new Date(`${iso}T12:00:00+03:00`));
export function trRange(days) {
  const first = new Date(`${days[0]}T12:00:00+03:00`);
  const last = new Date(`${days.at(-1)}T12:00:00+03:00`);
  return `${trFmt({ day: 'numeric' }).format(first)}–${trFmt({ day: 'numeric', month: 'long' }).format(last)}`;
}

export const jsonLd = (obj) =>
  `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
