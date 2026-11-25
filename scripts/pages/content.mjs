import { SITE, CONTACT, DELIVERY, PRICING, VENUES, FAIR_DAYS } from '../../src/config/site-settings.js';
import { esc, icon, trRange } from '../lib/html.mjs';
import { page, waLink } from '../lib/layout.mjs';
import { graph, businessNode, breadcrumbNode, faqNode, abs } from '../lib/seo.mjs';
import { pageHero, facts, prose, orderAside, productStrip, faqBlock, fairList, ctaBand } from '../lib/blocks.mjs';
import { CATEGORIES, categoryDisplayOrder } from '../lib/catalog.mjs';

const TUYAP = VENUES.find((v) => v.id === 'tuyap');
const IFM = VENUES.find((v) => v.id === 'ifm');
const M = DELIVERY.minutes;

// Her kategoriden en premium iki ürün: "en çok satan" iddiası olmadan öneri.
export const picks = (catalog, per = 2) => CATEGORIES.flatMap((c) => catalog.products.filter((p) => p.category === c.id).slice(0, per));

// Avrasya fuar sayfası şeridi: yalnızca en pahalılar art arda dizilmesin diye kurumsal standlara yakışan premium ürünler,
// "En çok satan" etiketliler ve uygun fiyatlılar aralarına serpiştirilir (B = en çok satan, P = premium, A = uygun).
// Havuzlar katalog verisinden çıkar: sıralama/etiket/fiyat değişince derlemede kendiliğinden güncellenir.
const AVRASYA_PATTERN = ['B', 'P', 'A', 'B', 'P', 'B', 'A', 'P', 'B', 'A', 'P', 'B'];
export function avrasyaPicks(catalog, pattern = AVRASYA_PATTERN) {
  const sellable = catalog.products.filter((p) => p.active !== false && p.inStock !== false);
  const best = sellable.filter((p) => p.badgeId === 'best-seller').sort((a, b) => (a.bestsellerRank ?? 99) - (b.bestsellerRank ?? 99));
  const rest = sellable.filter((p) => !best.includes(p));
  const premium = rest.filter((p) => p.price >= 7000 && ['ferforje', 'wreaths', 'orchids'].includes(p.category)).sort((a, b) => b.price - a.price);
  // Uygun fiyatlılar: kategorilere dağılsın (orkide, çelenk, aranjman) ve her kategoride en uygun fiyatlı önce gelsin.
  const cheap = ['orchids', 'wreaths', 'arrangements'].map((c) => rest.filter((p) => p.category === c && p.price <= 4300).sort((a, b) => a.price - b.price));
  const affordable = Array.from({ length: Math.max(...cheap.map((l) => l.length)) }, (_, i) => cheap.map((l) => l[i])).flat().filter(Boolean);
  const pools = { B: best, P: premium, A: affordable };
  const picked = [];
  for (const slot of pattern) {
    const next = pools[slot].find((p) => !picked.includes(p));
    if (next) picked.push(next);
  }
  // Bir havuz yetmezse kalan yerler diğer ürünlerle (pahalıdan ucuza) tamamlanır.
  for (const p of rest) if (picked.length < pattern.length && !picked.includes(p)) picked.push(p);
  return picked;
}

const webPage = (path, name, description) => ({ '@type': 'WebPage', '@id': abs(path), url: abs(path), name, description, inLanguage: 'tr-TR', isPartOf: { '@id': `${SITE.url}/#site` }, about: { '@id': `${SITE.url}/#isletme` } });

function landing({ path, title, description, crumbs, hero, factsList, sections, aside, featured, strip, fairs, faq, cta, drawerDefaults }) {
  return page({
    path, title, description, drawerDefaults,
    jsonld: graph(businessNode(), webPage(path, title, description), breadcrumbNode(crumbs), faq && faqNode(faq)),
    body: pageHero({ ...hero, crumbs }) + (factsList ? facts(factsList) : '') + (featured || '') + prose(sections, aside ?? orderAside()) + (strip || '') + (fairs || '') + (faq ? faqBlock(faq) : '') + ctaBand(cta),
  });
}

/* ---------------- TÜYAP ---------------- */
const TUYAP_CATALOG = 'tuyap-urunler';

