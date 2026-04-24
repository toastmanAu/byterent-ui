# ByteRent JoyID auth relay

Thin Cloudflare Worker that brokers the JoyID connect handshake so the PC never
has to run Chrome's WebAuthn hybrid (caBLE) flow. The phone does WebAuthn
locally against its iCloud-synced passkey, redirects to us, we stash the
response in KV, PC polls and collects.

See `src/index.ts` for the three routes.

## One-time setup

```bash
# From the worker/ dir.
cd worker

# 1. Install worker deps (separate from byterent-ui deps).
npm install

# 2. Login to Cloudflare (opens a browser).
npx wrangler login

# 3. Create the KV namespace — once for production, once for preview.
npx wrangler kv:namespace create SESSIONS
npx wrangler kv:namespace create SESSIONS --preview
```

Copy the returned `id` and `preview_id` into `wrangler.toml` (empty fields at the
top of the file).

## Deploy

```bash
# Local smoke test — serves on :8787 against an in-memory KV.
npm run dev

# Deploy to Cloudflare — first deploy goes to byterent-auth.<account>.workers.dev
npm run deploy
```

After the first deploy succeeds, point `auth.byterent.xyz` at it:

> Cloudflare dashboard → Workers & Pages → `byterent-auth` →
> Settings → Triggers → Custom Domains → Add `auth.byterent.xyz`

Then uncomment the `[[routes]]` block in `wrangler.toml` to lock the custom
domain in code, and redeploy.

## Frontend config

The frontend reads the worker URL via
`src/wallet/joyid/worker.ts::getAuthWorkerUrl()`. For local dev against
`wrangler dev`:

```bash
# byterent-ui/.env.local
VITE_AUTH_WORKER_URL=http://localhost:8787
```

Production picks up the default `https://byterent-auth.workers.dev` (update
`DEFAULT_AUTH_WORKER_URL` once the `auth.byterent.xyz` custom domain is live).

## Operational notes

- KV free tier: 100k reads + 1k writes/day. A single connect burns ~1 write
  (POST /session) + up to 60 reads (2s poll × 120s TTL) + 1 write (callback) —
  so ~50 connects/day is the write ceiling on the free tier, 1600 on reads.
  Fine for POC; revisit if we see organic usage.
- Sessions self-expire in 120s. No background cleanup needed.
- No auth, no secrets — session ids are one-time-use UUIDs known only to the
  user's PC (via QR generation) and their own phone (via scan).
