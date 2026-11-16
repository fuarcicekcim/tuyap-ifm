// Statik sayfa üreticisi: ayar dosyası ve ürün verisinden .build/ altına HTML yazar,
// statik dosyaları .build/public/ altına kopyalar. Ardından Vite .build/ klasörünü derler.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { loadCatalog } from './lib/catalog.mjs';
import { home } from './pages/home.mjs';
import { kvkk } from './pages/kvkk.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.build');
const PUB = path.join(OUT, 'public');

function write(rel, html) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

const STATIC = ['assets', 'api', 'teklif-gonder.php', 'config.example.php', '.htaccess', 'robots.txt', 'sitemap.xml'];

async function copyStatic() {
  for (const item of STATIC) {
    const src = path.join(ROOT, item);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(PUB, item), { recursive: true });
  }
  fs.mkdirSync(path.join(PUB, 'assets/brand'), { recursive: true });
  await sharp(path.join(ROOT, 'assets/brand-plant-crest.png'))
    .resize({ width: 80 }).webp({ quality: 85 })
    .toFile(path.join(PUB, 'assets/brand/crest-80.webp'));
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(PUB, { recursive: true });
await copyStatic();

const catalog = loadCatalog();
const pages = { 'index.html': home(catalog), 'kvkk.html': kvkk() };
for (const [rel, html] of Object.entries(pages)) write(rel, html);

console.log(`Üretilen sayfa: ${Object.keys(pages).length}`);
