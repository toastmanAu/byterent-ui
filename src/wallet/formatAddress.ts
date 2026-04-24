// Decision: show the full CKB address, wrapped across multiple lines.
//
// Truncation ('ckt1qz...xwsq') hides exactly the middle/suffix that a user
// visually scans when verifying the address matches their wallet — which is
// the one moment this display actually matters. The full string + CSS
// `break-all` keeps the address copy-pasteable (nothing is inserted into the
// string; only the rendered layout wraps) and lets the user trust what they
// see.

export function formatAddress(address: string): string {
  return address;
}