function tuyapProducts(catalog) {
  const available = categoryDisplayOrder(catalog.products.filter((p) => p.inStock !== false));
  return ['orchids', 'wreaths', 'plants', 'ferforje'].map((category) => available.find((p) => p.category === category)).filter(Boolean);
}
export function tuyap(catalog, fairData) {
  const faq = [
    ['TÜYAP’a çiçek göndermek için hangi bilgiler gerekir?', 'Fuar adı, salon ve stant numarası, teslim alacak firma ve bir telefon numarası yeterlidir. Şerit yazısını da siparişte belirtirsiniz.'],
    ['TÜYAP’a çiçek ne kadar sürede ulaşır?', `Sipariş onayından itibaren ${M} dakikada standa teslim ederiz. Süre onaydan başlar; ürünün stokta ve fuar girişinin uygun olması gerekir. Esenyurt’tan TÜYAP’a yol süremiz yaklaşık 5 dakikadır.`],
    ['Kurulum gününde teslimat yapıyor musunuz?', 'Evet. Fuar açılışından önceki kurulum gününde veya açılış sabahı standa teslim edebiliriz; saat aralığını siparişte seçersiniz.'],
    ['TÜYAP teslimatı için ayrıca ücret ödüyor muyum?', `Hayır. TÜYAP’a standa teslimat ürün fiyatına dahildir.`],
    ['Fuar boyunca çiçekler solarsa ne oluyor?', 'Fuar süresince solan çiçekleri değiştiriyoruz. WhatsApp hattından yazmanız yeterli.'],
    ['TÜYAP yakınındaki otellere de gönderiyor musunuz?', 'Evet. Fuar katılımcılarının konakladığı otellere karşılama çiçeği ve orkide gönderebiliyoruz; otel adı ve misafir adını yazın.'],
  ];
  const venueFairs = fairData.fairs.filter((f) => f.venue === 'tuyap' || f.venue === 'both');
  const next = venueFairs.find((f) => f.start > fairData.today);
  const products = tuyapProducts(catalog);
  const catalogAnchor = products.length ? TUYAP_CATALOG : undefined;
  return landing({
    path: TUYAP.page,
    title: 'TÜYAP Çiçekçi | TÜYAP Fuarına Çiçek Gönder – Fuar Çiçekçim',
    description: 'TÜYAP standına orkide, açılış çelengi veya saksı bitkisi gönderin. Ürünleri ve fiyatları inceleyin, salon ve stant numarasıyla sipariş verin.',
    drawerDefaults: { venue: TUYAP.id, fairName: '', days: null, catalogAnchor },
    crumbs: [['Ana sayfa', '/'], ['TÜYAP fuar çiçekçisi', TUYAP.page]],
    hero: {
      eyebrow: 'TÜYAP çiçekçi · Büyükçekmece',
      title: 'TÜYAP Fuarına <em>çiçek gönderin.</em>',
      lead: `Orkide, açılış çelengi veya saksı bitkisini seçin. Stok ve fuar girişi uygunsa sipariş onayından itibaren ${M} dakikada standa teslim ediyoruz.`,
      catalogAnchor,
      whatsappText: 'Merhaba, TÜYAP’ta bir standa çiçek göndermek istiyorum. Fuar adı, salon ve stant bilgilerini paylaşacağım.',
      image: '/assets/hero/tuyap-saksi-resmi-logo',
      imageAlt: 'TÜYAP’ta bir fuar standının önünde firma adlı şeritli saksı bitkisi',
    },
    factsList: [
      ['Teslimat ücreti', 'Fiyata dahil'],
      ['Teslim noktası', 'Salon ve stant numaranız'],
      ['Fotoğraflı onay', 'WhatsApp üzerinden'],
      next?.page
        ? ['Sıradaki TÜYAP fuarı', `<a href="${esc(next.page)}">${esc(next.name)} · ${esc(trRange([next.start, next.end]))}</a>`]
        : ['Fatura', 'Kurumsal e-Fatura'],
    ],
    sections: [
      { title: 'TÜYAP’a çiçek nasıl gönderilir?', html: `
        <p>TÜYAP’ta aynı günlerde birden fazla fuar ve onlarca salon olabilir. Siparişin doğru standa, doğru saatte ulaşması için bize dört bilgi yeter:</p>
        <ol><li><strong>Fuar adı</strong> — takvimde veya davetiyenizde yazan etkinliğin adı.</li><li><strong>Salon ve stant numarası</strong> — davetiyede veya katılımcı bilgilerinde yazar.</li><li><strong>Teslim alacak firma ve telefon</strong> — stantta ürünü teslim alacak kişi.</li><li><strong>Şerit yazısı</strong> — firma adınız ve kısa bir mesaj.</li></ol>
        <p>Bu bilgileri sipariş çekmecesine yazdığınızda, özetiniz WhatsApp’a düzenli bir mesaj olarak düşer; stok, saat ve ödemeyi aynı yazışmada netleştiririz.</p>` },
      { title: 'Ne zaman teslim edelim?', html: `
        <p><strong>Kurulum günü:</strong> Fuar açılışından önceki gün; çelenk ve büyük aranjmanlar standa yerleşmiş olur.</p>
        <p><strong>Açılış sabahı:</strong> İlk ziyaretçiler gelmeden önce; şeritli orkideler için en uygun an.</p>
        <p><strong>Fuar sırasında:</strong> İş ortağınızın standına tebrik veya kendi standınıza ek ürün; onaydan itibaren ${M} dakikada.</p>` },
      { title: 'TÜYAP standları için ne seçmeli?', html: `
        <p>Stant girişinde dikkat çekmek için <a href="/kategori/acilis-fuar-celengi.html">açılış ve fuar çelengi</a>, karşılama bankosu ve iş ortaklarına tebrik için <a href="/kategori/vip-orkide.html">VIP orkide</a>, toplantı masaları için <a href="/kategori/stant-aranjmani.html">stant aranjmanı</a>, boş köşeleri yeşillendirmek için <a href="/kategori/saksi-bitkisi.html">saksı bitkisi</a> öneriyoruz. Saksı bitkileri fuar süresince kiralanabilir.</p>
        <p>Şeride firma logonuzu bastırabilir, yazıyı Türkçe, İngilizce veya iki dilli hazırlatabilirsiniz. Örnekler için <a href="/blog/fuar-acilis-celengi-serit-yazisi-ornekleri.html">şerit yazısı örnekleri</a> rehberimize bakın.</p>` },
      { title: 'Fiyat, ödeme ve fatura', html: `
        <p>TÜYAP’a standa teslimat fiyata dahildir. Ödemeyi havale/EFT, kredi kartı veya teslimatta nakit olarak yapabilirsiniz; yöntem WhatsApp’ta netleşir. Firma bilgilerinize kurumsal e-Fatura düzenleriz. Ayrıntılı liste: <a href="/blog/fuar-cicegi-fiyatlari-2026.html">fuar çiçeği fiyat rehberi</a>.</p>` },
    ],
    featured: catalogAnchor && productStrip(products, { id: catalogAnchor, title: 'TÜYAP standları için <em>çiçekler.</em>' }),
    fairs: fairList(venueFairs, fairData.venues, { title: 'TÜYAP’ta yaklaşan <em>fuarlar.</em>' }),
    faq,
    cta: 'TÜYAP’taki fuarınız için <em>çiçekleri biz halledelim.</em>',
  });
}

