<?php
/*
  Teklif formu alıcısı — JSON POST alır, e-posta gönderir, isteğe bağlı olarak /veri/ klasörüne kaydeder.
  Çağıran: /site.js (teklif.html). Yanıt: {"ok":true} veya {"ok":false,"error":"..."}
*/
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$cfg = require __DIR__ . '/config.php';

function fail(string $msg, int $code = 400): void {
  http_response_code($code);
  echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
  exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('Yalnızca POST.', 405);

// Aynı siteden mi? (basit CSRF/spam koruması)
$host = $_SERVER['HTTP_HOST'] ?? '';
$origin = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
if ($origin && $host && stripos($origin, $host) === false) fail('Geçersiz kaynak.', 403);

$raw = file_get_contents('php://input') ?: '';
$data = json_decode($raw, true);
if (!is_array($data)) { $data = $_POST; }
if (!$data) fail('Boş istek.');

// Honeypot
if (!empty($data['website'])) { echo json_encode(['ok' => true]); exit; }

// Basit hız sınırı: aynı IP'den dakikada en fazla 5
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$rlFile = sys_get_temp_dir() . '/fc-rl-' . md5($ip);
$hits = is_file($rlFile) ? (array) json_decode((string) file_get_contents($rlFile), true) : [];
$hits = array_values(array_filter($hits, fn($t) => $t > time() - 60));
if (count($hits) >= 5) fail('Çok fazla deneme. Lütfen bir dakika sonra tekrar deneyin.', 429);
$hits[] = time();
@file_put_contents($rlFile, json_encode($hits));

$clean = fn($k, $max = 300) => mb_substr(trim(strip_tags((string) ($data[$k] ?? ''))), 0, $max);

$firma   = $clean('firma', 120);
$ad      = $clean('adsoyad', 120);
$tel     = $clean('telefon', 40);
$eposta  = filter_var($clean('eposta', 120), FILTER_VALIDATE_EMAIL) ?: '';
$fuar    = $clean('fuar_adi', 200) ?: $clean('fuar_diger', 200) ?: 'Belirtilmedi';
$merkez  = $clean('merkez', 40);
$stant   = $clean('stant', 120);
$tarih   = $clean('tarih', 40);
$saat    = $clean('saat', 60);
$adet    = $clean('adet', 60);
$butce   = $clean('butce', 60);
$kart    = $clean('kart', 500);
$not     = $clean('not', 800);
$urunNotu= $clean('urun_notu', 200);
$urunler = array_map(fn($u) => mb_substr(strip_tags((string) $u), 0, 120), (array) ($data['urunler'] ?? []));
$sayfa   = $clean('sayfa', 300);

if ($firma === '' || $ad === '' || $tel === '' || $stant === '') fail('Firma, yetkili, telefon ve stant bilgisi zorunludur.');
if (!preg_match('/\d{7,}/', preg_replace('/\D/', '', $tel))) fail('Geçerli bir telefon numarası yazın.');

$satirlar = [
  "Yeni fuar teklif talebi — fuarcicekcim.com",
  str_repeat('-', 48),
  "Fuar            : $fuar",
  "Fuar merkezi    : $merkez",
  "Salon / stant   : $stant",
  "Teslimat        : $tarih $saat",
  "Firma           : $firma",
  "Yetkili         : $ad",
  "Telefon         : $tel",
  "E-posta         : " . ($eposta ?: '-'),
  "Ürünler         : " . ($urunler ? implode(', ', $urunler) : '-'),
  "Katalog dışı    : " . ($urunNotu ?: '-'),
  "Adet / bütçe    : " . ($adet ?: '-') . " / " . ($butce ?: '-'),
  "Şerit / kart    : " . ($kart ?: '-'),
  "Not             : " . ($not ?: '-'),
  str_repeat('-', 48),
  "Tarih: " . date('d.m.Y H:i') . "  IP: $ip",
  "Sayfa: $sayfa",
  "",
  "WhatsApp ile yanıtla: https://wa.me/" . preg_replace('/\D/', '', (strpos($tel, '0') === 0 ? '9' . $tel : $tel)),
];
$govde = implode("\n", $satirlar);
$konu  = "Teklif: $firma — $fuar" . ($stant ? " ($stant)" : '');

// Yedek kayıt
$saved = false;
if (!empty($cfg['teklifleri_kaydet'])) {
  $dir = __DIR__ . '/veri';
  if (!is_dir($dir)) { @mkdir($dir, 0755, true); @file_put_contents("$dir/.htaccess", "Require all denied\n"); @file_put_contents("$dir/index.html", ""); }
  $saved = @file_put_contents("$dir/teklifler-" . date('Y-m') . ".txt", $govde . "\n\n" . str_repeat('=', 64) . "\n\n", FILE_APPEND | LOCK_EX) !== false;
}

// E-posta gönder
$to = $cfg['alici_eposta'];
$fromMail = $cfg['gonderen_eposta'];
$fromName = $cfg['gonderen_ad'];
$ok = false; $err = '';

if (!empty($cfg['smtp_host'])) {
  $ok = smtp_send($cfg, $to, $konu, $govde, $eposta, $err);
} else {
  $headers = [
    "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <$fromMail>",
    "Reply-To: " . ($eposta ?: $fromMail),
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "X-Mailer: fuarcicekcim-form",
  ];
  $ok = @mail($to, "=?UTF-8?B?" . base64_encode($konu) . "?=", $govde, implode("\r\n", $headers), "-f$fromMail");
  if (!$ok) $err = 'mail() başarısız';
}

if ($ok || $saved) {
  // E-posta gitmese bile dosyaya kaydedildiyse kullanıcıya başarı dönüyoruz; sorun loglanır.
  if (!$ok) error_log("fuarcicekcim teklif e-postası gönderilemedi: $err");
  echo json_encode(['ok' => true, 'mail' => (bool) $ok, 'saved' => $saved], JSON_UNESCAPED_UNICODE);
} else {
  fail('E-posta gönderilemedi. Lütfen WhatsApp ile iletin.', 500);
}

/* ---- Minimal SMTP (SSL/TLS, AUTH LOGIN) — harici kütüphane gerektirmez ---- */
function smtp_send(array $cfg, string $to, string $subject, string $body, string $replyTo, string &$err): bool {
  $host = $cfg['smtp_host']; $port = (int) $cfg['smtp_port'];
  $prefix = $port === 465 ? 'ssl://' : '';
  $fp = @stream_socket_client("$prefix$host:$port", $errno, $errstr, 15);
  if (!$fp) { $err = "SMTP bağlantı hatası: $errstr"; return false; }
  $read = function () use ($fp) { $r = ''; while ($line = fgets($fp, 512)) { $r .= $line; if (substr($line, 3, 1) === ' ') break; } return $r; };
  $cmd = function (string $c, array $okCodes) use ($fp, $read, &$err) { fwrite($fp, $c . "\r\n"); $r = $read(); $code = (int) substr($r, 0, 3); if (!in_array($code, $okCodes, true)) { $err = "SMTP: $c → $r"; return false; } return true; };
  $read();
  if (!$cmd('EHLO ' . ($_SERVER['HTTP_HOST'] ?? 'localhost'), [250])) return false;
  if ($port === 587) { if (!$cmd('STARTTLS', [220])) return false; stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT); if (!$cmd('EHLO ' . ($_SERVER['HTTP_HOST'] ?? 'localhost'), [250])) return false; }
  if (!$cmd('AUTH LOGIN', [334])) return false;
  if (!$cmd(base64_encode($cfg['smtp_kullanici']), [334])) return false;
  if (!$cmd(base64_encode($cfg['smtp_sifre']), [235])) return false;
  if (!$cmd('MAIL FROM:<' . $cfg['gonderen_eposta'] . '>', [250])) return false;
  foreach (array_map('trim', explode(',', $to)) as $rcpt) { if (!$cmd("RCPT TO:<$rcpt>", [250, 251])) return false; }
  if (!$cmd('DATA', [354])) return false;
  $headers = "From: =?UTF-8?B?" . base64_encode($cfg['gonderen_ad']) . "?= <{$cfg['gonderen_eposta']}>\r\nTo: $to\r\nReply-To: " . ($replyTo ?: $cfg['gonderen_eposta']) . "\r\nSubject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\nDate: " . date('r') . "\r\n";
  $msg = $headers . "\r\n" . str_replace("\n.", "\n..", $body) . "\r\n.";
  if (!$cmd($msg, [250])) return false;
  $cmd('QUIT', [221]); fclose($fp);
  return true;
}
