const SVG_NS = 'http://www.w3.org/2000/svg';
const FORBIDDEN = new Set([
  'script', 'foreignobject', 'iframe', 'object', 'embed', 'audio', 'video',
  'animate', 'animatetransform', 'animatemotion', 'set', 'discard',
]);
const localReference = (value) => /^#[^\s<>"']*$/u.test(value);

function rejectSvg(message) {
  throw new Error(message || 'SVG dosyası güvenli bir logo önizlemesi için uygun değil. Logoyu PNG olarak kaydedip yeniden ekleyin.');
}

// CSS kaçışları ve yorumları, harici kaynak denetimini aşmak için kullanılamaz.
function cssText(value) {
  return String(value)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\\(?:\r\n|[\r\n\f])/g, '')
    .replace(/\\([0-9a-f]{1,6})(?:\r\n|[ \t\r\n\f])?|\\([^\r\n\f])/gi, (_, hex, character) => {
      if (!hex) return character;
      const point = parseInt(hex, 16);
      return point && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : '\ufffd';
    });
}

function checkCss(value) {
  const css = cssText(value);
  if (/@import\b/i.test(css) || /(?:^|[^\w-])(?:-webkit-)?image-set\s*\(/i.test(css)) rejectSvg();
  const starts = css.match(/\burl\s*\(/gi) || [];
  const urls = [...css.matchAll(/\burl\s*\(([\s\S]*?)\)/gi)];
  if (starts.length !== urls.length) rejectSvg();
  for (const match of urls) {
    let reference = match[1].trim();
    if ((reference[0] === '"' && reference.at(-1) === '"') || (reference[0] === "'" && reference.at(-1) === "'")) reference = reference.slice(1, -1).trim();
    if (!localReference(reference)) rejectSvg('SVG dosyasında bağlı veya gömülü görsel var. Logoyu PNG olarak kaydedip yeniden ekleyin.');
  }
}

function pixelLength(value) {
  const match = /^\s*(\+?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*(px|in|cm|mm|q|pt|pc)?\s*$/i.exec(value || '');
  if (!match) return null;
  const factors = { px: 1, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, q: 96 / 101.6, pt: 96 / 72, pc: 16 };
  const pixels = Number(match[1]) * factors[(match[2] || 'px').toLowerCase()];
  return Number.isFinite(pixels) && pixels > 0 ? pixels : null;
}

function normalizeSize(svg) {
  const value = (svg.getAttribute('viewBox') || '').trim();
  let width;
  let height;
  if (value) {
    const box = value.split(/[\s,]+/).map(Number);
    if (box.length !== 4 || !box.every(Number.isFinite) || box[2] <= 0 || box[3] <= 0) rejectSvg('SVG dosyasının çizim alanı geçersiz. Logoyu yeniden kaydedip ekleyin.');
    [, , width, height] = box;
  } else {
    width = pixelLength(svg.getAttribute('width')) || 300;
    height = pixelLength(svg.getAttribute('height')) || 150;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }
  const scale = Math.min(256 / width, 128 / height);
  const previewWidth = Math.max(1, Math.round(width * scale));
  const previewHeight = Math.max(1, Math.round(height * scale));
  svg.setAttribute('width', String(previewWidth));
  svg.setAttribute('height', String(previewHeight));
  // SVG içindeki stiller, önizlemenin piksel boyutunu tekrar büyütemez.
  svg.style.setProperty('width', `${previewWidth}px`, 'important');
  svg.style.setProperty('height', `${previewHeight}px`, 'important');
  svg.style.setProperty('min-width', '0', 'important');
  svg.style.setProperty('min-height', '0', 'important');
  svg.style.setProperty('max-width', `${previewWidth}px`, 'important');
  svg.style.setProperty('max-height', `${previewHeight}px`, 'important');
}

// Yalnızca Image → PNG önizlemesinde kullanılacak yeni Blob döner; özgün dosya değişmez.
export async function prepareSvgLogo(file) {
  let text;
  try { text = await file.text(); }
  catch { rejectSvg('SVG dosyası okunamadı. Dosyayı yeniden seçin.'); }
  if (/<!\s*(?:doctype|entity)\b/i.test(text)) rejectSvg('SVG dosyası dış belge veya varlık tanımı içeriyor. Logoyu sade SVG olarak yeniden kaydedin.');
  let document;
  try { document = new DOMParser().parseFromString(text, 'image/svg+xml'); }
  catch { rejectSvg('SVG dosyası açılamadı. Dosyayı yeniden kaydedip ekleyin.'); }
  const svg = document.documentElement;
  if (!svg || svg.localName !== 'svg' || svg.namespaceURI !== SVG_NS || document.getElementsByTagName('parsererror').length) rejectSvg('Geçerli bir SVG logo dosyası seçin.');
  if (document.doctype || document.createTreeWalker(document, 128).nextNode()) rejectSvg();

  for (const element of [svg, ...svg.querySelectorAll('*')]) {
    if (FORBIDDEN.has(element.localName.toLowerCase())) rejectSvg('SVG dosyası hareketli veya etkileşimli içerik barındırıyor. Sabit logonuzu SVG ya da PNG olarak ekleyin.');
    if (element.localName.toLowerCase() === 'style') checkCss(element.textContent || '');
    for (const attribute of [...element.attributes]) {
      const name = attribute.localName.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith('on') || attribute.name.toLowerCase() === 'xml:base') rejectSvg();
      if (['href', 'src', 'poster'].includes(name) && value && !localReference(value)) rejectSvg('SVG dosyasında bağlı veya gömülü görsel var. Logoyu PNG olarak kaydedip yeniden ekleyin.');
      checkCss(attribute.value);
    }
  }
  normalizeSize(svg);
  return new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
}
