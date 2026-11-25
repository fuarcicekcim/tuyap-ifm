import { CONTACT, DELIVERY, PRICING, VENUES, FAIR_DAYS } from '../../src/config/site-settings.js';
import { esc, icon } from '../lib/html.mjs';
import { page } from '../lib/layout.mjs';
import { graph, businessNode, breadcrumbNode, breadcrumbs } from '../lib/seo.mjs';

export const BUDGETS = ['5.000 – 10.000 TL', '10.000 – 25.000 TL', '25.000 – 50.000 TL', '50.000 TL ve üzeri', 'Henüz belli değil'];

export function teklif() {
  const path = '/teklif.html';
  const crumbs = [['Ana sayfa', '/'], ['Kurumsal teklif', path]];
  const body = `
<section class="quote">
  <div class="wrap quote__grid">
    <div class="quote__intro">
      ${breadcrumbs(crumbs)}
      <p class="eyebrow">Kurumsal teklif</p>
      <h1 data-split>Birden fazla stand ve gün için <em>tek teklif.</em></h1>
      <p class="phero__lead">Bayilerinize, iş ortaklarınıza veya kendi standlarınıza fuar boyunca çiçek gönderecekseniz ihtiyacınızı bir kez yazın; ürün önerisi, teslim planı ve tutarı tek teklifte hazırlayalım.</p>
      <ul class="aside-card__list quote__list">
        <li>${icon('layers')}Birden fazla stant, gün ve ürün tek siparişte</li>
        <li>${icon('receipt-text')}Tüm teslimatlar için tek kurumsal e-Fatura</li>
        <li>${icon('truck')}TÜYAP ve İFM’de standa teslimat fiyata dahil</li>
        <li>${icon('credit-card')}Havale/EFT, kredi kartı veya teslimatta nakit</li>
      </ul>
      <p class="quote__alt">Acil mi? <a href="tel:${CONTACT.phoneE164}" data-track="phone_click" data-track-location="quote">${esc(CONTACT.phoneDisplay)}</a> numarasını arayın; sipariş hattımız 7/24 açık.</p>
    </div>
    <form class="order quote__form" data-quote-form novalidate>
      <fieldset class="order__set">
        <legend>Firma</legend>
        <label class="field"><span>Firma adı <b aria-hidden="true">*</b></span><input name="firma" required autocomplete="organization" maxlength="120"></label>
        <div class="field-row">
          <label class="field"><span>Yetkili ad soyad <b aria-hidden="true">*</b></span><input name="adsoyad" required autocomplete="name" maxlength="120"></label>
          <label class="field"><span>Telefon <b aria-hidden="true">*</b></span><input name="telefon" type="tel" required inputmode="tel" autocomplete="tel" maxlength="20" placeholder="05XX XXX XX XX"></label>
        </div>
        <label class="field"><span>E-posta</span><input name="eposta" type="email" inputmode="email" autocomplete="email" maxlength="120"></label>
      </fieldset>
      <fieldset class="order__set">
        <legend>Fuar ve teslimat</legend>
        <div class="field-row">
          <label class="field"><span>Fuar adı</span><input name="fuar_adi" maxlength="200" value="${esc(FAIR_DAYS.activeFairName)}"></label>
          <label class="field"><span>Fuar merkezi</span><select name="merkez">${VENUES.map((v) => `<option value="${esc(v.short)}">${esc(v.short)}</option>`).join('')}<option value="Her ikisi">Her ikisi</option><option value="Diğer">Diğer</option></select></label>
        </div>
        <label class="field"><span>Stantlar ve teslim günleri <b aria-hidden="true">*</b></span><textarea name="stant" required rows="4" maxlength="800" placeholder="Örn. Salon 5 / B12 – 21 Kasım sabah&#10;Salon 7 / 714 – 22 Kasım"></textarea></label>
        <label class="field"><span>Bütçe aralığı</span><select name="butce">${BUDGETS.map((b) => `<option>${esc(b)}</option>`).join('')}</select></label>
        <label class="field"><span>Not</span><textarea name="not" rows="3" maxlength="800" placeholder="Ürün tercihleri, şerit yazıları, logo, renk, kiralama veya lansman çiçeklendirmesi…"></textarea></label>
        <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      </fieldset>
      <label class="consent"><input type="checkbox" name="kvkk" required><span><a href="/kvkk.html" target="_blank" rel="noopener">KVKK aydınlatma metnini</a> okudum; teklif için iletişim bilgilerimin işlenmesini kabul ediyorum.</span></label>
      <p class="order__status" role="status" aria-live="polite" data-quote-status></p>
      <button class="btn btn--gold quote__submit" type="submit" data-quote-submit>${icon('send')}Teklif İste</button>
      <p class="drawer__note">${icon('shield-check')}Talebiniz için bir WhatsApp mesajı hazırlanır. ${esc(PRICING.paymentNote)}</p>
    </form>
  </div>
</section>`;
  return page({
    path,
    title: 'Kurumsal Fuar Çiçeği Teklifi | Çoklu Stand ve Gün – Fuar Çiçekçim',
    description: `Birden fazla stand, gün veya ürün için kurumsal fuar çiçeği teklifi alın. TÜYAP ve İFM’de standa teslimat dahil, ${DELIVERY.promise}, tek kurumsal e-Fatura.`,
    jsonld: graph(businessNode(), breadcrumbNode(crumbs)),
    body,
  });
}
