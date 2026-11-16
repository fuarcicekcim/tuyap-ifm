import { SITE, DELIVERY, PRICING, VENUES } from '../../src/config/site-settings.js';
import { esc, icon, tlPrice } from '../lib/html.mjs';
import { page } from '../lib/layout.mjs';
import { graph, businessNode, breadcrumbNode, breadcrumbs, abs } from '../lib/seo.mjs';
import { orderAside, ctaBand } from '../lib/blocks.mjs';
import { CATEGORIES } from '../lib/catalog.mjs';

const M = DELIVERY.minutes;
const TUYAP = VENUES.find((v) => v.id === 'tuyap');
const IFM = VENUES.find((v) => v.id === 'ifm');
const MODIFIED = new Date().toISOString().slice(0, 10);

const fmtDate = (iso) => new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(new Date(`${iso}T12:00:00+03:00`));

function priceTables(catalog) {
  return CATEGORIES.map((c) => {
    const items = catalog.products.filter((p) => p.category === c.id);
    return `<h2>${esc(c.name)}</h2>
<div class="table-wrap"><table><thead><tr><th scope="col">Ürün</th><th scope="col">KDV hariç</th><th scope="col">KDV dahil</th></tr></thead><tbody>
${items.map((p) => `<tr><td><a href="${p.page}">${esc(p.name)}</a></td><td data-price-id="${p.id}">${tlPrice(p.price)}</td><td>${tlPrice(p.price * (1 + PRICING.vatRate / 100))}</td></tr>`).join('')}
</tbody></table></div>`;
  }).join('');
}

