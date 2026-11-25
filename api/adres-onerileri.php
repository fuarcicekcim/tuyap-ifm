<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/places-autocomplete.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function fc_places_respond(int $status, array $suggestions = []): never
{
    http_response_code($status);
    echo json_encode(['suggestions' => $suggestions], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    fc_places_respond(405);
}

$host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
$fetchSite = (string) ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '');
if (!in_array($host, ['www.fuarcicekcim.com', 'fuarcicekcim.com'], true)
    || $origin !== 'https://' . $host
    || ($fetchSite !== '' && $fetchSite !== 'same-origin')) {
    fc_places_respond(403);
}

$contentType = (string) ($_SERVER['CONTENT_TYPE'] ?? '');
if (strtolower(trim(explode(';', $contentType, 2)[0])) !== 'application/json') {
    fc_places_respond(415);
}

$body = file_get_contents('php://input', false, null, 0, 1025);
if ($body === false || strlen($body) > 1024) {
    fc_places_respond(413);
}

try {
    $request = json_decode($body, true, 4, JSON_THROW_ON_ERROR);
} catch (JsonException) {
    fc_places_respond(400);
}

$input = $request['input'] ?? null;
if (!is_string($input) || count($request) !== 1 || preg_match('/[\p{Cc}\p{Cf}]/u', $input)) {
    fc_places_respond(400);
}

$input = trim(preg_replace('/\p{Z}+/u', ' ', $input));
if (!preg_match('/\A.{3,120}\z/u', $input) || !preg_match('/[\p{L}\p{N}]/u', $input)) {
    fc_places_respond(400);
}

try {
    $privateDir = fc_iis_private_dir();
    if ($privateDir === null || !function_exists('curl_init')) {
        fc_places_respond(503);
    }

    $key = fc_places_api_key($privateDir);
    if (!fc_places_reserve_request($privateDir)) {
        fc_places_respond(429);
    }

    fc_places_respond(200, fc_places_suggestions($input, $key));
} catch (Throwable) {
    fc_places_respond(503);
}
