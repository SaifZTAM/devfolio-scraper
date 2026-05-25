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
        cream: {
          50:  '#FDFAF4',
          100: '#F9F4EA',
          200: '#F2EAD8',
          300: '#E8DCC4',
          400: '#D9C9A8',
          DEFAULT: '#F5F0E6',
        },
        forest: {
          50:  '#EEF5EF',
          100: '#D4E8D6',
          200: '#A8D0AC',
          300: '#6DAF75',
          400: '#3D8C48',
          500: '#2A5C34',
          600: '#1E4426',
          700: '#153320',
          DEFAULT: '#2A5C34',
        },
        bark: {
          100: '#EDE4D3',
          200: '#D8CAAF',
          300: '#B8A88A',
          400: '#8C7A5E',
          500: '#5C4F3A',
          DEFAULT: '#8C7A5E',
        },
        ink: {
          DEFAULT: '#1C2B1C',
          secondary: '#4A5E4A',
          muted: '#7A8F7A',
          disabled: '#B4C4B4',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 4px rgba(28,43,28,0.06), 0 4px 16px rgba(28,43,28,0.04)',
        'card-hover': '0 2px 8px rgba(28,43,28,0.1), 0 8px 24px rgba(28,43,28,0.08)',
        'input-focus': '0 0 0 3px rgba(42,92,52,0.15)',
        'btn': '0 1px 3px rgba(28,43,28,0.2)',
        'btn-hover': '0 2px 8px rgba(28,43,28,0.25)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      backgroundImage: {
        'nature-texture': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232a5c34' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease forwards',
        'shimmer': 'shimmer 1.6s linear infinite',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { 'background-position': '-400px 0' },
          '100%': { 'background-position': '400px 0' },
        },
      },
    },
  },
  plugins: [],
}
export default config