/* ---------------- İFM ---------------- */
export function ifm(catalog, fairData) {
  const faq = [
    ['İFM’ye çiçek teslimatı ne kadar sürer?', `Sipariş onayından itibaren ${M} dakikada standa teslim ederiz. Süre onaydan başlar; ürünün stokta ve fuar girişinin uygun olması gerekir. Yoğun açılış günleri için bir gün önceden sipariş vermenizi öneririz.`],
    ['İFM’de teslimat için ne bilmem gerekiyor?', 'Fuar adı, salon ve stant kodunuz, teslim alacak firma ve telefon numarası yeterlidir.'],
    ['Yabancı katılımcılar için İngilizce şerit yazabilir misiniz?', 'Evet. Şerit yazısını Türkçe, İngilizce veya iki dilli hazırlıyoruz; firma logonuzu da şeride bastırabiliriz.'],
    ['İFM teslimatı ücretli mi?', `Hayır. İFM’ye standa teslimat ürün fiyatına dahildir; kurumsal e-Fatura düzenlenir.`],
    ['Misafirimizin oteline çiçek gönderebilir misiniz?', 'Evet. Fuar katılımcılarının konakladığı otellere karşılama çiçeği ve orkide gönderebiliyoruz.'],
    ['Birden fazla standa aynı gün gönderim yapabilir misiniz?', 'Evet. Bayi ve iş ortaklarınızın standlarına aynı gün birden fazla ürün gönderebilir, tümü için tek kurumsal e-Fatura alabilirsiniz.'],
  ];
  const venueFairs = fairData.fairs.filter((f) => f.venue === 'ifm' || f.venue === 'both');
  return landing({
    path: IFM.page,
    title: 'İFM Çiçekçi | İstanbul Fuar Merkezi’ne Çiçek – Fuar Çiçekçim',
    description: `İstanbul Fuar Merkezi (İFM) standlarına şeritli orkide, açılış çelengi ve stant aranjmanı. ${DELIVERY.promise}, İngilizce şerit, e-Fatura.`,
    crumbs: [['Ana sayfa', '/'], ['İFM fuar çiçekçisi', IFM.page]],
    hero: {
      eyebrow: 'İFM çiçekçi · Yeşilköy',
      title: 'İstanbul Fuar Merkezi’nde <em>dilediğiniz standa.</em>',
      lead: `İFM’de dilediğiniz standa, salon ve stant numarasına şeritli orkide, açılış çelengi ve stant aranjmanını sipariş onayından itibaren ${M} dakikada teslim ediyoruz. Uluslararası katılımcılar için şerit yazısı İngilizce veya iki dilli hazırlanır.`,
      image: '/assets/hero/ifm-ferforje',
      imageAlt: 'İstanbul Fuar Merkezi’nde bir standın önünde beyaz çiçekli ayaklı ferforje aranjman',
    },
    factsList: [
      ['Teslimat', `Onaydan itibaren ${M} dk`],
      ['Şerit dili', 'Türkçe · İngilizce · iki dilli'],
      ['Teslim noktası', 'Salon ve stant kodunuz'],
      ['Fatura', 'Kurumsal e-Fatura'],
    ],
    sections: [
      { title: 'İFM’ye çiçek göndermenin kolay yolu', html: `
        <p>İstanbul Fuar Merkezi, Yeşilköy’de çok salonlu bir fuar alanıdır; aynı anda birden fazla uluslararası fuar düzenlenebilir. Siparişin doğru standa ulaşması için <strong>fuar adı, salon ve stant kodu</strong>, <strong>teslim alacak firma</strong> ve <strong>telefon</strong> bilgisini paylaşmanız yeterli.</p>
        <p>Ürün hazırlandığında ve standa yerleştirildiğinde fotoğrafını WhatsApp’tan gönderiyoruz; böylece teslimatı uzaktan da takip edebilirsiniz.</p>` },
      { title: 'Uluslararası fuarlar için şerit ve kart', html: `
        <p>İFM’deki fuarlarda yabancı katılımcı oranı yüksektir. Şerit yazısını İngilizce (“Wishing you a successful fair”) veya iki dilli (“İyi fuarlar · Have a great fair”) hazırlayabilir, firma logonuzu şeride bastırabiliriz. Daha fazla örnek: <a href="/blog/fuar-acilis-celengi-serit-yazisi-ornekleri.html">şerit yazısı örnekleri</a>.</p>` },
      { title: 'Bayi ve iş ortağı tebrikleri', html: `
        <p>Fuar boyunca birden fazla iş ortağınızın standına tebrik göndermek istiyorsanız ürünleri tek siparişte toplayın; sepette her ürünün altına ayrı salon, stant, teslim alacak firma ve şerit yazısı girebilirsiniz. Tümü için tek kurumsal e-Fatura düzenlenir. Kalabalık siparişler için <a href="/teklif.html">kurumsal teklif</a> formunu da kullanabilirsiniz.</p>` },
      { title: 'Fiyat, ödeme ve fatura', html: `
        <p>İFM’ye standa teslimat fiyata dahildir. Ödeme havale/EFT, kredi kartı veya teslimatta nakit olarak yapılabilir. Güncel fiyatlar için <a href="/blog/fuar-cicegi-fiyatlari-2026.html">fiyat rehberine</a> bakın.</p>` },
    ],
    strip: productStrip(picks(catalog), { title: 'İFM standları için <em>öneriler.</em>' }),
    fairs: fairList(venueFairs, fairData.venues, { title: 'İFM’de yaklaşan <em>fuarlar.</em>' }),
    faq,
    cta: 'İFM’deki fuarınız için <em>çiçekleri biz halledelim.</em>',
  });
}

