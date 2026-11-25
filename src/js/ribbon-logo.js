// Logolar yerel tarayıcı veritabanında tutulur; sepet yalnızca kimlik ve dosya adını saklar.
import { prepareSvgLogo } from './svg-logo.js';

const DB_NAME = 'fc-ribbon-logos';
const STORE = 'logos';
export const RIBBON_LOGO_MAX_MB = 20;
export const RIBBON_LOGO_FORMATS = 'PNG, JPG/JPEG, WebP, SVG, AVIF, GIF veya BMP';
export const RIBBON_LOGO_ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml,image/avif,image/gif,image/bmp,image/x-ms-bmp,.png,.jpg,.jpeg,.webp,.svg,.avif,.gif,.bmp';
const MAX_BYTES = RIBBON_LOGO_MAX_MB * 1024 * 1024;
let dbPromise = null;
let previewQueue = Promise.resolve();

const validId = (id) => typeof id === 'string' && /^[a-zA-Z0-9-]{16,80}$/.test(id);
const cleanName = (name) => Array.from(String(name || '').split(/[\\/]/).pop()
  .replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim()).slice(0, 120).join('') || 'logo.png';

function storageError(error) {
  return new Error(error?.name === 'QuotaExceededError'
    ? 'Tarayıcıdaki depolama alanı dolu. Alan açıp logoyu yeniden ekleyin.'
    : 'Logo bu tarayıcıya kaydedilemedi. Tarayıcı depolamasına izin verip yeniden deneyin.');
}

function openDatabase() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('Bu tarayıcı logo kaydını desteklemiyor. Başka bir tarayıcıda yeniden deneyin.'));
  if (dbPromise) return dbPromise;
  const opening = new Promise((resolve, reject) => {
    let request;
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(storageError(error));
    };
    const timer = setTimeout(() => fail(), 10000);
    try { request = indexedDB.open(DB_NAME, 1); } catch (error) { fail(error); return; }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onerror = () => fail(request.error);
    request.onblocked = () => fail();
    request.onsuccess = () => {
      const db = request.result;
      if (settled) { db.close(); return; }
      if (!db.objectStoreNames.contains(STORE)) { db.close(); fail(); return; }
      settled = true;
      clearTimeout(timer);
      db.onversionchange = () => { db.close(); if (dbPromise === opening) dbPromise = null; };
      db.onclose = () => { if (dbPromise === opening) dbPromise = null; };
      resolve(db);
    };
  });
  dbPromise = opening;
  opening.catch(() => { if (dbPromise === opening) dbPromise = null; });
  return opening;
}

async function databaseRequest(mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let transaction;
    let request;
    let result;
    try {
      transaction = db.transaction(STORE, mode);
      request = action(transaction.objectStore(STORE));
    } catch (error) { reject(storageError(error)); return; }
    request.onsuccess = () => { result = request.result; };
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = transaction.onerror = () => reject(storageError(transaction.error || request.error));
  });
}

function checkDimensions(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0
    || width > 16384 || height > 16384 || width * height > 40000000) {
    throw new Error('Logonun piksel boyutları çok büyük. En fazla 40 megapiksel ve her kenarı en fazla 16.384 piksel olan bir görsel seçin.');
  }
}

// Sıkıştırılmış dosyanın boyutları biliniyorsa büyük bir piksel yüzeyi açılmadan kontrol edilir.
function headerDimensions(bytes, type) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (type === 'image/png' && bytes.length >= 24) return [view.getUint32(16), view.getUint32(20)];
  if (type === 'image/gif' && bytes.length >= 10) return [view.getUint16(6, true), view.getUint16(8, true)];
  if (type === 'image/bmp' && bytes.length >= 26) {
    const dib = view.getUint32(14, true);
    if (dib === 12) return [view.getUint16(18, true), view.getUint16(20, true)];
    if (dib >= 40) return [view.getInt32(18, true), Math.abs(view.getInt32(22, true))];
  }
  if (type === 'image/webp' && bytes.length >= 30) {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    if (chunk === 'VP8X') return [1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16)];
    if (chunk === 'VP8L' && bytes[20] === 47) return [1 + bytes[21] + ((bytes[22] & 63) << 8), 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 15) << 10)];
    if (chunk === 'VP8 ' && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) return [view.getUint16(26, true) & 16383, view.getUint16(28, true) & 16383];
  }
  if (type === 'image/jpeg') {
    const frames = new Set([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207]);
    let offset = 2;
    while (offset + 3 < bytes.length && bytes[offset] === 255) {
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218 || offset + 2 > bytes.length) break;
      if (marker === 1 || marker === 216 || (marker >= 208 && marker <= 215)) continue;
      const length = view.getUint16(offset);
      if (length < 2) break;
      if (frames.has(marker) && length >= 8 && offset + 7 <= bytes.length) return [view.getUint16(offset + 5), view.getUint16(offset + 3)];
      offset += length;
    }
  }
  return null;
}

