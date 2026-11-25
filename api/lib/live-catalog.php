<?php
declare(strict_types=1);
require_once __DIR__ . '/catalog-pricing.php';

/*
  Canlı katalog katmanı — sunucu tarafı. Panelden yapılan fiyat, stok, aç/kapat ve indirim değişiklikleri Supabase'teki
  fc_live_products tablosuna yazılır (supabase/migrations/002_live_catalog.sql). Tarayıcıdaki katman (src/js/live-catalog.js,
  src/js/live-rules.js) bu satırları sayfaya uygular; bu dosya SİPARİŞTE aynı satırları AYNI kurallarla products-data.js'in
  üstüne uygular, böylece müşterinin gördüğü fiyat/stok ile sunucunun doğruladığı/kaydettiği değer ayrışmaz.

  Model: bir satır, o ürünün TAM canlı durumudur. Satır varsa ürünün fiyat, stok, aktif ve indirim bilgisi satırdan gelir;
  satırı olmayan ürün statik katalogdaki değerinde kalır. Bozuk satır tümüyle yok sayılır (tarayıcıyla aynı doğrulama).
  Katalogda olmayan ürün kimliği yok sayılır. Varsayılan KAPALI: LIVE_CATALOG_ENABLED=true olmadıkça hiçbir şey değişmez.
*/

const FC_LIVE_SELECT = 'product_id,price,in_stock,active,sort_order,bestseller_rank,badge,discount_price,discount_previous,discount_starts_on,discount_ends_on';

function fc_live_catalog_enabled(): bool {
  try {
    return in_array(strtolower(trim((string) fc_env('LIVE_CATALOG_ENABLED'))), ['true','1'], true);
  } catch (FcSupabaseError) {
    // Özel yapılandırma okunamıyorsa (ör. bozuk server.env) canlı katman kapalı sayılır; site statik katalogla çalışır.
    error_log('fuarcicekcim canlı katalog yapılandırması okunamadı; statik katalog kullanılıyor.');
    return false;
  }
}

// JavaScript'teki Number.isInteger ile aynı: 5 ve 5.0 tamsayıdır; 1.5, metin, mantıksal değer ve null değildir (null döner).
function fc_live_int(mixed $value): ?int {
  if (is_int($value)) return $value;
  if (is_float($value) && is_finite($value) && floor($value) === $value && abs($value) <= 9007199254740991) return (int) $value;
  return null;
}

