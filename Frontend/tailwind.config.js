export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#4e8ecb',
        'background-main': '#e5e5e5',
        'background-elevated': '#ffffff',
        'text-primary': '#000000',
        'text-secondary': '#333333',
        border: '#e5e5e5'
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
