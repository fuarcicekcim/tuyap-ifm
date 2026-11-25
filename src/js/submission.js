// E-posta sunucusunun kabulü, dosyaya kayıt ve belirsiz sonuç birbirinden ayrılır.
// Zaman aşımı sunucunun isteği işlemediği anlamına gelmez; otomatik tekrar yapılmaz.
export async function submitRequest(payload, { timeoutMs = 4000 } = {}) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      (async () => {
        try {
          const response = await fetch('/teklif-gonder.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          let data;
          try { data = await response.json(); }
          catch { return { kind: response.ok ? 'unknown' : 'failed' }; }
          if (!response.ok) {
            if (response.status === 422 && data?.error_code === 'product_unavailable') {
              return { kind: 'product_unavailable', message: data.error };
            }
            if (data?.intake_saved === true && data.request_id === payload.client_request_id && data.mail === false) return { kind: 'saved' };
            return { kind: 'failed' };
          }
          if (!data || typeof data !== 'object' || Array.isArray(data)) return { kind: 'unknown' };
          if (response.ok && data.ok === true && data.mail === true) return { kind: 'sent' };
          if (response.ok && data.saved === true && data.mail === false) return { kind: 'saved' };
          if (data.ok === false) return { kind: 'failed' };
          return { kind: 'unknown' };
        } catch {
          return { kind: 'unknown' };
        }
      })(),
      new Promise((resolve) => {
        timer = setTimeout(() => {
          resolve({ kind: 'unknown' });
          controller.abort();
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// Kullanıcı tıklamasında açılır; bekleme sırasında da ana pencereye erişemez.
export function openWhatsAppWindow() {
  let win;
  try {
    win = window.open('', '_blank');
    if (win) win.opener = null;
    return win;
  } catch {
    try { win?.close(); } catch { /* Ana sayfada bağlantı sunulacak. */ }
    return null;
  }
}

export function navigateWhatsAppWindow(win, url) {
  try {
    if (!win || win.closed) return false;
    win.location.href = url;
    return true;
  } catch {
    return false;
  }
}

export function showSubmissionStatus(element, result, waUrl, { orderNo = '', location = '' } = {}) {
  const message = {
    sent: 'E-posta gönderimi için talebiniz alındı.',
    saved: 'Talebiniz kaydedildi; e-posta gönderimi doğrulanamadı. Bilgileriniz korunuyor.',
    failed: 'E-posta gönderimi tamamlanamadı. Bilgileriniz korunuyor.',
    unknown: 'E-posta gönderimi henüz doğrulanamadı. Bilgileriniz korunuyor.',
  }[result.kind];
  element.dataset.state = result.kind;
  element.textContent = `${message}${orderNo ? ` Sipariş no: ${orderNo}.` : ''} `;
  const link = document.createElement('a');
  link.href = waUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.dataset.track = 'whatsapp_click';
  link.dataset.trackLocation = location;
  link.textContent = 'Mesajı WhatsApp’ta aç';
  element.append(link, '. İletmek için WhatsApp’taki Gönder’e dokunun.');
}
