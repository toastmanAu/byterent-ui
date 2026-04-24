// In-app confirmation modal shown on mobile BEFORE the app navigates
// away to JoyID's /sign-message page.
//
// Why this exists:
//   JoyID's /sign-message endpoint (the only CKB-tx-capable endpoint
//   supporting redirect mode) shows the user only a hex hash during
//   Face ID. Acceptable for cryptographic correctness, opaque for
//   users. On desktop we handle this with a trusted preview page at
//   auth.byterent.xyz/tx-launch/:id. On mobile there's no cross-
//   device handoff — the browser is ON the user's phone already —
//   so the review has to happen in the app itself, just before we
//   `window.location.assign(joyidSignUrl)`.

import type { TxPreview } from '@byterent/joyid-connect';

export interface MobileSignConfirmProps {
  preview: TxPreview;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MobileSignConfirm({ preview, onConfirm, onCancel }: MobileSignConfirmProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="
        fixed inset-0 z-[250]
        flex items-end sm:items-center justify-center
        bg-black/70 backdrop-blur-sm
      "
      onClick={onCancel}
    >
      <div
        className="
          w-full sm:max-w-md
          bg-br-surface-1 border-t sm:border border-br-border
          rounded-t-2xl sm:rounded-2xl
          px-5 pt-6
          pb-[calc(env(safe-area-inset-bottom)+16px)]
          shadow-[0_-20px_60px_rgba(0,0,0,0.5)]
        "
        onClick={(e) => e.stopPropagation()}
      >
        <header className="text-center">
          {preview.network && (
            <span
              className="
                inline-block text-[10px] font-semibold uppercase
                tracking-[0.14em] text-br-accent
                border border-br-accent/60 rounded-full
                px-2 py-0.5 mb-3
              "
            >
              {preview.network}
            </span>
          )}
          <div className="text-xs uppercase tracking-[0.14em] text-br-muted">
            {preview.title}
          </div>
          {preview.amount && (
            <div className="mt-2 text-[34px] font-semibold text-br-accent tracking-tight break-words">
              {preview.amount}
            </div>
          )}
        </header>

        <dl className="mt-5 overflow-hidden rounded-xl bg-br-surface-2">
          {preview.details.map((row, i) => (
            <div
              key={`${row.label}-${i}`}
              className={`flex items-start justify-between gap-3 px-4 py-3 ${
                i < preview.details.length - 1 ? 'border-b border-br-border' : ''
              }`}
            >
              <dt className="text-xs text-br-dim shrink-0">{row.label}</dt>
              <dd
                className={`text-xs text-br-fg text-right break-words max-w-[60%] ${
                  row.mono ? 'font-mono' : ''
                }`}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-[11px] text-br-dim leading-snug text-center">
          Tapping Confirm will open JoyID for a Face ID / Touch ID prompt.
          JoyID will show only a hex hash — the details above are what
          you&rsquo;re authorising.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="
              py-3 rounded-lg text-sm font-medium
              bg-br-surface-2 text-br-fg border border-br-border
              active:brightness-95
            "
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="
              py-3 rounded-lg text-sm font-semibold
              bg-br-accent text-br-accent-ink
              active:brightness-90
            "
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
