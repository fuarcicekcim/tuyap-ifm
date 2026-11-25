<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/lib/supabase-bridge.php';
try {
  if (!fc_supabase_enabled()) throw new FcSupabaseError('Supabase sunucu bağlantısı henüz etkin değil.');
  $staff = fc_supabase_require_staff();
  echo json_encode(['ok'=>true,'enabled'=>true,'role'=>$staff['role']], JSON_UNESCAPED_UNICODE);
} catch (FcSupabaseError $error) {
  http_response_code($error->httpStatus);
  echo json_encode(['ok'=>false,'error'=>$error->getMessage()], JSON_UNESCAPED_UNICODE);
}
