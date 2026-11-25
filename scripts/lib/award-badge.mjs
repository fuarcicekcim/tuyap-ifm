// "En çok satan" madalya rozeti: şampanya-altın metal zemin, ince iç çerçeve, defne dalı (ortasında sıra numarası)
// ve hafif holografik parlama. Yalnızca products-data.js'te "best-seller" rozeti ve bestsellerRank'i olan ürünlerde
// kullanılır; satış iddiası verisiz üretilmez. Görünüm: src/styles/award-badge.css, masaüstü eğilme: src/js/award-badge.js.

const LEAVES = [
  [9.4, 25.2, -58], [6.6, 21, -38], [5.2, 16.2, -16], [5.6, 11.4, 10], [8, 7.2, 32],
];
const branch = `<path d="M13 28.6C6.8 25.4 3.6 17.6 7.8 6.4" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>${
  LEAVES.map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="1.7" ry="3.6" transform="rotate(${r} ${x} ${y})"/>`).join('')}`;

const STAR = '<polygon points="16,10.6 17.5,14 21.2,14.3 18.4,16.7 19.3,20.3 16,18.4 12.7,20.3 13.6,16.7 10.8,14.3 14.5,14"/>';

// rank 1–9 ise madalyonun ortasında sıra numarası, yoksa yıldız görünür.
const laurel = (rank) => `<svg class="award-badge__icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><g fill="currentColor">${branch}<g transform="matrix(-1 0 0 1 32 0)">${branch}</g>${rank ? `<text class="award-badge__rank" x="16" y="21.4" text-anchor="middle">${rank}</text>` : STAR}</g></svg>`;

// size: 'card' (ürün kartı görselinin üstü) | 'lg' (ürün sayfası başlığının üstü)
export function awardBadge({ size = 'card', rank = null } = {}) {
  const n = Number.isInteger(rank) && rank >= 1 && rank <= 9 ? rank : null;
  return `<span class="award-badge award-badge--${size}"><span class="award-badge__holo" aria-hidden="true"></span>${laurel(n)}<span class="award-badge__text"><span class="award-badge__kicker" aria-hidden="true">Fuar Çiçekçim</span><span class="award-badge__title">En Çok Satan</span></span>${n ? `<span class="sr-only"> ${n}. sırada</span>` : ''}</span>`;
}
