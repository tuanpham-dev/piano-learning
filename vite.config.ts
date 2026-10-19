/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'silence.wav'],
      manifest: {
        name: 'Piano Learning',
        short_name: 'Piano',
        description: 'Learn piano: songs, note reading, ear training, rhythm, and lessons.',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        background_color: '#fbfaf6',
        theme_color: '#b5303a',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,mp3,wav,woff,woff2,json,svg,png}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // VexFlow (with its music fonts) is most of the bundle; keep it in its own long-lived chunk.
        manualChunks: { vexflow: ['vexflow'], react: ['react', 'react-dom', 'react-router-dom'] },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
