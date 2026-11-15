/* site.js — iç sayfalar: menü, fuar takvimi, teklif formu */
(() => {
  'use strict';

  /* ---------- Header menü ---------- */
  const menuToggle = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#main-nav');
  const siteHeader = document.querySelector('.site-header');
  const announcement = document.querySelector('.site-announcement');
  if (siteHeader && announcement) {
    const updateHeader = () => siteHeader.classList.toggle('is-scrolled', window.scrollY >= announcement.offsetHeight);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }
  if (menuToggle && navigation) {
    const setMenuOpen = (open) => {
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
      navigation.classList.toggle('is-open', open);
    };
    menuToggle.addEventListener('click', () => setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('click', (e) => { if (!siteHeader.contains(e.target)) setMenuOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenuOpen(false); });
  }

  /* ---------- Fuar takvimi yardımcıları ---------- */
  const T = window.FUAR_TAKVIMI;
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const today = new Date(); today.setHours(0,0,0,0);
  const d = (s) => { const [y,m,g] = s.split('-').map(Number); return new Date(y, m-1, g); };
  const fmtRange = (f) => {
    const a = d(f.start), b = d(f.end);
    if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${months[a.getMonth()]} ${a.getFullYear()}`;
    return `${a.getDate()} ${months[a.getMonth()]} – ${b.getDate()} ${months[b.getMonth()]} ${b.getFullYear()}`;
  };
  const status = (f) => { const a = d(f.start), b = d(f.end); if (b < today) return 'past'; if (a <= today) return 'live'; return 'upcoming'; };
  const venueLabel = (v) => v === 'both' ? 'TÜYAP + İFM' : T.venues[v].short;
  const venuePill = (v) => `<span class="venue-pill venue-pill--${v}">${venueLabel(v)}</span>`;
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const quoteLink = (f) => `/teklif.html?fuar=${encodeURIComponent(f.id)}`;

  window.FuarTakvimi = { fmtRange, status, venueLabel, d };

  /* Ana sayfa / landing şeridi: data-fair-strip="tuyap|ifm|all" data-limit="4" */
  document.querySelectorAll('[data-fair-strip]').forEach(el => {
    if (!T) return;
    const scope = el.dataset.fairStrip || 'all';
    const limit = Number(el.dataset.limit || 4);
    const list = T.fairs
      .filter(f => status(f) !== 'past')
      .filter(f => scope === 'all' || f.venue === scope || f.venue === 'both')
      .sort((a,b) => a.start.localeCompare(b.start))
      .slice(0, limit);
    el.innerHTML = list.map(f => {
      const a = d(f.start), live = status(f) === 'live';
      return `<a href="${f.page || quoteLink(f)}">
        <div class="fair-date">${a.getDate()}–${d(f.end).getDate()} ${months[a.getMonth()].slice(0,3)}<small>${a.getFullYear()}${live ? ' · Devam ediyor' : ''}</small></div>
        <p class="fair-name">${esc(f.name)}</p>
        <div class="fair-meta">${venuePill(f.venue)}<span>${esc(f.sector || '')}</span></div>
      </a>`;
    }).join('') || '<p class="form-note">Yaklaşan fuar bilgisi için bizi arayın.</p>';
  });

  /* Tam takvim sayfası */
  const fairList = document.querySelector('[data-fair-list]');
  if (fairList && T) {
    const filters = document.querySelectorAll('[data-fair-filter]');
    let venue = 'all';
    const render = () => {
      const fairs = T.fairs
        .filter(f => venue === 'all' || f.venue === venue || f.venue === 'both')
        .filter(f => status(f) !== 'past' || (d(f.end) > new Date(today.getTime() - 14*864e5)))
        .sort((a,b) => a.start.localeCompare(b.start));
      let html = '', lastKey = '';
      fairs.forEach(f => {
        const a = d(f.start), key = `${a.getFullYear()}-${a.getMonth()}`;
        if (key !== lastKey) { html += `<h3 class="fair-month">${months[a.getMonth()]} ${a.getFullYear()}</h3>`; lastKey = key; }
        const st = status(f);
        html += `<article class="fair-row ${st === 'live' ? 'is-live' : ''} ${st === 'past' ? 'is-past' : ''}">
          <div class="fair-date">${a.getDate()}–${d(f.end).getDate()}<small>${months[a.getMonth()]}</small></div>
          <div>
            <p class="fair-name">${esc(f.name)}</p>
            <div class="fair-meta">${venuePill(f.venue)}${st === 'live' ? '<span class="venue-pill live-pill">Şu an devam ediyor</span>' : ''}<span>${esc(f.sector || '')}</span><span>${T.venues[f.venue === 'both' ? 'tuyap' : f.venue].district}${f.venue === 'both' ? ' & Yeşilköy' : ''}</span></div>
          </div>
          <div class="fair-actions">
            ${f.page ? `<a class="btn btn-ghost" href="${f.page}">Fuar sayfası</a>` : ''}
            <a class="btn btn-primary" href="${quoteLink(f)}">Bu fuar için sipariş</a>
          </div>
        </article>`;
      });
      fairList.innerHTML = html || '<p>Seçilen merkez için yaklaşan fuar bulunamadı.</p>';
    };
    filters.forEach(b => b.addEventListener('click', () => {
      venue = b.dataset.fairFilter;
      filters.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      render();
    }));
    render();
    const upd = document.querySelector('[data-fair-updated]');
    if (upd) upd.textContent = fmtRange({ start: T.updatedAt, end: T.updatedAt }).replace(/^(\d+)–\d+/, '$1');
  }

  /* ---------- Teklif formu ---------- */
  const form = document.querySelector('#teklif-form');
  if (form) {
    const params = new URLSearchParams(location.search);
    const fairSelect = form.querySelector('[name="fuar"]');
    const otherFair = form.querySelector('[name="fuar_diger"]');
    const statusBox = form.querySelector('.form-status');
    const waBtn = form.querySelector('#teklif-whatsapp');
    const catalog = window.FUAR_CATALOG;
    const whatsapp = (catalog && catalog.settings.whatsapp) || '905475670406';

    if (fairSelect && T) {
      const upcoming = T.fairs.filter(f => status(f) !== 'past').sort((a,b) => a.start.localeCompare(b.start));
      upcoming.forEach(f => {
        const o = document.createElement('option');
        o.value = f.id; o.textContent = `${f.name} · ${fmtRange(f)} · ${venueLabel(f.venue)}`;
        fairSelect.insertBefore(o, fairSelect.querySelector('option[value="diger"]'));
      });
      const pre = params.get('fuar');
      if (pre && upcoming.some(f => f.id === pre)) fairSelect.value = pre;
      const syncOther = () => { otherFair.closest('.field').hidden = fairSelect.value !== 'diger'; };
      fairSelect.addEventListener('change', syncOther); syncOther();
      const venuePre = params.get('merkez');
      if (venuePre && form.querySelector('[name="merkez"]')) form.querySelector('[name="merkez"]').value = venuePre;
    }

    // Ürün seçici (katalogdan)
    const picker = form.querySelector('.product-picker');
    if (picker && catalog) {
      picker.innerHTML = catalog.products.filter(p => p.active).map(p => `
        <label><input type="checkbox" name="urun" value="${esc(p.name)} (₺${new Intl.NumberFormat('tr-TR').format(p.price)} + KDV)">
          <img src="/${esc(p.image)}" alt="${esc(p.alt || p.name)}" loading="lazy" decoding="async">
          <span>${esc(p.name)}</span><small>₺${new Intl.NumberFormat('tr-TR').format(p.price)} + %${catalog.settings.vat} KDV</small></label>`).join('');
      const preProduct = params.get('urun');
      if (preProduct) picker.querySelectorAll('input').forEach(i => { if (i.value.toLowerCase().startsWith(preProduct.toLowerCase())) i.checked = true; });
    }

    const collect = () => {
      const fd = new FormData(form);
      const data = Object.fromEntries([...fd.entries()].filter(([k]) => k !== 'urun'));
      data.urunler = fd.getAll('urun');
      if (fairSelect) {
        const f = T && T.fairs.find(x => x.id === fairSelect.value);
        data.fuar_adi = f ? `${f.name} (${fmtRange(f)}, ${venueLabel(f.venue)})` : (data.fuar_diger || 'Belirtilmedi');
      }
      return data;
    };

    const buildMessage = (data) => [
      'Merhaba, Fuar Çiçekçim’den fuar siparişi / teklif almak istiyorum.',
      '',
      `Fuar: ${data.fuar_adi}`,
      `Fuar merkezi: ${data.merkez || '-'}`,
      `Salon / stant no: ${data.stant || '-'}`,
      `Teslimat tarihi ve saati: ${data.tarih || '-'} ${data.saat || ''}`.trim(),
      `Firma: ${data.firma || '-'}`,
      `Yetkili / telefon: ${data.adsoyad || '-'} / ${data.telefon || '-'}`,
      `Ürünler: ${data.urunler.length ? data.urunler.join(', ') : (data.urun_notu || 'Önerinizi bekliyorum')}`,
      `Adet / bütçe: ${data.adet || '-'} / ${data.butce || '-'}`,
      `Şerit / kart yazısı: ${data.kart || '-'}`,
      data.not ? `Not: ${data.not}` : ''
    ].filter(Boolean).join('\n');

    const updateWa = () => { if (waBtn) waBtn.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(buildMessage(collect()))}`; };
    form.addEventListener('input', updateWa); form.addEventListener('change', updateWa); updateWa();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const data = collect();
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Gönderiliyor…';
      statusBox.className = 'form-status';
      try {
        const res = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ ...data, mesaj: buildMessage(data), sayfa: location.href }) });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) throw new Error(json.error || 'Sunucu yanıt vermedi.');
        if (json.mail !== true) {
          if (json.saved !== true) throw new Error('Talep kaydedilemedi.');
          statusBox.textContent = 'Talebiniz kaydedildi ancak bildirim iletilemedi. Hızlı onay için "WhatsApp’tan gönder" düğmesini kullanın; bilgileriniz mesaja hazır olarak eklendi.';
          statusBox.classList.add('err');
          updateWa();
          return;
        }
        statusBox.textContent = 'Teşekkürler! Talebiniz bize ulaştı. En kısa sürede WhatsApp veya telefonla dönüş yapacağız. Daha hızlı yanıt için yandaki WhatsApp düğmesini de kullanabilirsiniz.';
        statusBox.classList.add('ok');
        form.reset(); updateWa();
      } catch (err) {
        statusBox.textContent = `Form şu anda gönderilemedi (${err.message}). Lütfen "WhatsApp’tan gönder" düğmesini kullanın; bilgileriniz mesaja hazır olarak eklendi.`;
        statusBox.classList.add('err');
      } finally {
        btn.disabled = false; btn.textContent = btn.dataset.label;
      }
    });
  }

  /* Yıl */
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();
