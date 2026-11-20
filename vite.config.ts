/// <reference types="vitest/config" />
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  // /api → FastAPI backend (docker compose exposes it on 127.0.0.1:8010)
  server: { port: 5173, strictPort: true, proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8010' } },
  preview: { proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8010' } },
  build: { chunkSizeWarningLimit: 600 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
