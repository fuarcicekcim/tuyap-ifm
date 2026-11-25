<?php
/* Admin panelinden gelen kataloğu özel sunucu taslağı olarak kaydeder; vitrini yayımlamaz.
   Ayrıca panelin giriş ekranı şifreyi buradan doğrulatır (eylem = giris); şifre sayfa koduna yazılmaz. */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/lib/supabase-bridge.php';
function fail(string $m, int $c = 400): void { http_response_code($c); echo json_encode(['ok' => false, 'error' => $m], JSON_UNESCAPED_UNICODE); exit; }
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('Yalnızca POST.', 405);
$requestBody = file_get_contents('php://input', false, null, 0, 32 * 1024 * 1024 + 1);
if ($requestBody === false || strlen($requestBody) > 32 * 1024 * 1024) fail('İstek gövdesi 32 MB sınırını aşıyor.', 413);
$in = json_decode($requestBody, true);
unset($requestBody);
if (!is_array($in)) fail('Geçersiz istek.');
// Kaba kuvvete karşı küçük gecikme + deneme sınırı
try { $supabaseEnabled = fc_supabase_enabled(); }
catch (FcSupabaseError $error) { fail($error->getMessage(), $error->httpStatus); }
if ($supabaseEnabled) {
  try { fc_supabase_require_staff(['owner','admin']); }
  catch (FcSupabaseError $error) { fail($error->getMessage(), $error->httpStatus); }
} else {
try {
  $cfg = @require fc_existing_config_path(dirname(__DIR__));
  if (!is_array($cfg) || !is_string($cfg['admin_sifre'] ?? null)) throw new RuntimeException('Yönetici ayarı eksik.');
} catch (Throwable) {
  fail('Yönetici doğrulaması için sunucu ayarı eksik.', 503);
}
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'; $f = sys_get_temp_dir() . '/fc-admin-' . md5($ip);
$tries = is_file($f) ? (array) json_decode((string) file_get_contents($f), true) : [];
$tries = array_values(array_filter($tries, fn($t) => $t > time() - 600));
if (count($tries) >= 8) fail('Çok fazla hatalı deneme. 10 dakika sonra tekrar deneyin.', 429);
usleep(300000);
if (!hash_equals((string) $cfg['admin_sifre'], (string) ($in['sifre'] ?? '')) || $cfg['admin_sifre'] === 'DEGISTIR-BENI-0406') {
  $tries[] = time(); @file_put_contents($f, json_encode($tries));
  fail($cfg['admin_sifre'] === 'DEGISTIR-BENI-0406' ? 'Önce config.php içindeki admin_sifre değerini değiştirin.' : 'Şifre hatalı.', 403);
}
}
// Yalnızca giriş denetimi: şifre doğruysa burada biter. Yanlış şifreler yukarıdaki deneme sınırına sayılır.
if (($in['eylem'] ?? '') === 'giris') { echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE); exit; }
function parse_catalog(string $source): array {
  $source = trim(str_replace("\xEF\xBB\xBF", '', $source));
  if (preg_match('/^window\.FUAR_CATALOG\s*=\s*(\{.*\})\s*;?$/s', $source, $match)) $source = $match[1];
  $data = json_decode($source, true);
  if (!is_array($data) || empty($data['products']) || !is_array($data['products'])) fail('Katalog geçerli JSON veya window.FUAR_CATALOG = {...}; biçiminde olmalı.');
  return $data;
}

$root = dirname(__DIR__);
$target = $root . '/products-data.js';
$iis = fc_is_iis_host();
try {
  $draftDir = $iis ? fc_iis_storage_dir('katalog-taslak') : $root . '/veri/katalog-taslak';
} catch (FcSupabaseError $error) {
  fail($error->getMessage(), $error->httpStatus);
}
$draftPath = $draftDir === null ? null : $draftDir . '/draft.json';

function draft_record(): ?array {
  global $draftPath;
  if ($draftPath === null || !is_file($draftPath)) return null;
  $data = json_decode((string) file_get_contents($draftPath), true);
  if (!is_array($data) || !isset($data['kaynak'], $data['sha256'], $data['revision'], $data['baseSourceSha256'], $data['updatedAt'], $data['productCount'])) fail('Sunucu taslağı okunamadı; mevcut taslak korunuyor.', 500);
  if (!hash_equals((string) $data['sha256'], hash('sha256', (string) $data['kaynak']))) fail('Sunucu taslağının bütünlüğü doğrulanamadı.', 500);
  return $data;
}

