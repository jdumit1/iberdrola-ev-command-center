/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        iberdrola: {
          900: '#00382A',
          800: '#00442F',
          700: '#00563F',
          600: '#007A5A',
          500: '#009E73',
          400: '#33B589',
          300: '#66CBA0',
          200: '#99E1B7',
          100: '#CCF0DB',
          50:  '#E6F8ED',
          accent: '#A3D133',
          'accent-dark': '#8AB92A',
          'accent-light': '#C4E466',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
