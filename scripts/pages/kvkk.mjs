import { SITE, CONTACT } from '../../src/config/site-settings.js';
import { esc } from '../lib/html.mjs';
import { page } from '../lib/layout.mjs';

// Taslak metindir; yayından önce işletme sahibi / hukuk danışmanı tarafından kontrol edilmelidir.
export function kvkk() {
  const body = `
<article class="section legal">
  <div class="wrap legal__wrap">
    <p class="eyebrow">Kişisel verilerin korunması</p>
    <h1>KVKK aydınlatma metni</h1>
    <p>Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında, ${esc(SITE.name)} (“İşletme”) tarafından sipariş ve teklif formları aracılığıyla toplanan kişisel verilere ilişkin olarak hazırlanmıştır.</p>
    <h2>Veri sorumlusu</h2>
    <p>${esc(SITE.name)} · ${esc(SITE.address.district)}, ${esc(SITE.address.city)} · ${esc(CONTACT.email)} · ${esc(CONTACT.phoneDisplay)}</p>
    <h2>İşlenen kişisel veriler</h2>
    <p>Ad soyad, firma adı, telefon numarası, e-posta adresi, teslimat bilgileri (fuar, salon, stant, tarih ve saat), kuşak/kart yazısı, fatura bilgileri (ünvan, vergi dairesi, vergi veya T.C. kimlik numarası) ve sipariş notları.</p>
    <h2>İşleme amaçları</h2>
    <p>Siparişin alınması, teyit edilmesi ve teslim edilmesi; sizinle WhatsApp, telefon veya e-posta üzerinden iletişim kurulması; fatura düzenlenmesi ve yasal yükümlülüklerin yerine getirilmesi.</p>
    <h2>Hukuki sebep ve toplama yöntemi</h2>
    <p>Veriler, internet sitemizdeki formlar ve WhatsApp yazışmaları aracılığıyla elektronik ortamda; KVKK m. 5/2-c (sözleşmenin kurulması ve ifası), m. 5/2-ç (hukuki yükümlülük) ve m. 5/2-f (meşru menfaat) hukuki sebeplerine dayanılarak işlenir.</p>
    <h2>Aktarım</h2>
    <p>Kişisel verileriniz yalnızca siparişin yerine getirilmesi için gerekli olduğu ölçüde; e-posta ve barındırma hizmeti sağlayıcıları, WhatsApp (Meta Platforms) iletişim altyapısı ve yasal olarak yetkili kamu kurumları ile paylaşılabilir. Bu hizmet sağlayıcılarının bir kısmının sunucuları yurt dışında bulunabilir.</p>
    <h2>Çerezler ve ölçüm araçları</h2>
    <p>Sitemizde, ziyaretlerin ve reklamlarımızın etkinliğini ölçmek amacıyla Google LLC tarafından sağlanan Google Analytics ve Google Ads hizmetleri kullanılabilir. Bu araçlar çerezler ve benzeri teknolojilerle; ziyaret edilen sayfalar, tıklanan butonlar (sipariş, WhatsApp, telefon), cihaz ve tarayıcı bilgisi, yaklaşık konum ve reklam tıklama bilgisi gibi verileri toplar. Bu veriler Google’ın yurt dışındaki sunucularında işlenebilir. Sipariş formuna yazdığınız ad, telefon, e-posta ve fatura bilgileri bu araçlara gönderilmez. Çerezleri tarayıcınızın ayarlarından silebilir veya engelleyebilir; Google reklam kişiselleştirmesini adssettings.google.com adresinden kapatabilirsiniz.</p>
    <h2>Haklarınız</h2>
    <p>KVKK m. 11 uyarınca verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya silinmesini isteme ve işlemeye itiraz etme haklarına sahipsiniz. Taleplerinizi ${esc(CONTACT.email)} adresine iletebilirsiniz.</p>
  </div>
</article>`;
  return page({
    path: '/kvkk.html',
    title: `KVKK Aydınlatma Metni | ${SITE.name}`,
    description: `${SITE.name} sipariş ve teklif formlarında toplanan kişisel verilere ilişkin KVKK aydınlatma metni.`,
    body,
  });
}
