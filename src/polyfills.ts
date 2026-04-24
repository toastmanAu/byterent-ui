// Browser polyfills required by @nervosnetwork/ckb-light-client-js.
// Loaded at the very top of src/main.tsx before any other imports.
//
// - `Buffer` is referenced as a global by the bn.js / ckb primitives
//   that the light-client bundles internally; providing a window-scoped
//   Buffer avoids the "buffer has been externalized" runtime error.

import { Buffer } from 'buffer';

declare global {
  interface Window {
    Buffer: typeof Buffer;
  }
}

if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}