export const POSTS = [
  {
    slug: 'fuar-standi-icin-cicek-secimi-rehberi',
    title: 'Fuar Standı İçin Çiçek Seçimi: 2026 Rehberi',
    description: 'Fuar standınıza hangi çiçek ve bitkiler uygun? Çelenk mi, orkide mi, saksı bitkisi mi? Amaç, stant büyüklüğü ve fuar süresine göre seçim rehberi.',
    published: '2026-11-10',
    minutes: 6,
    html: () => `
<p>Fuar standı çiçek için zorlu bir ortamdır: klimalı ve kuru hava, suni ışık, birkaç gün boyunca yoğun ziyaretçi trafiği. Doğru seçilmiş birkaç parça standınızı özenli gösterir; yanlış seçim ise ikinci gün solmuş yapraklarla ters etki yapar. Bu rehber, seçimi amaca göre yapmanıza yardımcı olur.</p>
<h2>1. Önce amacı belirleyin</h2>
<ul>
<li><strong>Karşılama ve algı:</strong> Stant girişi ve karşılama bankosu. <a href="/kategori/vip-orkide.html">VIP orkide</a> ve <a href="/kategori/stant-aranjmani.html">stant aranjmanı</a>.</li>
<li><strong>Tebrik ve ilişki:</strong> İş ortaklarınızın standına “İyi fuarlar” mesajı. Kuşaklı orkide ve <a href="/kategori/acilis-fuar-celengi.html">açılış çelengi</a>.</li>
<li><strong>Alan ve yeşillik:</strong> Boş köşeler, görüşme alanı, geçişler. <a href="/kategori/saksi-bitkisi.html">Saksı bitkileri</a>; fuar süresince kiralanabilir.</li>
</ul>
<h2>2. Stant büyüklüğüne göre kurgu</h2>
<p><strong>Küçük standlar:</strong> Bankoda bir orkide ve köşede bir saksı bitkisi çoğu zaman yeterlidir.</p>
<p><strong>Orta büyüklükte standlar:</strong> Banko ve toplantı masaları için iki orkide veya aranjman, köşeler için iki-üç saksı bitkisi.</p>
<p><strong>Ada standlar ve büyük alanlar:</strong> Girişte ferforje ayaklı bir aranjman veya çelenk, içeride birkaç orkide ve hacim veren saksı bitkileri.</p>
<p>Güncel fiyatlarla bütçe çıkarmak için <a href="/blog/fuar-cicegi-fiyatlari-2026.html">fiyat rehberine</a> bakabilirsiniz.</p>
<h2>3. Fuar salonuna uygun türler</h2>
<ul>
<li><strong>Phalaenopsis orkide:</strong> Birkaç gün boyunca formunu korur, az su ister.</li>
<li><strong>Antoryum:</strong> Parlak çiçekleri suni ışıkta da canlı görünür.</li>
<li><strong>Spatifilyum:</strong> Beyaz çiçekli, gölgeye dayanıklı; görüşme köşeleri için uygundur.</li>
<li><strong>Kauçuk, Benjamin, Yucca, Sansevieria:</strong> Yeşillik ve hacim için.</li>
</ul>
<p>Kesme çiçekli aranjmanlar (gül, lilyum, gerbera) açılış günü için idealdir. Uzun fuarlarda solan çiçekleri fuar süresince değiştiriyoruz.</p>
<h2>4. Marka renkleriyle uyum</h2>
<p>Lacivert veya gri kurumsal renklerde beyaz orkide ve yeşil yapraklı bitkiler en güvenli kombinasyondur. Kırmızı-beyaz logolarda kırmızı antoryum ve beyaz çiçekler, yeşil tonlu markalarda tamamen yeşil bir yerleşim iyi sonuç verir. Kuşağa firma logonuzu bastırabilirsiniz.</p>
<h2>5. Zamanlama</h2>
<p>Çiçekleri kurulum gününün sonunda ya da açılış sabahı teslim almak en doğrusudur; kurulum sırasındaki toz çiçeklere zarar verebilir. Fuar sırasında verilen siparişlerde ${TUYAP.short} ve ${IFM.short}’ye onaydan itibaren ${M} dakikada standa teslim ediyoruz.</p>`,
  },
  {
    slug: 'tuyapa-cicek-gonderme-rehberi',
    title: 'TÜYAP’a Çiçek Nasıl Gönderilir? Stand Teslimatı Rehberi',
    description: 'TÜYAP Fuar ve Kongre Merkezi’ndeki bir standa çiçek, çelenk veya orkide göndermek için gereken bilgiler, doğru teslim zamanı ve sık yapılan hatalar.',
    published: '2026-11-08',
    minutes: 5,
    html: () => `
<p>TÜYAP Fuar ve Kongre Merkezi, Büyükçekmece’de çok salonlu bir fuar alanıdır ve aynı günlerde birden fazla fuara ev sahipliği yapabilir. Bir iş ortağınızın standına tebrik orkidesi ya da kendi standınıza açılış çelengi gönderecekseniz birkaç pratik bilgi süreci çok kolaylaştırır.</p>
<h2>Hangi bilgiler gerekir?</h2>
<ul>
<li><strong>Fuar adı ve tarihi:</strong> Aynı anda birden fazla fuar olabilir.</li>
<li><strong>Salon ve stant numarası:</strong> Davetiyede veya organizatörün katılımcı bilgilerinde yazar.</li>
<li><strong>Teslim alacak firma ve telefon:</strong> Stantta ürünü teslim alacak kişi.</li>
<li><strong>Kuşak yazısı:</strong> “Başarılı bir fuar dileriz — Firma Adı” klasik bir seçimdir.</li>
</ul>
<h2>Ne zaman teslim edilmeli?</h2>
<ul>
<li><strong>Kurulum günü:</strong> Fuardan bir gün önce; çelenk ve büyük aranjmanlar için uygundur.</li>
<li><strong>Açılış sabahı:</strong> İlk ziyaretçilerden önce; orkideler için idealdir.</li>
<li><strong>Fuar sırasında:</strong> Ziyaret veya tebrik amaçlı; onaydan itibaren ${M} dakikada standa.</li>
</ul>
<h2>Teslimat nasıl yapılır?</h2>
<p>Ürünü salon ve stant numaranıza kendimiz teslim ediyor, teslimattan sonra standdaki fotoğrafını WhatsApp’tan gönderiyoruz. Çelenkler genellikle stant önüne, orkideler bankoya veya masaya yerleştirilir. Esenyurt’tan TÜYAP’a yol süremiz yaklaşık 5 dakikadır.</p>
<h2>Fiyat ve fatura</h2>
<p>TÜYAP’a standa teslimat ürün fiyatına dahildir; fiyatlara %${PRICING.vatRate} KDV eklenir. Ödeme havale/EFT, kredi kartı veya teslimatta nakit yapılabilir; firmanıza kurumsal e-Fatura düzenlenir.</p>
<h2>Sık yapılan hatalar</h2>
<ul>
<li><strong>Yanlış salon numarası:</strong> Numarayı davetiyeden teyit edin.</li>
<li><strong>Son güne bırakmak:</strong> Logolu kuşak için baskı zamanı gerekir; mümkünse bir gün önceden sipariş verin.</li>
<li><strong>Uzun fuara yalnızca kesme çiçek:</strong> Orkide veya saksı bitkisi daha uzun dayanır.</li>
</ul>
<p>Ayrıntılı hizmet bilgisi için <a href="${TUYAP.page}">TÜYAP fuar çiçekçisi</a> sayfamıza bakın.</p>`,
  },
  {
    slug: 'ifm-istanbul-fuar-merkezine-cicek-gonderme-rehberi',
    title: 'İFM (İstanbul Fuar Merkezi)’ne Çiçek Gönderme Rehberi',
    description: 'Yeşilköy’deki İstanbul Fuar Merkezi fuarlarına orkide, çelenk ve stant çiçeği göndermek için bilmeniz gerekenler: stant kodu, teslim zamanı, İngilizce kuşak, otel teslimatı.',
    published: '2026-11-06',
    minutes: 4,
    html: () => `
<p>İstanbul Fuar Merkezi (İFM), Yeşilköy’de çok salonlu bir fuar kompleksidir ve uluslararası katılımın yüksek olduğu fuarlara ev sahipliği yapar. Bu yüzden İFM’de kurumsal tebrik çiçekleri ve iki dilli kuşaklar sık tercih edilir.</p>
<h2>İFM’de teslimat nasıl işler?</h2>
<ul>
<li><strong>Salon ve stant kodu:</strong> Davetiyede veya organizatörün katılımcı bilgilerinde bulunur.</li>
<li><strong>Kurulum ve açılış:</strong> Kurulum gününde veya açılış sabahı teslim edebiliriz. Fuar süresince onaydan itibaren ${M} dakikada standa ulaşıyoruz.</li>
<li><strong>Fotoğraflı onay:</strong> Ürün standa yerleştirildiğinde fotoğrafını WhatsApp’tan gönderiyoruz.</li>
</ul>
<h2>Yabancı katılımcılar için kuşak</h2>
<p>Kuşak yazısını İngilizce (“Wishing you a successful fair — Company”) veya iki dilli (“İyi fuarlar · Have a great fair”) hazırlıyor, firma logonuzu kuşağa basıyoruz. Daha fazla örnek için <a href="/blog/fuar-acilis-celengi-serit-yazisi-ornekleri.html">kuşak yazısı örneklerine</a> bakın.</p>
<h2>Otel teslimatı</h2>
<p>Fuar katılımcılarının konakladığı otellere karşılama orkidesi ve çiçek gönderebiliyoruz. Otel adı ve misafirin adı yeterlidir.</p>
<h2>Fiyatlar</h2>
<p>İFM’ye standa teslimat ürün fiyatına dahildir; fiyatlara %${PRICING.vatRate} KDV eklenir. Güncel liste için <a href="/blog/fuar-cicegi-fiyatlari-2026.html">fiyat rehberine</a>, hizmet ayrıntıları için <a href="${IFM.page}">İFM fuar çiçekçisi</a> sayfamıza bakın.</p>`,
  },
  {
    slug: 'fuar-acilis-celengi-serit-yazisi-ornekleri',
    title: 'Fuar Çelengi ve Orkide Kuşak Yazısı Örnekleri (30+ Mesaj)',
    description: 'Fuar açılış çelengi, tebrik orkidesi ve kart için hazır kuşak yazısı örnekleri: resmi, samimi, İngilizce ve iki dilli mesajlar ve pratik kurallar.',
    published: '2026-11-04',
    minutes: 4,
    html: () => `
<p>Kuşak yazısı kısa olmalıdır: çelenk kuşağında en fazla iki satır, orkide kuşağında tek satır rahat okunur. Aşağıdaki örnekleri olduğu gibi kullanabilir ya da firma adınızla uyarlayabilirsiniz. Kuşağa firma logonuzu da basıyoruz; sipariş sırasında yazıyı canlı önizlemede görürsünüz.</p>
<h2>Klasik ve kurumsal</h2>
<ul><li>Başarılı bir fuar dileriz. — Firma Adı</li><li>İyi fuarlar dileriz. — Firma Adı</li><li>Hayırlı ve bereketli bir fuar olsun. — Firma Adı</li><li>Fuarınızın başarıyla geçmesini dileriz. — Firma Adı Yönetim Kurulu</li><li>Nice başarılı fuarlara. — Firma Adı Ailesi</li></ul>
<h2>İş ortağı ve bayi tebriği</h2>
<ul><li>Değerli iş ortağımıza başarılı bir fuar dileriz. — Firma Adı</li><li>Birlikte büyümeye devam. İyi fuarlar! — Firma Adı</li><li>Yeni iş birliklerine vesile olsun. — Firma Adı</li><li>Standınız dolu, siparişleriniz bol olsun. — Firma Adı</li></ul>
<h2>Yeni ürün ve lansman</h2>
<ul><li>Yeni koleksiyonunuz hayırlı olsun. — Firma Adı</li><li>Lansmanınızı kutlar, başarılar dileriz. — Firma Adı</li><li>İlk fuarınız kutlu olsun! — Firma Adı</li></ul>
<h2>Kısa ve modern (orkide kuşağı için)</h2>
<ul><li>İyi fuarlar · Firma Adı</li><li>Başarılar · Firma Adı</li><li>Yanınızdayız · Firma Adı</li><li>Keyifli ve verimli bir fuar · Firma Adı</li></ul>
<h2>İngilizce ve iki dilli</h2>
<ul><li>Wishing you a successful fair. — Company</li><li>Best wishes for a great show! — Company</li><li>Congratulations on your new launch. — Company</li><li>İyi fuarlar / Have a great fair. — Firma Adı</li><li>Başarılar dileriz / Best of luck. — Firma Adı</li></ul>
<h2>Kendi standınız için (karşılama)</h2>
<ul><li>Hoş geldiniz. — Firma Adı</li><li>Standımıza hoş geldiniz · Salon 5 / 512</li><li>Sizinle tanışmaktan mutluluk duyarız. — Firma Adı</li></ul>
<h2>Kuşak için pratik kurallar</h2>
<ul><li><strong>Firma adı mutlaka olsun.</strong> Kuşağın asıl işi kimin gönderdiğini göstermektir.</li><li><strong>Logoyu PNG veya PDF gönderin.</strong> Vektör dosya baskıda en temiz sonucu verir.</li><li><strong>Uzun mesajı karta yazın.</strong> Kuşak başlık, kart ayrıntı içindir.</li><li><strong>Karakter sınırına dikkat edin.</strong> Sipariş çekmecesindeki kuşak alanı okunaklı kalması için kısa tutulmuştur.</li></ul>`,
  },
  {
    slug: 'fuar-cicegi-fiyatlari-2026',
    title: 'Fuar Çiçeği Fiyatları 2026: Çelenk, Orkide, Aranjman ve Saksı Bitkisi',
    metaTitle: 'Fuar Çiçeği Fiyatları 2026 | Fuar Çiçekçim',
    description: '2026 fuar çiçeği fiyat rehberi: açılış çelengi, VIP orkide, stant aranjmanı ve saksı bitkisi fiyatları (KDV hariç ve dahil). TÜYAP ve İFM’de standa teslimat dahil.',
    published: '2026-11-02',
    minutes: 4,
    html: (catalog) => `
<p>Fuar çiçeği fiyatı ürünün türüne, boyutuna ve kuşak/logo gibi kişiselleştirmelere göre değişir. Aşağıdaki tablolar sitemizdeki güncel katalog fiyatlarından otomatik oluşturulur. TÜYAP ve İFM’ye standa teslimat fiyata dahildir; fiyatlara %${PRICING.vatRate} KDV eklenir.</p>
${priceTables(catalog)}
<h2>Fiyatı etkileyen faktörler</h2>
<ul>
<li><strong>Logolu kuşak:</strong> Kuşağa firma adı yazılır; logo baskısı için logonuzu WhatsApp’tan gönderin, siparişte teyit edelim.</li>
<li><strong>Kiralama:</strong> Saksı bitkilerini fuar süresince kiralayabilirsiniz; fiyat için WhatsApp’tan yazın.</li>
<li><strong>Toplu sipariş:</strong> Birden fazla stand veya gün için <a href="/teklif.html">kurumsal teklif</a> isteyebilirsiniz.</li>
<li><strong>Teslimat:</strong> ${esc(PRICING.deliveryIncluded)} ${esc(DELIVERY.condition)}</li>
</ul>`,
  },
];

