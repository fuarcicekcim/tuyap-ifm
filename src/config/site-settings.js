// Sitenin tek ayar dosyası: teslimat vaadi, iletişim, fuar günleri ve KDV buradan yönetilir.
// Hem derleme betiği (scripts/generate.mjs) hem tarayıcı kodu bu dosyayı okur. Gizli bilgi yazmayın.

export const SITE = {
  name: 'Fuar Çiçekçim',
  url: 'https://www.fuarcicekcim.com',
  locale: 'tr_TR',
  // Bu alanlar Google İşletme Profili ile birebir aynı olmalı (NAP tutarlılığı).
  // Tam adres ve çalışma saatleri kullanıcıdan alınınca doldurulacak.
  address: {
    street: '',
    district: 'Esenyurt',
    city: 'İstanbul',
    postalCode: '',
    country: 'TR',
  },
  openingHours: null,
};

export const CONTACT = {
  phoneDisplay: '0547 567 04 06',
  phoneE164: '+905475670406',
  whatsapp: '905475670406',
  email: 'fuarcicekcim@gmail.com',
  instagram: 'https://www.instagram.com/fuarcicekcim/',
  // Google İşletme Profili paylaşım bağlantısı (kullanıcı verdi, 2026-11-17): "Fuar Çiçekçim" profil kartını açar
  // (haritada konum, yol tarifi). Boşsa sağ alttaki yüzen kümede Haritalar düğmesi görünmez.
  // Başka bir bağlantıya geçmek için: Google Haritalar'da işletmeyi açın → Paylaş → Bağlantıyı kopyala.
  // Adres gizli (hizmet bölgesi işletmesi) olduğundan sokak adresi yazılmaz; yalnızca profil bağlantısı konur.
  maps: 'https://share.google/vNIds6xncCeRpxJdX',
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
