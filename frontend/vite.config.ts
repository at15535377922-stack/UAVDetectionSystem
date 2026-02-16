import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if ((err as any).code === 'ECONNREFUSED' || (err as any).code === 'ECONNABORTED') {
              // Backend offline — silently ignore
              return
            }
            console.error('[proxy]', err.message)
          })
        },
      },
    },
  },
})
