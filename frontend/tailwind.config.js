/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        temple: {
          ivory: '#FDFBF7',
          parchment: '#FAF5EC',
          sand: '#F3ECE0',
          border: '#E8DCCE',
          saffron: {
            DEFAULT: '#C86A1B',
            light: '#E68A35',
            dark: '#A65311',
            bg: '#FDF4EB'
          },
          maroon: {
            DEFAULT: '#7A1C23',
            light: '#962A33',
            dark: '#5C1217',
            bg: '#FBF0F1'
          },
          gold: {
            DEFAULT: '#C99700',
            light: '#E0AE18',
            dark: '#9E7700'
          },
          charcoal: {
            DEFAULT: '#2D2520',
            muted: '#61544B',
            light: '#8F8278'
          }
        }
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'serif'],
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    },
  },
  plugins: [],
}