/* ---------------- Fuar çiçekçisi / en yakın ---------------- */
export function fuarCicekcisi(catalog, fairData) {
  const path = '/fuar-cicekcisi.html';
  const faq = [
    ['Size en yakın fuar merkezi hangisi?', 'Esenyurt’tan çalışıyoruz; TÜYAP Fuar ve Kongre Merkezi’ne yol süremiz yaklaşık 5 dakikadır. İstanbul Fuar Merkezi’ne (İFM) de standa teslimat yapıyoruz.'],
    ['Fuar çiçekçisi sıradan bir çiçekçiden neden farklı?', 'Fuar teslimatında stant numarası, kurulum günü, açılış saati ve şerit yazısı gibi ayrıntılar önemlidir. Sipariş sürecimiz bu bilgiler üzerine kurulu: salon ve stant numarasına teslim, fotoğraflı onay ve kurumsal e-Fatura.'],
    ['Gece veya hafta sonu sipariş verebilir miyim?', 'Evet. Sipariş hattımız 7/24 açıktır; WhatsApp’tan veya sitedeki sipariş çekmecesinden her saatte yazabilirsiniz.'],
    ['Hangi ödeme yöntemlerini kabul ediyorsunuz?', 'Havale/EFT, kredi kartı ve teslimatta nakit. Sitede online ödeme alınmaz; ödeme WhatsApp’ta netleşir.'],
    ['Fuar dışında lansman veya etkinlik süslemesi yapıyor musunuz?', 'Evet. Fuar içi lansman, kokteyl ve sahne çiçeklendirmesi için WhatsApp’tan veya kurumsal teklif formundan bilgi isteyebilirsiniz.'],
  ];
  return landing({
    path,
    title: 'Fuar Çiçekçi | En Yakın Fuar Çiçekçisi – Fuar Çiçekçim',
    description: `İstanbul’da fuar çiçekçisi: Esenyurt’tan TÜYAP’a 5 dakika, İFM’ye standa teslimat. Açılış çelengi, VIP orkide, stant aranjmanı; ${DELIVERY.promise}, 7/24 WhatsApp.`,
    crumbs: [['Ana sayfa', '/'], ['Fuar çiçekçisi', path]],
    hero: {
      eyebrow: 'Fuar çiçekçi · İstanbul',
      title: 'Fuar standlarına uzman, <em>size en yakın çiçekçi.</em>',
      lead: `Yalnızca fuar ve kurumsal etkinlikler için çalışıyoruz. Esenyurt’tan TÜYAP’a yaklaşık 5 dakikada, İFM’deki standlara ise sipariş onayından itibaren ${M} dakikada ulaşıyoruz.`,
    },
    factsList: [
      ['Konum', `${esc(SITE.address.district)}, ${esc(SITE.address.city)}`],
      ['TÜYAP’a', 'Yaklaşık 5 dakika'],
      ['Teslimat vaadi', esc(DELIVERY.promise)],
      ['Sipariş hattı', '7/24 WhatsApp'],
    ],
    sections: [
      { title: '“En yakın fuar çiçekçisi” ararken neye bakmalı?', html: `
        <p>Fuar sabahı yetişmesi gereken bir çelenk ya da iş ortağınızın standına gidecek bir orkide için yakınlık tek başına yetmez. Asıl önemli olan üç şeydir: <strong>standa teslim</strong> (fuar kapısına değil, salon ve stant numarasına), <strong>teyitli süre</strong> ve <strong>teslimatın kanıtı</strong>.</p>
        <p>Biz siparişi WhatsApp’ta yazılı onaylıyor, ${M} dakikalık süreyi onaydan itibaren başlatıyor ve teslimattan sonra ürünün standdaki fotoğrafını gönderiyoruz.</p>` },
      { title: 'TÜYAP ve İFM’de hizmet', html: `
        <p><a href="${TUYAP.page}">TÜYAP fuar çiçekçisi</a> sayfamızda Büyükçekmece’deki fuarlar için teslimat ayrıntılarını, <a href="${IFM.page}">İFM fuar çiçekçisi</a> sayfamızda Yeşilköy’deki İstanbul Fuar Merkezi için bilgileri bulabilirsiniz. Her iki fuar merkezinde de standa teslimat fiyata dahildir.</p>` },
      { title: 'Fuar boyunca yanınızdayız', html: `
        <ul><li>Kurulum gününde veya açılış sabahı teslimat</li><li>Fuar süresince solan çiçek değişimi</li><li>Saksı bitkilerinde fuar süresince kiralama seçeneği</li><li>Katılımcıların konakladığı otellere karşılama çiçeği</li><li>Şeride firma logosu; Türkçe, İngilizce veya iki dilli yazı</li></ul>` },
    ],
    strip: productStrip(picks(catalog), { title: 'Fuarda en çok <em>yakışanlar.</em>' }),
    fairs: fairList(fairData.fairs, fairData.venues, { limit: 6 }),
    faq,
  });
}

