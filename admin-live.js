// Yönetim paneli — canlı yayın katmanı (arayüz + Supabase). Mantık admin-live-core.js'te, satır doğrulama live-rules.js'te.
//
// Panelde yapılan düzenlemeler eskisi gibi bu cihazdaki taslağa yazılır. "Canlıya al", taslaktaki fiyat/stok/aç-kapat/sıralama/
// rozet/indirim değişikliklerini TEK istekte (atomik) Supabase'teki fc_live_products tablosuna yazar; site bu tabloyu okuyup
// yükleme yapmadan güncellenir. Yazma yetkisini veritabanı verir (RLS: yalnız aktif owner/admin); buradaki kontroller kullanım kolaylığıdır.
// Bayrak: VITE_LIVE_CATALOG_ENABLED (supabase-config.js → window.FUAR_LIVE). Kapalıysa bu dosya hiçbir şey yapmaz.
import { parseRow, parseRows, LIVE_SELECT } from './live-rules.js?v=1';
import * as core from './admin-live-core.js?v=2';

const cfg = window.FUAR_LIVE;
const store = window.FuarStore;
const auth = window.FuarAuth;
const pricing = window.FuarPricing;
const $ = (id) => document.getElementById(id);
const BASELINE_KEY = 'fc-live-baseline-v1';
const LAST_KEY = 'fc-live-last-v1';
// "Bu telefonda oturumum açık kalsın" seçiliyse oturum localStorage'da kalır (çıkışa kadar); değilse sekme kapanınca biter.
// admin.js bu anahtarı okuyup kayıtlı oturumla paneli şifresiz açmayı bekler.
const REMEMBER_KEY = 'fc-live-remember-v1';

if (cfg?.enabled && store && pricing && $('live-bar')) init();

