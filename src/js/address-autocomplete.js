import '../styles/address-autocomplete.css';

const AUTOCOMPLETE_UNAVAILABLE = 'Adres önerileri şu anda kullanılamıyor. Adresi elle yazabilirsiniz.';
const AUTOCOMPLETE_LIMIT = 'Adres önerisi sınırına ulaşıldı. Adresi elle yazabilirsiniz.';

export function initAddressAutocomplete(form) {
  const field = form.querySelector('[data-address-autocomplete]');
  const input = field?.querySelector('input[name="adres"]');
  const optIn = field?.querySelector('[data-address-lookup]');
  const results = field?.querySelector('[data-address-suggestions]');
  const status = field?.querySelector('[data-address-status]');
  if (!input || !optIn || !results || !status) return () => {};

  let timer;
  let activeRequest;
  let quotaReached = false;

  function clear() {
    clearTimeout(timer);
    activeRequest?.abort();
    activeRequest = null;
    results.hidden = true;
    results.replaceChildren();
    status.textContent = quotaReached ? AUTOCOMPLETE_LIMIT : '';
  }

  function canLookup() {
    return optIn.checked && !optIn.disabled && !input.disabled && !field.closest('[hidden]');
  }

  function render(suggestions) {
    const items = suggestions.filter((item) => typeof item === 'string' && item.trim()
      && (input.maxLength < 0 || item.length <= input.maxLength)).slice(0, 5);
    if (!items.length) {
      status.textContent = 'Adres önerisi bulunamadı. Adresi elle yazabilirsiniz.';
      return;
    }

    const options = document.createDocumentFragment();
    for (const text of items) {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'address-suggestions__option';
      option.textContent = text;
      option.addEventListener('click', () => {
        input.value = text;
        input.focus();
        clear();
        status.textContent = 'Adres seçildi. Gerekirse adresi düzenleyebilirsiniz.';
      });
      options.append(option);
    }

    const attribution = document.createElement('img');
    attribution.className = 'address-suggestions__attribution';
    attribution.src = '/assets/google-maps-attribution.png';
    attribution.alt = 'Google Maps';
    attribution.setAttribute('translate', 'no');
    options.append(attribution);
    results.replaceChildren(options);
    results.hidden = false;
    status.textContent = 'Adres önerileri hazır.';
  }

  async function lookup(query) {
    if (!canLookup() || quotaReached) return;
    const request = new AbortController();
    activeRequest = request;
    try {
      const response = await fetch('/api/adres-onerileri.php', {
        method: 'POST',
        mode: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: query }),
        signal: request.signal,
      });
      if (activeRequest !== request || !canLookup()) return;
      if (response.status === 429) {
        quotaReached = true;
        optIn.checked = false;
        optIn.disabled = true;
        status.textContent = AUTOCOMPLETE_LIMIT;
        return;
      }
      if (!response.ok) throw new Error();
      const { suggestions } = await response.json();
      if (!Array.isArray(suggestions)) throw new Error();
      if (activeRequest === request && canLookup()) render(suggestions);
    } catch {
      if (activeRequest !== request || !canLookup()) return;
      optIn.checked = false;
      status.textContent = AUTOCOMPLETE_UNAVAILABLE;
    } finally {
      if (activeRequest === request) activeRequest = null;
    }
  }

  function schedule() {
    clear();
    if (quotaReached) return;
    const query = input.value.trim();
    if (canLookup() && query.length >= 4) timer = setTimeout(() => lookup(query), 350);
  }

  input.addEventListener('input', schedule);
  optIn.addEventListener('change', schedule);
  form.addEventListener('reset', clear);
  field.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || results.hidden) return;
    event.preventDefault();
    input.focus();
    clear();
  });
  return clear;
}
