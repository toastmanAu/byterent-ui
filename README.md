# ByteRent UI

React + Vite frontend for [ByteRent](https://byterent.xyz) — a marketplace for leasable on-chain CKB storage capacity.

- **Rent cells by the epoch.** Browse open listings, choose capacity and term, pay a single lease fee to unlock on-chain storage you can freely write to.
- **List your idle capacity.** If you hold unused CKB, mint a listing that locks it up and earns rent until the term expires.
- **Cells are real capacity.** ByteRent isn't a wrapper — what you lease is native CKB capacity controlled by the lease lock script.

Live at **<https://byterent.xyz>** (testnet).

## Architecture at a glance

- **Hybrid indexing.** Public CKB RPC for enumeration (listings + leases), in-browser WASM light client (`@nervosnetwork/ckb-light-client-js`) for wallet-specific trustless queries. No backend indexer required — the Rust HTTP indexer that lived at `api.byterent.xyz` was retired 2026-04-24.
- **JoyID wallet via redirect-relay.** The default CCC JoyID connector uses a popup + Chrome's FIDO hybrid (caBLE) QR transport, which is notoriously flaky on Chrome/Linux. We swap it for a redirect-based flow that runs through our own Cloudflare Worker — see [toastmanAu/joyid-ckb-connector](https://github.com/toastmanAu/joyid-ckb-connector).
- **Phone-side confirmation page.** Transaction signing uses JoyID's `/sign-message` endpoint (the only one that supports redirect). Since that endpoint shows users only a hex hash, a trusted preview page on `auth.byterent.xyz` renders the human-readable tx details (amount, recipient, fee) before handing off to Face ID.

## Repos

- **This repo** — React frontend (`src/`) + Cloudflare Worker (`worker/`) that brokers JoyID auth + tx signing.
- [`toastmanAu/joyid-ckb-connector`](https://github.com/toastmanAu/joyid-ckb-connector) — `@byterent/joyid-connect` + `@byterent/joyid-relay` published packages, consumed here via `file:` links.
- Scripts, indexer library, and contract code live in a separate private repo.

## Tech stack

- **Frontend:** React 19, Vite 8, Tailwind CSS, React Router 7, TanStack Query
- **CKB:** `@ckb-ccc/ccc` 1.x, `@joyid/ckb` 1.x, `@nervosnetwork/ckb-light-client-js` 0.5.x
- **Worker:** Cloudflare Workers + Durable Objects (SQLite-backed), free-tier eligible
- **Deploy:** Cloudflare Pages for the SPA + Cloudflare Workers for `auth.byterent.xyz`

## Getting started

```bash
# Prerequisites: Node 20+, npm 10+, the sibling joyid-ckb-connector repo
# checked out at ../joyid-ckb-connector (file: dep target).

git clone https://github.com/toastmanAu/byterent-ui
cd byterent-ui
npm install

# Dev server (Vite)
npm run dev

# Type-check + production build
npm run build

# Preview the production build locally
npm run preview
```

The app defaults to testnet — listings and leases you see are real CKB testnet cells. Wallet-connect requires a JoyID passkey on an iOS device (camera scan → Face ID).

### Environment variables

Vite only exposes `VITE_*`-prefixed variables to client code. Copy `.env.example` to `.env.local` and override if needed. Defaults work out-of-the-box against the deployed `auth.byterent.xyz` Worker.

### Worker

The `worker/` subdirectory is a standalone Cloudflare Worker. It's a thin consumer of `@byterent/joyid-relay` that adds the ByteRent-specific CORS allowlist + branded logo payload.

```bash
cd worker
npm install
npx wrangler deploy   # deploys to auth.byterent.xyz
```

## Conventions

- **Currency labels** use `CKB` everywhere in user-facing copy. The TESTNET badge in the sidebar handles network disclosure.
- **Bundle size** is intentionally heavy (~11 MB / 5 MB gz) — dominated by the WASM light client. Code-splitting is tracked as follow-up work.
- **Cross-origin isolation** (`COOP: same-origin`, `COEP: require-corp`) is required for the light client's SharedArrayBuffer use. Set via `public/_headers` for Cloudflare Pages and `vite.config.ts` for dev.

## License

MIT. See individual package licenses for transitive deps.
