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
