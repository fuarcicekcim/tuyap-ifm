// Sitenin tek ayar dosyası: teslimat vaadi, iletişim, fuar günleri ve KDV buradan yönetilir.
// Hem derleme betiği (scripts/generate.mjs) hem tarayıcı kodu bu dosyayı okur. Gizli bilgi yazmayın.

export const SITE = {
  name: 'Fuar Çiçekçim',
  url: 'https://www.fuarcicekcim.com',
  locale: 'tr_TR',
  // Bu alanlar Google İşletme Profili ile birebir aynı olmalı (NAP tutarlılığı).
  // Adres (Türkçe posta biçimi): "Gökevler Mah. 564. Sk. Bahçeşehir Sitesi No:10/A, 34522 Esenyurt/İstanbul".
  // Mahalle, sokak, kapı numarası (Bahçeşehir Sitesi içinde No:10/A) ve posta kodunu (34522) kullanıcı bildirdi (2026-11-17/18);
  // önceki 34500, Google Haritalar kaydından alınmıştı ve yanlıştı. Kullanıcı Google İşletme Profili'ne aynı adresi girdi (2026-11-18).
  // Google adresi görüntülerken kendi biçimine çevirebilir; profilde farklı görünürse site yazımı birebir eşitlenmeli (NAP tutarlılığı).
  // Adres sitede görünür (kullanıcı kararı, 2026-11-17): altbilgi, iletişim sayfası, KVKK ve JSON-LD.
  // Çalışma saatleri: 7/24 (kullanıcı doğruladı, 2026-11-17); JSON-LD'de her gün 00:00–23:59 olarak yazılır (scripts/lib/seo.mjs).
  address: {
    street: 'Gökevler Mah. 564. Sk. Bahçeşehir Sitesi No:10/A',
    district: 'Esenyurt',
    city: 'İstanbul',
    postalCode: '34522',
    country: 'TR',
  },
  // Tek satır adres, Google'daki biçimde. Şablonlar bunu kullanır (SITE.addressLine); sokak boşsa yalnızca ilçe ve şehir döner.
  get addressLine() {
    const a = this.address;
    return a.street ? `${a.street}, ${a.postalCode} ${a.district}/${a.city}` : `${a.district}, ${a.city}`;
  },
};

export const CONTACT = {
  phoneDisplay: '0547 567 04 06',
  phoneE164: '+905475670406',
  whatsapp: '905475670406',
  email: 'fuarcicekcim@gmail.com',
  instagram: 'https://www.instagram.com/fuarcicekcim/',
  // Google Haritalar paylaşım bağlantısı (kullanıcı verdi, 2026-11-17): işletmenin Haritalar sayfasını açar (konum, yol tarifi).
  // Boşsa sağ alttaki yüzen kümede Haritalar düğmesi görünmez.
  // Başka bir bağlantıya geçmek için: Google Haritalar'da işletmeyi açın → Paylaş → Bağlantıyı kopyala (maps.app.goo.gl/…).
  // Adres sitede de görünür (2026-11-17 kararı); bu bağlantı altbilgide, iletişim sayfasında ve JSON-LD'de (hasMap) kullanılır.
  maps: 'https://maps.app.goo.gl/rzFAQGbV2MHwvH5s6',
};

export const DELIVERY = {
  minutes: 60,
  promise: '60 dakikada standa teslim',
  promiseLong: 'TÜYAP ve İFM’de sipariş onayından itibaren 60 dakikada standa teslim',
  condition: 'Süre sipariş onayından başlar; ürünün stokta ve fuar girişinin uygun olması gerekir.',
};

export const PRICING = {
  vatRate: 20,
  priceBasis: 'KDV hariç',
  deliveryIncluded: 'TÜYAP ve İFM’ye standa teslimat fiyata dahildir.',
  paymentNote: 'Ödeme WhatsApp’ta onaylanır.',
};

export const VENUES = [
  { id: 'tuyap', name: 'TÜYAP Fuar ve Kongre Merkezi', short: 'TÜYAP', district: 'Büyükçekmece', page: '/tuyap-fuar-cicekcisi.html' },
  { id: 'ifm', name: 'İstanbul Fuar Merkezi (İFM)', short: 'İFM', district: 'Yeşilköy', page: '/ifm-fuar-cicekcisi.html' },
];

export const FAIR_DAYS = {
  activeFairName: 'Avrasya Pencere, Kapı ve Cam Fuarları',
  activeFairVenue: 'tuyap',
  activeFairPage: '/tuyap-avrasya-pencere-kapi-cam-2026.html',
  days: ['2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24'],
  timeSlots: ['08:00–10:00', '10:00–12:00', '12:00–14:00', '14:00–16:00', '16:00–18:00'],
};

export const RIBBON = {
  maxChars: 40,
};

export const ANALYTICS = {
  // Boş bırakılan kimlik için hiçbir Google etiketi yüklenmez; site yine sorunsuz çalışır.
  // GA4 ölçüm kimliği: Google Analytics → Yönetici → Veri akışları → "G-XXXXXXXXXX".
  ga4Id: '',
  // Google Ads etiket kimliği: Google Ads → Hedefler → Dönüşümler → etiket kurulumu → "AW-XXXXXXXXXX".
  adsId: '',
  // Her dönüşüm işleminin etiketi (send_to'daki "/" işaretinden sonraki kısım, ör. "AbC1dEfGhIjK").
  // Etiketi boş olan işlem Google Ads'e dönüşüm olarak gönderilmez (GA4'e olay olarak yine gider).
  conversions: {
    order_submit: '', // Sipariş gönderimi (sepet tutarı, KDV dahil, TRY)
    whatsapp_click: '', // Herhangi bir WhatsApp butonuna tıklama
    phone_click: '', // Telefon numarasına tıklama
    corporate_quote_submit: '', // Kurumsal teklif formunun gönderilmesi
  },
};
