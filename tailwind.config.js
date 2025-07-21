/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Emma AI Emotional Color System
        trust: {
          50: '#eff6ff',
          100: '#dbeafe', 
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        warm: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a', 
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        crisis: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        growth: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'voice-lg': ['1.5rem', { lineHeight: '2rem' }],
        'voice-md': ['1.25rem', { lineHeight: '1.75rem' }],
      },
      animation: {
        'gentle-pulse': 'gentle-pulse 2s ease-in-out infinite',
        'thinking-pulse': 'thinking-pulse 1.5s ease-in-out infinite',
        'audio-responsive': 'audio-responsive 0.1s ease-out infinite',
        'message-appear': 'message-appear 0.4s ease-out',
        'crisis-modal-appear': 'crisis-modal-appear 0.3s ease-out',
      },
      keyframes: {
        'gentle-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        'thinking-pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'audio-responsive': {
          'to': { transform: 'scale(calc(1 + var(--audio-level, 0) * 0.3))' },
        },
        'message-appear': {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        'crisis-modal-appear': {
          'from': { opacity: '0', transform: 'scale(0.9) translateY(20px)' },
          'to': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}