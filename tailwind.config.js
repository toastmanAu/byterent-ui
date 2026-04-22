/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Placeholder accent palette — Chunk 3 will replace with a full
      // ByteRent-native palette via the ui-design skill.
      colors: {
        byterent: {
          accent: '#5ae58f',     // interim green — will re-pick
          surface: '#0f1012',    // background
          elevated: '#171a1d',   // cards / sidebar
          muted: '#9ba0a6',      // secondary text
          border: '#232629',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
