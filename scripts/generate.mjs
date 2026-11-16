// Statik sayfa üreticisi: ayar dosyası, ürün ve fuar verisinden .build/ altına HTML yazar,
// statik dosyaları .build/public/ altına kopyalar. Ardından Vite .build/ klasörünü derler.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SITE } from '../src/config/site-settings.js';
import { loadCatalog, loadFairs, CATEGORIES } from './lib/catalog.mjs';
import { setCatalogData } from './lib/layout.mjs';
import { home } from './pages/home.mjs';
import { kvkk } from './pages/kvkk.mjs';
import { productPage, categoryPage } from './pages/products.mjs';
import { tuyap, ifm, fuarCicekcisi, avrasya, takvim, hizmetler, hakkimizda, iletisim, sss, teslimat, notFound } from './pages/content.mjs';
import { POSTS, blogPost, blogIndex } from './pages/blog.mjs';
import { teklif } from './pages/teklif.mjs';
import { paketler } from './pages/paketler.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.build');
const PUB = path.join(OUT, 'public');
const CACHE = path.join(ROOT, '.cache', 'img');
const TODAY = new Date().toISOString().slice(0, 10);

// Eski adres → yeni adres (kalıcı 301).
export const REDIRECTS = {
  'galeri.html': '/',
  'urunler/cenaze-celengi.html': '/kategori/acilis-fuar-celengi.html',
  'urunler/cift-dalli-orkide.html': '/urunler/iki-dalli-beyaz-orkide.html',
  'urunler/cift-katli-celenk.html': '/urunler/sari-beyaz-cift-kat-celenk.html',
  'urunler/cift-katli-ferforje.html': '/urunler/beyaz-yesil-ikiz-ferforje.html',
  'urunler/marginata.html': '/urunler/marginata-iki-govde.html',
  'urunler/massengena.html': '/urunler/massengena-iki-govde.html',
  'urunler/orkide-aranjman-4750.html': '/urunler/orkide-pembe-lilyum-beyaz-gul.html',
  'urunler/orkide-aranjman-8500.html': '/urunler/dort-dalli-beyaz-orkide.html',
  'urunler/orkide-aranjman-9500.html': '/urunler/mor-orkide-lilyum-kirmizi-gul.html',
  'urunler/tek-katli-celenk.html': '/urunler/turuncu-tek-kat-celenk.html',
  'urunler/tek-katli-ferforje.html': '/urunler/beyaz-lilyum-prestij-ferforje.html',
  'urunler/yucca.html': '/urunler/yucca-iki-govde.html',
};

// Eski yönetim paneli Supabase aşamasına kadar olduğu gibi yayında kalır.
const STATIC = ['assets', 'api', 'teklif-gonder.php', 'config.example.php', 'products-data.js', 'fairs-data.js',
  'admin.html', 'admin.js', 'admin.css', 'catalog-store.js'];

async function resized(srcRel, width) {
  const out = srcRel.replace(/\.webp$/, `-${width}.webp`);
  const cached = path.join(CACHE, out);
  const src = path.join(ROOT, srcRel);
  if (!fs.existsSync(cached) || fs.statSync(cached).mtimeMs < fs.statSync(src).mtimeMs) {
    fs.mkdirSync(path.dirname(cached), { recursive: true });
    await sharp(src).resize({ width }).webp({ quality: 78 }).toFile(cached);
  }
  const dest = path.join(PUB, out);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(cached, dest);
}

async function copyStatic(catalog) {
  for (const item of STATIC) {
    const src = path.join(ROOT, item);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(PUB, item), { recursive: true });
  }
  fs.mkdirSync(path.join(PUB, 'assets/brand'), { recursive: true });
  await sharp(path.join(ROOT, 'assets/brand-plant-crest.png')).resize({ width: 80 }).webp({ quality: 85 })
    .toFile(path.join(PUB, 'assets/brand/crest-80.webp'));
  // Yatay logo (kullanıcının mevcut logosu, www.fuarcicekcim.com ile aynı): başlık için WebP.
  for (const w of [360, 540]) {
    await sharp(path.join(ROOT, 'assets/fuar-cicekcim-logo-yatay.png')).resize({ width: w }).webp({ quality: 90, alphaQuality: 100 })
      .toFile(path.join(PUB, `assets/brand/logo-yatay-${w}.webp`));
  }
  await Promise.all(catalog.products.flatMap((p) => {
    const img = p.image.slice(1);
    const jobs = [resized(img, 400)];
    const fuar = img.replace(/\.webp$/, '-fuar.webp');
    if (fs.existsSync(path.join(ROOT, fuar))) jobs.push(resized(fuar, 600));
    return jobs;
  }));
}

function write(rel, html) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

const toUrl = (rel) => `${SITE.url}/${rel.replace(/index\.html$/, '')}`;

