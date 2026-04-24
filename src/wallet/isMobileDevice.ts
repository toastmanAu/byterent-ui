// UA-based mobile detection used to pick the wallet-connect flow.
//
// The question we're answering is "does this device have a native
// passkey it can talk to on its own?" — NOT "how wide is the viewport?"
// A desktop user in a narrow Chrome window still has no onboard
// passkey hardware, and needs the QR-to-phone redirect-relay flow.
// A phone in landscape with a wide viewport can sign natively.
//
// UA parsing is flaky long-term (iPadOS Safari cosplays as desktop
// since iOS 13, new devices appear, etc.) but fine as a first-cut
// heuristic. Overridable via ?forceMobile=1 / ?forceDesktop=1 query
// params so users stuck on the wrong path can self-rescue.

// Canonical mobile-UA tokens. Each token appears ONLY in mobile-intent
// user agents:
//   - Android — all Android browsers
//   - iPhone / iPad / iPod — all iOS browsers
//   - BlackBerry / IEMobile / Opera Mini / webOS — legacy but cheap to keep
//   - Mobi — catches Firefox Android, Samsung Internet, and any future
//     mobile UA that follows the "platform-plus-Mobi" convention.
//     Desktop UAs never contain "Mobi" — unlike the looser "Mobile"
//     token which can show up in custom browser/extension strings.
const MOBILE_UA_RE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi\b/i;

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const params = new URLSearchParams(window.location.search);
  if (params.get('forceMobile') === '1') return true;
  if (params.get('forceDesktop') === '1') return false;

  // iPadOS since 13 identifies as desktop Safari. Catch it via the
  // touch-point heuristic: no modern desktop has a touch screen with
  // more than 1 concurrent touch point AND a Mac-like UA.
  const ua = navigator.userAgent;
  const isIPadMasqueradingAsMac =
    /Macintosh/.test(ua) &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 1;

  return MOBILE_UA_RE.test(ua) || isIPadMasqueradingAsMac;
}
