// Statik sayfa üreticisi: ayar dosyası, ürün ve fuar verisinden .build/ altına HTML yazar,
// statik dosyaları .build/public/ altına kopyalar. Ardından Vite .build/ klasörünü derler.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SITE, CONTACT, PRICING, VENUES } from '../src/config/site-settings.js';
import { PACKAGES } from '../src/config/packages.js';
import { releaseManifest, validateCatalog, sourceSha256 } from './lib/catalog-release.mjs';
import { publicSupabaseConfig, publicLiveCatalogConfig } from './lib/supabase-config.mjs';
import { loadCatalog, loadFairs, CATEGORIES } from './lib/catalog.mjs';
import { setCatalogData, setLiveCatalogConfig } from './lib/layout.mjs';
import { home } from './pages/home.mjs';
import { kvkk } from './pages/kvkk.mjs';
import { productPage, categoryPage } from './pages/products.mjs';
import { tuyap, ifm, fuarCicekcisi, avrasya, plastEurasia, takvim, hizmetler, hakkimizda, iletisim, sss, teslimat, notFound } from './pages/content.mjs';
import { POSTS, blogPost, blogIndex } from './pages/blog.mjs';
import { teklif } from './pages/teklif.mjs';
import { paketler } from './pages/paketler.mjs';
import { yorum } from './pages/yorum.mjs';

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

// Katalog yönetim paneli statik taşınır; sunucuya kayıt özel taslaktır, yayın derlemeyle yapılır.
const STATIC = ['assets', 'api', 'teklif-gonder.php', 'config.example.php', 'products-data.js', 'fairs-data.js',
  'admin.html', 'admin.js', 'admin.css', 'admin-auth.js', 'admin-live.js', 'admin-live-core.js', 'catalog-pricing.js', 'catalog-store.js'];