/* ---------------- Avrasya 2026 (fuara özel) ---------------- */
export function avrasya(catalog, fairData) {
  const path = '/tuyap-avrasya-pencere-kapi-cam-2026.html';
  const fair = fairData.fairs.find((f) => f.page === path) || { name: FAIR_DAYS.activeFairName, start: FAIR_DAYS.days[0], end: FAIR_DAYS.days.at(-1) };
  const range = `${trRange([fair.start, fair.end])} 2026`;
  const faq = [
    [`${fair.name} için hangi günlerde teslimat yapıyorsunuz?`, `Fuar günleri olan ${range} boyunca her gün teslimat yapıyoruz; fuar öncesi kurulum gününde de teslim edebiliriz.`],
    ['Teslimat ne kadar sürer?', `Sipariş onayından itibaren ${M} dakikada standa teslim ederiz. Süre onaydan başlar; ürünün stokta ve fuar girişinin uygun olması gerekir.`],
    ['Stant numaramı nereden öğrenebilirim?', 'Salon ve stant numarası fuar davetiyesinde veya organizatörün katılımcı bilgilerinde yer alır. Emin değilseniz siparişten önce WhatsApp’tan yazın, birlikte netleştirelim.'],
  ];
  return page({
    path,
    title: `${fair.name} 2026 · TÜYAP Çiçek`,
    description: `${range} ${fair.name} için TÜYAP’taki dilediğiniz standa orkide, çelenk ve aranjman. ${DELIVERY.promise}, fotoğraflı onay.`,
    jsonld: graph(
      businessNode(),
      { '@type': 'Event', name: fair.name, startDate: fair.start, endDate: fair.end, eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', eventStatus: 'https://schema.org/EventScheduled', location: { '@type': 'Place', name: TUYAP.name, address: { '@type': 'PostalAddress', addressLocality: 'Büyükçekmece', addressRegion: 'İstanbul', addressCountry: 'TR' } } },
      breadcrumbNode([['Ana sayfa', '/'], ['TÜYAP fuar çiçekçisi', TUYAP.page], [fair.name, path]]),
      faqNode(faq),
    ),
    body: pageHero({
      crumbs: [['Ana sayfa', '/'], ['TÜYAP', TUYAP.page], [fair.name, path]],
      eyebrow: `${range} · TÜYAP İstanbul`,
      title: `${esc(fair.name)} için <em>standınız hazır olsun.</em>`,
      lead: `Avrasya fuarlarında iş ortaklarınıza iyi fuarlar dileyin, kendi standınızı çiçeklerle karşılamaya hazırlayın. Siparişinizi salon ve stant numarasına göre ${M} dakikada teslim ediyoruz.`,
      image: '/assets/hero/tuyap-orkide',
      imageAlt: 'TÜYAP’ta stant bankosunda firma adlı şeritli beyaz orkide',
    })
      + facts([['Fuar tarihi', range], ['Fuar merkezi', esc(TUYAP.name)], ['Teslimat', `Onaydan itibaren ${M} dk`], ['Esenyurt → TÜYAP', 'Yaklaşık 5 dakika']])
      + productStrip(avrasyaPicks(catalog), { title: 'Avrasya standları için <em>seçimler.</em>' })
      + faqBlock(faq)
      + ctaBand('Avrasya fuarında <em>ilk izlenimi siz bırakın.</em>'),
  });
}

/* ---------------- Plast Eurasia ---------------- */
export function plastEurasia(catalog, fair, today) {
  const range = `${trRange([fair.start, fair.end])} ${fair.start.slice(0, 4)}`;
  const firstDay = today > fair.start ? today : fair.start;
  const active = firstDay <= fair.end;
  const dayMs = 24 * 60 * 60 * 1000;
  const days = active
    ? Array.from({ length: (Date.parse(fair.end) - Date.parse(firstDay)) / dayMs + 1 },
      (_, offset) => new Date(Date.parse(firstDay) + offset * dayMs).toISOString().slice(0, 10))
    : null;
  const products = tuyapProducts(catalog);
  const catalogAnchor = products.length ? TUYAP_CATALOG : undefined;
  const whatsappText = active
    ? `Merhaba, ${fair.name} için TÜYAP’taki bir standa çiçek göndermek istiyorum.`
    : 'Merhaba, TÜYAP’ta bir standa çiçek göndermek istiyorum.';
  const faq = [
    ['Standa çiçek göndermek için hangi bilgiler gerekir?', 'Fuar adı, salon ve stant numarası, teslim alacak firma ve varsa şerit yazısını siparişe ekleyin.'],
    ['Kurulum gününe teslimat planlayabilir miyim?', 'Evet. Tarih ve saat aralığını önceden paylaşın. Teslimat, fuara giriş izni ve ürün uygunluğu teyit edildikten sonra planlanır.'],
    ['TÜYAP standına teslimat fiyata dahil mi?', 'Evet. Ürün fiyatına TÜYAP standına teslimat dahildir.'],
  ];

  return landing({
    path: fair.page,
    title: 'Plast Eurasia 2026 Çiçek Siparişi | TÜYAP',
    description: `${range} Plast Eurasia İstanbul fuarında TÜYAP standına orkide, çelenk ve saksı bitkisi gönderin. Ürünleri ve fiyatları inceleyin.`,
    crumbs: [['Ana sayfa', '/'], ['TÜYAP fuar çiçekçisi', TUYAP.page], [fair.name, fair.page]],
    hero: {
      eyebrow: `${range} · TÜYAP İstanbul`,
      title: `${esc(fair.name)} <em>stant çiçekleri.</em>`,
      lead: active
        ? `Standınıza veya bir iş ortağınıza orkide, açılış çelengi ya da saksı bitkisi gönderin. Stok ve fuar girişi uygunsa sipariş onayından itibaren ${M} dakikada teslim ediyoruz.`
        : `${esc(fair.name)} ${range} tarihlerinde düzenlendi. Diğer TÜYAP fuarları için standa teslim çiçek seçeneklerini inceleyin.`,
      image: '/assets/hero/tuyap-orkide',
      imageAlt: 'Fuar standı bankosunda beyaz orkide ve pastel aranjman',
      catalogAnchor,
      whatsappText,
    },
    drawerDefaults: { venue: TUYAP.id, fairName: active ? fair.name : '', days, catalogAnchor },
    factsList: [
      ['Fuar tarihi', `<a href="${esc(fair.url)}">${esc(range)}</a>`],
      ['Fuar merkezi', esc(TUYAP.name)],
      ['Teslimat ücreti', 'Fiyata dahil'],
      ['Fotoğraflı onay', 'WhatsApp üzerinden'],
    ],
    featured: catalogAnchor && productStrip(products, { id: catalogAnchor, title: 'Standa gönderilebilecek <em>çiçekler.</em>' }),
    sections: [
      { title: 'Standa çiçek siparişi', html: `
        <p>Katalogdan bir ürün seçin. Sepette salon ve stant numarasını, teslim alacak firmayı ve şerit yazısını ekleyin. Firma logonuzu da şeride basabiliriz.</p>
        <p>Teslimat günü ve saatini seçin. Kurulum günü siparişleri veya birden fazla stant için <a href="/teklif.html">kurumsal teklif</a> formunu da kullanabilirsiniz.</p>` },
    ],
    faq,
    cta: 'TÜYAP’taki standınıza <em>çiçek gönderin.</em>',
  });
}

/* ---------------- Fuar takvimi ---------------- */
export function takvim(fairData) {
  const path = '/fuar-takvimi.html';
  const vName = (id) => (id === 'both' ? 'TÜYAP & İFM' : fairData.venues[id]?.short || id);
  const months = new Map();
  for (const f of fairData.fairs) {
    const key = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(new Date(`${f.start}T12:00:00+03:00`));
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(f);
  }
  const body = pageHero({
    crumbs: [['Ana sayfa', '/'], ['Fuar takvimi', path]],
    eyebrow: 'İstanbul fuar takvimi',
    title: 'TÜYAP ve İFM <em>fuar takvimi.</em>',
    lead: 'Çiçek göndereceğiniz fuarı bulun ve “Bu fuar için sipariş” deyin; fuar adı ve fuar merkezi sipariş çekmecesine otomatik gelir.',
  }) + `
<section class="section fairs">
  <div class="wrap">
    ${[...months].map(([month, list]) => `
    <h2 class="fairs__month">${esc(month)}</h2>
    <ol class="fairs__list">
      ${list.map((f) => `
      <li class="fair">
        <p class="fair__date">${trRange([f.start, f.end])}</p>
        <div><h3 class="fair__name">${f.page ? `<a href="${f.page}">${esc(f.name)}</a>` : esc(f.name)}</h3><p class="fair__meta">${esc(vName(f.venue))} · ${esc(f.sector || '')}</p></div>
        <button class="fair__cta" type="button" data-drawer-open data-fair="${esc(f.name)}" data-venue="${esc(vName(f.venue))}" data-track-location="fair-calendar">Bu fuar için sipariş ${icon('arrow-up-right')}</button>
      </li>`).join('')}
    </ol>`).join('')}
    <p class="fairs__note">Son güncelleme: ${esc(fairData.updatedAt)}. Kaynak: TÜYAP ve İFM resmî fuar takvimleri. Tarihler organizatör tarafından değiştirilebilir; sipariş sırasında teyit ederiz.</p>
  </div>
</section>` + ctaBand('Fuarınızı buldunuz mu? <em>Çiçekleri de bulalım.</em>');
  return page({
    path,
    title: 'İstanbul Fuar Takvimi 2026–2027 | TÜYAP, İFM – Fuar Çiçekçim',
    description: 'TÜYAP ve İstanbul Fuar Merkezi (İFM) 2026–2027 fuar takvimi. Fuarınızı bulun, standınız için çiçek ve çelenk siparişini tek tıkla oluşturun.',
    jsonld: graph(businessNode(), breadcrumbNode([['Ana sayfa', '/'], ['Fuar takvimi', path]])),
    body,
  });
}

/* ---------------- Hizmetler ---------------- */
export function hizmetler(catalog) {
  const path = '/hizmetler.html';
  const services = [
    ['flower-2', 'Açılış ve fuar çelengi', 'Stant önünde ve açılışta en görünür tebrik. Tek ve çift katlı çelenkler, ferforje ayaklı aranjmanlar; firma adınız şeritte.', '/kategori/acilis-fuar-celengi.html'],
    ['sparkles', 'VIP orkide ve şeritli tebrik', 'Karşılama bankosu ve iş ortağı tebrikleri için çok dallı orkideler. Şeride firma logosu basılabilir.', '/kategori/vip-orkide.html'],
    ['flower', 'Stant aranjmanı', 'Toplantı masaları ve karşılama alanı için orkide, lilyum ve gül aranjmanları.', '/kategori/stant-aranjmani.html'],
    ['sprout', 'Stant yeşillendirme ve kiralama', 'Saksı bitkileriyle boş köşeler ve geçişler; fuar süresince kiralama seçeneğiyle.', '/kategori/saksi-bitkisi.html'],
    ['languages', 'Logolu ve çok dilli şerit', 'Şeritte firma logonuz; yazı Türkçe, İngilizce veya iki dilli.', '/blog/fuar-acilis-celengi-serit-yazisi-ornekleri.html'],
    ['party-popper', 'Lansman ve etkinlik çiçeklendirmesi', 'Fuar içi lansman, kokteyl, sahne ve masa çiçeklendirmesi; konseptinize göre.', '/teklif.html'],
    ['hotel', 'Otellere teslimat', 'Fuar katılımcılarının konakladığı otellere karşılama çiçeği ve orkide.', '/iletisim.html'],
    ['refresh-ccw', 'Fuar boyu bakım', 'Kurulum gününde teslimat ve fuar süresince solan çiçek değişimi.', '/teslimat-sureci.html'],
  ];
  const body = pageHero({
    crumbs: [['Ana sayfa', '/'], ['Hizmetler', path]],
    eyebrow: 'Hizmetlerimiz',
    title: 'Fuar standınız için <em>uçtan uca çiçek.</em>',
    lead: `Açılış çelenginden stant yeşillendirmeye, şeritli orkideden lansman çiçeklendirmesine. Tüm hizmetlerde fotoğraflı teslim onayı, kurumsal e-Fatura ve TÜYAP–İFM’de ${DELIVERY.promise} standarttır.`,
  }) + `
<section class="section services">
  <div class="wrap">
    <ol class="services__list">
      ${services.map(([ic, t, d, href], i) => `
      <li class="service" data-reveal>
        <span class="service__num">${String(i + 1).padStart(2, '0')}</span>
        ${icon(ic, 'icon service__icon')}
        <h2 class="service__title">${esc(t)}</h2>
        <p>${esc(d)}</p>
        <a class="service__link" href="${href}">Ayrıntılar ${icon('arrow-up-right')}</a>
      </li>`).join('')}
    </ol>
  </div>
</section>` + productStrip(picks(catalog)) + ctaBand();
  return page({
    path,
    title: 'Fuar Çiçekçiliği Hizmetleri | Fuar Çiçekçim',
    description: 'TÜYAP ve İFM fuarları için açılış çelengi, logolu şeritli orkide, stant aranjmanı, bitki kiralama, lansman çiçeklendirmesi ve otellere teslimat.',
    jsonld: graph(businessNode(), breadcrumbNode([['Ana sayfa', '/'], ['Hizmetler', path]]),
      { '@type': 'ItemList', name: 'Fuar çiçekçiliği hizmetleri', itemListElement: services.map(([, t, d], i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'Service', name: t, description: d, provider: { '@id': `${SITE.url}/#isletme` }, areaServed: VENUES.map((v) => v.name) } })) }),
    body,
  });
}