function catalog_status(): array {
  global $target, $root;
  $source = (string) file_get_contents($target);
  $catalog = parse_catalog($source);
  $draft = draft_record();
  $manifest = is_file($root . '/catalog-release.json') ? json_decode((string) file_get_contents($root . '/catalog-release.json'), true) : null;
  $published = is_array($manifest) && preg_match('/^[a-f0-9]{64}$/', (string) ($manifest['sourceSha256'] ?? '')) ? [
    'revision' => (string) ($manifest['revision'] ?? ''), 'sourceSha256' => $manifest['sourceSha256'],
    'generatedAt' => (string) ($manifest['generatedAt'] ?? ''), 'productCount' => (int) ($manifest['productCount'] ?? 0)
  ] : null;
  return ['source' => ['revision' => (string) ($catalog['revision'] ?? ''), 'sha256' => hash('sha256', $source)],
    'published' => $published,
    'draft' => $draft ? ['revision' => $draft['revision'], 'sha256' => $draft['sha256'], 'baseSourceSha256' => $draft['baseSourceSha256'], 'updatedAt' => $draft['updatedAt'], 'productCount' => $draft['productCount']] : null];
}

function draft_metadata(array $draft): array { return array_intersect_key($draft, array_flip(['revision', 'sha256', 'baseSourceSha256', 'updatedAt', 'productCount'])); }
function respond(array $payload): void { echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
$action = $in['eylem'] ?? 'taslak-kaydet';
if ($action === 'durum') respond(['ok' => true] + catalog_status());
if ($action === 'taslak-indir') {
  $draft = draft_record();
  if (!$draft) fail('Sunucuda kayıtlı taslak yok.', 404);
  respond(['ok' => true, 'kaynak' => $draft['kaynak'], 'draft' => draft_metadata($draft)]);
}
if ($action !== 'taslak-kaydet') fail('Bilinmeyen işlem.');
if (!is_string($in['kaynak'] ?? null) || strlen($in['kaynak']) > 30 * 1024 * 1024) fail('Katalog verisi eksik veya 30 MB sınırını aşıyor.');
if (!preg_match('/^[a-f0-9]{64}$/', (string) ($in['expectedSourceSha256'] ?? '')) || !array_key_exists('expectedDraftSha256', $in)
  || ($in['expectedDraftSha256'] !== null && (!is_string($in['expectedDraftSha256']) || !preg_match('/^[a-f0-9]{64}$/', $in['expectedDraftSha256'])))) fail('Önce güncel katalog ve taslak sürümünü denetleyin.', 409);

// Kilit yalnız özel taslak yazımını serileştirir. Her kayıtta kaynak ve önceki taslak sürümü karşılaştırılır.
if ($iis) {
  try { $draftDir = fc_iis_storage_dir('katalog-taslak', true); }
  catch (FcSupabaseError $error) { fail($error->getMessage(), $error->httpStatus); }
  if ($draftDir === null) fail('Sunucunun özel taslak klasörü hazır değil.', 503);
  $draftPath = $draftDir . '/draft.json';
} else {
  if (!is_dir($draftDir) && !mkdir($draftDir, 0755, true) && !is_dir($draftDir)) fail('Taslak klasörü oluşturulamadı.', 500);
  if (!str_starts_with((string) realpath($draftDir), realpath($root) . DIRECTORY_SEPARATOR)) fail('Taslak klasörü proje dışına çıkıyor.', 500);
  $denyPath = $draftDir . '/.htaccess';
  $deny = is_file($denyPath) ? (string) file_get_contents($denyPath) : '';
  if (stripos($deny, 'Require all denied') === false && file_put_contents($denyPath, $deny . "\nRequire all denied\n", LOCK_EX) !== strlen($deny . "\nRequire all denied\n")) fail('Taslak erişim koruması oluşturulamadı.', 500);
}
$lock = fopen($draftDir . '/write.lock', 'c');
if (!$lock || !flock($lock, LOCK_EX)) fail('Taslak kilidi alınamadı.', 500);
$status = catalog_status();
if (!hash_equals($status['source']['sha256'], $in['expectedSourceSha256']) || ($status['draft']['sha256'] ?? null) !== $in['expectedDraftSha256']) {
  http_response_code(409);
  respond(['ok' => false, 'error' => 'Kaynak veya sunucu taslağı başka bir işlemde değişti. Düzenlemeleriniz korunuyor; güncel sürümü karşılaştırın.'] + $status);
}
$current = parse_catalog((string) file_get_contents($target));
$json = parse_catalog($in['kaynak']);
if (count($json['products']) > 1000 || !is_string($json['revision'] ?? null) || $json['revision'] === '' || strlen($json['revision']) > 160) fail('Katalog sürümü veya ürün sayısı geçersiz.');
if (array_key_exists('cartDiscount', $json) && $json['cartDiscount'] === null) unset($json['cartDiscount']);
$cartDiscountError = fc_pricing_cart_validate($json['cartDiscount'] ?? null);
if ($cartDiscountError !== '') fail($cartDiscountError);
if (($json['settings'] ?? null) != ($current['settings'] ?? null) || ($json['categories'] ?? null) != ($current['categories'] ?? null)) fail('İletişim, KDV, duyuru, bölge ve kategori tanımları bu aşamada salt okunurdur.');
$categories = array_column($current['categories'] ?? [], 'id');
$badgeIds = array_column($current['badges'] ?? [], 'id');
if (!is_array($json['badges'] ?? null) || array_column($json['badges'], 'id') !== $badgeIds) fail('Rozet kimlikleri değiştirilemez.');
foreach ($json['badges'] as $badge) if (!is_string($badge['name'] ?? null) || trim($badge['name']) === '' || strlen($badge['name']) > 280) fail('Rozet adı geçersiz.');
$old = [];
foreach ($current['products'] as $product) $old[$product['id']] = $product;
foreach ($json['products'] as &$product) {
  if (is_array($product) && array_key_exists('discount', $product) && $product['discount'] === null) unset($product['discount']);
}
unset($product);
$ids = []; $pages = []; $ranks = [];
foreach ($json['products'] as $p) {
  if (!is_array($p) || !is_string($p['id'] ?? null) || !preg_match('/^[a-z0-9][a-z0-9-]{0,89}$/i', $p['id']) || isset($ids[$p['id']])) fail('Ürün kimlikleri geçersiz veya tekrarlı.');
  $ids[$p['id']] = $p;
  if (!is_string($p['name'] ?? null) || trim($p['name']) === '' || strlen($p['name']) > 400) fail('Ürün adı geçersiz.');
  if ((!is_int($p['price'] ?? null) && !is_float($p['price'] ?? null)) || !is_finite((float) $p['price']) || $p['price'] < 0 || $p['price'] > 1000000000 || abs($p['price'] * 100 - round($p['price'] * 100)) > 0.0001) fail('Ürün fiyatı geçersiz.');
  $discountError = fc_pricing_validate($p);
  if ($discountError !== '') fail($discountError);
  if (!in_array($p['category'] ?? null, $categories, true) || (!empty($p['badge']) && !in_array($p['badge'], $badgeIds, true)) || (isset($p['active']) && !is_bool($p['active']))) fail('Kategori, rozet veya aktiflik geçersiz.');
  if (array_key_exists('inStock', $p) && !is_bool($p['inStock'])) fail('Ürün stok durumu geçersiz.');
  foreach (['sortOrder' => [0, 1000000], 'bestsellerRank' => [1, 5]] as $key => $range) {
    if (array_key_exists($key, $p) && $p[$key] !== null && (!is_int($p[$key]) || $p[$key] < $range[0] || $p[$key] > $range[1])) fail('Ürün sıralaması geçersiz.');
  }
  if (isset($p['bestsellerRank'])) { if (isset($ranks[$p['bestsellerRank']])) fail('En çok satan öncelikleri benzersiz olmalı (1–5).'); $ranks[$p['bestsellerRank']] = true; }
  $page = $p['sharePage'] ?? '';
  if (!is_string($page) || ($page !== '' && !preg_match('/^urunler\/[a-z0-9-]+\.html$/i', $page))) fail('Ürün adresi geçersiz.');
  $page = $page ?: 'urunler/' . $p['id'] . '.html';
  if (isset($pages[$page])) fail('Ürün adresleri benzersiz olmalı.');
  $pages[$page] = true;
  if (isset($old[$p['id']]) && (($old[$p['id']]['sharePage'] ?? '') ?: 'urunler/' . $p['id'] . '.html') !== $page) fail('Mevcut ürün adresi değiştirilemez.');
  if (!is_string($p['image'] ?? null)) fail('Ürün görseli geçersiz.');
  $image = $p['image'];
  if (str_starts_with($image, 'data:')) {
    if (!preg_match('/^data:image\/(webp|png|jpeg|gif|avif);base64,([A-Za-z0-9+\/]+={0,2})$/', $image, $parts)) fail('Görsel verisi geçersiz.');
    $bytes = base64_decode($parts[2], true);
    if ($bytes === false || strlen($bytes) > 12000000 || base64_encode($bytes) !== $parts[2]) fail('Görsel verisi okunamadı.');
    $info = @getimagesizefromstring($bytes);
    if (!$info || !in_array($info['mime'] ?? '', ['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/avif'], true) || $info[0] * $info[1] > 40000000) fail('Görsel geçerli bir resim olmalı (en fazla 40 megapiksel).');
  } else {
    $image = preg_replace('/^\.\//', '', $image);
    $decoded = rawurldecode($image);
    if (!preg_match('/^assets\/[\pL\pN_ .()\/+\-]+\.(webp|png|jpe?g|gif|avif)$/iu', $decoded) || preg_match('/[\\\\\x00-\x1f%?#]/', $decoded) || preg_match('/(?:^|\/)\.{1,2}(?:\/|$)/', $decoded)) fail('Görsel yolu geçersiz; assets/ dosyası veya yüklenen fotoğraf kullanın.');
    $resolved = realpath($root . '/' . $decoded);
    if (!$resolved || !is_file($resolved) || !str_starts_with($resolved, realpath($root) . DIRECTORY_SEPARATOR)) fail('Görsel dosyası bulunamadı.');
  }
}
foreach ($old as $id => $product) if (!isset($ids[$id])) fail('Mevcut ürünü silmek yerine pasifleştirin; ürün adresi korunmalı.');
$protected = ['iki-dalli-beyaz-orkide', 'kirmizi-gul-beyaz-gerbera', 'sansevieria', 'dort-dalli-beyaz-orkide', 'areka', 'seflera-buyuk', 'sekiz-dalli-beyaz-orkide', 'yucca-buyuk', 'ficus-lyrata', 'kutuda-beyaz-orkide-iki-renk-gul', 'beyaz-lilyum-prestij-ferforje'];
if (is_file($root . '/admin-config.js') && preg_match('/^window\.FUAR_ADMIN_META\s*=\s*(\{.*\})\s*;\s*$/s', trim((string) file_get_contents($root . '/admin-config.js')), $metaMatch)) {
  $meta = json_decode($metaMatch[1], true);
  if (is_array($meta['protectedProductIds'] ?? null)) $protected = $meta['protectedProductIds'];
}
foreach ($protected as $id) if (isset($old[$id]) && ($ids[$id]['active'] ?? true) === false) fail('Bu ürün hazır pakette kullanılıyor; önce paket düzenlenmeli.');
$clean = 'window.FUAR_CATALOG = ' . json_encode($json, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . ";\n";
if (strlen($clean) > 30 * 1024 * 1024) fail('Katalog 30 MB sınırını aşıyor.');
$record = ['schema' => 1, 'revision' => $json['revision'], 'sha256' => hash('sha256', $clean), 'baseSourceSha256' => $status['source']['sha256'], 'updatedAt' => gmdate('c'), 'productCount' => count($json['products']), 'kaynak' => $clean];
$temporary = tempnam($draftDir, 'draft-');
$recordBytes = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($temporary === false || $recordBytes === false || file_put_contents($temporary, $recordBytes, LOCK_EX) !== strlen($recordBytes)) { if ($temporary !== false) @unlink($temporary); fail('Taslak kaydedilemedi; düzenlemeleriniz korunuyor.', 500); }
if (!hash_equals($status['source']['sha256'], (string) hash_file('sha256', $target))) { @unlink($temporary); fail('Kaynak katalog kayıt sırasında değişti; yeniden sürüm denetimi yapın.', 409); }
if (!rename($temporary, $draftPath)) { @unlink($temporary); fail('Taslak değiştirilemedi; önceki sürüm korunuyor.', 500); }
flock($lock, LOCK_UN); fclose($lock);
respond(['ok' => true, 'saved' => true, 'publishedNow' => false, 'bytes' => strlen($clean), 'source' => $status['source'], 'published' => $status['published'], 'draft' => draft_metadata($record)]);
