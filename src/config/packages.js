// Fuar paketleri — tek ayar dosyası.
// Kural (kullanıcı kararı 2026-11-16): paket fiyatı, içindeki ürünlerin products-data.js'teki
// güncel fiyatlarının toplamıdır (indirim yok). Ürünler standa bir kez kurulur.
// Paket fiyatı burada yazılmaz; derlemede ve tarayıcıdaki fiyat tazelemede otomatik hesaplanır.
// items: [ürün kimliği, adet] — kimlikler products-data.js ile birebir aynı olmalıdır.

export const PACKAGES = [
  {
    id: 'karsilama',
    name: 'Karşılama Paketi',
    fit: 'Kompakt standlar ve tek karşılama bankosu için',
    lead: 'Bankoya şeritli orkide, masaya taze aranjman, köşeye az bakım isteyen bir bitki.',
    items: [
      ['iki-dalli-beyaz-orkide', 1],
      ['kirmizi-gul-beyaz-gerbera', 1],
      ['sansevieria', 1],
    ],
  },
  {
    id: 'stant',
    name: 'Stant Paketi',
    fit: 'Orta büyüklükte standlar ve görüşme alanı olan firmalar için',
    lead: 'Karşılama bankosunda dört dallı orkide; görüşme alanını ve köşeleri yeşillendiren iki büyük bitki ve masa aranjmanı.',
    recommended: true,
    items: [
      ['dort-dalli-beyaz-orkide', 1],
      ['areka', 1],
      ['seflera-buyuk', 1],
      ['kirmizi-gul-beyaz-gerbera', 1],
    ],
  },
  {
    id: 'prestij',
    name: 'Prestij Stant Paketi',
    fit: 'Ada standlar, VIP alanlar ve marka lansmanları için',
    lead: 'Sekiz dallı seramik orkideyle başlayan, üç büyük bitki ve kutuda orkide-gül aranjmanıyla tamamlanan tam stant düzeni.',
    items: [
      ['sekiz-dalli-beyaz-orkide', 1],
      ['yucca-buyuk', 1],
      ['areka', 1],
      ['ficus-lyrata', 1],
      ['kutuda-beyaz-orkide-iki-renk-gul', 1],
    ],
  },
  {
    id: 'tebrik',
    name: 'Açılış Tebrik Paketi',
    fit: 'Bayilerinizin ve iş ortaklarınızın standına tebrik göndermek için',
    lead: 'Fuarın ilk sabahı göz önünde duran ayaklı ferforje ve bankoya şeritli orkide; ikisinde de firmanızın adı.',
    items: [
      ['beyaz-lilyum-prestij-ferforje', 1],
      ['dort-dalli-beyaz-orkide', 1],
    ],
  },
];
