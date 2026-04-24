# ByteRent UI

React + Vite frontend for [ByteRent](https://byterent.xyz) — an on-chain marketplace for leasable CKB capacity on Nervos.

Live at **<https://byterent.xyz>** (testnet).

## What ByteRent is

CKB cells are measured in native capacity (shannons). If you hold idle CKB, you can mint a **listing** that commits a slice of that capacity to a lease pool for a fixed number of epochs at a quoted rate. Another user takes a **lease** against the listing by paying the rate and locks the capacity for their own use until the term expires — typically to park data on-chain (via [CKBFS](https://github.com/code-monad/ckbfs)) or to satisfy a contract's capacity reservation. When the term ends, the capacity reverts to the lister.

There's no wrapping or bridging — leased capacity is native CKB cells controlled by the ByteRent lease lock script, auditable and movable like any other CKB state.

## Architecture at a glance

- **Hybrid indexing.** Public CKB RPC for enumeration (listings + leases), in-browser WASM light client (`@nervosnetwork/ckb-light-client-js`) for wallet-specific trustless queries. No backend indexer required — the Rust HTTP indexer that used to live at `api.byterent.xyz` was retired 2026-04-24.
- **JoyID wallet via redirect-relay.** The default CCC JoyID connector uses a popup + Chrome's FIDO hybrid (caBLE) QR transport, which is notoriously flaky on Chrome/Linux. We swap it for a redirect-based flow brokered by our own Cloudflare Worker — see [`toastmanAu/joyid-ckb-connector`](https://github.com/toastmanAu/joyid-ckb-connector).
- **Phone-side confirmation page.** Transaction signing uses JoyID's `/sign-message` endpoint (the only one supporting redirect). Since that endpoint shows only a hex hash, a trusted preview page on `auth.byterent.xyz` renders the human-readable tx details (amount, recipient, fee) before handing off to Face ID.

## Related repos

- [`toastmanAu/byterent`](https://github.com/toastmanAu/byterent) — Rust contracts, indexer library, deployment scripts, and the on-chain protocol logic.
- [`toastmanAu/joyid-ckb-connector`](https://github.com/toastmanAu/joyid-ckb-connector) — `@byterent/joyid-connect` + `@byterent/joyid-relay` packages, consumed here via `file:` links.

## Tech stack

- React 19, Vite 8, Tailwind 3, React Router 7, TanStack Query 5
- `@ckb-ccc/ccc` 1.x, `@joyid/ckb` 1.x, `@nervosnetwork/ckb-light-client-js` 0.5.x
- Cloudflare Workers + Durable Objects (SQLite-backed, free-tier eligible) for `auth.byterent.xyz`
- Cloudflare Pages for the SPA

## Getting started

```bash
# Prerequisites: Node 20+, npm 10+, and the sibling joyid-ckb-connector repo
# checked out alongside this one (the package.json uses a file: dep pointing at
# ../joyid-ckb-connector/packages/joyid-connect).

git clone https://github.com/toastmanAu/joyid-ckb-connector
git clone https://github.com/toastmanAu/byterent-ui
cd byterent-ui
npm install

npm run dev       # Vite dev server
npm run build     # tsc -b && vite build
npm run preview   # Serve the production build locally
```

The app defaults to testnet — listings and leases you see are real CKB testnet cells. Wallet-connect requires a JoyID passkey on an iOS device (camera scan → Face ID).

### Environment variables

Vite only exposes `VITE_*`-prefixed variables to client code. Copy `.env.example` to `.env.local` and override as needed; defaults work against the deployed `auth.byterent.xyz` Worker.

### Worker

The `worker/` subdirectory is a standalone Cloudflare Worker — a thin consumer of `@byterent/joyid-relay` that adds the ByteRent-specific CORS allowlist + branded logo payload.

```bash
cd worker
npm install
npx wrangler deploy   # deploys to auth.byterent.xyz
```

## Conventions

- **Currency labels.** UI copy uses `CKB` throughout; the TESTNET badge in the sidebar handles network disclosure.
- **Bundle size.** ~11 MB / 5 MB gzipped, dominated by the WASM light client. Code-splitting is tracked as follow-up work.
- **Cross-origin isolation.** `COOP: same-origin` + `COEP: require-corp` are required for the light client's SharedArrayBuffer use. Set via `public/_headers` for Cloudflare Pages and `vite.config.ts` for dev.

## License

MIT — see [LICENSE](./LICENSE).
