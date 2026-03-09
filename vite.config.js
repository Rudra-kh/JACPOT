import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  root: 'src/renderer',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main:       path.resolve(__dirname, 'src/renderer/index.html'),
        miniplayer: path.resolve(__dirname, 'src/renderer/miniplayer.html'),
      },
    },
  },
  server: {
    port: 5174,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
    },
  },
})