async function resized(srcRel, width) {
  const out = srcRel.replace(/\.(?:webp|png|jpe?g|gif|avif)$/i, `-${width}.webp`);
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

// Uygulama ikonu: preloader'ın ilk karesiyle aynı görünüm (orman yeşili zemin + krem madalyon içinde amblem).
// Ana ekran kısayolunun açılış ekranı bu ikondan ve manifestteki zemin renginden oluşur; manifest yoksa telefon
// 80 px'lik tarayıcı ikonunu beyaz zemine büyütüp gösterir (bulanık, beyaz).
async function appIcon(size, plate = 0.64) {
  const d = Math.round(size * plate);
  const crestW = Math.round(d * 0.86);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><radialGradient id="g" cx="50%" cy="36%" r="64%"><stop offset="0" stop-color="#fffdf8"/><stop offset=".6" stop-color="#f7f5f0"/><stop offset="1" stop-color="#ece6d6"/></radialGradient></defs><rect width="100%" height="100%" fill="#173628"/><circle cx="${size / 2}" cy="${size / 2}" r="${d / 2}" fill="url(#g)" stroke="#c5a059" stroke-opacity=".6" stroke-width="${Math.max(1, size / 256)}"/></svg>`;
  const crest = await sharp(path.join(ROOT, 'assets/brand-plant-crest.png')).resize({ width: crestW }).toBuffer();
  const { height } = await sharp(crest).metadata();
  return sharp(Buffer.from(svg)).composite([{ input: crest, left: Math.round((size - crestW) / 2), top: Math.round((size - height) / 2 + d * 0.03) }]).png({ compressionLevel: 9 });
}

async function copyStatic(catalog) {
  for (const item of STATIC) {
    const src = path.join(ROOT, item);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(PUB, item), { recursive: true });
  }
  fs.writeFileSync(path.join(PUB, 'products-data.js'), catalog.source);
  fs.mkdirSync(path.join(PUB, 'assets/brand'), { recursive: true });
  await sharp(path.join(ROOT, 'assets/brand-plant-crest.png')).resize({ width: 80 }).webp({ quality: 85 })
    .toFile(path.join(PUB, 'assets/brand/crest-80.webp'));
  // Açılış (preloader) amblemi: kaynak PNG 320 px olduğundan büyütülmez (bulanıklaşmasın).
  await sharp(path.join(ROOT, 'assets/brand-plant-crest.png')).webp({ quality: 80, alphaQuality: 90, effort: 6 })
    .toFile(path.join(PUB, 'assets/brand/crest-320.webp'));
  // Ana ekrana eklenen kısayolun ikonu, açılış ekranı ve renkleri (manifest + iOS ikonu).
  await (await appIcon(192)).toFile(path.join(PUB, 'assets/brand/icon-192.png'));
  await (await appIcon(512)).toFile(path.join(PUB, 'assets/brand/icon-512.png'));
  await (await appIcon(180)).toFile(path.join(PUB, 'assets/brand/apple-touch-icon.png'));
  fs.writeFileSync(path.join(PUB, 'manifest.json'), JSON.stringify({
    name: SITE.name, short_name: SITE.name, lang: 'tr', dir: 'ltr', id: '/', start_url: '/', scope: '/', display: 'standalone',
    background_color: '#173628', theme_color: '#173628',
    icons: [
      { src: '/assets/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/assets/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/assets/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, null, 2) + '\n');
  // Yatay logo (kullanıcının mevcut logosu, www.fuarcicekcim.com ile aynı): başlık için WebP.
  for (const w of [360, 540]) {
    await sharp(path.join(ROOT, 'assets/fuar-cicekcim-logo-yatay.png')).resize({ width: w }).webp({ quality: 90, alphaQuality: 100 })
      .toFile(path.join(PUB, `assets/brand/logo-yatay-${w}.webp`));
  }
  await Promise.all(catalog.allProducts.flatMap((p) => {
    const img = p.image.slice(1);
    const jobs = [resized(img, 400)];
    if (p.fuarImage) jobs.push(resized(p.fuarImage.slice(1), 600));
    return jobs;
  }));
  fs.mkdirSync(path.join(PUB, 'assets/vendor'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'node_modules/lucide/dist/umd/lucide.min.js'), path.join(PUB, 'assets/vendor/lucide.min.js'));
  const publicAuth = publicSupabaseConfig(ROOT);
  // Yalnız public bilgiler yazılır. Secret anahtar bu sınırdan geçemez.
  // Canlı yayın (panelden anında fiyat/stok/sıralama) ayrı bayrakla açılır: aynı public URL ve publishable anahtar.
  // Bayrak kapalıysa panelde canlı yayın çubuğu çıkmaz.
  const publicLive = publicLiveCatalogConfig(ROOT);
  fs.writeFileSync(path.join(PUB, 'supabase-config.js'), `window.FUAR_SUPABASE = ${JSON.stringify(publicAuth).replace(/</g, '\\u003c')};\nwindow.FUAR_LIVE = ${JSON.stringify(publicLive).replace(/</g, '\\u003c')};\n`);
  // Panelin canlı satır doğrulayıcısı siteyle AYNI dosyadır (tek kaynak); panel kökünden yüklenir.
  fs.copyFileSync(path.join(ROOT, 'src/js/live-rules.js'), path.join(PUB, 'live-rules.js'));
  fs.copyFileSync(path.join(ROOT, 'node_modules/@supabase/supabase-js/dist/umd/supabase.js'), path.join(PUB, 'assets/vendor/supabase.js'));
  const adminMeta = { schema: 1, protectedProductIds: [...new Set(PACKAGES.flatMap((pkg) => pkg.items.map(([id]) => id)))], settings: { whatsapp: CONTACT.whatsapp, vat: PRICING.vatRate, announcement: catalog.raw.settings.announcement, regions: Object.fromEntries(VENUES.map(({ id }) => [id, true])) }, categoriesEditable: false };
  fs.writeFileSync(path.join(PUB, 'admin-config.js'), `window.FUAR_ADMIN_META = ${JSON.stringify(adminMeta).replace(/</g, '\\u003c')};\n`);
}

function write(rel, html) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html.replace('</head>', `<meta name="catalog-source-sha256" content="${catalog.sourceSha256}">\n</head>`));
}

const toUrl = (rel) => `${SITE.url}/${rel.replace(/index\.html$/, '')}`;

function sitemap(rels) {
  const urls = rels.filter((r) => r !== '404.html').sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
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
  <FilesMatch "^(products-data|fairs-data|admin|admin-auth|admin-live|admin-live-core|admin-config|supabase-config|live-rules|catalog-pricing|catalog-store)\\.js$">
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
validateCatalog(catalog.raw, { packages: PACKAGES });
const fairData = loadFairs();
const plastFair = fairData.allFairs.find((fair) => fair.id === 'plast-eurasia-2026');
setCatalogData(catalog.products, catalog.cartDiscount);
// Canlı katalog katmanı kapalıysa (varsayılan) sayfalara hiçbir yapılandırma yazılmaz; site yalnız statik katalogla çalışır.
const liveCatalog = publicLiveCatalogConfig(ROOT);
setLiveCatalogConfig(liveCatalog.enabled
  ? { ...liveCatalog, badges: Object.fromEntries((catalog.raw.badges || []).map((badge) => [badge.id, badge.name])) }
  : null);
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
  'yorum/index.html': yorum(),
  'teklif.html': teklif(),
  'fuar-paketleri.html': paketler(catalog),
  'sss.html': sss(),
  'teslimat-sureci.html': teslimat(),
  'kvkk.html': kvkk(),
  '404.html': notFound(),
  'blog/index.html': blogIndex(),
};
if (plastFair?.page) pages[plastFair.page.slice(1)] = plastEurasia(catalog, plastFair, fairData.today);
for (const post of POSTS) pages[`blog/${post.slug}.html`] = blogPost(post, catalog);
for (const cat of CATEGORIES) pages[`kategori/${cat.slug}.html`] = categoryPage(cat, catalog);
for (const p of catalog.allProducts) pages[p.page.slice(1)] = productPage(p, catalog);

for (const [rel, html] of Object.entries(pages)) write(rel, html);
fs.writeFileSync(path.join(PUB, 'sitemap.xml'), sitemap(Object.keys(pages)));
fs.writeFileSync(path.join(PUB, 'robots.txt'), robots());
fs.writeFileSync(path.join(PUB, '.htaccess'), htaccess());
if (sourceSha256(fs.readFileSync(path.join(ROOT, 'products-data.js'))) !== catalog.sourceSha256) throw new Error('Katalog derleme sırasında değişti; tek sürüm üretmek için yeniden derleyin.');
fs.writeFileSync(path.join(PUB, 'catalog-release.json'), JSON.stringify(releaseManifest(catalog.source, catalog.raw), null, 2) + '\n');

console.log(`Üretilen sayfa: ${Object.keys(pages).length} · yönlendirme: ${Object.keys(REDIRECTS).length}`);
