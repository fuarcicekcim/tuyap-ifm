// Güvenli yerel katalog aktarımı. Varsayılan yalnız denetler; yazmak için açıkça --apply gerekir.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { parseCatalogSource, validateCatalog, serializeCatalog, sourceSha256, localImagePath } from './lib/catalog-release.mjs';

const args = process.argv.slice(2);
const input = args.find((arg, index) => !arg.startsWith('--') && !['--root', '--expected-source-sha256'].includes(args[index - 1]));
const rootIndex = args.indexOf('--root');
const root = fs.realpathSync(path.resolve(rootIndex < 0 ? fileURLToPath(new URL('..', import.meta.url)) : args[rootIndex + 1] || ''));
const apply = args.includes('--apply');
const expectedIndex = args.indexOf('--expected-source-sha256');
const allowed = new Set(['--root', '--apply', '--expected-source-sha256']);
let lock, stage;

function inside(filename) {
  const absolute = path.resolve(root, filename);
  if (!absolute.startsWith(root + path.sep)) throw new Error('Hedef proje klasörü dışına çıkıyor.');
  let parent = path.dirname(absolute);
  while (!fs.existsSync(parent)) parent = path.dirname(parent);
  if (fs.realpathSync(parent) !== root && !fs.realpathSync(parent).startsWith(root + path.sep)) throw new Error('Hedef klasör proje dışına yönleniyor.');
  if (fs.existsSync(absolute) && fs.lstatSync(absolute).isSymbolicLink()) throw new Error('Sembolik bağlantıya yazılamaz.');
  return absolute;
}

try {
  if (!input || args.some((arg) => arg.startsWith('--') && !allowed.has(arg)) || (rootIndex >= 0 && !args[rootIndex + 1])) throw new Error('Kullanım: node scripts/import-catalog.mjs <katalog.js|json> [--root <site>] [--apply]');
  const inputPath = fs.realpathSync(path.resolve(input));
  const inputBytes = fs.readFileSync(inputPath);
  if (inputBytes.length > 30 * 1024 * 1024) throw new Error('Katalog 30 MB sınırını aşıyor.');
  const sourcePath = inside('products-data.js');
  const source = fs.readFileSync(sourcePath, 'utf8');
  if (expectedIndex >= 0 && args[expectedIndex + 1] !== sourceSha256(source)) throw new Error('Katalog kaynak sürümü değişmiş; güncel sürümü karşılaştırıp yeniden deneyin.');
  const previous = parseCatalogSource(source);
  const packagePath = inside('src/config/packages.js');
  const packages = fs.existsSync(packagePath) ? (await import(pathToFileURL(packagePath).href)).PACKAGES : [];
  const catalog = validateCatalog(parseCatalogSource(inputBytes.toString('utf8')), { previous, packages, root, checkFiles: true });
  if (JSON.stringify(catalog.settings) !== JSON.stringify(previous.settings)
    || JSON.stringify(catalog.categories) !== JSON.stringify(previous.categories)) throw new Error('Bu aşamada iletişim/KDV/duyuru/bölge ve kategori tanımları değiştirilemez.');
  const images = [];
  for (const product of catalog.products) {
    if (!product.image.startsWith('data:')) {
      product.image = localImagePath(product.image);
      continue;
    }
    const encoded = product.image.slice(product.image.indexOf(',') + 1);
    const decoded = Buffer.from(encoded, 'base64');
    if (decoded.length > 12 * 1024 * 1024 || !decoded.length || decoded.toString('base64') !== encoded) throw new Error(`${product.name}: fotoğraf verisi geçersiz veya 12 MB sınırını aşıyor.`);
    const image = sharp(decoded, { limitInputPixels: 40_000_000, animated: false });
    const metadata = await image.metadata();
    if (!['webp', 'png', 'jpeg', 'gif', 'avif', 'heif'].includes(metadata.format)) throw new Error(`${product.name}: fotoğraf biçimi desteklenmiyor.`);
    const bytes = await image.rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toBuffer();
    const relative = `assets/products/${product.id}-${sourceSha256(bytes).slice(0, 16)}.webp`;
    const target = inside(relative);
    if (fs.existsSync(target) && !fs.readFileSync(target).equals(bytes)) throw new Error('Görsel dosyası çakışıyor.');
    product.image = relative;
    images.push({ path: relative, bytes, existed: fs.existsSync(target) });
  }
  validateCatalog(catalog, { previous, packages, allowEmbedded: false });
  const output = serializeCatalog(catalog);
  const report = { mode: apply ? 'applied' : 'dry-run', sourceSha256: sourceSha256(source), targetSha256: sourceSha256(output), productCount: catalog.products.length, revision: catalog.revision, images: images.map(({ path: filename, bytes, existed }) => ({ path: filename, bytes: bytes.length, existed })) };
  if (apply) {
    const lockPath = inside('.catalog-import.lock');
    lock = { path: lockPath, fd: fs.openSync(lockPath, 'wx') };
    stage = fs.mkdtempSync(path.join(root, '.catalog-import-'));
    const stagedSource = path.join(stage, 'products-data.js');
    fs.writeFileSync(stagedSource, output);
    for (let index = 0; index < images.length; index++) fs.writeFileSync(path.join(stage, `image-${index}.webp`), images[index].bytes);
    if (sourceSha256(fs.readFileSync(sourcePath)) !== report.sourceSha256 || !fs.readFileSync(inputPath).equals(inputBytes)) throw new Error('Aktarım sırasında kaynak veya giriş dosyası değişti; yeniden deneyin.');
    const backup = inside(`calismalar/catalog-import-backups/${report.sourceSha256}-products-data.js`);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    if (!fs.existsSync(backup)) fs.writeFileSync(backup, source, { flag: 'wx' });
    for (let index = 0; index < images.length; index++) {
      const image = images[index], target = inside(image.path);
      if (fs.existsSync(target)) { if (!fs.readFileSync(target).equals(image.bytes)) throw new Error('Görsel dosyası aktarım sırasında değişti.'); continue; }
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.renameSync(path.join(stage, `image-${index}.webp`), target);
    }
    // Görseller hazırlandıktan sonra tek kaynak dosyası atomik değiştirilir; başarısızlıkta eski katalog kalır.
    fs.renameSync(stagedSource, sourcePath);
    report.backup = path.relative(root, backup).replaceAll('\\', '/');
  }
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }));
  process.exitCode = 1;
} finally {
  if (stage) fs.rmSync(stage, { recursive: true, force: true });
  if (lock) { fs.closeSync(lock.fd); fs.unlinkSync(lock.path); }
}
