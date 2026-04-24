// Minimal toast notification system. Fixed-position bottom-center
// stack, auto-dismissing, safe-area-aware. Imperative API so any
// module can fire a toast without threading a hook through props.
//
// Usage:
//   import { toast } from './Toast';
//   toast.success('Tx submitted');
//   toast.error('Pool rejected');
//   toast.info('Fetching…');
//
// Mount <ToastContainer /> once at the app root.

import { useEffect, useState } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
  /** Optional action-like trailing link (explorer URL, etc.). */
  href?: string;
  hrefLabel?: string;
}

type Listener = (t: ToastMessage) => void;

// Module-level subscription bus. The container subscribes on mount,
// producers call emit() from anywhere. Keeps the public API
// hook-free, so callers don't need a provider wrapper.
let nextId = 1;
const listeners = new Set<Listener>();

function emit(kind: ToastKind, text: string, extra?: Pick<ToastMessage, 'href' | 'hrefLabel'>) {
  const msg: ToastMessage = { id: nextId++, kind, text, ...extra };
  for (const l of listeners) l(msg);
}

export const toast = {
  success: (text: string, extra?: Pick<ToastMessage, 'href' | 'hrefLabel'>) =>
    emit('success', text, extra),
  error: (text: string, extra?: Pick<ToastMessage, 'href' | 'hrefLabel'>) =>
    emit('error', text, extra),
  info: (text: string, extra?: Pick<ToastMessage, 'href' | 'hrefLabel'>) =>
    emit('info', text, extra),
};

const DEFAULT_TTL_MS = 6000;

export function ToastContainer() {
  const [queue, setQueue] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener: Listener = (t) => {
      setQueue((q) => [...q, t]);
      // Schedule auto-dismiss. Individual TTLs could later be
      // parameterised per-kind (errors longer, info shorter).
      window.setTimeout(() => {
        setQueue((q) => q.filter((m) => m.id !== t.id));
      }, DEFAULT_TTL_MS);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (queue.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      // Pin to the TOP of the viewport — the bottom has the sticky
      // ActiveLeaseBar (Layout.tsx) which was occluding the toast
      // even with higher z-index. Top-aligned is also the default
      // convention for "just submitted" style success banners and
      // sidesteps the wallet-bar-height-estimation problem across
      // varied layouts.
      className="
        pointer-events-none fixed left-0 right-0 z-[300]
        flex flex-col items-center gap-2 px-4
        top-[calc(env(safe-area-inset-top)+16px)]
      "
    >
      {queue.map((m) => (
        <ToastItem key={m.id} message={m} onDismiss={() => setQueue((q) => q.filter((x) => x.id !== m.id))} />
      ))}
    </div>
  );
}

function ToastItem({ message, onDismiss }: { message: ToastMessage; onDismiss: () => void }) {
  const color =
    message.kind === 'success'
      ? 'border-br-accent/50 bg-br-surface-1'
      : message.kind === 'error'
        ? 'border-br-danger/50 bg-br-surface-1'
        : 'border-br-border bg-br-surface-1';

  const dotColor =
    message.kind === 'success'
      ? 'bg-br-accent'
      : message.kind === 'error'
        ? 'bg-br-danger'
        : 'bg-br-dim';

  return (
    <div
      role="status"
      className={`
        pointer-events-auto w-full max-w-sm
        flex items-start gap-3
        rounded-xl border ${color}
        px-4 py-3 text-sm text-br-fg
        shadow-[0_14px_40px_rgba(0,0,0,0.5)]
        backdrop-blur-sm
      `}
    >
      <span className={`mt-1.5 inline-block h-2 w-2 rounded-full ${dotColor} shrink-0`} aria-hidden />
      <div className="flex-1 min-w-0">
        <div className="break-words">{message.text}</div>
        {message.href && (
          <a
            href={message.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block font-mono text-[11px] text-br-accent hover:underline break-all"
          >
            {message.hrefLabel ?? message.href}
          </a>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="text-br-dim hover:text-br-fg text-lg leading-none shrink-0"
      >
        ×
      </button>
    </div>
  );
}
