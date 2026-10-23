/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Used across Layout, CategoryCard and PremiumLoader (text-gold, border-gold/20, …)
        gold: {
          DEFAULT: '#D4AF37',
          light: '#E8CF73',
          dark: '#B8942E',
        },
        premium: {
          gold: '#D4AF37',
          charcoal: '#1A1A1A',
          cream: '#F5F5F0',
          burgundy: '#800020',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // Fraunces: variable serif (300–700 + italics) used for all display headings
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}