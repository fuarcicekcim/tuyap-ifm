# Supabase bağlantısı — C aşaması

Bu dosya kurulum planıdır; hesabın/projenin hazır olduğunu veya SQL'in çalıştırıldığını göstermez. Mevcut katalog ve fuar dosyaları ana kaynak olarak kalır. Bağlantı varsayılan olarak kapalıdır.

## Kurulum sırası

1. Supabase hesabına giriş yapın; Fuar Çiçekçim organizasyonu ve boş bir proje oluşturun. Plan ve ücret seçimini kendiniz gözden geçirin. Veritabanı şifresini parola yöneticinizde saklayın; sohbete göndermeyin.
2. SQL Editor'de `migrations/001_requests_and_access.sql` dosyasını inceleyip yeni projede bir kez çalıştırın. Bu SQL mevcut tabloları silmez; aynı adlı tablolar varsa durur. Hata olursa tabloları silerek tekrar denemeyin.
3. Authentication ayarlarında herkese açık yeni kullanıcı kaydını kapatın. Authentication / Users üzerinden yönetici hesabınızı davet edin veya oluşturun. İlk parolanızı Supabase'in güvenli akışında belirleyin.

E-posta daveti/parola yenileme bağlantısını kullanmadan önce Authentication URL Configuration içindeki Site URL ve izin verilen dönüş adresleri gerçek alan adıyla ayarlanmalıdır. Mevcut panel e-posta/parolayla giriş yapar; davet bağlantısından ilk parola belirleme ve parola yenileme ekranı henüz uygulanmadı. Bu akış doğrulanmadan daveti çalışıyor saymayın; ilk kullanıcıyı dashboard üzerinden oluşturma seçeneği varsa parolayı orada kendiniz belirleyin.
4. Yönetici hesabının kullanıcı UUID'siyle aşağıdaki SQL'i çalıştırın. Yer tutucuyu kendi kullanıcınızın kimliğiyle değiştirin:

```sql
insert into public.fc_staff(user_id, role, active)
select id, 'owner', true from auth.users
where id = 'YONETICI_KULLANICI_UUID'::uuid;
```

Bu işlem diğer hesaplara rol vermez. `fc_staff` satırlarını istemci arayüzünden değiştirme izni yoktur.

5. Project URL ve **publishable** anahtarı yerel `site/.env.local` içine koyun; `.env.example` biçimini izleyin. Publishable anahtar herkese açık istemci kimliğidir; yetkiyi RLS ve giriş yapmış kullanıcı belirler. Eski `anon` anahtarı da desteklenir. `secret` / `service_role` tarayıcıya konmaz.
6. PHP sunucusunda aşağıdaki değerleri hosting ortam değişkenleriyle tanımlayın. Windows/IIS FastCGI üzerinde uygulamanın kökü `httpdocs` ise Plesk'te bununla aynı seviyedeki `fuar-private/server.env` dosyası da kullanılabilir. PHP site hesabı bu klasörü okuyabilmeli. Sunucu ortamında tanımlı değerler dosyadan önce gelir. Secret anahtarı yalnız bu sunucu ayarlarından birine girin.

```text
SUPABASE_ENABLED=false
SUPABASE_URL=https://PROJE.supabase.co
SUPABASE_PUBLISHABLE_KEY=YALNIZ_PUBLISHABLE_ANAHTAR
SUPABASE_SECRET_KEY=YALNIZ_SUNUCUDA_SAKLANAN_SECRET
```

7. Gerçek bağlantı testleri ve erişim kontrolleri geçtikten sonra PHP'de `SUPABASE_ENABLED=true`, istemci `.env.local` dosyasında `VITE_SUPABASE_ENABLED=true` yapılır. `npm run build` ile yeni statik dosyalar üretilir. Plesk'e yükleme ayrı yayın adımıdır. Yalnız tek bir admin dosyasını yüklemek yeterli değildir.

Sunucu PHP 8.1+ ile cURL ve mbstring uzantılarını desteklemelidir. Plesk'te Authorization başlığının PHP'ye ulaştığı ayrıca doğrulanır. Gerçek SMTP ve bağlantı gecikmesi ölçülmeden zaman aşımı davranışı tamamlanmış sayılmaz.

