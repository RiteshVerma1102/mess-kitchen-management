import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Strict Design Tokens matching Reference Screenshots
        brand: {
          DEFAULT: '#087E8B',
          hover: '#066873',
          light: '#DDF3F3',
          subtle: '#F0F9F9',
        },
        surface: {
          bg: '#F5F7FA',
          card: '#FFFFFF',
          sidebar: '#FFFFFF',
          border: '#E5EAF0',
        },
        content: {
          primary: '#253746',
          secondary: '#718096',
          muted: '#A0AEC0',
        },
        status: {
          success: '#16A36A',
          'success-bg': '#E8F7F0',
          warning: '#E9A23B',
          'warning-bg': '#FEF6E9',
          danger: '#DC5353',
          'danger-bg': '#FCEEEE',
        },
        // Backward compatibility
        ink: '#253746',
        paper: '#F5F7FA',
        line: '#E5EAF0',
      },
      minHeight: { tap: '3.5rem' },
      minWidth: { tap: '3.5rem' },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(37, 55, 70, 0.04)',
        xs: '0 1px 3px 0 rgba(37, 55, 70, 0.06), 0 1px 2px -1px rgba(37, 55, 70, 0.04)',
        sm: '0 2px 6px -1px rgba(37, 55, 70, 0.08), 0 2px 4px -2px rgba(37, 55, 70, 0.05)',
        md: '0 4px 12px -2px rgba(37, 55, 70, 0.08), 0 2px 6px -2px rgba(37, 55, 70, 0.05)',
      },
    },
  },
  plugins: [],
};

export default config;