/* ---------------- Hakkımızda ---------------- */
export function hakkimizda() {
  const path = '/hakkimizda.html';
  return page({
    path,
    title: 'Hakkımızda | Fuar Çiçekçim – TÜYAP ve İFM Fuar Çiçekçisi',
    description: 'Fuar Çiçekçim, TÜYAP ve İFM fuarlarına odaklanan kurumsal bir çiçekçidir. Esenyurt’tan 7/24 standa teslimat, logolu şerit, fotoğraflı onay ve e-Fatura.',
    jsonld: graph(businessNode(), { '@type': 'AboutPage', url: abs(path), name: 'Hakkımızda', about: { '@id': `${SITE.url}/#isletme` } }, breadcrumbNode([['Ana sayfa', '/'], ['Hakkımızda', path]])),
    body: pageHero({
      crumbs: [['Ana sayfa', '/'], ['Hakkımızda', path]],
      eyebrow: 'Hakkımızda',
      title: 'Yalnızca fuarlara odaklanan <em>bir çiçekçi.</em>',
      lead: 'Fuar Çiçekçim, İstanbul’un iki büyük fuar merkezi TÜYAP ve İFM’deki standlar için kurulmuş kurumsal bir çiçekçilik markasıdır. Esenyurt’tan çalışıyor, 7/24 sipariş alıyoruz.',
      ctas: false,
    }) + prose([
      { title: 'Fuar çiçekçiliği ayrı bir iştir', html: '<p>Fuar standı; klimalı salon havası, suni ışık ve birkaç günlük yoğun ziyaretçi trafiğiyle bir ofisten çok farklıdır. Ürünlerimizi bu koşullara göre seçiyor, teslimatı fuarın ritmine göre planlıyoruz: kurulum günü, açılış sabahı ya da fuar sırasında.</p>' },
      { title: 'Satın alma ekiplerinin sevdiği düzen', html: `<p>Siparişler WhatsApp’ta yazılı olarak teyit edilir. Ürün standa yerleştirildiğinde fotoğrafını gönderir, firmanıza kurumsal e-Fatura düzenleriz. Ödeme havale/EFT, kredi kartı veya teslimatta nakit yapılabilir.</p>` },
      { title: 'Şeritte markanız', html: '<p>Şeride firma logonuzu basabilir, mesajınızı Türkçe, İngilizce veya iki dilli yazdırabilirsiniz. Sipariş sırasında şerit yazısını canlı önizlemede görürsünüz.</p>' },
    ]) + ctaBand(),
  });
}

