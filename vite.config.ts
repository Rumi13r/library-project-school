import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // За вашия API
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        // Не пренасочвай placeholder заявки към локалния API
        bypass: (req) => {
          if (req.url && req.url.includes('/api/placeholder')) {
            return req.url;
          }
        }
      },
      // Специален proxy за placeholder услуги
      '/api/placeholder': {
        target: 'https://via.placeholder.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/placeholder/, ''),
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  esbuild: {
    drop: ['console', 'debugger'] // 🚀 Премахва всички console.* и debugger в production
  }
})