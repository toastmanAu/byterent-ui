// ByteRent's joyid-relay Worker entry — thin consumer of @byterent/joyid-relay.
//
// Library implementation lives in ../../joyid-ckb-connector/packages/joyid-relay.
// This file only carries ByteRent-specific config: the CORS origin allowlist
// and the branded logo payload.

import { makeRelayWorker, AuthSession } from '@byterent/joyid-relay';
import { LOGO_NO_TEXT_B64 } from './logo';

// Re-export the Durable Object class so wrangler's migration can find it.
export { AuthSession };

export default makeRelayWorker({
  allowedOrigins: [
    'https://byterent.xyz',
    'https://www.byterent.xyz',
    'https://byterent.pages.dev',
    'https://daoview.org',
    'https://www.daoview.org',
    'https://dao-view.pages.dev',
    'http://localhost:5173',
    'http://localhost:5174',
  ],
  logo: {
    contentType: 'image/png',
    base64: LOGO_NO_TEXT_B64,
  },
});