/* ---------------- İletişim ---------------- */
export function iletisim() {
  const path = '/iletisim.html';
  return page({
    path,
    title: 'İletişim ve Adres | Fuar Çiçekçim – 7/24 Sipariş, Esenyurt',
    description: `İletişim: ${CONTACT.phoneDisplay}, WhatsApp. Adres: ${SITE.addressLine}. TÜYAP ve İFM’ye 7/24 teslimat.`,
    jsonld: graph(businessNode(), { '@type': 'ContactPage', url: abs(path), name: 'İletişim', about: { '@id': `${SITE.url}/#isletme` } }, breadcrumbNode([['Ana sayfa', '/'], ['İletişim', path]])),
    body: pageHero({
      crumbs: [['Ana sayfa', '/'], ['İletişim', path]],
      eyebrow: 'İletişim',
      title: 'Bize her saatte <em>ulaşabilirsiniz.</em>',
      lead: 'Telefon, WhatsApp ya da sipariş çekmecesi — size hangisi kolaysa. Sipariş hattımız 7/24 açıktır.',
    }) + facts([
      ['Telefon / WhatsApp', `<a href="tel:${CONTACT.phoneE164}" data-track="phone_click" data-track-location="contact">${esc(CONTACT.phoneDisplay)}</a>`, 'wide'],
      ['E-posta', `<a href="mailto:${CONTACT.email}">${esc(CONTACT.email)}</a>`, 'wide'],
      [SITE.address.street ? 'Adres' : 'Konum', `<address>${esc(SITE.addressLine)}</address>${CONTACT.maps ? `<a class="facts__link" href="${esc(CONTACT.maps)}" target="_blank" rel="noopener" data-track="maps_click" data-track-location="contact">${icon('map-pin')}Haritalar’da aç</a>` : ''}`, 'wide'],
      ['Çalışma saatleri', '7/24 sipariş ve teslimat', 'wide'],
    ]) + prose([
      { title: 'Hizmet bölgemiz', html: `<p>Standa teslimat yaptığımız fuar merkezleri: <a href="${TUYAP.page}">${esc(TUYAP.name)}</a> (Büyükçekmece) ve <a href="${IFM.page}">${esc(IFM.name)}</a> (Yeşilköy). Esenyurt’tan TÜYAP’a yol süremiz yaklaşık 5 dakikadır. Fuar katılımcılarının konakladığı otellere de karşılama çiçeği gönderiyoruz.</p>` },
      { title: 'Sosyal medya', html: `<p>Instagram: <a href="${CONTACT.instagram}" target="_blank" rel="noopener">@fuarcicekcim</a></p>` },
    ]) + ctaBand(),
  });
}

