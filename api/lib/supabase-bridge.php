<?php
declare(strict_types=1);
require_once __DIR__ . '/catalog-pricing.php';
require_once __DIR__ . '/live-catalog.php';

final class FcSupabaseError extends RuntimeException {
  public function __construct(string $message, public readonly int $httpStatus = 503, public readonly ?string $errorCode = null) { parent::__construct($message); }
}
function fc_is_iis_host(): bool {
  return PHP_OS_FAMILY === 'Windows' && PHP_SAPI === 'cgi-fcgi'
    && str_starts_with(strtolower((string) ($_SERVER['SERVER_SOFTWARE'] ?? '')), 'microsoft-iis/');
}
function fc_private_path_key(string $path): string {
  $path = rtrim(str_replace('\\', '/', $path), '/');
  return PHP_OS_FAMILY === 'Windows' ? strtolower($path) : $path;
}
function fc_iis_private_dir(): ?string {
  if (!fc_is_iis_host()) return null;
  $appRoot = @realpath(dirname(__DIR__, 2));
  $documentRoot = (string) ($_SERVER['DOCUMENT_ROOT'] ?? '');
  if ($documentRoot === '') $documentRoot = (string) ($_SERVER['APPL_PHYSICAL_PATH'] ?? '');
  $docRoot = $documentRoot !== '' ? @realpath($documentRoot) : false;
  if (!is_string($appRoot) || !is_string($docRoot) || fc_private_path_key($appRoot) !== fc_private_path_key($docRoot)) throw new FcSupabaseError('Sunucu özel yapılandırması doğrulanamadı.');
  // Plesk/IIS'te site kullanıcısı webspace klasörünün kendisini çözemeyebilir (realpath/is_dir başarısız),
  // ama içindeki fuar-private'a erişir. appRoot zaten gerçek yoldur; özel klasör aşağıda ayrıca doğrulanır.
  $webspace = dirname($appRoot);
  $candidate = $webspace . DIRECTORY_SEPARATOR . 'fuar-private';
  if (!@file_exists($candidate) && !@is_link($candidate)) return null;
  $private = @realpath($candidate);
  if (!is_string($private) || !@is_dir($private) || !@is_readable($private)
      || fc_private_path_key($private) !== fc_private_path_key($candidate)
      || str_starts_with(fc_private_path_key($private) . '/', fc_private_path_key($docRoot) . '/')) throw new FcSupabaseError('Sunucu özel yapılandırması doğrulanamadı.');
  return $private;
}
function fc_private_supabase_settings(): array {
  static $settings = null;
  if ($settings !== null) return $settings;
  $directory = fc_iis_private_dir();
  if ($directory === null) return $settings = [];
  $candidate = $directory . DIRECTORY_SEPARATOR . 'server.env';
  if (!@file_exists($candidate) && !@is_link($candidate)) return $settings = [];
  $file = @realpath($candidate);
  if (!is_string($file) || !@is_file($file) || !@is_readable($file)
      || fc_private_path_key($file) !== fc_private_path_key($candidate)) throw new FcSupabaseError('Sunucu özel yapılandırması okunamadı.');
  $contents = @file_get_contents($file, false, null, 0, 16385);
  if (!is_string($contents) || $contents === '' || strlen($contents) > 16384) throw new FcSupabaseError('Sunucu özel yapılandırması okunamadı.');
  $contents = preg_replace('/^\xEF\xBB\xBF/', '', $contents);
  $allowed = ['SUPABASE_ENABLED','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','LIVE_CATALOG_ENABLED'];
  $seen = [];
  foreach (preg_split('/\R/', $contents) as $line) {
    if (preg_match('/^\s*\[/', $line)) throw new FcSupabaseError('Sunucu özel yapılandırması geçersiz.');
    if (preg_match('/^\s*([a-z_][a-z0-9_]*)\s*=/i', $line, $match)) {
      if (!in_array($match[1], $allowed, true) || isset($seen[$match[1]])) throw new FcSupabaseError('Sunucu özel yapılandırması geçersiz.');
      $seen[$match[1]] = true;
    }
  }
  $parsed = @parse_ini_string($contents, false, INI_SCANNER_RAW);
  if (!is_array($parsed) || !$parsed) throw new FcSupabaseError('Sunucu özel yapılandırması geçersiz.');
  foreach ($parsed as $key => $value) {
    if (!in_array($key, $allowed, true) || !is_string($value) || preg_match('/[\x00-\x1f\x7f]/', $value)) throw new FcSupabaseError('Sunucu özel yapılandırması geçersiz.');
  }
  foreach (['SUPABASE_ENABLED','LIVE_CATALOG_ENABLED'] as $flag) {
    if (isset($parsed[$flag]) && !in_array(strtolower($parsed[$flag]), ['true','false','1','0'], true)) throw new FcSupabaseError('Sunucu özel yapılandırması geçersiz.');
  }
  return $settings = $parsed;
}
function fc_env(string $name): string|false {
  if (!in_array($name, ['SUPABASE_ENABLED','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','LIVE_CATALOG_ENABLED'], true)) throw new FcSupabaseError('Sunucu yapılandırma alanı geçersiz.');
  $native = getenv($name);
  if ($native !== false) return $native;
  if (!fc_is_iis_host()) return false;
  return fc_private_supabase_settings()[$name] ?? false;
}
function fc_supabase_enabled(): bool { return in_array(strtolower(trim((string) fc_env('SUPABASE_ENABLED'))), ['true','1'], true); }
function fc_supabase_config(bool $requireSecret = true): array {
  $url = rtrim((string) fc_env('SUPABASE_URL'), '/');
  $public = (string) fc_env('SUPABASE_PUBLISHABLE_KEY');
  $secret = (string) (fc_env('SUPABASE_SECRET_KEY') ?: fc_env('SUPABASE_SERVICE_ROLE_KEY'));
  if (!preg_match('~^https://[a-z0-9-]+\.supabase\.co$~i', $url) || $public === '' || ($requireSecret && $secret === '')) throw new FcSupabaseError('Sunucu Supabase yapılandırması eksik.');
  if (preg_match('/[\r\n]/', $public . ($requireSecret ? $secret : ''))) throw new FcSupabaseError('Sunucu yapılandırması geçersiz.');
  $publicAllowed = preg_match('/^sb_publishable_[a-z0-9_-]{10,}$/i', $public) === 1;
  if (!$publicAllowed && preg_match('/^[a-z0-9_-]+\.([a-z0-9_-]+)\.[a-z0-9_-]+$/i', $public, $parts)) {
    // Yalnız anahtar türünü ayırır; oturum/JWT yetkisi uzak Auth ve RLS ile doğrulanır.
    $claims = json_decode((string) base64_decode(strtr($parts[1], '-_', '+/'), true), true);
    $publicAllowed = is_array($claims) && ($claims['role'] ?? null) === 'anon';
  }
  if (!$publicAllowed) throw new FcSupabaseError('Sunucu public alanında yalnız publishable veya eski anon anahtarı kullanılabilir.');
  return ['url'=>$url,'public'=>$public,'secret'=>$secret];
}
function fc_sb_call(string $path, ?array $payload = null, ?string $userToken = null): mixed {
  $config = fc_supabase_config($userToken === null);
  if (!function_exists('curl_init')) throw new FcSupabaseError('Sunucu bağlantı bileşeni hazır değil.');
  $key = $userToken !== null ? $config['public'] : $config['secret'];
  $headers = ['Content-Type: application/json','Accept: application/json','apikey: ' . $key];
  if ($userToken !== null) $headers[] = 'Authorization: Bearer ' . $userToken;
  elseif (!str_starts_with($key, 'sb_secret_')) $headers[] = 'Authorization: Bearer ' . $key;
  $handle = curl_init($config['url'] . $path);
  curl_setopt_array($handle, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>3,CURLOPT_TIMEOUT=>7,
    CURLOPT_HTTPHEADER=>$headers,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2]);
  if ($payload !== null) { curl_setopt($handle, CURLOPT_POST, true); curl_setopt($handle, CURLOPT_POSTFIELDS, $payload === [] ? '{}' : json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)); }
  $body = curl_exec($handle);
  $status = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE);
  curl_close($handle);
  if ($body === false || $status === 0) throw new FcSupabaseError('Sunucu kaydı veya oturumu doğrulanamadı.');
  if ($status < 200 || $status >= 300) {
    $code = json_decode((string) $body, true)['code'] ?? '';
    if ($status === 409 || $code === 'PT409') throw new FcSupabaseError('Aynı talep kimliği farklı bilgilerle kullanılmış. Bilgileri kontrol edip yeniden deneyin.', 409);
    if (in_array($status, [401,403], true)) throw new FcSupabaseError('Oturum veya yetki doğrulanamadı.', 403);
    throw new FcSupabaseError('Supabase işlemi doğrulanamadı. Yapılandırmayı kontrol edin.');
  }
  try { return json_decode((string) $body, true, 512, JSON_THROW_ON_ERROR); }
  catch (Throwable) { throw new FcSupabaseError('Sunucu yanıtı doğrulanamadı.'); }
}
function fc_supabase_require_staff(array $roles = ['owner','admin']): array {
  $header = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
  if (!preg_match('/^Bearer ([A-Za-z0-9_.-]{20,8192})$/', $header, $match)) throw new FcSupabaseError('Yönetici oturumu gerekli.', 401);
  $user = fc_sb_call('/auth/v1/user', null, $match[1]);
  if (!is_array($user) || !is_string($user['id'] ?? null)) throw new FcSupabaseError('Oturum doğrulanamadı.', 401);
  $role = fc_sb_call('/rest/v1/rpc/fc_staff_role', [], $match[1]);
  if (!in_array($role, $roles, true)) throw new FcSupabaseError('Bu işlem için yönetici yetkisi gerekli.', 403);
  return ['id'=>$user['id'],'role'=>$role];
}
function fc_intake_text(mixed $value, string $label, ?int $maxBytes = 2000): string {
  if (!is_string($value) || ($maxBytes !== null && strlen($value) > $maxBytes)) throw new FcSupabaseError($label . ' alanını kontrol edin.', 422);
  if (preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/', $value)) throw new FcSupabaseError($label . ' alanı geçersiz.', 422);
  return trim($value);
}
function fc_require_order_halls(mixed $deliveries): void {
  $error = 'Her teslimat için hol numarası gerekli.';
  if (!is_array($deliveries) || !$deliveries) throw new FcSupabaseError($error, 422);
  foreach ($deliveries as $delivery) {
    if (!is_array($delivery) || fc_intake_text($delivery['hall_no'] ?? '', 'Hol numarası') === '') {
      throw new FcSupabaseError($error, 422);
    }
  }
}
function fc_normalize_intake(array $input): array {
  if (($input['payload_version'] ?? null) !== 2 || !preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i', (string) ($input['client_request_id'] ?? ''))) throw new FcSupabaseError('Güncel formu kullanmak için sayfayı yenileyin. Bilgileriniz korunur.', 422);
  if (!in_array($input['kvkk'] ?? null, ['on','1',1,true], true)) throw new FcSupabaseError('KVKK onayı gerekli.', 422);
  $type = $input['request_type'] ?? '';
  if (!in_array($type, ['order_request','quote_request'], true)) throw new FcSupabaseError('Talep türü geçersiz.', 422);
  $customer = $input['customer'] ?? [];
  if (!is_array($customer)) throw new FcSupabaseError('Müşteri bilgileri geçersiz.', 422);
  $cleanCustomer = [];
  foreach (['name','company','phone','email','billing_company','tax_office','tax_number'] as $field) $cleanCustomer[$field] = fc_intake_text($customer[$field] ?? '', 'Müşteri');
  $phoneDigits = preg_replace('/\D/', '', $cleanCustomer['phone']);
  if ($cleanCustomer['name'] === '' || $cleanCustomer['company'] === '' || !preg_match('/^\+?\d[\d ()-]{6,39}$/', $cleanCustomer['phone']) || strlen($phoneDigits) < 7 || strlen($phoneDigits) > 15) throw new FcSupabaseError('Firma, yetkili ve telefon bilgilerini kontrol edin.', 422);
  if ($cleanCustomer['email'] !== '' && !filter_var($cleanCustomer['email'], FILTER_VALIDATE_EMAIL)) throw new FcSupabaseError('E-posta geçersiz.', 422);
  $event = $input['event'] ?? [];
  if (!is_array($event) || !in_array($event['venue'] ?? '', ['tuyap','ifm','both','other'], true)) throw new FcSupabaseError('Fuar merkezi geçersiz.', 422);
  $deliveries = []; $deliveryIds = [];
  $rawDeliveries = $input['deliveries'] ?? [];
  $rawItems = $input['items'] ?? [];
  if (!is_array($rawDeliveries) || !is_array($rawItems) || count($rawDeliveries) > 99 || count($rawItems) > 99) throw new FcSupabaseError('Ürün/teslimat listesi geçersiz.', 422);
  foreach ($rawDeliveries as $delivery) {
    if (!is_array($delivery)) throw new FcSupabaseError('Teslimat bilgisi geçersiz.', 422);
    $row = [];
    foreach (['delivery_id','venue','fair_name','hall_no','stand_no','recipient_company','recipient_name','recipient_phone','requested_slot','requested_date_label','notes'] as $field) $row[$field] = fc_intake_text($delivery[$field] ?? '', 'Teslimat');
    if ($row['delivery_id'] === '' || isset($deliveryIds[$row['delivery_id']]) || !in_array($row['venue'], ['tuyap','ifm','both','other'], true)) throw new FcSupabaseError('Teslimat kimliği veya merkezi geçersiz.', 422);
    $date = $delivery['requested_date'] ?? null;
    if ($date !== null && (!is_string($date) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || date('Y-m-d', strtotime($date)) !== $date)) throw new FcSupabaseError('Teslimat tarihi geçersiz.', 422);
    $row['requested_date'] = $date;
    $row['scheduled_at'] = null; // Serbest saat seçeneği kesin teslimat randevusu sayılmaz.
    $row['time_zone'] = 'Europe/Istanbul';
    $deliveryIds[$row['delivery_id']] = $row;
    $deliveries[] = $row;
  }
  $items = []; $lineKeys = [];
  foreach ($rawItems as $item) {
    if (!is_array($item)) throw new FcSupabaseError('Ürün satırı geçersiz.', 422);
    $id = fc_intake_text($item['product_id'] ?? '', 'Ürün kimliği', 90);
    $key = fc_intake_text($item['line_key'] ?? '', 'Ürün satırı', 200);
    $deliveryId = fc_intake_text($item['delivery_id'] ?? '', 'Teslimat kimliği', 200);
    $qty = $item['qty'] ?? null;
    if ($id === '' || !is_int($qty) || $qty < 1 || $qty > 99 || $key === '' || isset($lineKeys[$key]) || !isset($deliveryIds[$deliveryId])) throw new FcSupabaseError('Ürün veya teslimat bilgisi geçersiz.', 422);
    if ($deliveryIds[$deliveryId]['stand_no'] === '' || $deliveryIds[$deliveryId]['recipient_company'] === '') throw new FcSupabaseError('Her ürün için teslimat firması ve stant bilgisi gerekli.', 422);
    $ribbon = $item['ribbon'] ?? [];
    if (!is_array($ribbon) || !in_array($ribbon['mode'] ?? '', ['text','logo-only'], true)) throw new FcSupabaseError('Şerit düzeni geçersiz.', 422);
    $logoName = fc_intake_text($ribbon['logo_file_name'] ?? '', 'Logo dosya adı', 1000);
    $only = $ribbon['mode'] === 'logo-only';
    if ($only && $logoName === '') throw new FcSupabaseError('Sadece logo düzeninde logo seçilmeli.', 422);
    if (!$only && !in_array($ribbon['color'] ?? '', ['black','blue','red'], true)) throw new FcSupabaseError('Şerit rengi geçersiz.', 422);
    $ribbonText = $only ? '' : fc_intake_text($ribbon['text'] ?? '', 'Şerit yazısı', null);
    $lineKeys[$key] = true;
    $items[] = ['line_key'=>$key,'product_id'=>$id,'qty'=>$qty,'package_name'=>fc_intake_text($item['package_name'] ?? '', 'Paket adı'),'delivery_id'=>$deliveryId,
      'ribbon'=>['mode'=>$only?'logo-only':'text','text'=>$ribbonText,'color'=>$only?null:$ribbon['color'],'logo_file_name'=>$logoName,'logo_status'=>'not_uploaded']];
  }
  $notes = fc_intake_text($input['notes'] ?? '', 'Notlar', 20000);
  if ($type === 'order_request' && !$items && $notes === '') throw new FcSupabaseError('Ürün veya talep açıklaması gerekli.', 422);
  $quote = $input['quote'] ?? [];
  if (!is_array($quote)) throw new FcSupabaseError('Teklif bilgisi geçersiz.', 422);
  $cleanQuote = [];
  foreach (['details','budget'] as $field) $cleanQuote[$field] = fc_intake_text($quote[$field] ?? '', 'Teklif', 20000);
  if ($type === 'quote_request' && $cleanQuote['details'] === '') throw new FcSupabaseError('Teklif açıklaması gerekli.', 422);
  return ['request_id'=>strtolower($input['client_request_id']),'reference'=>fc_intake_text($input['request_reference'] ?? '', 'Talep numarası', 100),'request_type'=>$type,'source'=>$type === 'order_request'?'web_cart':'web_quote',
    'customer'=>$cleanCustomer,'event'=>['venue'=>$event['venue'],'fair_name'=>fc_intake_text($event['fair_name'] ?? '', 'Fuar adı')],
    'notes'=>$notes,'consent'=>['kvkk'=>true],'items'=>$items,'deliveries'=>$deliveries,'quote'=>$cleanQuote];
}
function fc_intake_input_hash(array $normalized): string {
  return hash('sha256', json_encode($normalized, JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));
}
// Dönüş: [katalog, statik kaynak metni, canlı katman özeti|null]. Canlı katman açıksa (LIVE_CATALOG_ENABLED) panelden yapılan
// fiyat/stok/aç-kapat/indirim satırları statik kataloğun üstüne uygulanır; böylece sipariş, müşterinin gördüğü durumla doğrulanır.
// $requireLive=true (fiyatı sunucunun belirlediği kayıt): canlı okuma başarısızsa sipariş reddedilir, eski fiyatla kayıt açılmaz.
// $requireLive=false (yalnız satışa açıklık kontrolü): okuma başarısızsa e-posta akışı kaybolmasın diye statik katalog kullanılır.
function fc_read_order_catalog(string $catalogPath, bool $requireLive = false): array {
  $source = @file_get_contents($catalogPath);
  if (!is_string($source) || !preg_match('/^\s*window\.FUAR_CATALOG\s*=\s*(\{.*\})\s*;?\s*$/s', $source, $match)) throw new FcSupabaseError('Ürün kataloğu okunamadı.');
  $catalog = json_decode($match[1], true);
  if (!is_array($catalog['products'] ?? null)) throw new FcSupabaseError('Ürün kataloğu doğrulanamadı.');
  $live = null;
  if (fc_live_catalog_enabled()) {
    try {
      [$catalog, $applied] = fc_live_catalog_apply($catalog, fc_live_rows_parse(fc_live_catalog_fetch()));
      if ($applied) $live = ['count'=>count($applied),'digest'=>fc_live_catalog_digest($applied)];
    } catch (Throwable $error) {
      // Beklenmeyen hata da aynı şekilde ele alınır; günlüğe yalnız hata türü yazılır (ayrıntı/gizli değer sızmaz).
      error_log('fuarcicekcim canlı katalog okunamadı (' . get_class($error) . ').');
      if ($requireLive) throw new FcSupabaseError('Güncel fiyatlar şu anda doğrulanamadı. Siparişinizi WhatsApp ile iletebilirsiniz.', 503, 'catalog_unavailable');
    }
  }
  return [$catalog, $source, $live];
}

function fc_order_product(array $byId, string $id): array {
  $product = $byId[$id] ?? null;
  if (!$product || ($product['active'] ?? true) === false) {
    throw new FcSupabaseError('Sepette satışa kapalı bir ürün var. Kataloğu yenileyip sepetinizi kontrol edin.', 422, 'product_unavailable');
  }
  if (($product['inStock'] ?? true) === false) {
    throw new FcSupabaseError($product['name'] . ' stokta yok. Devam etmek için ürünü sepetten çıkarın.', 422, 'product_unavailable');
  }
  return $product;
}

function fc_require_order_products(mixed $items, string $catalogPath): void {
  if (!is_array($items)) throw new FcSupabaseError('Sipariş ürünleri geçersiz.', 422);
  if (!$items) return;
  [$catalog] = fc_read_order_catalog($catalogPath);
  $byId = array_column($catalog['products'], null, 'id');
  foreach ($items as $item) {
    $id = $item['product_id'] ?? null;
    if (!is_string($id) || $id === '') throw new FcSupabaseError('Sipariş ürünü geçersiz.', 422);
    fc_order_product($byId, $id);
  }
}

function fc_enrich_intake(array $normalized, string $catalogPath): array {
  // Hol, yeni siparişlerde doğrulanır; kayıtlı istekler mevcut özetiyle yeniden açılabilir.
  if (($normalized['request_type'] ?? '') === 'order_request') {
    fc_require_order_halls($normalized['deliveries'] ?? null);
  }
  [$catalog, $source, $live] = fc_read_order_catalog($catalogPath, true);
  $byId = array_column($catalog['products'], null, 'id');
  $vatBps = (int) round((float) ($catalog['settings']['vat'] ?? 20) * 100);
  $request = $normalized;
  $request['input_sha256'] = fc_intake_input_hash($normalized);
  $pricingDate = (new DateTimeImmutable('now', new DateTimeZone('Europe/Istanbul')))->format('Y-m-d');
  try {
    $cartDiscountActive = fc_pricing_cart_resolve($catalog['cartDiscount'] ?? null, $pricingDate);
  } catch (InvalidArgumentException) {
    throw new FcSupabaseError('Ürün kataloğunun sepet indirimi doğrulanamadı.');
  }
  if ($cartDiscountActive && $request['items']) $request['cart_discount'] = ['rate'=>5,'startsOn'=>$catalog['cartDiscount']['startsOn'],'endsOn'=>$catalog['cartDiscount']['endsOn']];
  foreach ($request['items'] as &$item) {
    $product = fc_order_product($byId, $item['product_id']);
    try {
      $pricing = fc_pricing_resolve($product, $pricingDate);
    } catch (InvalidArgumentException $e) {
      throw new FcSupabaseError('Ürün kataloğunun fiyatı doğrulanamadı.');
    }
    $item['product_name'] = $product['name'];
    $item['unit_net_kurus'] = (int) round((float) $pricing['price'] * 100);
    if ($cartDiscountActive) {
      $item['product_unit_net_kurus'] = $item['unit_net_kurus'];
      $item['unit_net_kurus'] = intdiv($item['unit_net_kurus'] * 95, 100);
    }
    $item['vat_rate_bps'] = $vatBps;
  }
  unset($item);
  // Canlı satır uygulandıysa kayıt bunu belirtir: revizyona "+live", parmak izine uygulanan satırların özeti katılır.
  $request['catalog_revision'] = (string) $catalog['revision'] . ($live !== null ? '+live' : '');
  $request['catalog_sha256'] = hash('sha256', $live !== null ? $source . "\n" . $live['digest'] : $source);
  return $request;
}
function fc_prepare_intake(array $input, string $catalogPath): array {
  return fc_enrich_intake(fc_normalize_intake($input), $catalogPath);
}

function fc_existing_config_path(string $root): string {
  $local = $root . '/config.php';
  if (!fc_is_iis_host() || @is_file($local)) return $local;
  // Bazı Plesk kurulumlarında mevcut SMTP ayarı httpdocs kardeşidir.
  $sibling = dirname($root) . '/config.php';
  return @is_file($sibling) ? $sibling : $local;
}

// IIS üzerinde yeni kayıtlar belge kökünün dışındaki özel klasörde tutulur.
function fc_iis_storage_dir(string $name, bool $create = false): ?string {
  if (!in_array($name, ['katalog-taslak', 'teklif-yedek'], true)) {
    throw new FcSupabaseError('Özel kayıt klasörü geçersiz.');
  }
  $parent = fc_iis_private_dir();
  if ($parent === null) return null;
  $path = $parent . DIRECTORY_SEPARATOR . $name;
  if ($create && !is_dir($path)) @mkdir($path, 0750);
  $resolved = @realpath($path);
  if ($resolved === false) {
    if (@file_exists($path) || @is_link($path)) throw new FcSupabaseError('Özel kayıt klasörü doğrulanamadı.');
    return null;
  }
  if (!is_dir($resolved) || fc_private_path_key($path) !== fc_private_path_key($resolved) || is_link($path)) {
    throw new FcSupabaseError('Özel kayıt klasörü doğrulanamadı.');
  }
  return $resolved;
}
