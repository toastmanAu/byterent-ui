// Minimal icon set — inline SVGs, stroke-based, 20px default. Keeping the
// set tiny and purpose-built rather than pulling a full icon library; anything
// we need is 10 lines of JSX away.

interface IconProps {
  size?: number;
  className?: string;
}

const defaults = {
  width: 20,
  height: 20,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function GridIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...defaults} width={size} height={size} className={className}>
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.5" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" />
      <rect x="11.5" y="11.5" width="6" height="6" rx="1.5" />
    </svg>
  );
}

export function ReceiptIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...defaults} width={size} height={size} className={className}>
      <path d="M4 3h12v14l-2-1.5L12 17l-2-1.5L8 17l-2-1.5L4 17V3Z" />
      <path d="M7 7h6M7 10h6M7 13h3" />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...defaults} width={size} height={size} className={className}>
      <path d="M12 5l-5 5 5 5M7 10h11" />
    </svg>
  );
}

export function WalletIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...defaults} width={size} height={size} className={className}>
      <path d="M3 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2H3V6Z" />
      <path d="M3 8h14v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8Z" />
      <circle cx="13.5" cy="12.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function DatabaseIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...defaults} width={size} height={size} className={className}>
      <ellipse cx="10" cy="4" rx="6.5" ry="2" />
      <path d="M3.5 4v6c0 1.1 2.9 2 6.5 2s6.5-.9 6.5-2V4" />
      <path d="M3.5 10v6c0 1.1 2.9 2 6.5 2s6.5-.9 6.5-2v-6" />
    </svg>
  );
}

export function LightningIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...defaults} width={size} height={size} className={className}>
      <path d="M11 2.5 4 12h5l-1 5.5L15 8h-5l1-5.5Z" />
    </svg>
  );
}

export function FileIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...defaults} width={size} height={size} className={className}>
      <path d="M5 2h7l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
      <path d="M12 2v4h4" />
    </svg>
  );
}

export function SettingsIcon({ size = 20, className }: IconProps) {
  // Cog/gear — 8 teeth on a central hub. Previously this was a sun
  // (rays from a centre circle) which universally reads as "light
  // mode toggle" rather than settings.
  return (
    <svg {...defaults} width={size} height={size} className={className}>
      <path d="M10 2.5c.2 0 .4.15.45.35l.35 1.5a6 6 0 0 1 1.6.67l1.28-.85a.5.5 0 0 1 .62.07l1.4 1.4a.5.5 0 0 1 .07.62l-.85 1.28a6 6 0 0 1 .67 1.6l1.5.35c.2.05.35.25.35.45v2c0 .2-.15.4-.35.45l-1.5.35a6 6 0 0 1-.67 1.6l.85 1.28a.5.5 0 0 1-.07.62l-1.4 1.4a.5.5 0 0 1-.62.07l-1.28-.85a6 6 0 0 1-1.6.67l-.35 1.5a.5.5 0 0 1-.45.35h-2a.5.5 0 0 1-.45-.35l-.35-1.5a6 6 0 0 1-1.6-.67l-1.28.85a.5.5 0 0 1-.62-.07l-1.4-1.4a.5.5 0 0 1-.07-.62l.85-1.28a6 6 0 0 1-.67-1.6l-1.5-.35A.5.5 0 0 1 1.5 11V9c0-.2.15-.4.35-.45l1.5-.35a6 6 0 0 1 .67-1.6l-.85-1.28a.5.5 0 0 1 .07-.62l1.4-1.4a.5.5 0 0 1 .62-.07l1.28.85a6 6 0 0 1 1.6-.67l.35-1.5A.5.5 0 0 1 8 2.5h2Z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  );
}
