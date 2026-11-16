import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

const root = path.resolve(import.meta.dirname, '.build');

function htmlEntries(dir, out = {}) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'public') htmlEntries(full, out);
    else if (entry.name.endsWith('.html')) out[path.relative(root, full).replace(/\\/g, '/').replace(/\.html$/, '')] = full;
  }
  return out;
}

export default defineConfig({
  root,
  publicDir: path.join(root, 'public'),
  resolve: {
    alias: { '/src': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    port: 5173,
    fs: { allow: [import.meta.dirname] },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    assetsDir: 'static',
    rollupOptions: { input: htmlEntries(root) },
  },
});
