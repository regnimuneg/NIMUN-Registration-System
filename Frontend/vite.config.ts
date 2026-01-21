import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // Use local public directory if it exists, otherwise fall back to root public
  publicDir: path.resolve(__dirname, 'public'),
  server: {
    host: true
  }
})

