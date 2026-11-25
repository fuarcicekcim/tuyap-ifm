(() => {
  const dayFormat = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' });
  const wholeFormat = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
  const kurusFormat = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const today = () => dayFormat.format(new Date());
  const toKurus = (amount) => Math.round(amount * 100);
  const discountedPrice = (amount, rate) => Math.floor(toKurus(amount) * (100 - rate) / 100) / 100;
  // Tam liralar "4.038 TL", kuruşlular her zaman iki haneli "4.037,50 TL" görünür (e-posta biçimiyle aynı).
  const format = (amount) => (toKurus(amount) % 100 === 0 ? wholeFormat : kurusFormat).format(amount) + ' TL';
  const dateLabel = (date) => date.split('-').reverse().join('.');
  
  function validMoney(amount) {
    return typeof amount === 'number' && Number.isFinite(amount) && amount >= 0 && amount <= 1_000_000_000
      && Math.abs(amount * 100 - toKurus(amount)) <= 0.0001;
  }

  function validDate(date) {
    if (typeof date !== 'string' || !/^[1-9][0-9]{3}-[0-9]{2}-[0-9]{2}$/.test(date)) return false;
    const day = new Date(date + 'T00:00:00Z');
    return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === date;
  }

  function validateCartDiscount(campaign) {
    if (campaign == null) return '';
    if (typeof campaign !== 'object' || Array.isArray(campaign) || Object.keys(campaign).length !== 2
      || !validDate(campaign.startsOn) || !validDate(campaign.endsOn) || campaign.startsOn > campaign.endsOn) {
      return 'Sepet indiriminin başlangıç ve bitiş tarihlerini geçerli sırayla girin.';
    }
    return '';
  }

  function resolveCartDiscount(campaign, date = today()) {
    return Boolean(campaign && !validateCartDiscount(campaign) && campaign.startsOn <= date && date <= campaign.endsOn);
  }

  function validate(product) {
    const discount = product.discount;
    if (discount === undefined || discount === null) return '';
    if (typeof discount !== 'object' || Array.isArray(discount) || Object.keys(discount).length !== 4) return 'İndirim bilgisi geçersiz.';
    const { price, previousPrice, startsOn, endsOn } = discount;
    if (!validMoney(price) || !validMoney(previousPrice)) return 'İndirimli ve önceki fiyatı en fazla iki ondalıkla girin.';
    if (!validMoney(product.price) || toKurus(price) >= toKurus(previousPrice) || toKurus(previousPrice) > toKurus(product.price)) {
      return 'İndirimli fiyat önceki fiyattan düşük, önceki fiyat normal fiyata eşit veya daha düşük olmalı.';
    }
    if (!validDate(startsOn) || !validDate(endsOn) || startsOn > endsOn) {
      return 'Kampanya başlangıç ve bitiş tarihlerini geçerli sırayla girin.';
    }
    return '';
  }

  function resolve(product, date = today()) {
    const discount = product.discount;
    if (product.active !== false && discount && !validate(product) && discount.startsOn <= date && date <= discount.endsOn) {
      return { price: discount.price, previousPrice: discount.previousPrice, discount };
    }
    return { price: product.price, previousPrice: null, discount: null };
  }

  const saving = ({ previousPrice, price }) => (toKurus(previousPrice) - toKurus(price)) / 100;
  const percent = ({ previousPrice, price }) => Math.floor((toKurus(previousPrice) - toKurus(price)) * 100 / toKurus(previousPrice));

  function totals(lines, vatRate) {
    let net = 0;
    let vat = 0;
    const rateBps = Math.round(vatRate * 100);
    for (const { price, qty } of lines) {
      const lineNet = toKurus(price) * qty;
      net += lineNet;
      vat += Math.round(lineNet * rateBps / 10_000);
    }
    return { net: net / 100, vat: vat / 100, gross: (net + vat) / 100 };
  }

  globalThis.FuarPricing = Object.freeze({ today, validate, resolve, validateCartDiscount, resolveCartDiscount, format, dateLabel, discountedPrice, saving, percent, totals });
})();
