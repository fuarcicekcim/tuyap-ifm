(() => {
  'use strict';
  const config = window.FUAR_SUPABASE || { enabled: false };
  let client = null;
  let verified = null;
  const listeners = new Set();
  const notify = () => listeners.forEach(fn => fn(verified));
  function sdk() {
    if (!config.enabled) return null;
    if (!window.supabase?.createClient) throw new Error('Giriş bileşeni yüklenemedi. Sayfayı yenileyin.');
    if (!client) {
      client = window.supabase.createClient(config.url, config.publishableKey, {
        auth: { storage: sessionStorage, storageKey: 'fc-admin-auth-v1', autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
        global: { fetch: (url, init) => fetch(url, { ...init, signal: init?.signal || AbortSignal.timeout(12000) }) },
      });
      // Auth callback içinde yeni SDK isteği başlatılmaz; oturum kapanması hemen kilitler.
      client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) { verified = null; notify(); }
      });
    }
    return client;
  }
  async function verify() {
    const api = sdk();
    if (!api) return null;
    const { data, error } = await api.auth.getUser();
    if (error || !data?.user) { verified = null; throw new Error('Oturum doğrulanamadı. Yeniden giriş yapın.'); }
    const { data: role, error: roleError } = await api.rpc('fc_staff_role');
    if (roleError || !['owner', 'admin'].includes(role)) {
      verified = null;
      throw new Error('Bu hesabın katalog yönetim yetkisi yok. Yönetici davetinizi kontrol edin.');
    }
    verified = { id: data.user.id, email: data.user.email || '', role };
    return verified;
  }
  async function signIn(email, password) {
    const api = sdk();
    if (!api) throw new Error('Supabase bağlantısı henüz etkin değil.');
    const { error } = await api.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error('E-posta veya şifre doğrulanamadı.');
    try { return await verify(); }
    catch (failure) { await api.auth.signOut({ scope: 'local' }); throw failure; }
  }
  async function token() {
    const api = sdk();
    if (!api) return '';
    const { data, error } = await api.auth.getSession();
    if (error || !data?.session?.access_token) throw new Error('Oturum sona erdi. Yeniden giriş yapın.');
    return data.session.access_token;
  }
  async function restore() {
    const api = sdk();
    if (!api) return null;
    const { data, error } = await api.auth.getSession();
    if (error || !data?.session) return null;
    return verify();
  }
  async function signOut() {
    verified = null;
    if (client) await client.auth.signOut({ scope: 'local' });
    notify();
  }
  window.FuarAuth = Object.freeze({ enabled: config.enabled === true, signIn, verify, token, restore, signOut, client: sdk,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); } });
})();
