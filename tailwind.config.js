/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './admin.html',
    './campus.html',
    './catalogacao.html',
    './contact.html',
    './territorio.html',
    './timeline.html',
    './trabalhos.html',
    './header.html',
    './footer.html',
    './src/**/*.{js,html}',
  ],
  theme: {
    extend: {
      colors: {
        // Institutional colors
        primary: {
          50: '#f0f7f4',
          100: '#d4ede6',
          200: '#b3dfce',
          300: '#7ed1b0',
          500: '#2e7d32', // Main institutional green
          600: '#26612a',
          700: '#1d4620',
          800: '#142f17',
          900: '#0c1a0d',
        },
        secondary: {
          50: '#fef5e7',
          100: '#fde8c3',
          200: '#fbd99a',
          500: '#f39c12',
          600: '#d68910',
          700: '#af700d',
        },
        neutral: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        state: {
          error: '#dc2626',
          warning: '#f59e0b',
          success: '#10b981',
          info: '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"'],
        serif: ['Georgia', 'serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        0: '0',
        1: '0.25rem',
        2: '0.5rem',
        3: '0.75rem',
        4: '1rem',
        6: '1.5rem',
        8: '2rem',
        12: '3rem',
        16: '4rem',
        20: '5rem',
        24: '6rem',
        32: '8rem',
        40: '10rem',
        48: '12rem',
        56: '14rem',
        64: '16rem',
      },
      borderRadius: {
        none: '0',
        sm: '0.25rem',
        base: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        none: 'none',
      },
      zIndex: {
        hide: '-1',
        auto: 'auto',
        0: '0',
        10: '10',
        20: '20',
        30: '30',
        40: '40',
        50: '50',
        dropdown: '100',
        overlay: '500',
        modal: '1000',
        tooltip: '9999',
      },
      animation: {
        slideInRight: 'slideInRight 0.6s ease-out both',
        slideInLeft: 'slideInLeft 0.6s ease-out both',
        fadeIn: 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          from: { transform: 'translateX(-100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      screens: {
        xs: '20rem',      // 320px
        sm: '36rem',      // 576px (was 640)
        md: '48rem',      // 768px
        lg: '62rem',      // 992px (was 1024)
        xl: '80rem',      // 1280px
        '2xl': '96rem',   // 1536px
      },
    },
  },
  plugins: [
    // Plugin: Container component with max-width constraint
    function ({ addComponents, theme }) {
      addComponents({
        '.container': {
          maxWidth: '100%',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: theme('spacing.4'),
          paddingRight: theme('spacing.4'),
          '@screen sm': {
            paddingLeft: theme('spacing.6'),
            paddingRight: theme('spacing.6'),
          },
          '@screen lg': {
            maxWidth: '62rem',
            paddingLeft: theme('spacing.8'),
            paddingRight: theme('spacing.8'),
          },
        },
      });
    },
  ],
};
