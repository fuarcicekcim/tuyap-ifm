import { loadEnv } from 'vite';

export function publicSupabaseConfig(root, environment = null) {
  const env = environment || { ...loadEnv('production', root, 'VITE_SUPABASE_'), ...process.env };
  const enabled = env.VITE_SUPABASE_ENABLED === 'true';
  if (!enabled) return { enabled: false, url: '', publishableKey: '' };
  const url = String(env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || '');
  if (!/^https:\/\/[a-z\d-]+\.supabase\.co$/i.test(url)) throw new Error('Supabase proje URL yapılandırması geçersiz.');
  let valid = /^sb_publishable_[a-z\d_-]{10,}$/i.test(key);
  if (!valid && key.split('.').length === 3) {
    try { valid = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')).role === 'anon'; } catch { /* reject */ }
  }
  if (!valid) throw new Error('Tarayıcıda yalnız Supabase publishable veya eski anon anahtarı kullanılabilir.');
  return { enabled: true, url, publishableKey: key };
}