Windows/IIS üzerinde yeni katalog taslakları `fuar-private/katalog-taslak/`, yapılandırılmış e-posta yedekleri `fuar-private/teklif-yedek/` altında tutulur. Bu konumlar için siteye ait PHP hesabının yazma izni gerekir. Daha önceki `httpdocs/veri` kayıtları yerinde kalır. Onlar için mevcut IIS yapılandırmasında HTTP erişim engeli doğrulanır. Canlıya geçmeden önce mevcut `web.config` kuralları ile yeni koruma birleştirilir.

Kullanıcı JWT'sini doğrulayan Auth/katalog API yolu yalnız Project URL + Publishable key kullanır; bu yol Secret key gerektirmez. Müşteri talebini kaydeden service-only RPC yolunda Secret key zorunludur. Bu iki bağlantının hazır olması ayrı ayrı doğrulanır; yalnız Auth testi sipariş kaydının hazır olduğunu göstermez.

## Kontrol edilmesi gerekenler

- Yönetici giriş yapabilir; davetsiz veya `fc_staff` kaydı olmayan hesap paneli açamaz.
- Yanlış/sona ermiş JWT ile katalog taslağı okunamaz veya yazılamaz. Supabase etkinken eski ortak parola geçişi yoktur.
- Anon/public istemci talepleri okuyamaz ve intake RPC'sini doğrudan çağıramaz.
- Yetkili olmayan kullanıcının rol yükseltmesi ve tabloya doğrudan yazması reddedilir.
- Aynı gönderim kimliğiyle özdeş istek tek kayıt üretir; farklı içerik 409 verir.
- Müşteri isteğinin sunucuda hesaplanan özeti, katalog snapshotından ayrıdır. Katalog daha sonra değişse veya ürün kapanmış olsa da kaydedilmiş talebin aynı içerikle tekrarı ilk fiyatları korur; yeni talep güncel katalogla doğrulanır.
- Ürün adı, fiyat ve KDV sunucudaki katalogdan hesaplanır; istemci tutarı kullanılmaz.
- E-posta talep kaydından ayrı takip edilir. Belirsiz SMTP sonucu otomatik tekrar gönderilmez.
- Özgün logo hâlâ müşterinin tarayıcısındadır ve WhatsApp'a ayrıca eklenir. Veritabanındaki dosya adı, yüklenmiş dosya sayılmaz.

## Model ve kapsam

`fc_requests` gelen talebi saklar; onaylı satış veya ödeme değildir. Satır, teslimat ve şerit bilgilerinin tamamı ilişkilendirilir. `fc_request_events` kayıt/e-posta geçmişini tutar. Tutarlar kuruş cinsindedir. Kesinleşmemiş saat metni teslimat randevusuna çevrilmez.

Teslimat günü ISO tarih olarak, görünen Türkçe etiketi de özgün payload içinde saklanır. "Diğer" gün seçimi ve notlar korunur. KVKK onayı sunucuda zorunludur ve kaydedilmiş payload'a işlenir.

RLS bütün yeni tablolarda açıktır. Yönetici ve operatör talep okuyabilir; kurye yalnız kendisine atanmış teslimat satırını okuyabilir. C aşamasında doğrudan istemci yazma izni yoktur. Sipariş onayı, kurye ataması, durum değişiklikleri ve raporlar D–F aşamalarında ele alınır.

`fc-order-assets` özel kovası hazırlanır; istemciden yükleme izni henüz açılmaz. SQL boş projenin dışında çalıştırılmadan önce mevcut nesneler değerlendirilmelidir.

## Geri alma

Bağlantıyı etkinleştirmeden önce mevcut dağıtımı koruyun. Uygulama hatasında özellik bayraklarını kapatmak müşteri kayıtlarını silmez. Mevcut veritabanı tablolarını veya saklanmış talepleri silen bir rollback betiği yoktur. Bağlantıyı kapatınca yeni talepler eski PHP e-posta akışına döner; daha önce kaydedilmiş bir talebi manuel yeniden göndermeden önce kayıt/e-posta durumunu kontrol edin.

## Resmî dayanaklar

- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- https://supabase.com/docs/guides/storage/buckets/fundamentals
