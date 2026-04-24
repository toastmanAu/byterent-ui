import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The @nervosnetwork/ckb-light-client-js runtime uses SharedArrayBuffer
// and imports node's `buffer` module. Browsers require cross-origin
// isolation for SharedArrayBuffer — we set the two cross-origin headers
// here for dev, and in public/_headers for the Cloudflare Pages deploy.
// Buffer is aliased to the npm `buffer` polyfill and exposed as a global
// via a small preload (src/polyfills.ts, imported at the top of main.tsx).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  define: {
    // Some libs check `global` instead of `window`.
    global: 'globalThis',
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@nervosnetwork/ckb-light-client-js'],
    include: ['buffer'],
  },
});
