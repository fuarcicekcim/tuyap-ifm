// Canlı katalogdaki (Supabase fc_live_products) fiyat, stok, aktif, sıralama, rozet ve indirim durumunu
// products-data.js'e işler; böylece bir sonraki derleme/yayın canlıda yapılan değişiklikleri geri almaz.
//
//   node scripts/pull-live-catalog.mjs                 → yalnız denetler (dry-run): neyin değişeceğini gösterir, dosya yazmaz
//   node scripts/pull-live-catalog.mjs --apply         → products-data.js'i günceller (öncesinde yedek alır)
//   --from-file <satirlar.json>                        → Supabase yerine dosyadaki ham satırlar (deneme/çevrimdışı)
//   --root <site klasörü>                              → varsayılan: bu betiğin üst klasörü
//   --expected-source-sha256 <hex>                     → products-data.js bu sürümde değilse durur
//
// Supabase okuması yalnız publishable anahtarla ve herkese açık sütunlarla yapılır (secret/service_role kullanılmaz).
// Anahtar ve adres .env.local / ortam değişkenlerinden okunur, çıktıya yazılmaz.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { parseCatalogSource, serializeCatalog, sourceSha256 } from './lib/catalog-release.mjs';
import { publicSupabaseConfig } from './lib/supabase-config.mjs';
import { planPull, PullError } from './lib/live-pull.mjs';
import { LIVE_SELECT } from '../src/js/live-rules.js';

const args = process.argv.slice(2);
const valued = ['--root', '--from-file', '--expected-source-sha256'];
const allowed = new Set(['--apply', ...valued]);
const option = (name) => { const index = args.indexOf(name); return index < 0 ? null : args[index + 1] || ''; };
let lock, stage;

try {
  const unknown = args.filter((arg, index) => !allowed.has(arg) && !valued.includes(args[index - 1]));
  if (unknown.length || valued.some((name) => args.includes(name) && !option(name))) throw new Error('Kullanım: node scripts/pull-live-catalog.mjs [--apply] [--from-file <satirlar.json>] [--root <site>] [--expected-source-sha256 <hex>]');
  const apply = args.includes('--apply');
  const rootArg = option('--root');
  const root = fs.realpathSync(path.resolve(rootArg ?? fileURLToPath(new URL('..', import.meta.url))));
  const inside = (filename) => {
    const absolute = path.resolve(root, filename);
    if (!absolute.startsWith(root + path.sep)) throw new Error('Hedef proje klasörü dışına çıkıyor.');
    if (fs.existsSync(absolute) && fs.lstatSync(absolute).isSymbolicLink()) throw new Error('Sembolik bağlantıya yazılamaz.');
    return absolute;
  };

  const sourcePath = inside('products-data.js');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const sourceHash = sourceSha256(source);
  const expected = option('--expected-source-sha256');
  if (expected !== null && expected !== sourceHash) throw new Error('products-data.js beklenen sürümde değil; güncel sürümü karşılaştırıp yeniden deneyin.');
  const catalog = parseCatalogSource(source);
  const packagePath = inside('src/config/packages.js');
  const packages = fs.existsSync(packagePath) ? (await import(pathToFileURL(packagePath).href)).PACKAGES : [];

  // 1) Canlı satırları oku
  const fromFile = option('--from-file');
  let rows, origin;
  if (fromFile !== null) {
    rows = JSON.parse(fs.readFileSync(path.resolve(fromFile), 'utf8'));
    origin = 'dosya';
  } else {
    const env = { ...loadEnv('production', root, 'VITE_SUPABASE_'), ...process.env };
    const config = publicSupabaseConfig(root, { ...env, VITE_SUPABASE_ENABLED: 'true' });
    const headers = { Accept: 'application/json', apikey: config.publishableKey };
    if (!config.publishableKey.startsWith('sb_publishable_')) headers.Authorization = `Bearer ${config.publishableKey}`;
    let response;
    try { response = await fetch(`${config.url}/rest/v1/fc_live_products?select=${LIVE_SELECT}&limit=1000`, { headers, signal: AbortSignal.timeout(20000), redirect: 'error' }); }
    catch { throw new Error('Supabase\'e bağlanılamadı (internet veya zaman aşımı). Hiçbir şey yazılmadı.'); }
    if (!response.ok) throw new Error(`Supabase canlı katalog okumasını reddetti (HTTP ${response.status}). Hiçbir şey yazılmadı.`);
    try { rows = await response.json(); } catch { throw new Error('Supabase yanıtı okunamadı. Hiçbir şey yazılmadı.'); }
    origin = 'supabase';
  }

  // 2) Planla (doğrulama dahil; hata varsa hiçbir şey yazılmaz)
  const plan = planPull(catalog, rows, { packages });
  const output = plan.changed ? serializeCatalog(plan.catalog) : source;
  const report = {
    mode: apply ? (plan.changed ? 'applied' : 'no-change') : 'dry-run',
    origin,
    sourceSha256: sourceHash,
    targetSha256: sourceSha256(output),
    ...plan.summary,
    changes: plan.changes,
  };
  if (!plan.changed) report.note = 'Canlı durum products-data.js ile aynı; yazılacak bir şey yok.';
  else if (!apply) report.note = 'Dry-run: hiçbir dosya yazılmadı. Uygulamak için --apply ekleyin.';

  // 3) Uygula: yedek + atomik değiştirme
  if (apply && plan.changed) {
    const lockPath = inside('.catalog-pull.lock');
    lock = { path: lockPath, fd: fs.openSync(lockPath, 'wx') };
    stage = fs.mkdtempSync(path.join(root, '.catalog-pull-'));
    const staged = path.join(stage, 'products-data.js');
    fs.writeFileSync(staged, output);
    if (sourceSha256(fs.readFileSync(sourcePath, 'utf8')) !== sourceHash) throw new Error('İşlem sırasında products-data.js değişti; yeniden deneyin.');
    const backup = inside(`calismalar/catalog-import-backups/${sourceHash}-products-data.js`);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    if (!fs.existsSync(backup)) fs.writeFileSync(backup, source, { flag: 'wx' });
    fs.renameSync(staged, sourcePath);
    report.backup = path.relative(root, backup).replaceAll('\\', '/');
  }
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message, ...(error instanceof PullError && error.problems.length ? { problems: error.problems } : {}) }, null, 2));
  process.exitCode = 1;
} finally {
  if (stage) fs.rmSync(stage, { recursive: true, force: true });
  if (lock) { fs.closeSync(lock.fd); fs.unlinkSync(lock.path); }
}
