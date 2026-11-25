<?php
declare(strict_types=1);

require_once __DIR__ . '/supabase-bridge.php';

const FC_PLACES_DAILY_LIMIT = 300;

function fc_places_api_key(string $privateDir): string
{
    $candidate = $privateDir . DIRECTORY_SEPARATOR . 'places-autocomplete-key.txt';
    $file = @realpath($candidate);
    if (!is_string($file) || !@is_file($file) || @is_link($candidate)
        || fc_private_path_key($file) !== fc_private_path_key($candidate)) {
        throw new RuntimeException('Adres önerileri anahtarı hazır değil.');
    }

    $contents = @file_get_contents($file, false, null, 0, 257);
    if (!is_string($contents) || strlen($contents) > 256) {
        throw new RuntimeException('Adres önerileri anahtarı okunamadı.');
    }

    $key = trim(preg_replace('/^\xEF\xBB\xBF/', '', $contents));
    if (!preg_match('/\A[A-Za-z0-9_-]{20,128}\z/', $key)) {
        throw new RuntimeException('Adres önerileri anahtarı geçersiz.');
    }

    return $key;
}

function fc_places_reserve_request(string $privateDir, ?DateTimeImmutable $now = null): bool
{
    $istanbul = new DateTimeZone('Europe/Istanbul');
    $day = ($now ?? new DateTimeImmutable())->setTimezone($istanbul)->format('Y-m-d');
    $path = $privateDir . DIRECTORY_SEPARATOR . "places-autocomplete-$day.quota";

    if (@is_link($path)) {
        throw new RuntimeException('Adres önerileri sayacı doğrulanamadı.');
    }

    $file = @fopen($path, 'ab+');
    if ($file === false) {
        throw new RuntimeException('Adres önerileri sayacı açılamadı.');
    }

    try {
        if (!@flock($file, LOCK_EX)) {
            throw new RuntimeException('Adres önerileri sayacı kilitlenemedi.');
        }

        clearstatcache(true, $path);
        $real = @realpath($path);
        if (!is_string($real) || !@is_file($real) || @is_link($path)
            || fc_private_path_key($real) !== fc_private_path_key($path)) {
            throw new RuntimeException('Adres önerileri sayacı doğrulanamadı.');
        }

        // Her Google çağrısı, ağ isteğinden önce bu kilidin altında bir bayt ayırır.
        $entries = @stream_get_contents($file, FC_PLACES_DAILY_LIMIT + 1, 0);
        if (!is_string($entries) || strspn($entries, '1') !== strlen($entries)) {
            throw new RuntimeException('Adres önerileri sayacı okunamadı.');
        }

        if (strlen($entries) >= FC_PLACES_DAILY_LIMIT) {
            return false;
        }

        if (@fwrite($file, '1') !== 1 || !@fflush($file) || !@fsync($file)) {
            throw new RuntimeException('Adres önerileri sayacı yazılamadı.');
        }

        return true;
    } finally {
        fclose($file);
    }
}

function fc_places_suggestions(string $input, string $key): array
{
    $request = json_encode([
        'input' => $input,
        'languageCode' => 'tr',
        'includedRegionCodes' => ['tr'],
        'includedPrimaryTypes' => ['street_address', 'premise', 'subpremise'],
    ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

    $handle = curl_init('https://places.googleapis.com/v1/places:autocomplete');
    if ($handle === false) {
        throw new RuntimeException('Adres önerileri bağlantısı kurulamadı.');
    }

    try {
        if (!curl_setopt_array($handle, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $request,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
                'X-Goog-Api-Key: ' . $key,
                'X-Goog-FieldMask: suggestions.placePrediction.text.text',
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_CONNECTTIMEOUT_MS => 1500,
            CURLOPT_TIMEOUT_MS => 4000,
        ])) {
            throw new RuntimeException('Adres önerileri bağlantısı hazırlanamadı.');
        }

        $body = @curl_exec($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE);
    } finally {
        curl_close($handle);
    }

    if (!is_string($body) || $status !== 200) {
        throw new RuntimeException('Adres önerileri alınamadı.');
    }

    $response = json_decode($body, true, 16, JSON_THROW_ON_ERROR);
    $predictions = $response['suggestions'] ?? [];
    if (!is_array($response) || !is_array($predictions)) {
        throw new RuntimeException('Adres önerileri yanıtı geçersiz.');
    }

    $suggestions = [];
    foreach (array_slice($predictions, 0, 5) as $prediction) {
        $text = $prediction['placePrediction']['text']['text'] ?? null;
        if (is_string($text) && trim($text) !== '') {
            $suggestions[] = $text;
        }
    }
    return array_values(array_unique($suggestions));
}
