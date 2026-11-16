// Alt bilgideki süzülen botanik öğeler (vektör çizim; fotoğraf değil).
// Her öğe: tür, konum (%), boyut (px), açı, paralaks derinliği, öne/arkaya, süzülme süresi, yalnız masaüstü.

const SVG = {
  orchid: `<svg viewBox="0 0 120 120" focusable="false"><defs><radialGradient id="flo-o" cx="50%" cy="55%" r="65%"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#f6eef2"/><stop offset="1" stop-color="#e7d3dd"/></radialGradient></defs><g fill="url(#flo-o)" stroke="#dcc6d1" stroke-width=".8"><path d="M60 58C52 30 56 10 60 7c4 3 8 23 0 51Z"/><path d="M60 58C40 70 30 95 38 101c10 2 20-21 22-43Z"/><path d="M60 58c20 12 30 37 22 43-10 2-20-21-22-43Z"/><path d="M60 58C40 18 18 28 20 52c2 19 30 15 40 6Z"/><path d="M60 58c20-40 42-30 40-6-2 19-30 15-40 6Z"/></g><path d="M60 57c-11 6-12 22 0 28 12-6 11-22 0-28Z" fill="#c4577d"/><path d="M60 64c-4 3-4 9 0 12 4-3 4-9 0-12Z" fill="#9e3a60" opacity=".55"/><circle cx="60" cy="59" r="3.6" fill="#f0c64a"/></svg>`,
  leaf: `<svg viewBox="0 0 60 140" focusable="false"><defs><linearGradient id="flo-l" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#2c6446"/><stop offset="1" stop-color="#86ad90"/></linearGradient></defs><path d="M30 4c28 36 26 96 0 132C4 100 2 40 30 4Z" fill="url(#flo-l)"/><path d="M30 12v120" stroke="#163d2a" stroke-width="1.3" opacity=".55" fill="none"/><path d="M30 40l14-10M30 60l17-12M30 80l16-12M30 100l12-10M30 40L16 30M30 60L13 48M30 80L14 68M30 100L18 90" stroke="#163d2a" stroke-width=".8" opacity=".3" fill="none"/></svg>`,
  petal: `<svg viewBox="0 0 80 80" focusable="false"><defs><radialGradient id="flo-p" cx="38%" cy="32%" r="72%"><stop offset="0" stop-color="#fae3de"/><stop offset="1" stop-color="#d9988f"/></radialGradient></defs><path d="M40 6c26 2 36 28 26 50S24 78 14 56 14 6 40 6Z" fill="url(#flo-p)"/><path d="M22 50c12 8 28 6 38-6" stroke="#c47f76" stroke-width="1" opacity=".45" fill="none"/></svg>`,
  euca: `<svg viewBox="0 0 80 160" focusable="false"><path d="M40 156c-2-46 2-96 0-150" stroke="#5f7f6e" stroke-width="2" fill="none"/><g fill="#9fb8a8" stroke="#7d9a88" stroke-width=".6"><ellipse cx="27" cy="136" rx="13" ry="10"/><ellipse cx="54" cy="116" rx="13" ry="10"/><ellipse cx="26" cy="96" rx="12" ry="9"/><ellipse cx="53" cy="76" rx="11" ry="9"/><ellipse cx="28" cy="57" rx="10" ry="8"/><ellipse cx="51" cy="40" rx="9" ry="7"/><ellipse cx="32" cy="24" rx="8" ry="6"/><ellipse cx="44" cy="11" rx="6" ry="5"/></g></svg>`,
  sprig: `<svg viewBox="0 0 60 120" focusable="false"><path d="M30 116C28 80 32 40 30 4" stroke="#b8924a" stroke-width="1.4" fill="none"/><g fill="none" stroke="#c5a059" stroke-width="1.2"><path d="M30 96c-12-2-18-10-18-18 10 0 18 8 18 18Z"/><path d="M30 80c12-2 18-10 18-18-10 0-18 8-18 18Z"/><path d="M30 62c-10-2-16-9-16-16 9 0 16 7 16 16Z"/><path d="M30 46c10-2 15-8 15-15-9 0-15 6-15 15Z"/><path d="M30 30c-8-2-12-7-12-13 7 0 12 5 12 13Z"/></g></svg>`,
};

const ITEMS = [
  // tür,   x%,  y%,  boyut, açı, derinlik, öne, süre, yalnızMasaüstü
  ['orchid', 5,   78,  96,  -14, 90,  true,  9,  false],
  ['leaf',   15,  70,  64,   38, 150, false, 11, true],
  ['petal',  27,  56,  40,   24, 60,  true,  7,  true],
  ['euca',   36,  74,  70,  -18, 120, false, 12, true],
  ['orchid', 50,  78,  124,   9, 130, true,  10, false],
  ['petal',  64,  52,  34,  -32, 50,  false, 8,  true],
  ['sprig',  70,  72,  56,   20, 100, true,  10, true],
  ['leaf',   86,  80,  86,  -42, 160, true,  12, false],
  ['petal',  91,  84,  44,   60, 70,  true,  8,  false],
  ['orchid', 93,  42,  70,   18, 80,  false, 11, true],
];

export function flora() {
  // Degrade kimlikleri her öğede benzersiz olsun diye numaralanır.
  return ITEMS.map(([kind, x, y, size, rot, depth, front, dur, desk], i) =>
    `<span class="flora flora--${kind}${front ? ' is-front' : ''}${desk ? ' is-desk' : ''}" data-depth="${depth}" style="--x:${x}%;--y:${y}%;--s:${size}px;--r:${rot}deg;--d:${dur}s">${SVG[kind].replaceAll('id="flo-', `id="flo${i}-`).replaceAll('url(#flo-', `url(#flo${i}-`)}</span>`,
  ).join('');
}