export function blogPost(post, catalog) {
  const path = `/blog/${post.slug}.html`;
  const crumbs = [['Ana sayfa', '/'], ['Rehberler', '/blog/'], [post.title, path]];
  const others = POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);
  const body = `
<article class="article">
  <header class="article__head">
    <div class="wrap">
      ${breadcrumbs(crumbs)}
      <p class="eyebrow">Rehber · ${post.minutes} dk okuma</p>
      <h1 data-split>${esc(post.title)}</h1>
      <p class="article__meta"><time datetime="${post.published}">${fmtDate(post.published)}</time> · ${esc(SITE.name)}</p>
    </div>
  </header>
  <div class="section prose-wrap">
    <div class="wrap prose-grid">
      <div class="prose">${post.html(catalog)}</div>
      <aside class="prose-aside">${orderAside()}</aside>
    </div>
  </div>
</article>
<section class="section related">
  <div class="wrap">
    <p class="eyebrow">Okumaya devam edin</p>
    <ul class="post-list">${others.map((p) => postItem(p)).join('')}</ul>
  </div>
</section>` + ctaBand();
  return page({
    path,
    title: post.metaTitle || (post.title.length <= 55 ? `${post.title} | Fuar Çiçekçim` : post.title),
    description: post.description,
    jsonld: graph(
      { '@type': 'BlogPosting', headline: post.title, description: post.description, datePublished: post.published, dateModified: MODIFIED, inLanguage: 'tr-TR', mainEntityOfPage: abs(path), image: `${SITE.url}/assets/og/fuar-cicekcim-og.jpg`, author: { '@type': 'Organization', name: SITE.name, url: `${SITE.url}/` }, publisher: { '@id': `${SITE.url}/#isletme` } },
      businessNode(),
      breadcrumbNode(crumbs),
    ),
    body,
  });
}

