<?php
/*
  Teklif formu alıcısı — JSON POST alır, e-posta gönderir ve isteğe bağlı olarak özel kayıt tutar.
  Çağıran: sipariş/teklif formları ve eski /site.js.
  Yanıt: ok ve mail SMTP kabulünü; saved doğrulanmış disk veya talep kaydını belirtir.
*/
declare(strict_types=1);
require_once __DIR__ . '/api/lib/supabase-bridge.php';
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function fail(string $msg, int $code = 400, ?string $errorCode = null): void {
  http_response_code($code);
  $response = ['ok' => false, 'mail' => false, 'saved' => false, 'error' => $msg];
  if ($errorCode !== null) $response['error_code'] = $errorCode;
  echo json_encode($response, JSON_UNESCAPED_UNICODE);
  exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('Yalnızca POST.', 405);

try {
  $cfg = @require fc_existing_config_path(__DIR__);
  if (!is_array($cfg)) throw new RuntimeException('Geçersiz yapılandırma.');
} catch (Throwable $error) {
  error_log('fuarcicekcim teklif yapılandırması yüklenemedi.');
  fail('Form şu anda kullanılamıyor. Lütfen WhatsApp ile iletin.', 500);
}

// Kaynak alan adı ve portu tam eşleşir; alan adını içeren yabancı URL kabul edilmez.
$host = $_SERVER['HTTP_HOST'] ?? '';
$origin = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
if ($origin && $host) {
  $parts = parse_url($origin);
  $originHost = strtolower((string) ($parts['host'] ?? '')) . (isset($parts['port']) ? ':' . $parts['port'] : '');
  if (!in_array($parts['scheme'] ?? '', ['https','http'], true) || $originHost !== strtolower($host)) fail('Geçersiz kaynak.', 403);
}

$raw = file_get_contents('php://input', false, null, 0, 1024 * 1024 + 1) ?: '';
if (strlen($raw) > 1024 * 1024) fail('İstek boyutu sınırını aşıyor.', 413);
$data = json_decode($raw, true);
if (!is_array($data)) { $data = $_POST; }
if (!$data) fail('Boş istek.');

// Honeypot
if (!empty($data['website'])) { echo json_encode(['ok' => false, 'mail' => false, 'saved' => false]); exit; }

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
$acikAdresTeklifi = $merkez === 'Açık adres' && $clean('tur', 20) === 'teklif';
$stant   = $clean('stant', $acikAdresTeklifi ? 1150 : 300);
$tarih   = $clean('tarih', 40);
$saat    = $clean('saat', 60);
$adet    = $clean('adet', 60);
$butce   = $clean('butce', 60);
$not     = $clean('not', 800);
$urunNotu= $clean('urun_notu', 200);
$urunler = array_map(fn($u) => mb_substr(strip_tags((string) $u), 0, 300), (array) ($data['urunler'] ?? []));
$sayfa   = $clean('sayfa', 300);
$siparis = $clean('tur', 20) === 'siparis';
$sipNo   = preg_replace('/[^A-Z0-9\-]/', '', $clean('siparis_no', 30));
$araTop  = $clean('ara_toplam', 40);
$urunAraTop = $clean('urun_ara_toplam', 40);
$sepetIndirimi = $clean('sepet_indirimi', 40);
$kdv     = $clean('kdv', 40);
$toplam  = $clean('toplam', 40);
$fUnvan  = $clean('fatura_unvan', 160);
$fVd     = $clean('vergi_dairesi', 60);
$fVno    = preg_replace('/\D/', '', $clean('vergi_no', 20));
if ($siparis && $firma === '') $firma = $fUnvan !== '' ? $fUnvan : 'Web sipariş';

// Ürün bazındaki şerit bilgileri isteğe bağlıdır; eski teklif istekleri aynı kalır.
$ribbonClean = static function ($value, ?int $max = null): string {
  if (!is_scalar($value)) return '';
  $value = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', strip_tags((string) $value)) ?? '';
  $value = trim($value);
  return $max === null ? $value : mb_substr($value, 0, $max);
};
$kart = $ribbonClean($data['kart'] ?? '');
$seritler = [];
$ribbonRows = $data['seritler'] ?? [];
if (is_array($ribbonRows)) {
  foreach (array_slice($ribbonRows, 0, 99) as $row) {
    if (!is_array($row)) continue;
    $logoOnly = $ribbonClean($row['duzen'] ?? '', 30) === 'Sadece logo';
    $color = $ribbonClean($row['yazi_rengi'] ?? '', 20);
    if (!in_array($color, ['Siyah', 'Mavi', 'Kırmızı'], true)) $color = 'Siyah';
    $logo = $ribbonClean($row['logo'] ?? '', 120);
    $seritler[] = [
      'urun' => $ribbonClean($row['urun'] ?? '', 160),
      'duzen' => $logoOnly ? 'Sadece logo' : 'Yazılı şerit',
      'yazi' => $logoOnly ? '' : $ribbonClean($row['yazi'] ?? ''),
      'zemin' => 'Beyaz',
      'yazi_rengi' => $logoOnly ? '' : $color,
      'logo' => $logo,
      'logo_konumu' => $logoOnly ? 'Şeridin ortasında' : ($logo !== '' ? 'Yazının solunda ve sağında' : ''),
    ];
  }
}

// Sipariş çekmecesi iletişim bilgisi istemez (müşteri numarası WhatsApp mesajında görünür); teklif formu ister.
if ($stant === '') fail($acikAdresTeklifi ? 'Teslimat bilgisi zorunludur.' : 'Stant bilgisi zorunludur.');
if (!$siparis && ($firma === '' || $ad === '' || $tel === '')) fail($acikAdresTeklifi
  ? 'Firma, yetkili ve telefon bilgisi zorunludur.'
  : 'Firma, yetkili, telefon ve stant bilgisi zorunludur.');
if ($tel !== '' && !preg_match('/\d{7,}/', preg_replace('/\D/', '', $tel))) fail('Geçerli bir telefon numarası yazın.');

$intakeSaved = false; $intakeId = null; $mailClaimToken = null;
// IIS'te özel yapılandırma klasörü doğrulanamazsa Supabase kapalı kabul edilir: hiçbir gizli değer
// okunmaz, sipariş e-posta akışıyla devam eder (e-posta kaybolmasın diye hata 503 olarak dönmez).
try { $supabaseEnabled = fc_supabase_enabled(); }
catch (FcSupabaseError) { $supabaseEnabled = false; error_log('fuarcicekcim özel yapılandırma doğrulanamadı; e-posta akışı kullanılıyor.'); }
try {
  if (!$supabaseEnabled && ($data['payload_version'] ?? null) === 2
      && ($siparis || ($data['request_type'] ?? '') === 'order_request')) {
    fc_require_order_halls($data['deliveries'] ?? null);
    fc_require_order_products($data['items'] ?? [], __DIR__ . '/products-data.js');
  }
} catch (FcSupabaseError $error) {
  fail($error->getMessage(), $error->httpStatus, $error->errorCode);
}
if ($supabaseEnabled) {
  try {
    $normalized = fc_normalize_intake($data);
    $inputHash = fc_intake_input_hash($normalized);
    $intake = fc_sb_call('/rest/v1/rpc/fc_find_request', ['p_request_id'=>$normalized['request_id'],'p_input_sha256'=>$inputHash]);
    if ($intake === null) {
      $fresh = fc_enrich_intake($normalized, __DIR__ . '/products-data.js');
      $result = fc_sb_call('/rest/v1/rpc/fc_intake_request', ['p_request'=>$fresh]);
      if (!is_array($result) || ($result['request_id'] ?? '') !== $normalized['request_id']) throw new FcSupabaseError('Talep kaydı doğrulanamadı.');
      $intake = $result['request'] ?? null;
    }
    if (!is_array($intake) || ($intake['request_id'] ?? '') !== $normalized['request_id'] || ($intake['input_sha256'] ?? '') !== $inputHash) throw new FcSupabaseError('Talep kaydı doğrulanamadı.');
    $intakeSaved = true; $intakeId = $intake['request_id'];
    $claim = fc_sb_call('/rest/v1/rpc/fc_claim_request_mail', ['p_request_id'=>$intakeId]);
    if (!is_array($claim) || !isset($claim['claimed'], $claim['status'])) throw new FcSupabaseError('E-posta işlem durumu doğrulanamadı.');
    if ($claim['claimed'] !== true) {
      $mailSent = $claim['status'] === 'sent';
      echo json_encode(['ok'=>$mailSent,'mail'=>$mailSent,'saved'=>true,'intake_saved'=>true,'request_id'=>$intakeId,'replayed'=>true,
        'error'=>$mailSent?'':'Talep kaydedildi; e-posta sonucu henüz doğrulanmadı. WhatsApp ile de iletebilirsiniz.'], JSON_UNESCAPED_UNICODE);
      exit;
    }
    $mailClaimToken = $claim['claim_token'] ?? null;
    if (!is_string($mailClaimToken)) throw new FcSupabaseError('E-posta işlem kimliği doğrulanamadı.');
    // İstemcinin fiyat/tutar metni e-postada da yetkili fiyat kaynağı sayılmaz.
    $netKurus = 0; $vatKurus = 0; $productNetKurus = 0;
    foreach ($intake['items'] as $item) {
      $lineNet = $item['unit_net_kurus'] * $item['qty'];
      $netKurus += $lineNet;
      $productNetKurus += ($item['product_unit_net_kurus'] ?? $item['unit_net_kurus']) * $item['qty'];
      $vatKurus += (int) round($lineNet * $item['vat_rate_bps'] / 10000);
    }
    $money = static fn(int $kurus): string => number_format($kurus / 100, 2, ',', '.') . ' TL';
    $araTop = $money($netKurus); $kdv = $money($vatKurus); $toplam = $money($netKurus + $vatKurus);
    // Bu fark yalnız kayıtlı, sunucuda hesaplanan snapshot'tan gelir; istemci tutarı kullanılmaz.
    $cartSavingKurus = $productNetKurus - $netKurus;
    $urunAraTop = $cartSavingKurus > 0 ? $money($productNetKurus) : '';
    $sepetIndirimi = $cartSavingKurus > 0 ? $money($cartSavingKurus) : '';
    $urunler = array_map(static fn(array $item): string => $item['qty'] . ' × ' . $item['product_name'] . ' · satır: ' . $item['line_key'] . ' · teslimat: ' . $item['delivery_id'], $intake['items']);
    // E-posta ve veritabanı aynı doğrulanmış müşteri/şerit/teslimat verisini kullanır.
    $firma = $intake['customer']['company']; $ad = $intake['customer']['name'];
    $tel = $intake['customer']['phone']; $eposta = $intake['customer']['email'];
    $fUnvan = $intake['customer']['billing_company']; $fVd = $intake['customer']['tax_office']; $fVno = $intake['customer']['tax_number'];
    $fuar = $intake['event']['fair_name'] ?: 'Belirtilmedi';
    $merkez = $acikAdresTeklifi ? 'Açık adres' : ['tuyap'=>'TÜYAP','ifm'=>'İFM','both'=>'Her ikisi','other'=>'Diğer'][$intake['event']['venue']];
    $not = $intake['notes']; $butce = $intake['quote']['budget'];
    $siparis = $intake['request_type'] === 'order_request';
    $sipNo = preg_replace('/[^A-Z0-9\-]/', '', $intake['reference']);
    $seritler = array_map(static function(array $item): array {
      $ribbon = $item['ribbon']; $only = $ribbon['mode'] === 'logo-only';
      return ['urun'=>$item['product_name'] . ' · ' . $item['line_key'], 'duzen'=>$only?'Sadece logo':'Yazılı şerit',
        'yazi'=>$ribbon['text'],'zemin'=>'Beyaz','yazi_rengi'=>$only?'':['black'=>'Siyah','blue'=>'Mavi','red'=>'Kırmızı'][$ribbon['color']],
        'logo'=>$ribbon['logo_file_name'],'logo_konumu'=>$only?'Şeridin ortasında':($ribbon['logo_file_name'] !== ''?'Yazının solunda ve sağında':'')];
    }, $intake['items']);
    $kart = ''; $stant = $siparis ? 'Aşağıdaki ürün teslimatlarına bakın' : $intake['quote']['details'];
    $tarih = ''; $saat = ''; $adet = ''; $urunNotu = '';
  } catch (FcSupabaseError $error) {
    http_response_code($error->httpStatus);
    $response = ['ok'=>false,'mail'=>false,'saved'=>$intakeSaved,'intake_saved'=>$intakeSaved,'request_id'=>$intakeId,'error'=>$error->getMessage()];
    if ($error->errorCode !== null) $response['error_code'] = $error->errorCode;
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
  }
}

// Fiyatlara KDV yalnızca kurumsal fatura bilgisi girildiyse yansıtılır; aksi hâlde toplam KDV'siz tutardır.
$faturali = $fUnvan !== '' || $fVd !== '' || $fVno !== '';
if ($siparis && !$faturali && $araTop !== '') { $kdv = ''; $toplam = $araTop; }

$satirlar = [
  $siparis ? "Yeni sipariş ($sipNo) — fuarcicekcim.com · ödeme WhatsApp'ta onaylanacak" : "Yeni fuar teklif talebi — fuarcicekcim.com",
  str_repeat('-', 48),
  "Fuar            : $fuar",
  "Fuar merkezi    : $merkez",
  ($acikAdresTeklifi ? "Teslimat bilgisi: " : "Salon / stant   : ") . $stant,
  "Teslimat        : $tarih $saat",
  "Firma           : $firma",
  "Yetkili         : " . ($ad ?: '-'),
  "Telefon         : " . ($tel ?: '- (WhatsApp mesajında görünür)'),
  "E-posta         : " . ($eposta ?: '-'),
  "Ürünler         : " . ($urunler ? implode("\n                  ", $urunler) : '-'),
  "Katalog dışı    : " . ($urunNotu ?: '-'),
  "Adet / bütçe    : " . ($adet ?: '-') . " / " . ($butce ?: '-'),
  "Şerit / kart    : " . ($kart ?: '-'),
  "Not             : " . ($not ?: '-'),
];
if ($intakeSaved && $intake['deliveries']) {
  $satirlar[] = 'Ürün teslimatları:';
  foreach ($intake['deliveries'] as $delivery) {
    $satirlar[] = $delivery['delivery_id'] . ' · Salon: ' . $delivery['hall_no'] . ' · Stant: ' . $delivery['stand_no'] . ' · Firma: ' . $delivery['recipient_company'];
    $dayLabel = $delivery['requested_date_label'] ?: ($delivery['requested_date'] ? date('d.m.Y', strtotime($delivery['requested_date'])) : '-');
    $satirlar[] = '   İstenen teslimat: ' . $dayLabel . ' ' . $delivery['requested_slot'] . ' · Saat dilimi: Europe/Istanbul';
  }
}
if ($seritler) {
  $satirlar[] = 'Ürün bazında şerit bilgileri:';
  foreach ($seritler as $n => $serit) {
    array_push($satirlar,
      ($n + 1) . ') Ürün: ' . ($serit['urun'] ?: '-'),
      '   Şerit düzeni : ' . $serit['duzen'],
      '   Şerit yazısı : ' . ($serit['duzen'] === 'Sadece logo' ? 'Yazı basılmayacak' : ($serit['yazi'] ?: '-')),
      '   Şerit zemini : ' . $serit['zemin'],
      '   Yazı rengi   : ' . ($serit['duzen'] === 'Sadece logo' ? 'Uygulanmaz' : $serit['yazi_rengi']),
      '   Logo dosyası : ' . ($serit['logo'] ?: '-'),
      '   Logo konumu  : ' . ($serit['logo_konumu'] ?: '-')
    );
  }
}
if ($siparis) {
  if ($urunAraTop !== '' && $sepetIndirimi !== '') {
    array_push($satirlar, 'Ürün ara toplamı: ' . $urunAraTop . ($faturali ? ' (KDV hariç)' : ''), 'Sepette %5 indirim: -' . $sepetIndirimi);
  }
  if ($faturali) array_push($satirlar,
    "Ara toplam      : " . ($araTop ?: '-') . " (KDV hariç)",
    "KDV             : " . ($kdv ?: '-'),
    "Toplam          : " . ($toplam ?: '-') . " (KDV dahil)"
  );
  else $satirlar[] = "Toplam          : " . ($toplam ?: '-');
  array_push($satirlar,
    "Fatura ünvanı   : " . ($fUnvan ?: '-'),
    "Vergi dairesi   : " . ($fVd ?: '-'),
    "Vergi / TC no   : " . ($fVno ?: '-')
  );
}
array_push($satirlar,
  str_repeat('-', 48),
  "Tarih: " . date('d.m.Y H:i') . "  IP: $ip",
  "Sayfa: $sayfa",
  "",
  ($tel !== '' ? "WhatsApp ile yanıtla: https://wa.me/" . preg_replace('/\D/', '', (strpos($tel, '0') === 0 ? '9' . $tel : $tel)) : "Müşterinin numarası, WhatsApp'tan gelen sipariş mesajında görünür.")
);
$govde = implode("\n", $satirlar);
$konu  = $acikAdresTeklifi
  ? "Açık adres teslimat teklifi — $firma"
  : ($siparis ? "Sipariş $sipNo: " : "Teklif: ") . "$firma — $fuar" . ($stant ? " ($stant)" : '') . ($siparis && $toplam ? " · $toplam" : '');

// Yedek kayıt: ayarın açık olması yeterli değildir; yazılan bayt sayısı doğrulanır.
$saved = $intakeSaved;
if (!empty($cfg['teklifleri_kaydet'])) {
  if (fc_is_iis_host()) {
    try { $dir = fc_iis_storage_dir('teklif-yedek', true); }
    catch (FcSupabaseError) { $dir = null; }
    $protected = $dir !== null;
  } else {
    $dir = __DIR__ . '/veri';
    $directoryReady = is_dir($dir) || @mkdir($dir, 0755, true) || is_dir($dir);
    $denyRule = "Require all denied\n";
    $protected = $directoryReady && (is_file("$dir/.htaccess") || @file_put_contents("$dir/.htaccess", $denyRule, LOCK_EX) === strlen($denyRule));
  }
  if ($protected) {
    $entry = $govde . "\n\n" . str_repeat('=', 64) . "\n\n";
    $written = @file_put_contents("$dir/teklifler-" . date('Y-m') . ".txt", $entry, FILE_APPEND | LOCK_EX);
    $saved = $intakeSaved || ($written !== false && $written === strlen($entry));
  }
  if (!$saved) error_log('fuarcicekcim teklif dosyaya kaydedilemedi.');
}

// E-posta gönder
$to = (string) ($cfg['alici_eposta'] ?? '');
$fromMail = (string) ($cfg['gonderen_eposta'] ?? '');
$fromName = (string) ($cfg['gonderen_ad'] ?? 'Fuar Çiçekçim');
$ok = false; $err = '';

try {
  if ($to === '' || $fromMail === '') {
    $err = 'E-posta ayarları eksik.';
  } elseif (!empty($cfg['smtp_host'])) {
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
    if (!$ok) $err = 'mail() gönderimi kabul etmedi.';
  }
} catch (Throwable $error) {
  $err = 'E-posta gönderimi tamamlanamadı.';
}

if (!$ok) error_log("fuarcicekcim teklif e-postası doğrulanamadı: $err");
if ($intakeSaved && $mailClaimToken !== null) {
  try { fc_sb_call('/rest/v1/rpc/fc_finish_request_mail', ['p_request_id'=>$intakeId,'p_claim_token'=>$mailClaimToken,'p_status'=>$ok?'sent':'unknown']); }
  catch (FcSupabaseError) { error_log('fuarcicekcim talep e-posta durumu doğrulanamadı.'); }
}
if ($ok) {
  echo json_encode(['ok' => true, 'mail' => true, 'saved' => $saved,'intake_saved'=>$intakeSaved,'request_id'=>$intakeId], JSON_UNESCAPED_UNICODE);
} elseif ($saved) {
  echo json_encode(['ok' => false, 'mail' => false, 'saved' => true, 'error' => 'Talebiniz sunucuya kaydedildi ancak e-posta gönderimi doğrulanamadı. WhatsApp ile de iletebilirsiniz.'], JSON_UNESCAPED_UNICODE);
} else {
  fail('E-posta gönderimi ve sunucu kaydı doğrulanamadı. Lütfen WhatsApp ile iletin.', 500);
}

/* ---- Minimal SMTP (SSL/TLS, AUTH LOGIN) — harici kütüphane gerektirmez ---- */
function smtp_send(array $cfg, string $to, string $subject, string $body, string $replyTo, string &$err): bool {
  $host = $cfg['smtp_host']; $port = (int) $cfg['smtp_port'];
  $prefix = $port === 465 ? 'ssl://' : '';
  $fp = @stream_socket_client("$prefix$host:$port", $errno, $errstr, 15);
  if (!$fp) { $err = 'SMTP bağlantısı kurulamadı.'; return false; }
  stream_set_timeout($fp, 10);
  try {
  $read = function () use ($fp) { $r = ''; while ($line = fgets($fp, 512)) { $r .= $line; if (substr($line, 3, 1) === ' ') break; } return $r; };
  $cmd = function (string $c, array $okCodes) use ($fp, $read, &$err) {
    $wire = $c . "\r\n";
    if (@fwrite($fp, $wire) !== strlen($wire)) { $err = 'SMTP isteği tamamlanamadı.'; return false; }
    $r = $read(); $code = (int) substr($r, 0, 3);
    if (!in_array($code, $okCodes, true)) { $err = 'SMTP yanıtı gönderimi doğrulamadı (kod ' . $code . ').'; return false; }
    return true;
  };
  $read();
  if (!$cmd('EHLO ' . ($_SERVER['HTTP_HOST'] ?? 'localhost'), [250])) return false;
  if ($port === 587) { if (!$cmd('STARTTLS', [220])) return false; if (@stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT) !== true) { $err = 'SMTP güvenli bağlantısı kurulamadı.'; return false; } if (!$cmd('EHLO ' . ($_SERVER['HTTP_HOST'] ?? 'localhost'), [250])) return false; }
  if (!$cmd('AUTH LOGIN', [334])) return false;
  if (!$cmd(base64_encode($cfg['smtp_kullanici']), [334])) return false;
  if (!$cmd(base64_encode($cfg['smtp_sifre']), [235])) return false;
  if (!$cmd('MAIL FROM:<' . $cfg['gonderen_eposta'] . '>', [250])) return false;
  foreach (array_map('trim', explode(',', $to)) as $rcpt) { if (!$cmd("RCPT TO:<$rcpt>", [250, 251])) return false; }
  if (!$cmd('DATA', [354])) return false;
  $headers = "From: =?UTF-8?B?" . base64_encode($cfg['gonderen_ad']) . "?= <{$cfg['gonderen_eposta']}>\r\nTo: $to\r\nReply-To: " . ($replyTo ?: $cfg['gonderen_eposta']) . "\r\nSubject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\nDate: " . date('r') . "\r\n";
  $msg = $headers . "\r\n" . str_replace("\n.", "\n..", $body) . "\r\n.";
  if (!$cmd($msg, [250])) return false;
  $cmd('QUIT', [221]);
  return true;
  } finally {
    fclose($fp);
  }
}
