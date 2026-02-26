import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Minimal dev setup: frontend calls /api/* and Vite proxies to Flask (no CORS changes needed).
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