async function validateFile(file) {
  if (!(file instanceof Blob)) throw new Error('Bir logo dosyası seçin.');
  if (!file.size) throw new Error('Logo dosyası boş. Başka bir görsel seçin.');
  if (file.size > MAX_BYTES) throw new Error(`Logo dosyası en fazla ${RIBBON_LOGO_MAX_MB} MB olabilir.`);
  let bytes;
  try { bytes = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer()); }
  catch { throw new Error('Logo dosyası okunamadı. Dosyayı yeniden seçin.'); }
  const text = (start, end) => String.fromCharCode(...bytes.slice(start, end));
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = [82, 73, 70, 70].every((value, i) => bytes[i] === value)
    && [87, 69, 66, 80].every((value, i) => bytes[i + 8] === value);
  const gif = ['GIF87a', 'GIF89a'].includes(text(0, 6));
  const bmp = text(0, 2) === 'BM' && bytes.length >= 26;
  let avif = false;
  if (bytes.length >= 16 && text(4, 8) === 'ftyp') {
    const end = new DataView(bytes.buffer).getUint32(0);
    if (end >= 16 && end <= bytes.length) {
      avif = ['avif', 'avis'].includes(text(8, 12));
      for (let offset = 16; !avif && offset + 4 <= end; offset += 4) avif = ['avif', 'avis'].includes(text(offset, offset + 4));
    }
  }
  const type = png ? 'image/png' : jpeg ? 'image/jpeg' : webp ? 'image/webp' : gif ? 'image/gif' : bmp ? 'image/bmp' : avif ? 'image/avif' : '';
  if (!type) {
    if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name || '') || new TextDecoder().decode(bytes.slice(0, 512)).trimStart().startsWith('<')) return prepareSvgLogo(file);
    throw new Error(`${RIBBON_LOGO_FORMATS} biçiminde bir logo seçin. Bu dosya türü önizlenemiyor.`);
  }
  const dimensions = headerDimensions(bytes, type);
  if (dimensions) checkDimensions(...dimensions);
  // İşletim sistemi MIME bilgisini boş/yanlış verebilir; önizleme gerçek dosya imzasını kullanır.
  return new Blob([file], { type });
}

async function createPreview(file) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Logo açılamadı. Başka bir görsel seçin.')), 15000);
      image.onload = () => { clearTimeout(timer); resolve(); };
      image.onerror = () => { clearTimeout(timer); reject(new Error('Logo açılamadı. Başka bir görsel seçin.')); };
      image.src = url;
    });
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    checkDimensions(width, height);
    const scale = Math.min(1, 256 / width, 128 / height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Logo önizlemesi hazırlanamadı. Başka bir tarayıcıda yeniden deneyin.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const preview = canvas.toDataURL('image/png');
    if (!preview.startsWith('data:image/png;base64,')) throw new Error('Logo önizlemesi hazırlanamadı. Başka bir görsel seçin.');
    return preview;
  } finally {
    image.onload = image.onerror = null;
    image.removeAttribute('src');
    URL.revokeObjectURL(url);
  }
}

function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  if (globalThis.crypto?.getRandomValues) {
    return [...crypto.getRandomValues(new Uint8Array(16))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('Logo için kayıt oluşturulamadı. Sayfayı yenileyip yeniden deneyin.');
}

// Kayıt işlemi tamamlanmadan kimlik dönmez; başarısız yükleme sepete eklenmez.
export async function saveRibbonLogo(file) {
  // Büyük görseller aynı anda çözülmez; önceki bir hata sonraki yüklemeleri durdurmaz.
  const job = previewQueue.then(async () => createPreview(await validateFile(file)));
  previewQueue = job.catch(() => {});
  const preview = await job;
  const record = { id: newId(), name: cleanName(file.name), blob: file, preview, createdAt: Date.now() };
  await databaseRequest('readwrite', (store) => store.add(record));
  return { id: record.id, name: record.name };
}

export async function getRibbonLogo(id) {
  if (!validId(id)) return null;
  const record = await databaseRequest('readonly', (store) => store.get(id));
  if (!record || record.id !== id || !(record.blob instanceof Blob)
    || typeof record.preview !== 'string' || record.preview.length > 256 * 1024
    || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(record.preview)) return null;
  return { ...record, name: cleanName(record.name) };
}

// Aynı logo başka sepet satırında kullanılıyorsa çağıran silmemelidir.
export async function deleteRibbonLogo(id) {
  if (!validId(id)) return;
  await databaseRequest('readwrite', (store) => store.delete(id));
}
