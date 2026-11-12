import type { Config } from 'tailwindcss';

// Design tokens live as CSS variables in globals.css so light/dark and the
// high-contrast kitchen theme can be swapped without touching components.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--ink) / <alpha-value>)',
        paper: 'rgb(var(--paper) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        brand: 'rgb(var(--brand) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
      },
      minHeight: { tap: '3.5rem' }, // 56px glove-friendly tap target
      minWidth: { tap: '3.5rem' },
    },
  },
  plugins: [],
};
export default config;
