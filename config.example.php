<?php
/*
  Fuar Çiçekçim — sunucu ayarları
  -------------------------------------------------------------
  Bu dosyayı cPanel File Manager'dan düzenleyin.
  ADMIN_SIFRE: admin.html'deki "Sunucuya yayınla" için gerekli şifre. Mutlaka değiştirin!
*/
return [
  // Teklif formunun gideceği adres(ler). Virgülle birden fazla yazabilirsiniz.
  'alici_eposta'   => 'fuarcicekcim@gmail.com',
  // Gönderen adresi: mutlaka kendi alan adınızdan olmalı (SPF/DKIM için). cPanel > E-posta Hesapları'ndan oluşturun.
  'gonderen_eposta'=> 'form@fuarcicekcim.com',
  'gonderen_ad'    => 'Fuar Çiçekçim Web',
  // İsteğe bağlı SMTP (cPanel e-posta hesabı). Boş bırakılırsa PHP mail() kullanılır.
  'smtp_host'      => '',           // örn. 'mail.fuarcicekcim.com'
  'smtp_port'      => 465,
  'smtp_kullanici' => '',           // örn. 'form@fuarcicekcim.com'
  'smtp_sifre'     => '',
  // Admin panelinden katalogu sunucuya yazmak için şifre (admin.html > Sunucuya yayınla)
  'admin_sifre'    => 'DEGISTIR-BENI-0406',
  // Gelen teklifleri ayrıca dosyaya kaydet (e-posta gelmezse yedek). Klasör: /veri/
  'teklifleri_kaydet' => true,
];
