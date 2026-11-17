import { SITE, CONTACT, VENUES } from '../../src/config/site-settings.js';
import { esc, jsonLd } from './html.mjs';

export const abs = (p) => SITE.url + p;

// Yerel işletme düğümü. Ad, adres ve telefon (NAP) Google İşletme Profili'ndekiyle birebir aynıdır; kaynak: src/config/site-settings.js.
// Çalışma saatleri ve koordinat (geo) doğrulanmadığı için yazılmaz; sokak ve posta kodu ayar dosyasında doluysa eklenir.
export const businessNode = () => ({
  '@type': 'Florist',
  '@id': `${SITE.url}/#isletme`,
  name: SITE.name,
  url: `${SITE.url}/`,
  telephone: CONTACT.phoneE164,
  email: CONTACT.email,
  image: `${SITE.url}/assets/og/fuar-cicekcim-og.jpg`,
  logo: `${SITE.url}/assets/brand/crest-80.webp`,
  priceRange: '₺₺',
  currenciesAccepted: 'TRY',
  paymentAccepted: 'Havale/EFT, Kredi kartı, Nakit',
  address: { '@type': 'PostalAddress', streetAddress: SITE.address.street || undefined, addressLocality: SITE.address.district, addressRegion: SITE.address.city, postalCode: SITE.address.postalCode || undefined, addressCountry: SITE.address.country },
  hasMap: CONTACT.maps || undefined,
  areaServed: VENUES.map((v) => ({ '@type': 'Place', name: v.name, address: { '@type': 'PostalAddress', addressLocality: v.district, addressRegion: 'İstanbul', addressCountry: 'TR' } })),
  openingHoursSpecification: [{
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    opens: '00:00', closes: '23:59',
  }],
  sameAs: [CONTACT.instagram],
});

export const breadcrumbNode = (crumbs) => ({
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })),
});

export const faqNode = (faq) => ({
  '@type': 'FAQPage',
  mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});

export const graph = (...nodes) => jsonLd({ '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) });

export function breadcrumbs(crumbs) {
  return `<nav class="crumbs" aria-label="Sayfa yolu"><ol>${crumbs.map(([name, path], i) =>
    i === crumbs.length - 1 ? `<li aria-current="page">${esc(name)}</li>` : `<li><a href="${path}">${esc(name)}</a></li>`).join('')}</ol></nav>`;
}
