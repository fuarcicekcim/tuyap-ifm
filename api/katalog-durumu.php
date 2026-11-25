<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');
require_once __DIR__ . '/lib/supabase-bridge.php';

/*
  Canlı katalog katmanının sunucu tarafındaki durumu (izleme ve yayın sonrası kontrol için):
  - liveCatalog: sipariş doğrulamasında panelden yayımlanan fiyat/stok satırları kullanılıyor mu
  - source: durumu ne belirliyor ("server.env" ya da vitrinle ortak herkese açık "public" yapılandırma)
  - reachable/rows: açıksa Supabase'teki fc_live_products tablosu okunabiliyor mu, kaç satır var
  Gizli değer döndürmez; tablo zaten herkese açık okunur (RLS).
*/

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
  http_response_code(405);
  header('Allow: GET');
  echo json_encode(['ok'=>false], JSON_UNESCAPED_UNICODE);
  exit;
}

$state = fc_live_catalog_state();
$out = ['ok'=>true,'liveCatalog'=>$state['enabled'],'source'=>$state['source']];
if ($state['enabled']) {
  try {
    $out['rows'] = count(fc_live_rows_parse(fc_live_catalog_fetch()));
    $out['reachable'] = true;
  } catch (Throwable $error) {
    error_log('fuarcicekcim katalog durumu: canlı katalog okunamadı (' . get_class($error) . ').');
    $out['reachable'] = false;
  }
}
echo json_encode($out, JSON_UNESCAPED_UNICODE);
