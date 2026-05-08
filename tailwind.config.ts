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
          DEFAULT: '#005EAD',
          50: '#e6f1f9',
          100: '#cce3f3',
          500: '#005EAD',
          600: '#0052a0',
          700: '#004080',
          800: '#003060',
        },
        secondary: {
          DEFAULT: '#DC3545',
          500: '#DC3545',
          600: '#c82333',
        },
        brand: '#4C4D4F',
      },
      fontFamily: {
        sans: ['Mona Sans', 'system-ui', 'sans-serif'],
        heading: ['Mona Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        pill: '25px',
      },
    },
  },
  plugins: [],
}

export default config