// Ham bir satırı doğrular. src/js/live-rules.js parseRow ile birebir aynı kurallar; geçersizse null.
function fc_live_row_parse(mixed $raw): ?array {
  if (!is_array($raw) || array_is_list($raw)) return null;
  $id = $raw['product_id'] ?? null;
  if (!is_string($id) || strlen($id) > 80 || preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/D', $id) !== 1) return null;
  $price = $raw['price'] ?? null;
  if (!fc_pricing_money($price) || $price > 1000000) return null;
  $inStock = $raw['in_stock'] ?? null;
  $active = $raw['active'] ?? null;
  if (!is_bool($inStock) || !is_bool($active)) return null;
  $sortOrder = fc_live_int($raw['sort_order'] ?? null);
  if ($sortOrder !== null && ($sortOrder < 0 || $sortOrder > 1000000)) return null;
  $rank = fc_live_int($raw['bestseller_rank'] ?? null);
  if ($rank !== null && ($rank < 1 || $rank > 5)) return null;
  // Tamsayı olmayan bir değer (ör. 1.5, metin) satırı geçersiz kılar; null "yok" demektir.
  if (($raw['sort_order'] ?? null) !== null && $sortOrder === null) return null;
  if (($raw['bestseller_rank'] ?? null) !== null && $rank === null) return null;
  $badge = $raw['badge'] ?? '';
  if (!is_string($badge) || preg_match('/^[a-z0-9-]{0,40}$/D', $badge) !== 1) return null;

  // İndirim ya hiç yoktur ya da dört alanıyla eksiksizdir (veritabanındaki kuralla aynı).
  $fields = [$raw['discount_price'] ?? null, $raw['discount_previous'] ?? null, $raw['discount_starts_on'] ?? null, $raw['discount_ends_on'] ?? null];
  $given = count(array_filter($fields, static fn(mixed $value): bool => $value !== null));
  $discount = null;
  if ($given === 4) {
    $discount = ['price'=>$fields[0],'previousPrice'=>$fields[1],'startsOn'=>$fields[2],'endsOn'=>$fields[3]];
    // Ortak katalog kuralı: indirimli < önceki <= fiyat, geçerli tarihler, başlangıç <= bitiş.
    if (fc_pricing_validate(['price'=>$price,'discount'=>$discount]) !== '') return null;
  } elseif ($given !== 0) {
    return null;
  }
  return ['id'=>$id,'price'=>$price,'inStock'=>$inStock,'active'=>$active,'sortOrder'=>$sortOrder,'bestsellerRank'=>$rank,'badge'=>$badge,'discount'=>$discount];
}

// Satır listesini kimliğe göre haritalar; geçersizler atlanır, aynı ürün iki kez gelirse sonuncusu geçerlidir.
function fc_live_rows_parse(mixed $list): array {
  $rows = [];
  if (!is_array($list) || !array_is_list($list)) return $rows;
  foreach ($list as $raw) {
    $row = fc_live_row_parse($raw);
    if ($row !== null) $rows[$row['id']] = $row;
  }
  return $rows;
}

// Satırları katalog ürünlerinin üstüne uygular. [güncel katalog, uygulanan satırlar (kimliğe göre sıralı)] döner.
function fc_live_catalog_apply(array $catalog, array $rows): array {
  $applied = [];
  foreach ($catalog['products'] as $index => $product) {
    $id = is_array($product) ? ($product['id'] ?? null) : null;
    $row = is_string($id) ? ($rows[$id] ?? null) : null;
    if ($row === null) continue;
    $product['price'] = $row['price'];
    $product['active'] = $row['active'];
    $product['inStock'] = $row['inStock'];
    if ($row['discount'] !== null) $product['discount'] = $row['discount']; else unset($product['discount']);
    $catalog['products'][$index] = $product;
    $applied[$id] = $row;
  }
  ksort($applied);
  return [$catalog, $applied];
}

// Uygulanan satırların parmak izi: siparişin hangi canlı duruma göre fiyatlandığını denetlenebilir kılar.
function fc_live_catalog_digest(array $applied): string {
  return hash('sha256', json_encode(array_values($applied), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
}

// Okuma işlevi değiştirilebilir (yalnız testlerde, ağ olmadan denemek için); üretimde hiçbir yerde değiştirilmez.
function fc_live_catalog_fetcher(?callable $replace = null): callable {
  static $fetcher = null;
  if ($replace !== null) $fetcher = $replace;
  return $fetcher ?? 'fc_live_catalog_http_fetch';
}
function fc_live_catalog_fetch(): array {
  return (fc_live_catalog_fetcher())();
}

// Satırları Supabase'ten okur: herkese açık sütunlar, yalnız publishable anahtar (secret anahtar gerekmez).
function fc_live_catalog_http_fetch(): array {
  $config = fc_supabase_config(false);
  if (!function_exists('curl_init')) throw new FcSupabaseError('Sunucu bağlantı bileşeni hazır değil.');
  $headers = ['Accept: application/json', 'apikey: ' . $config['public']];
  if (!str_starts_with($config['public'], 'sb_publishable_')) $headers[] = 'Authorization: Bearer ' . $config['public'];
  $handle = curl_init($config['url'] . '/rest/v1/fc_live_products?select=' . FC_LIVE_SELECT);
  curl_setopt_array($handle, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>3,CURLOPT_TIMEOUT=>5,
    CURLOPT_HTTPHEADER=>$headers,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2]);
  $body = curl_exec($handle);
  $status = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE);
  curl_close($handle);
  if ($body === false || $status !== 200) throw new FcSupabaseError('Canlı katalog okunamadı.');
  try { $list = json_decode((string) $body, true, 512, JSON_THROW_ON_ERROR); }
  catch (Throwable) { throw new FcSupabaseError('Canlı katalog yanıtı doğrulanamadı.'); }
  if (!is_array($list) || !array_is_list($list)) throw new FcSupabaseError('Canlı katalog yanıtı doğrulanamadı.');
  return $list;
}
