export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#183591',
        'background-main': '#e5e5e5',
        'background-elevated': '#ffffff',
        'text-primary': '#000000',
        'text-secondary': '#333333',
        border: '#e5e5e5'
      },
      // NIMUN'27: square corners everywhere except pills/toggles (rounded-full)
      borderRadius: { md: '0', lg: '0', xl: '0', '2xl': '0', '3xl': '0' },
      fontFamily: {
        sans: ['Consolas', 'Inconsolata', '"Cascadia Mono"', 'Menlo', 'monospace'],
        mono: ['Consolas', 'Inconsolata', '"Cascadia Mono"', 'Menlo', 'monospace'],
        display: ['"Monument Extended"', 'Archivo', '"Arial Black"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
