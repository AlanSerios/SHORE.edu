import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = process.env.SHORE_API_TARGET || 'http://127.0.0.1:5000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy /api requests to local Flask backend during development.
    // When deployed to Vercel, vercel.json handles the proxy to Render.
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      }
    }
  }
})
