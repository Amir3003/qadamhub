/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Daylight Warm Pearl & Soft Ivory Palette (Stripe / Arc Inspired)
        bg: '#F4F5F8', // Warm Alabaster / Soft Pearl Canvas
        sidebar: '#FFFFFF', // Crisp White Sidebar
        surface: {
          DEFAULT: '#FFFFFF', // Crisp Warm White Card
          hover: '#F8FAFC',   // Hover Surface
          subtle: '#EAECEF',  // Secondary / Contrasting Tinted Stone
          tint: '#E8F3EE',    // Soft Mint-Tinted Stone
        },
        border: {
          DEFAULT: '#E2E8F0', // Soft subtle border
          strong: '#CBD5E1',  // Focus / highlight border
        },
        text: {
          DEFAULT: '#0F172A', // Deep Slate Navy Primary
          2: '#334155',       // Rich Charcoal Slate Body
          muted: '#64748B',   // Warm Slate Muted
          'muted-2': '#94A3B8', // Deep Muted Slate
        },
        accent: {
          DEFAULT: '#0D9488', // Vibrant Emerald-Teal Primary
          light: '#10B981',   // Warm Emerald
          border: '#0D9488',  // Teal Accent Border
          indigo: '#4F46E5',  // Electric Indigo Accent
          sky: '#0284C7',     // Sky Blue
          amber: '#D97706',   // Warm Amber
          rose: '#E11D48',    // Coral Rose
        },
        warning: {
          DEFAULT: '#D97706',
          text: '#B45309',
        },
      },
      // Motion: one ease-out curve for everything that enters or responds, a softer one for
      // sliding thumbs and sheets. Only transform and opacity animate.
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.23, 1, 0.32, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        ios: 'cubic-bezier(0.32, 0.72, 0, 1)',
        spring: 'cubic-bezier(0.34, 1.45, 0.64, 1)',
      },
      transitionDuration: {
        DEFAULT: '180ms',
      },
      // The individual `scale` property joins the lists so button press feedback eases back.
      transitionProperty: {
        DEFAULT:
          'color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, scale, filter, backdrop-filter',
        colors: 'color, background-color, border-color, text-decoration-color, fill, stroke, scale',
      },
      keyframes: {
        'overlay-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'modal-in': {
          from: { opacity: '0', transform: 'translate3d(0, 10px, 0) scale(0.97)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0) scale(1)' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'translate3d(0, -4px, 0) scale(0.96)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0) scale(1)' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translate3d(0, 14px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translate3d(0, 6px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
      },
      // `backwards` holds the start state during a delay and leaves the element untouched afterwards.
      animation: {
        'overlay-in': 'overlay-in 180ms cubic-bezier(0.23, 1, 0.32, 1) backwards',
        'modal-in': 'modal-in 260ms cubic-bezier(0.23, 1, 0.32, 1) backwards',
        'pop-in': 'pop-in 160ms cubic-bezier(0.23, 1, 0.32, 1) backwards',
        'rise-in': 'rise-in 560ms cubic-bezier(0.23, 1, 0.32, 1) backwards',
        fadeIn: 'fadeIn 240ms cubic-bezier(0.23, 1, 0.32, 1) backwards',
      },
      boxShadow: {
        card: '0 12px 40px -12px rgba(15, 23, 42, 0.08)',
        elevated: '0 20px 48px -16px rgba(15, 23, 42, 0.12)',
        subtle: '0 4px 20px -4px rgba(15, 23, 42, 0.04)',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        btn: '8px',
        card: '16px',
        '3xl': '24px',
      },
      fontSize: {
        pageTitle: ['18px', { lineHeight: '24px', fontWeight: '600' }],
        subheading: ['15px', { lineHeight: '20px', fontWeight: '600' }],
        body: ['13px', { lineHeight: '18px' }],
        caption: ['12px', { lineHeight: '16px' }],
        mini: ['12px', { lineHeight: '16px' }],
      },
    },
  },
  plugins: [],
}
