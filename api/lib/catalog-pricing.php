<?php
declare(strict_types=1);

function fc_pricing_money(mixed $value): bool {
  return (is_int($value) || is_float($value)) && is_finite((float) $value)
    && $value >= 0 && $value <= 1000000000
    && abs($value * 100 - round($value * 100)) <= 0.0001;
}

function fc_pricing_date(mixed $value): bool {
  return is_string($value) && preg_match('/^([1-9]\d{3})-(\d{2})-(\d{2})$/D', $value, $parts) === 1
    && checkdate((int) $parts[2], (int) $parts[3], (int) $parts[1]);
}

function fc_pricing_cart_validate(mixed $campaign): string {
  if ($campaign === null) return '';
  if (!is_array($campaign) || array_is_list($campaign) || count($campaign) !== 2
      || array_diff(array_keys($campaign), ['startsOn','endsOn'])
      || !fc_pricing_date($campaign['startsOn'] ?? null) || !fc_pricing_date($campaign['endsOn'] ?? null)
      || $campaign['startsOn'] > $campaign['endsOn']) return 'Sepet indirimi için geçerli ve sıralı başlangıç/bitiş tarihleri yazın.';
  return '';
}

function fc_pricing_cart_resolve(mixed $campaign, ?string $date = null): bool {
  if (fc_pricing_cart_validate($campaign) !== '') throw new InvalidArgumentException('Sepet indirimi doğrulanamadı.');
  $date ??= (new DateTimeImmutable('now', new DateTimeZone('Europe/Istanbul')))->format('Y-m-d');
  if (!fc_pricing_date($date)) throw new InvalidArgumentException('Fiyat tarihi geçersiz.');
  return $campaign !== null && $campaign['startsOn'] <= $date && $date <= $campaign['endsOn'];
}

function fc_pricing_validate(array $product): string {
  if (!array_key_exists('discount', $product) || $product['discount'] === null) return '';
  $discount = $product['discount'];
  if (!is_array($discount) || array_is_list($discount)
      || array_diff(array_keys($discount), ['price','previousPrice','startsOn','endsOn'])
      || count($discount) !== 4) return 'İndirim alanlarını kontrol edin.';
  if (!fc_pricing_money($product['price'] ?? null) || !fc_pricing_money($discount['price'] ?? null)
      || !fc_pricing_money($discount['previousPrice'] ?? null)
      || round($discount['price'] * 100) >= round($discount['previousPrice'] * 100)
      || round($discount['previousPrice'] * 100) > round($product['price'] * 100)) {
    return 'İndirimli fiyat önceki fiyattan düşük, önceki fiyat ürün fiyatından yüksek olmamalı; fiyatlar en fazla iki ondalıklı sayı olmalı.';
  }
  if (!fc_pricing_date($discount['startsOn'] ?? null) || !fc_pricing_date($discount['endsOn'] ?? null)
      || $discount['startsOn'] > $discount['endsOn']) return 'İndirim için geçerli ve sıralı başlangıç/bitiş tarihleri yazın.';
  return '';
}

function fc_pricing_resolve(array $product, ?string $date = null): array {
  if (!fc_pricing_money($product['price'] ?? null) || fc_pricing_validate($product) !== '') throw new InvalidArgumentException('Ürün fiyatı doğrulanamadı.');
  $date ??= (new DateTimeImmutable('now', new DateTimeZone('Europe/Istanbul')))->format('Y-m-d');
  if (!fc_pricing_date($date)) throw new InvalidArgumentException('Fiyat tarihi geçersiz.');
  $discount = $product['discount'] ?? null;
  if (($product['active'] ?? true) !== false && $discount !== null && $date >= $discount['startsOn'] && $date <= $discount['endsOn']) {
    return ['price'=>$discount['price'],'previousPrice'=>$discount['previousPrice'],'discount'=>$discount];
  }
  return ['price'=>$product['price'],'previousPrice'=>null,'discount'=>null];
}
