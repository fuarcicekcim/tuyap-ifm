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

// Hol/stant numarasını bilmeyen müşteriler için sipariş çekmecesinde gösterilen resmî katılımcı listesi bağlantıları.
// Adresler organizatör sitelerinden alındı ve 21 Kasım 2026'da açıldığı doğrulandı; listede her firma için "Salon" (hol) ve
// "Stant" yazar. Fuar adı `match` sözcüklerinden birini (küçük harfle) içeriyorsa o fuarın listesi gösterilir; eşleşme yoksa
// seçili fuar merkezinin resmî fuar takvimine gidilir. Yeni fuar için `fairs` listesine bir satır ekleyin.
export const PARTICIPANT_LISTS = {
  fairs: [
    {
      id: 'avrasya',
      match: ['pencere', 'avrasya cam', 'avrasya kapı'],
      text: 'Fuarın resmî katılımcı listesinde firmanızı aratın. Hol, listede “Salon” olarak yazar.',
      links: [
        { label: 'Pencere & Kapı fuarı', href: 'https://www.avrasyapencerekapifuari.com/katilimci-listesi' },
        { label: 'Cam fuarı', href: 'https://avrasyacamfuari.com/katilimci-listesi' },
      ],
    },
  ],
  venues: [
    { venue: 'tuyap', text: 'Fuarınızı takvimden seçin; fuarın sayfasındaki katılımcı listesinde firmanızı bulabilirsiniz.', label: 'TÜYAP fuar takvimi', href: 'https://tuyap.com.tr/fuar-takvimi' },
    { venue: 'ifm', text: 'Fuarınızı takvimden seçin; fuarın sayfasındaki katılımcı listesinde firmanızı bulabilirsiniz.', label: 'İFM fuar takvimi', href: 'https://ifm.com.tr/tr/ifm-fuar-takvimi' },
  ],
};

export const ANALYTICS = {
  // Veri çıkarma (text) önizlemesi ve kaydı 18 Kasım 2026'da kullanıcıyla doğrulandı.
  // Yalnızca gerçek site alan adlarında çalışır; yerel önizlemeler ölçüme dahil edilmez.
  enabled: true,
  // Boş bırakılan kimlik için hiçbir Google etiketi yüklenmez; site yine sorunsuz çalışır.
  // GA4 ölçüm kimliği: Google Analytics → Yönetici → Veri akışları → "G-XXXXXXXXXX".
  ga4Id: 'G-M6JLD9BHE0',
  // Google Ads etiket kimliği: Google Ads → Hedefler → Dönüşümler → etiket kurulumu → "AW-XXXXXXXXXX".
  // 21 Kasım 2026: kampanyaların bulunduğu Ads hesabının (fuarcicekcim@gmail.com, 500-387-9539) etiketi.
  // Not: aynı gün yanlışlıkla Onur ZORLU özel ders hesabının etiketi (AW-16549271570) kullanılmıştı; düzeltildi.
  adsId: 'AW-18577301598',
  // Her dönüşüm işleminin etiketi (send_to'daki "/" işaretinden sonraki kısım, ör. "AbC1dEfGhIjK").
  // Etiketi boş olan işlem Google Ads'e dönüşüm olarak gönderilmez (GA4'e olay olarak yine gider).
  conversions: {
    // Siparişler Ads'e GA4'ten aktarılır (Ads eylemi "Web Sitesi Sipariş Talebi" = GA4 olayı order_submit).
    // Burada etiket yazılırsa her sipariş iki kez sayılır; boş bırakın.
    order_submit: '',
    // WhatsApp ve telefon tıklaması için Ads'te henüz eylem yok; oluşturulunca etiketi buraya yazın.
    whatsapp_click: '',
    phone_click: '',
    corporate_quote_submit: '1wijCLjzkLwdEN7ArJpF', // Ads eylemi "Fiyat teklifi isteyin" (web sitesi etiketi)
  },
};
