let initialized = false;

export function initMobileMenu() {
  const dialog = document.querySelector('[data-mobile-menu]');
  const panel = dialog?.querySelector('[data-menu-panel]');
  const toggles = [...document.querySelectorAll('[data-menu-open]')];
  if (initialized || !dialog || !panel || !toggles.length || typeof dialog.showModal !== 'function') return;
  initialized = true;

  const html = document.documentElement;
  const mobile = window.matchMedia('(max-width: 1023px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let opener = null;
  let state = 'closed';
  let restoreOnClose = true;
  let openFrame = 0;
  let closeTimer = 0;
  let transitionEnd = null;

  const expanded = (value) => toggles.forEach((toggle) => toggle.setAttribute('aria-expanded', String(value)));
  const resumeScroll = () => {
    if (!['menu-locked', 'drawer-locked', 'intro-on', 'intro-leaving'].some((name) => html.classList.contains(name))) window.__lenis?.start();
  };

  function cancelPending() {
    cancelAnimationFrame(openFrame);
    clearTimeout(closeTimer);
    openFrame = closeTimer = 0;
    if (transitionEnd) panel.removeEventListener('transitionend', transitionEnd);
    transitionEnd = null;
  }

  function finishClose() {
    const shouldRestore = state !== 'closed' && restoreOnClose;
    cancelPending();
    state = 'closed';
    dialog.classList.remove('is-open');
    expanded(false);
    html.classList.remove('menu-locked');
    if (dialog.open) dialog.close();
    resumeScroll();
    if (shouldRestore && mobile.matches && opener?.isConnected && opener.getClientRects().length) opener.focus({ preventScroll: true });
  }

  function closeMenu({ immediate = false, restoreFocus = true } = {}) {
    restoreOnClose = restoreFocus;
    if (!dialog.open || immediate || reduced.matches) { finishClose(); return; }
    if (state === 'closing') return;
    const wasVisible = dialog.classList.contains('is-open');
    cancelPending();
    state = 'closing';
    dialog.classList.remove('is-open');
    expanded(false);
    if (!wasVisible) { finishClose(); return; }
    transitionEnd = (event) => {
      if (event.target === panel && ['transform', 'translate'].includes(event.propertyName)) finishClose();
    };
    panel.addEventListener('transitionend', transitionEnd);
    closeTimer = setTimeout(finishClose, 300);
  }

  function openMenu(toggle) {
    if (!mobile.matches || ['drawer-locked', 'intro-on', 'intro-leaving'].some((name) => html.classList.contains(name))) return;
    if (dialog.open && state !== 'closing') return;
    cancelPending();
    opener = toggle;
    restoreOnClose = true;
    if (!dialog.open) {
      try { dialog.showModal(); } catch { return; }
    }
    state = 'opening';
    expanded(true);
    html.classList.add('menu-locked');
    window.__lenis?.stop();
    // Kapalı panelin ilk konumu hesaplanır; sonraki karedeki sınıf geçişi animasyonu başlatır.
    panel.getBoundingClientRect();
    openFrame = requestAnimationFrame(() => {
      openFrame = 0;
      if (!dialog.open || state !== 'opening') return;
      dialog.classList.add('is-open');
      state = 'open';
    });
  }

  toggles.forEach((toggle) => toggle.addEventListener('click', (event) => {
    event.preventDefault();
    openMenu(toggle);
  }));
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeMenu(); });
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const focusables = [...panel.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]')]
      .filter((el) => el.getClientRects().length);
    const first = focusables[0];
    const last = focusables.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  dialog.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('[data-menu-close]')) { event.preventDefault(); closeMenu(); return; }
    if (event.target.closest('a[href]')) { closeMenu({ immediate: true, restoreFocus: false }); return; }
    if (event.target === dialog) closeMenu();
  });
  dialog.addEventListener('close', () => {
    // Önceki kapanışın kuyruğa alınmış olayı, yeniden açılmış menüyü etkilemez.
    if (!dialog.open) finishClose();
  });
  mobile.addEventListener('change', () => { if (!mobile.matches) closeMenu({ immediate: true, restoreFocus: false }); });
  reduced.addEventListener('change', () => { if (reduced.matches && state === 'closing') finishClose(); });
  window.addEventListener('pagehide', () => closeMenu({ immediate: true, restoreFocus: false }));
  expanded(false);
}