function init() {
  let client = null;
  const state = {
    user: null, rows: null, updatedAt: new Map(), loadedAt: '', busy: false, error: '', items: [], snap: null,
    mode: 'review', undo: [], lastPublish: readJson(LAST_KEY),
  };

  // ---- Yardımcılar ---------------------------------------------------------------------------------------------------
  function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  function writeJson(key, value) {
    try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch { /* Depolama kapalıysa yalnız bu oturumda geçerli olur. */ }
  }
  const time = (iso) => {
    const date = new Date(iso);
    return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }).format(date) : '';
  };
  function node(tag, className = '', text = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }
  let toastTimer;
  function toast(message, error = false) {
    const target = $('toast');
    if (!target) return;
    window.clearTimeout(toastTimer);
    target.textContent = message;
    target.classList.toggle('is-error', error);
    target.hidden = false;
    toastTimer = window.setTimeout(() => { target.hidden = true; }, 6000);
  }
  const icons = () => window.lucide?.createIcons();
  // Kullanıcıya olduğu gibi gösterilecek hata (kind: 'auth' | 'denied' | 'other').
  const userError = (message, kind) => Object.assign(new Error(message), { userMessage: true, kind });
  function remembered() {
    try { return localStorage.getItem(REMEMBER_KEY) === '1'; } catch { return false; }
  }
  function setRemember(on) {
    try { if (on) localStorage.setItem(REMEMBER_KEY, '1'); else localStorage.removeItem(REMEMBER_KEY); } catch { /* Depolama kapalıysa oturum sekmeyle sınırlı kalır. */ }
  }
  // Supabase oturumu, seçime göre localStorage (kalıcı) ya da sessionStorage'da (sekmeyle biter) tutulur; silme ikisinden de siler.
  const authStorage = {
    getItem(key) { try { return (remembered() ? localStorage : sessionStorage).getItem(key); } catch { return null; } },
    setItem(key, value) { try { (remembered() ? localStorage : sessionStorage).setItem(key, value); } catch { /* Depolama kapalı. */ } },
    removeItem(key) {
      try { localStorage.removeItem(key); } catch { /* Depolama kapalı. */ }
      try { sessionStorage.removeItem(key); } catch { /* Depolama kapalı. */ }
    },
  };
  async function safeSignOut() {
    if (auth?.enabled) return;
    try { await sb().auth.signOut({ scope: 'local' }); } catch { /* Oturum zaten yok ya da SDK yüklenemedi. */ }
    authStorage.removeItem('fc-live-auth-v1');
    setRemember(false);
  }

  function sb() {
    if (auth?.enabled && auth.client) return auth.client();
    if (!client) {
      if (!window.supabase?.createClient) throw new Error('Giriş bileşeni yüklenemedi. Sayfayı yenileyin.');
      client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
        auth: { storage: authStorage, storageKey: 'fc-live-auth-v1', autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
        global: { fetch: (url, init) => fetch(url, { ...init, signal: init?.signal || AbortSignal.timeout(15000) }) },
      });
    }
    return client;
  }

  // ---- Taban (taslağın son eşitlendiği canlı durum) --------------------------------------------------------------------
  function readBaseline() {
    const saved = readJson(BASELINE_KEY);
    if (saved?.rev === store.defaults().revision && saved.states && typeof saved.states === 'object') return new Map(Object.entries(saved.states));
    return new Map();
  }
  function writeBaseline(map) {
    writeJson(BASELINE_KEY, { rev: store.defaults().revision, states: Object.fromEntries(map) });
  }

  // ---- Anlık görüntü ve plan -----------------------------------------------------------------------------------------
  function snapshot() {
    const stat = store.defaults();
    const draft = store.read();
    const staticStates = new Map(stat.products.map((product) => [product.id, core.stateOf(product, store.bestsellerRank(product, stat))]));
    const draftStates = new Map(draft.products.map((product) => [product.id, core.stateOf(product, store.bestsellerRank(product, draft))]));
    return {
      stat, draft, staticStates, draftStates,
      ids: draft.products.filter((product) => staticStates.has(product.id)).map((product) => product.id),
      newCount: draft.products.filter((product) => !staticStates.has(product.id)).length,
      stale: Boolean(store.draftInfo?.().stale),
      names: new Map(draft.products.map((product) => [product.id, product.name])),
      badges: new Map(draft.badges.map((badge) => [badge.id, badge.name])),
    };
  }

  // Satırı olmayan ürün statik değerinde kalır; satırı olan ürün satırdaki değerdedir.
  function effectiveLive(snap) {
    const live = new Map(snap.staticStates);
    const known = new Set(snap.badges.keys());
    for (const [id, row] of state.rows ?? []) if (live.has(id)) live.set(id, core.stateOfRow(row, known));
    return live;
  }

  function replan() {
    state.snap = snapshot();
    if (!state.user || !state.rows || state.snap.stale) { state.items = []; return; }
    state.items = core.planSync({
      ids: state.snap.ids, staticStates: state.snap.staticStates, draftStates: state.snap.draftStates,
      liveStates: effectiveLive(state.snap), baseline: readBaseline(),
    });
  }

  const actionable = () => state.items.filter((item) => item.kind === 'pending' || item.kind === 'conflict');

  // ---- Taslağa alma ---------------------------------------------------------------------------------------------------
  function adoptIntoDraft(adopts) {
    if (!adopts.size) return;
    const next = store.read();
    for (const product of next.products) if (adopts.has(product.id)) core.applyStateToProduct(product, adopts.get(product.id));
    window.__fuarLiveWriting = true;
    try { store.save(next); }
    finally { window.__fuarLiveWriting = false; }
    window.dispatchEvent(new CustomEvent('fuar-live-draft-changed'));
  }

  // Dokunulmamış ürünlerde canlıdaki değer taslağa alınır; eşitlenen ürünlerin tabanı canlı değer olur.
  function syncDraftWithLive() {
    if (!state.user || !state.rows || state.snap?.stale) return;
    const adopts = new Map(state.items.filter((item) => item.kind === 'adopt').map((item) => [item.id, item.live]));
    try { adoptIntoDraft(adopts); }
    catch (error) {
      state.error = `Canlı değerler taslağa alınamadı: ${error.message}`;
      return;
    }
    const baseline = readBaseline();
    for (const item of state.items) if (item.kind === 'adopt' || item.kind === 'same') baseline.set(item.id, item.live);
    const compact = new Map();
    for (const [id, value] of baseline) if (!core.sameState(value, state.snap.staticStates.get(id) ?? value)) compact.set(id, value);
    writeBaseline(compact);
    replan();
  }

  // ---- Ağ ---------------------------------------------------------------------------------------------------------------
  async function verifyRole() {
    const api = sb();
    const { data, error } = await api.auth.getUser();
    if (error || !data?.user) throw userError('Oturum doğrulanamadı. Yeniden giriş yapın.', 'auth');
    const { data: role, error: roleError } = await api.rpc('fc_staff_role');
    if (roleError || !['owner', 'admin'].includes(role)) throw userError('Bu hesabın canlı yayın yetkisi yok.', 'denied');
    state.user = { email: data.user.email || '', role };
  }

  async function fetchLive() {
    const { data, error } = await sb().from('fc_live_products').select(LIVE_SELECT).limit(1000);
    if (error) throw error;
    if (!Array.isArray(data)) throw userError('Canlı katalog yanıtı doğrulanamadı.', 'other');
    state.rows = parseRows(data, pricing);
    state.updatedAt = new Map(data.filter((row) => row && typeof row.product_id === 'string').map((row) => [row.product_id, row.updated_at]));
    state.loadedAt = new Date().toISOString();
    replan();
  }

  async function refresh({ adopt = true } = {}) {
    await fetchLive();
    if (adopt) syncDraftWithLive();
  }

  function dropSession(message) {
    state.user = null; state.rows = null; state.items = []; state.error = message || '';
    void safeSignOut();
  }

  // Ağ/yetki hatalarını iletiye çevirir; oturum bittiyse çıkış yaptırır.
  function fail(error) {
    const info = error?.userMessage ? { kind: error.kind, message: error.message } : core.explainError(error);
    if (info.kind === 'auth' || info.kind === 'denied') dropSession(info.message);
    else state.error = info.message;
    return info;
  }

  async function run(task) {
    if (state.busy) return;
    state.busy = true; state.error = '';
    render();
    try { return await task(); }
    catch (error) { fail(error); }
    finally { state.busy = false; render(); }
  }

  // ---- Çubuk ------------------------------------------------------------------------------------------------------------
  function render() {
    const bar = $('live-bar');
    bar.hidden = false;
    state.snap = state.snap ?? snapshot();
    const pending = actionable();
    const conflicts = pending.filter((item) => item.kind === 'conflict').length;
    let mode = 'ok'; let title = 'Canlı yayın bağlı'; let detail = '';
    if (!state.user) {
      mode = state.error ? 'error' : 'signin';
      title = 'Canlı yayın için giriş gerekli';
      detail = state.error || 'Fiyat, stok, aç/kapat, sıralama, rozet ve indirim değişiklikleri yükleme yapmadan vitrine anında yansır. Yönetici hesabınızla giriş yapın.';
    } else if (state.busy) {
      mode = 'busy'; title = 'Canlı katalog okunuyor…'; detail = 'Lütfen bekleyin.';
    } else if (state.snap.stale) {
      mode = 'error'; title = 'Önceki sürümden bir taslağınız var';
      detail = 'Canlı yayından önce Genel Bakış bölümünden eski taslağı kurtarın veya indirin.';
    } else if (state.error) {
      mode = 'error'; title = 'Canlı yayın işlemi tamamlanamadı'; detail = state.error;
    } else if (pending.length) {
      mode = 'pending'; title = `${pending.length} ürünün değişikliği canlıya hazır`;
      detail = `Bu değişiklikler henüz vitrinde yok.${conflicts ? ` ${conflicts} üründe canlıda başka bir değişiklik var; incelerken karar verirsiniz.` : ' İnceleyip “Canlıya al”a basın.'}`;
    } else {
      detail = `${state.user.email} · ${state.rows?.size ?? 0} üründe canlı ayar var${state.loadedAt ? ` · Son okuma ${time(state.loadedAt)}` : ''}`;
    }
    if (state.user && state.snap.newCount) detail += ` Yeni eklenen ${state.snap.newCount} ürün canlıya alınamaz; yeni ürün için yayın turu gerekir.`;
    bar.dataset.state = mode;
    $('live-bar-title').textContent = title;
    $('live-bar-detail').textContent = detail;
    const signed = Boolean(state.user);
    $('live-signin-button').hidden = signed;
    $('live-refresh-button').hidden = !signed;
    $('live-signout-button').hidden = !signed;
    $('live-publish-button').hidden = !(signed && pending.length && !state.snap.stale);
    $('live-publish-label').textContent = pending.length ? `Canlıya al (${pending.length})` : 'Canlıya al';
    $('live-undo-button').hidden = !(signed && state.lastPublish?.items?.length);
    for (const id of ['live-signin-button', 'live-refresh-button', 'live-publish-button', 'live-undo-button', 'live-signout-button']) {
      $(id).disabled = state.busy;
      $(id).setAttribute('aria-busy', String(state.busy));
    }
    icons();
  }

  // ---- İnceleme penceresi -----------------------------------------------------------------------------------------------
  const dialog = $('live-dialog');
  const ctx = () => ({ badgeName: (id) => state.snap.badges.get(id) });
  const nameOf = (id) => state.snap.names.get(id) || id;

  function showDialog(mode) {
    state.mode = mode;
    $('live-signin-form').hidden = mode !== 'signin';
    $('live-review').hidden = mode === 'signin';
    $('live-confirm-button').hidden = mode === 'signin';
    $('live-signin-submit').hidden = mode !== 'signin';
    $('live-dialog-eyebrow').textContent = 'CANLI YAYIN';
    $('live-review-error').textContent = '';
    $('live-signin-error').textContent = '';
    if (!dialog.open) dialog.showModal();
  }

  function changeBlock(label, lines) {
    const block = node('div', 'live-change__block');
    block.append(node('span', 'live-change__label', label));
    const list = node('ul', 'live-change__lines');
    for (const line of lines) list.append(node('li', '', line));
    block.append(list);
    return block;
  }

  function renderReview() {
    const list = $('live-changes');
    list.replaceChildren();
    const items = state.mode === 'undo' ? state.undo : actionable();
    for (const item of items) {
      const row = node('li', 'live-change');
      row.dataset.productId = item.id;
      row.append(node('strong', 'live-change__name', nameOf(item.id)));
      if (state.mode === 'undo') {
        row.append(changeBlock('Geri alınacak', core.describeChange(item.after, item.before, ctx())));
      } else if (item.kind === 'conflict') {
        const when = state.updatedAt.get(item.id) ? ` (${time(state.updatedAt.get(item.id))})` : '';
        row.classList.add('is-conflict');
        row.append(changeBlock(`Canlıda başka bir yerden değiştirilmiş${when}`, core.describeChange(item.base, item.live, ctx())));
        row.append(changeBlock('Sizin değişikliğiniz', core.describeChange(item.base, item.draft, ctx())));
        if (item.reason === 'rank') {
          row.append(node('p', 'live-change__note', 'İstenen “en çok satan” sırası canlıda başka bir ürüne verilmiş. Canlıdaki değer korunacak; sıralamayı yenileyip yeniden seçin.'));
        } else {
          const choices = node('div', 'live-change__choices');
          for (const [value, label, checked] of [['live', 'Canlıdaki kalsın (önerilen)', true], ['mine', 'Benimki yazılsın', false]]) {
            const choice = node('label', 'live-choice');
            const input = node('input');
            input.type = 'radio'; input.name = `live-choice-${item.id}`; input.value = value; input.checked = checked;
            choice.append(input, node('span', '', label));
            choices.append(choice);
          }
          row.append(choices);
        }
      } else {
        row.append(changeBlock('Değişecek', core.describeChange(item.live, item.draft, ctx())));
      }
      list.append(row);
    }
    const count = items.length;
    const onlyConflicts = state.mode !== 'undo' && count > 0 && items.every((item) => item.kind === 'conflict');
    $('live-dialog-title').textContent = state.mode === 'undo' ? 'Son yayını geri al' : onlyConflicts ? `${count} üründe karar gerekiyor` : `${count} ürün canlıya alınacak`;
    $('live-dialog-sub').textContent = state.mode === 'undo'
      ? 'Aşağıdaki ürünler, son canlı yayından önceki değerlerine döner ve vitrinde anında değişir.'
      : 'Aşağıdaki değişiklikler onayınızla vitrinde anında yayınlanır. Yeniden yükleme gerekmez.';
    $('live-confirm-button').querySelector('span').textContent = state.mode === 'undo' ? 'Geri al ve canlıya yaz' : 'Şimdi canlıya al';
    $('live-review-note').textContent = state.mode === 'undo' ? '' : 'Yazma tek istekte yapılır: ya hepsi değişir ya hiçbiri. Hata olursa vitrin olduğu gibi kalır.';
  }

  const signature = (items) => JSON.stringify(items.map((item) => [item.id, item.kind, item.live, item.draft]));
  let reviewSignature = '';

  async function openReview() {
    await run(async () => {
      await refresh({ adopt: true });
      if (state.error) return;
      const items = actionable();
      if (!items.length) { toast('Canlıya alınacak değişiklik yok.'); return; }
      reviewSignature = signature(items);
      showDialog('review');
      renderReview();
    });
  }

  // Seçimler: yalnız çakışma satırlarındaki radyo düğmeleri.
  function readChoices() {
    const choices = new Map();
    for (const input of $('live-changes').querySelectorAll('input[type="radio"]:checked')) {
      choices.set(input.name.replace('live-choice-', ''), input.value);
    }
    return choices;
  }

  // Yazma + doğrulama + taslak/taban güncellemesi. writes/adopts: Map<id, durum>.
  async function writeAndVerify({ writes, adopts, baseline, baselineBefore, items, undoOf = null }) {
    const rows = [...writes].map(([id, value]) => core.stateToRow(id, value));
    if (rows.length) {
      writeBaseline(baselineBefore);
      const { error } = await sb().from('fc_live_products').upsert(rows, { onConflict: 'product_id' });
      if (error) throw error;
    }
    writeBaseline(baseline);
    // Yazılanı geri okuyup istenenle karşılaştır; vitrin gerçekten bu değerleri okuyacak.
    let verified = true;
    if (rows.length) {
      try {
        await fetchLive();
        const known = new Set(state.snap.badges.keys());
        for (const [id, wanted] of writes) {
          const row = state.rows.get(id);
          if (!row || !core.sameState(core.stateOfRow(row, known), wanted)) verified = false;
        }
      } catch { verified = false; }
    }
    // Taslağı canlıyla eşitle (yazılanlar zaten taslakta; geri almada ve çakışmada canlı değer taslağa alınır).
    adoptIntoDraft(new Map([...adopts]));
    if (rows.length) {
      state.lastPublish = undoOf ? null : {
        at: new Date().toISOString(),
        items: items.filter((item) => writes.has(item.id)).map((item) => ({ id: item.id, before: item.live, after: writes.get(item.id) })),
      };
      writeJson(LAST_KEY, state.lastPublish);
    }
    return verified;
  }

  async function confirmReview() {
    if (state.busy) return;
    $('live-review-error').textContent = '';
    $('live-confirm-button').disabled = true;
    try { await confirmReviewTask(); }
    finally { $('live-confirm-button').disabled = false; }
  }

  async function confirmReviewTask() {
    await run(async () => {
      try {
        if (state.mode === 'undo') { await confirmUndo(); return; }
        await refresh({ adopt: false });
        const items = actionable();
        // Siz incelerken canlı durum veya taslak değiştiyse listeyi yeniden gösterip yeniden onay iste.
        if (signature(items) !== reviewSignature) {
          reviewSignature = signature(items);
          if (!items.length) { dialog.close(); toast('Canlıya alınacak değişiklik kalmadı.'); return; }
          renderReview();
          $('live-review-error').textContent = 'Siz incelerken canlı durum değişti. Listeyi yeniden gözden geçirip onaylayın.';
          return;
        }
        const out = core.resolve(state.items, readChoices(), { staticStates: state.snap.staticStates, pricing, parseRow });
        if (out.errors.length) {
          $('live-review-error').textContent = out.errors.map((error) => `${nameOf(error.id)}: ${error.message}`).join(' ');
          return;
        }
        const verified = await writeAndVerify({ ...out, items: state.items });
        dialog.close();
        syncAfterWrite();
        if (out.writes.size) toast(verified ? `${out.writes.size} ürün canlıya alındı. Vitrin anında güncellendi.` : `${out.writes.size} ürün yazıldı ancak geri okuma doğrulanamadı. “Yenile” ile kontrol edin.`, !verified);
        else toast('Canlıya yazılacak değişiklik kalmadı; canlı değerler taslağa alındı.');
      } catch (error) {
        const info = fail(error);
        $('live-review-error').textContent = info.message;
        if (info.kind === 'auth' || info.kind === 'denied') dialog.close();
      }
    });
  }

  function syncAfterWrite() {
    replan();
    window.dispatchEvent(new CustomEvent('fuar-live-draft-changed'));
  }

  // ---- Son yayını geri al ------------------------------------------------------------------------------------------------
  async function openUndo() {
    await run(async () => {
      await refresh({ adopt: true });
      if (state.error) return;
      const live = effectiveLive(state.snap);
      const eligible = []; const skipped = [];
      for (const entry of state.lastPublish?.items ?? []) {
        // Yalnız canlı hâlâ o yayının sonucuysa ve taslakta sonradan değişiklik yoksa geri alınır.
        const ok = live.has(entry.id) && core.sameState(live.get(entry.id), entry.after) && state.snap.draftStates.has(entry.id) && core.sameState(state.snap.draftStates.get(entry.id), entry.after);
        (ok ? eligible : skipped).push(entry);
      }
      if (!eligible.length) {
        dropLastPublish();
        toast('Geri alınacak bir şey kalmadı: ürünler yayından sonra yeniden değişmiş.', true);
        return;
      }
      state.undo = eligible;
      showDialog('undo');
      renderReview();
      if (skipped.length) $('live-review-note').textContent = `${skipped.length} ürün yayından sonra yeniden değiştiği için geri alınmayacak.`;
    });
  }

  function dropLastPublish() { state.lastPublish = null; writeJson(LAST_KEY, null); }

  async function confirmUndo() {
    await refresh({ adopt: false });
    const live = effectiveLive(state.snap);
    const writes = new Map(); const items = [];
    for (const entry of state.undo) {
      if (!live.has(entry.id) || !core.sameState(live.get(entry.id), entry.after)) continue;
      writes.set(entry.id, entry.before);
      items.push({ id: entry.id, live: entry.after });
    }
    if (!writes.size) { dialog.close(); toast('Geri alınacak bir şey kalmadı.', true); dropLastPublish(); return; }
    const baseline = readBaseline();
    for (const [id, value] of writes) baseline.set(id, value);
    const compact = new Map();
    for (const [id, value] of baseline) if (!core.sameState(value, state.snap.staticStates.get(id) ?? value)) compact.set(id, value);
    const verified = await writeAndVerify({ writes, adopts: new Map(writes), baseline: compact, baselineBefore: readBaseline(), items, undoOf: true });
    dropLastPublish();
    dialog.close();
    syncAfterWrite();
    toast(verified ? `${writes.size} ürün önceki değerine döndürüldü.` : 'Geri alma yazıldı ancak doğrulanamadı. “Yenile” ile kontrol edin.', !verified);
  }

  // ---- Giriş ------------------------------------------------------------------------------------------------------------
  async function signIn(event) {
    event.preventDefault();
    if (state.busy) return;
    const email = $('live-email').value.trim();
    const password = $('live-password').value;
    $('live-signin-error').textContent = '';
    if (!email || !password) { $('live-signin-error').textContent = 'E-posta ve şifrenizi yazın.'; return; }
    state.error = '';
    state.busy = true; render();
    $('live-signin-submit').setAttribute('aria-busy', 'true');
    try {
      setRemember(!auth?.enabled && $('live-remember').checked);
      const { error } = await sb().auth.signInWithPassword({ email, password });
      if (error) throw new Error('E-posta veya şifre doğrulanamadı.');
      $('live-password').value = '';
      try { await verifyRole(); }
      catch (failure) { await safeSignOut(); throw failure; }
      await refresh({ adopt: true });
      dialog.close();
      toast('Canlı yayın bağlandı.');
    } catch (error) {
      if (!state.user) setRemember(false);
      $('live-signin-error').textContent = error.message || core.explainError(error).message;
    } finally {
      $('live-password').value = '';
      $('live-signin-submit').removeAttribute('aria-busy');
      state.busy = false; render();
    }
  }

  async function signOut() {
    state.user = null; state.rows = null; state.items = []; state.error = '';
    await safeSignOut();
    render();
    toast('Canlı yayın oturumu kapatıldı. Taslağınız bu cihazda korunuyor.');
  }

  // ---- Başlangıç ve olaylar ---------------------------------------------------------------------------------------------
  // Yayın turundan sonra (yeni katalog sürümü) cihazdaki eski taslak yeni katalogla birebir aynıysa (yani tüm değişiklikler zaten
  // canlıya alınıp kataloğa işlenmişse) "önceki sürümden taslağınız var" uyarısı gereksizdir ve canlı yayını engeller: taslak silinir.
  // İçerik farklıysa (ör. ad/fotoğraf düzenlemesi) hiçbir şeye dokunulmaz; mevcut "taslağı kurtar / indir" akışı geçerlidir.
  function dropRedundantStaleDraft() {
    try {
      const info = store.draftInfo?.();
      if (!info?.hasDraft || !info.stale || info.invalid) return;
      const saved = store.getSavedDraft?.();
      if (!saved || !core.sameCatalogContent(saved, store.normalize(store.defaults()))) return;
      window.__fuarLiveWriting = true;
      try { store.reset(); } finally { window.__fuarLiveWriting = false; }
      window.dispatchEvent(new CustomEvent('fuar-live-draft-changed'));
    } catch { /* Taslağa dokunulamazsa mevcut uyarı akışı sürer. */ }
  }

  async function start() {
    dropRedundantStaleDraft();
    state.snap = snapshot();
    render();
    await run(async () => {
      const { data } = await sb().auth.getSession();
      if (!data?.session) return;
      if (!state.user) await verifyRole();
      await refresh({ adopt: true });
    });
  }

  // Panel kilitliyken kayıtlı oturum varsa: oturum ve yönetici yetkisi doğrulanınca admin.js paneli şifresiz açar.
  // Oturum geçersizse veya yetki yoksa kayıt silinir; ağ hatasında kayıt korunur, panel şifresi istenir.
  async function restoreRemembered() {
    let ok = false;
    try {
      const { data } = await sb().auth.getSession();
      if (data?.session) {
        await verifyRole();
        ok = true;
      } else setRemember(false);
    } catch (error) { fail(error); }
    window.dispatchEvent(new CustomEvent('fuar-live-restore', { detail: ok }));
  }

  function reset() {
    state.user = null; state.rows = null; state.items = []; state.error = ''; state.busy = false;
    if (dialog.open) dialog.close();
    $('live-password').value = '';
    void safeSignOut();
    render();
  }

  $('live-signin-button').addEventListener('click', () => { showDialog('signin'); $('live-dialog-title').textContent = 'Canlı yayın girişi'; $('live-dialog-sub').textContent = 'Canlı vitrini değiştirebilmek için yönetici hesabınızla giriş yapın.'; $('live-email').focus(); });
  $('live-signin-form').addEventListener('submit', signIn);
  $('live-refresh-button').addEventListener('click', () => void run(async () => { await refresh({ adopt: true }); if (!state.error) toast('Canlı durum yenilendi.'); }));
  $('live-publish-button').addEventListener('click', () => void openReview());
  $('live-undo-button').addEventListener('click', () => void openUndo());
  $('live-signout-button').addEventListener('click', () => void signOut());
  $('live-confirm-button').addEventListener('click', () => void confirmReview());
  dialog.addEventListener('close', () => { $('live-password').value = ''; });

  // Taslak değişince ağa gitmeden yalnız plan ve çubuk yenilenir.
  let replanTimer;
  store.subscribe(() => {
    if (window.__fuarLiveWriting) return;
    window.clearTimeout(replanTimer);
    replanTimer = window.setTimeout(() => { replan(); render(); }, 150);
  });
  // Sekmeye dönüldüğünde (telefonda sık) canlı durum 2 dakikadan eskiyse sessizce yenilenir.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !state.user || state.busy || document.querySelector('dialog[open]')) return;
    if (Date.now() - new Date(state.loadedAt || 0).getTime() > 120000) void run(() => refresh({ adopt: true }));
  });
  window.addEventListener('fuar-admin', (event) => {
    if (event.detail === 'ready') void start();
    if (event.detail === 'locked') reset();
  });

  window.FuarLive = Object.freeze({
    // admin.js'in "taslağa kaydedildi" iletisine eklenen ipucu (canlı yayın kapalıysa null).
    hint: () => (state.user ? 'Taslağa kaydedildi. Vitrinde görünmesi için “Canlıya al”a basın.' : 'Bu cihazdaki taslağa kaydedildi; canlı yayın için giriş yapın.'),
    // Katalog durum kartındaki "yayımlanmadı" açıklamasının canlı yayın açıkken doğru hâli.
    catalogNote: 'Düzenlemeler tarayıcıda saklanıyor. Fiyat, stok, sıra, rozet ve indirim “Canlıya al” ile vitrine gider; ad, fotoğraf ve yeni ürün yayın turu ister.',
  });

  if (auth?.enabled) $('live-remember').closest('label').hidden = true;
  if (!$('dashboard').hidden) void start();
  else if (!auth?.enabled && remembered()) void restoreRemembered();
}
