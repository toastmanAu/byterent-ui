/** @type {import('tailwindcss').Config}
 *
 * Design tokens for ByteRent UI, aligned with the brand mark.
 *
 * The brand is a teal-green hex-padlock gem on navy. Primary accent pulls
 * from the gem's `#0CC095` — `hsl(168, 88%, 42%)` tuned for dark-bg contrast.
 * Surfaces shift toward the brand navy (`hue 213°`) so neutrals harmonize
 * with the logo's base navy rather than clashing with it.
 *
 * Type scale caps at 24px (h1) — we lean on weight + whitespace for hierarchy
 * rather than massive display type, per the product's data-led feel.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        br: {
          // Surfaces — navy-leaning neutrals that sit with the brand mark.
          surface: 'hsl(213 55% 6%)',     // near-black, navy hint
          'surface-1': 'hsl(213 40% 10%)', // cards, sidebar
          'surface-2': 'hsl(213 32% 14%)', // hover, raised
          'surface-3': 'hsl(213 26% 18%)', // top overlay
          border: 'hsl(213 22% 22%)',
          'border-strong': 'hsl(213 22% 30%)',

          // Text
          fg: 'hsl(210 15% 98%)',
          muted: 'rgb(229 237 244 / 0.72)',
          dim: 'rgb(229 237 244 / 0.48)',
          faint: 'rgb(229 237 244 / 0.28)',

          // Accent — brand teal (#0CC095)
          accent: 'hsl(168 88% 42%)',
          'accent-hover': 'hsl(168 80% 54%)',
          'accent-soft': 'hsl(168 70% 62%)',
          'accent-dim': 'hsl(168 60% 14%)',  // dim background for pills
          'accent-ink': 'hsl(213 80% 8%)',   // navy text on accent fills

          // Brand navy — reserved for branded surfaces (hero ribbons etc)
          navy: '#0B304E',
          'navy-deep': '#0A2545',

          // Semantic
          success: 'hsl(142 72% 50%)',
          warning: 'hsl(38 92% 58%)',
          danger: 'hsl(0 72% 58%)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '1.5', letterSpacing: '0.005em' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.55' }],
        lg: ['20px', { lineHeight: '1.35', letterSpacing: '-0.01em' }],
        xl: ['24px', { lineHeight: '1.25', letterSpacing: '-0.015em' }],
      },
      boxShadow: {
        xs: '0 1px 2px rgb(0 0 0 / 0.25)',
        sm: '0 2px 4px rgb(0 0 0 / 0.28), 0 1px 2px rgb(0 0 0 / 0.22)',
        md: '0 6px 12px rgb(0 0 0 / 0.32), 0 2px 4px rgb(0 0 0 / 0.22)',
        lg: '0 12px 24px rgb(0 0 0 / 0.38), 0 4px 8px rgb(0 0 0 / 0.24)',
        'accent-glow':
          '0 0 0 1px hsl(168 88% 42% / 0.4), 0 8px 24px hsl(168 88% 42% / 0.22)',
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        lg: '14px',
        xl: '20px',
      },
      spacing: {
        sidebar: '240px',
      },
      maxWidth: {
        prose: '65ch',
      },
    },
  },
  plugins: [],
};