const postItem = (p) => `
<li class="post" data-reveal>
  <a href="/blog/${p.slug}.html">
    <span class="post__meta">${fmtDate(p.published)} · ${p.minutes} dk okuma</span>
    <span class="post__title">${esc(p.title)}</span>
    <span class="post__desc">${esc(p.description)}</span>
    <span class="post__more">Oku ${icon('arrow-up-right')}</span>
  </a>
</li>`;

export function blogIndex() {
  const path = '/blog/';
  const crumbs = [['Ana sayfa', '/'], ['Rehberler', path]];
  return page({
    path,
    title: 'Fuar Çiçekçiliği Rehberleri | Fuar Çiçekçim',
    description: 'Fuar standı çiçek seçimi, TÜYAP ve İFM’ye çiçek gönderme rehberleri, kuşak yazısı örnekleri ve güncel fuar çiçeği fiyatları.',
    jsonld: graph(businessNode(), breadcrumbNode(crumbs), { '@type': 'Blog', url: abs(path), name: 'Fuar Çiçekçim Rehberleri', blogPost: POSTS.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: abs(`/blog/${p.slug}.html`), datePublished: p.published })) }),
    body: `
<section class="phero">
  <div class="wrap phero__grid"><div class="phero__copy">
    ${breadcrumbs(crumbs)}
    <p class="eyebrow">Rehberler</p>
    <h1 data-split>Fuar çiçekçiliği üzerine <em>işe yarar notlar.</em></h1>
    <p class="phero__lead">Stant için çiçek seçimi, teslimat püf noktaları, kuşak yazıları ve fiyatlar. Fuara hazırlanan pazarlama ve satın alma ekipleri için.</p>
  </div></div>
</section>
<section class="section"><div class="wrap"><ul class="post-list post-list--index">${POSTS.map(postItem).join('')}</ul></div></section>` + ctaBand(),
  });
}
