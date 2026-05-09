import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#005AA3',
          50: '#e6f0f9',
          100: '#cce1f3',
          200: '#99c3e7',
          300: '#66a5db',
          400: '#3387cf',
          500: '#005AA3',
          600: '#004d8c',
          700: '#003f73',
          800: '#00305a',
        },
        secondary: {
          DEFAULT: '#DC3545',
          500: '#DC3545',
          600: '#c82333',
        },
        brand: {
          DEFAULT: '#4C4D4F',
          dark: '#111111',
          gray: '#64708d',
          border: '#ced2db',
          bg: '#f1f4f8',
          navy: '#181f28',
        },
      },
      fontFamily: {
        sans: ['Mona Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        pill: '25px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
        'card-hover': '0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
        'offset': '12px 12px 0 0 #4C4D4F',
        'btn': '0 4px 8px rgba(0,90,163,0.25)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        'fade-in': 'fade-in 0.3s ease-out both',
      },
    },
  },
  plugins: [],
}

export default config
