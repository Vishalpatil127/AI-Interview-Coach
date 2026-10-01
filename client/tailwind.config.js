/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        surface: {
          50:  '#f8faff',
          100: '#f1f4fe',
          200: '#e4e9fc',
          800: '#1e1b4b',
          900: '#0f0e2a',
          950: '#070614',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Cal Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-1': 'radial-gradient(at 40% 20%, hsla(240,80%,70%,0.25) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(260,80%,65%,0.2) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(200,80%,65%,0.15) 0px, transparent 50%)',
        'mesh-dark': 'radial-gradient(at 40% 20%, hsla(240,80%,40%,0.3) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(260,80%,35%,0.25) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(200,80%,35%,0.2) 0px, transparent 50%)',
      },
      animation: {
        'fade-in':    'fadeIn 0.5s ease forwards',
        'fade-up':    'fadeUp 0.5s ease forwards',
        'fade-down':  'fadeDown 0.4s ease forwards',
        'scale-in':   'scaleIn 0.3s ease forwards',
        'slide-right':'slideRight 0.4s ease forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float':      'float 6s ease-in-out infinite',
        'shimmer':    'shimmer 1.5s infinite',
        'glow':       'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        fadeUp:    { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeDown:  { from: { opacity: '0', transform: 'translateY(-16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:   { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        slideRight:{ from: { opacity: '0', transform: 'translateX(-20px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        float:     { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-12px)' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        glow:      { from: { boxShadow: '0 0 20px rgba(99,102,241,0.3)' }, to: { boxShadow: '0 0 40px rgba(99,102,241,0.6)' } },
      },
      boxShadow: {
        'glow-sm':  '0 0 15px rgba(99,102,241,0.25)',
        'glow-md':  '0 0 30px rgba(99,102,241,0.35)',
        'glow-lg':  '0 0 60px rgba(99,102,241,0.4)',
        'glow-accent': '0 0 30px rgba(16,185,129,0.35)',
        'card':     '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.08)',
        'card-hover':'0 4px 24px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