function sitemap(rels) {
  const urls = rels.filter((r) => !['404.html', 'kvkk.html'].includes(r)).sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((r) => `  <url><loc>${toUrl(r)}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n')}
</urlset>
`;
}

const robots = () => `User-agent: *
Allow: /
Disallow: /admin.html
Disallow: /api/
Disallow: /veri/
Disallow: /teklif-gonder.php

Sitemap: ${SITE.url}/sitemap.xml
`;

function htaccess() {
  const rules = Object.entries(REDIRECTS).map(([from, to]) => `  RewriteRule ^${from.replace(/\./g, '\\.')}$ ${to} [R=301,L]`).join('\n');
  return `# Fuar Çiçekçim — Apache ayarları (Plesk / Linux). Bu dosya scripts/generate.mjs tarafından üretilir.
Options -Indexes
AddDefaultCharset UTF-8
ServerSignature Off
DirectoryIndex index.html

<IfModule mod_rewrite.c>
  RewriteEngine On

  # 1) HTTPS + www'ye yönlendir (SSL kurulmadan sorun çıkarsa bu bloğu # ile kapatın)
  RewriteCond %{HTTPS} off [OR]
  RewriteCond %{HTTP_HOST} !^www\\. [NC]
  RewriteCond %{HTTP_HOST} ^(?:www\\.)?(.+)$ [NC]
  RewriteRule ^ https://www.%1%{REQUEST_URI} [L,R=301]

  # 2) Kaldırılan / taşınan eski adresler (kalıcı)
${rules}
  RewriteCond %{THE_REQUEST} \\s/+index\\.html[\\s?]
  RewriteRule ^index\\.html$ / [R=301,L]

  # 3) Eski GitHub Pages yolları
  RewriteRule ^tuyap-ifm/?(.*)$ /$1 [R=301,L]

  # 4) /sayfa → /sayfa.html (uzantısız adresler de çalışsın)
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME}\\.html -f
  RewriteRule ^([^.]+)$ $1.html [L]
</IfModule>

ErrorDocument 404 /404.html

# Hassas dosyalar
<FilesMatch "^(config\\.php|README.*|\\.git.*|.*\\.md|package(-lock)?\\.json)$">
  Require all denied
</FilesMatch>

<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
  <FilesMatch "^admin\\.html$">
    Header set X-Robots-Tag "noindex, nofollow"
  </FilesMatch>
  # Görseller ve fontlar: 1 yıl
  <FilesMatch "\\.(webp|avif|jpe?g|png|gif|svg|ico|woff2?)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  # Vite çıktısı (dosya adında içerik özeti var): 1 yıl
  <If "%{REQUEST_URI} =~ m#^/static/#">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </If>
  <FilesMatch "^(products-data|fairs-data|admin|catalog-store)\\.js$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
  <FilesMatch "\\.(html|php|xml|txt)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css text/xml application/javascript application/json application/xml image/svg+xml
</IfModule>

AddType image/webp .webp
AddType image/avif .avif
AddType font/woff2 .woff2
`;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(PUB, { recursive: true });

const catalog = loadCatalog();
const fairData = loadFairs();
setCatalogData(catalog.products);
await copyStatic(catalog);

const pages = {
  'index.html': home(catalog),
  'tuyap-fuar-cicekcisi.html': tuyap(catalog, fairData),
  'ifm-fuar-cicekcisi.html': ifm(catalog, fairData),
  'fuar-cicekcisi.html': fuarCicekcisi(catalog, fairData),
  'tuyap-avrasya-pencere-kapi-cam-2026.html': avrasya(catalog, fairData),
  'fuar-takvimi.html': takvim(fairData),
  'hizmetler.html': hizmetler(catalog),
  'hakkimizda.html': hakkimizda(),
  'iletisim.html': iletisim(),
  'teklif.html': teklif(),
  'fuar-paketleri.html': paketler(catalog),
  'sss.html': sss(),
  'teslimat-sureci.html': teslimat(),
  'kvkk.html': kvkk(),
  '404.html': notFound(),
  'blog/index.html': blogIndex(),
};
for (const post of POSTS) pages[`blog/${post.slug}.html`] = blogPost(post, catalog);
for (const cat of CATEGORIES) pages[`kategori/${cat.slug}.html`] = categoryPage(cat, catalog);
for (const p of catalog.products) pages[p.page.slice(1)] = productPage(p, catalog);

for (const [rel, html] of Object.entries(pages)) write(rel, html);
fs.writeFileSync(path.join(PUB, 'sitemap.xml'), sitemap(Object.keys(pages)));
fs.writeFileSync(path.join(PUB, 'robots.txt'), robots());
fs.writeFileSync(path.join(PUB, '.htaccess'), htaccess());

console.log(`Üretilen sayfa: ${Object.keys(pages).length} · yönlendirme: ${Object.keys(REDIRECTS).length}`);
