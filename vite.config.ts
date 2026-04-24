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
    // `@byterent/joyid-connect` is consumed via a `file:` link from a
    // sibling monorepo, and npm keeps a parallel copy of React in that
    // workspace's node_modules. Without dedupe, the connector's dist
    // imports its workspace React while the app uses ours — two
    // instances, `useState` returns null at the second, whole tree
    // crashes. Force single copies of both React and its ecosystem
    // hook-callers.
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
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
