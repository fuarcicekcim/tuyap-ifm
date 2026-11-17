<?php
/* Admin panelinden gelen products-data.js içeriğini doğrulayıp site köküne yazar.
   Ayrıca panelin giriş ekranı şifreyi buradan doğrulatır (eylem = giris); şifre sayfa koduna yazılmaz. */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
$cfg = require dirname(__DIR__) . '/config.php';
function fail(string $m, int $c = 400): void { http_response_code($c); echo json_encode(['ok' => false, 'error' => $m], JSON_UNESCAPED_UNICODE); exit; }
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('Yalnızca POST.', 405);
$in = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($in)) fail('Geçersiz istek.');
// Kaba kuvvete karşı küçük gecikme + deneme sınırı
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'; $f = sys_get_temp_dir() . '/fc-admin-' . md5($ip);
$tries = is_file($f) ? (array) json_decode((string) file_get_contents($f), true) : [];
$tries = array_values(array_filter($tries, fn($t) => $t > time() - 600));
if (count($tries) >= 8) fail('Çok fazla hatalı deneme. 10 dakika sonra tekrar deneyin.', 429);
usleep(300000);
if (!hash_equals((string) $cfg['admin_sifre'], (string) ($in['sifre'] ?? '')) || $cfg['admin_sifre'] === 'DEGISTIR-BENI-0406') {
  $tries[] = time(); @file_put_contents($f, json_encode($tries));
  fail($cfg['admin_sifre'] === 'DEGISTIR-BENI-0406' ? 'Önce config.php içindeki admin_sifre değerini değiştirin.' : 'Şifre hatalı.', 403);
}
// Yalnızca giriş denetimi: şifre doğruysa burada biter. Yanlış şifreler yukarıdaki deneme sınırına sayılır.
if (($in['eylem'] ?? '') === 'giris') { echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE); exit; }
$src = (string) ($in['kaynak'] ?? '');
if (strlen($src) > 3_000_000) fail('Veri çok büyük.');
if (!preg_match('/^\s*window\.FUAR_CATALOG\s*=\s*(\{.*\});?\s*$/s', $src, $m)) fail('Beklenen biçimde değil (window.FUAR_CATALOG = {...};).');
$json = json_decode($m[1], true);
if (!is_array($json) || empty($json['products']) || !is_array($json['products'])) fail('Ürün listesi okunamadı.');
foreach ($json['products'] as $p) {
  if (!isset($p['id'], $p['name'], $p['price'], $p['image'])) fail('Eksik ürün alanı.');
  if (!preg_match('/^[a-z0-9][a-z0-9-]*$/i', (string) $p['id'])) fail('Geçersiz ürün kimliği.');
}
$target = dirname(__DIR__) . '/products-data.js';
$backupDir = dirname(__DIR__) . '/veri/yedek';
if (!is_dir($backupDir)) { @mkdir($backupDir, 0755, true); @file_put_contents(dirname($backupDir) . '/.htaccess', "Require all denied\n"); }
if (is_file($target)) @copy($target, $backupDir . '/products-data-' . date('Ymd-His') . '.js');
$clean = "window.FUAR_CATALOG = " . json_encode($json, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . ";\n";
if (file_put_contents($target, $clean, LOCK_EX) === false) fail('Dosya yazılamadı. products-data.js izinlerini (644) ve klasör sahipliğini kontrol edin.', 500);
echo json_encode(['ok' => true, 'bytes' => strlen($clean)], JSON_UNESCAPED_UNICODE);