/* ---------------- SSS ---------------- */
export const SSS = [
  ['Teslimat ne kadar sürer?', `TÜYAP ve İFM’ye sipariş onayından itibaren ${M} dakikada standa teslim ederiz. Süre onaydan başlar; ürünün stokta ve fuar girişinin uygun olması gerekir.`],
  ['Hangi fuar merkezlerine teslimat yapıyorsunuz?', `${TUYAP.name} (Büyükçekmece) ve ${IFM.name} (Yeşilköy). Ayrıca fuar katılımcılarının konakladığı otellere teslimat yapıyoruz.`],
  ['Fiyatlara teslimat dahil mi?', 'TÜYAP ve İFM’ye standa teslimat fiyata dahildir.'],
  ['Ödemeyi nasıl yapıyorum?', 'Havale/EFT, kredi kartı veya teslimatta nakit. Sitede online ödeme alınmaz; sipariş özetiniz WhatsApp’a iletilir ve ödeme aynı yazışmada netleşir.'],
  ['Kurumsal fatura kesiyor musunuz?', 'Evet. Firma ünvanı, vergi dairesi ve vergi numaranızı paylaştığınızda kurumsal e-Fatura düzenleriz.'],
  ['Şeride logo basılabiliyor mu?', 'Evet. Logonuzu WhatsApp’tan gönderin; şeride firma logonuz ve mesajınız basılır. Yazı Türkçe, İngilizce veya iki dilli olabilir.'],
  ['Kurulum gününde teslim ediyor musunuz?', 'Evet. Fuar açılışından önceki kurulum gününde veya açılış sabahı teslim edebiliriz.'],
  ['Fuar boyunca çiçekler solarsa?', 'Fuar süresince solan çiçekleri değiştiriyoruz; WhatsApp’tan yazmanız yeterli.'],
  ['Bitki kiralama var mı?', 'Evet. Saksı bitkilerini fuar süresince kiralayabilirsiniz; fiyat için WhatsApp’tan veya kurumsal teklif formundan yazın.'],
  ['Teslim edildiğini nasıl bileceğim?', 'Teslimattan sonra ürünün standdaki fotoğrafını WhatsApp’tan gönderiyoruz.'],
  ['Birden fazla standa sipariş verebilir miyim?', 'Evet. Ürünleri tek siparişte toplayın; sepette her ürünün altına ayrı salon, stant, teslim alacak firma ve şerit yazısı girebilirsiniz. Aynı üründen birden fazla adet farklı standlara da gönderilebilir. Tümü için tek fatura düzenlenir.'],
  ['Gece veya hafta sonu sipariş verebilir miyim?', 'Evet. Sipariş hattımız 7/24 açıktır.'],
];

export function sss() {
  const path = '/sss.html';
  return page({
    path,
    title: 'Sık Sorulan Sorular | Fuar Çiçeği Siparişi – Fuar Çiçekçim',
    description: `Fuar çiçeği siparişi hakkında merak edilenler: ${DELIVERY.promise}, teslimat, ödeme yöntemleri, kurumsal fatura, logolu şerit, bitki kiralama.`,
    jsonld: graph(businessNode(), breadcrumbNode([['Ana sayfa', '/'], ['Sık sorulan sorular', path]]), faqNode(SSS)),
    body: pageHero({ crumbs: [['Ana sayfa', '/'], ['SSS', path]], eyebrow: 'Sık sorulan sorular', title: 'Sipariş vermeden önce <em>bilmeniz gerekenler.</em>', ctas: false }) + faqBlock(SSS, 'Tüm <em>sorular.</em>') + ctaBand(),
  });
}

/* ---------------- Teslimat süreci ---------------- */
export function teslimat() {
  const path = '/teslimat-sureci.html';
  const steps = [
    ['Siparişi oluşturun', 'Ürünleri sepete ekleyin; fuar merkezi, salon ve stant numarası, teslim günü ve saat aralığını seçin. Şerit yazısını canlı önizlemede görün.'],
    ['WhatsApp’ta onaylayın', 'Sipariş özetiniz numarasıyla birlikte WhatsApp’a düşer. Stok, teslim saati ve ödeme yöntemini (havale/EFT, kredi kartı veya teslimatta nakit) yazılı olarak netleştiririz.'],
    ['Hazırlık ve şerit', 'Ürün hazırlanır, şeride firma adınız veya logonuz basılır. Yazı Türkçe, İngilizce veya iki dilli olabilir.'],
    [`${M} dakikada standa teslim`, `Onaydan itibaren ${M} dakika içinde salon ve stant numarasına teslim ederiz. Kurulum günü veya açılış sabahı için önceden planlama da yapılabilir.`],
    ['Fotoğraflı onay ve fatura', 'Teslimattan sonra standdaki fotoğrafı WhatsApp’tan gönderir, kurumsal e-Faturanızı düzenleriz.'],
    ['Fuar boyunca destek', 'Fuar süresince solan çiçekleri değiştirir, ek siparişleri aynı hattan alırız.'],
  ];
  return page({
    path,
    title: `Teslimat Süreci | ${DELIVERY.promise.charAt(0).toUpperCase() + DELIVERY.promise.slice(1)} – Fuar Çiçekçim`,
    description: `Fuar çiçeği teslimat süreci adım adım: sipariş, WhatsApp onayı, şerit hazırlığı, ${DELIVERY.promise}, fotoğraflı onay ve kurumsal e-Fatura.`,
    jsonld: graph(businessNode(), breadcrumbNode([['Ana sayfa', '/'], ['Teslimat süreci', path]])),
    body: pageHero({
      crumbs: [['Ana sayfa', '/'], ['Teslimat süreci', path]],
      eyebrow: 'Teslimat süreci',
      title: 'Siparişten standa, <em>adım adım.</em>',
      lead: `${DELIVERY.condition} TÜYAP ve İFM’ye standa teslimat fiyata dahildir.`,
    }) + `
<section class="section">
  <div class="wrap">
    <ol class="timeline">
      ${steps.map(([t, d], i) => `<li class="timeline__item" data-reveal><span class="steps__num">${String(i + 1).padStart(2, '0')}</span><div><h2 class="timeline__title">${esc(t)}</h2><p>${esc(d)}</p></div></li>`).join('')}
    </ol>
  </div>
</section>` + ctaBand(),
  });
}

/* ---------------- 404 ---------------- */
export function notFound() {
  return page({
    path: '/404.html',
    title: `Sayfa bulunamadı | ${SITE.name}`,
    description: 'Aradığınız sayfa taşınmış ya da kaldırılmış olabilir.',
    robots: 'noindex, follow',
    body: pageHero({
      eyebrow: '404',
      title: 'Bu sayfa <em>solmuş.</em>',
      lead: 'Aradığınız sayfa taşınmış olabilir. Koleksiyona göz atın ya da siparişinizi doğrudan oluşturun.',
    }) + ctaBand(),
  });
}
