/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// The app always runs on this port. Browser storage (IndexedDB) is tied to the
// exact address (http://localhost:5180), so if the port changed, the app would
// open with empty data. `strictPort` makes Vite stop with an error instead of
// silently picking another port.
const PORT = 5180

// When hosted on GitHub Pages the app lives under a sub-path such as
// https://<user>.github.io/<repo>/. The deploy workflow sets BASE_PATH to
// "/<repo>/". Locally it stays "/".
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  server: { port: PORT, strictPort: true },
  preview: { port: PORT, strictPort: true },
  plugins: [
    react(),
    // Makes the app installable (own icon, own window) and usable offline.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: '12 Week Tracker',
        short_name: '12 Week',
        description: 'Track the execution of your 12-week plan. Your data stays on this device.',
        theme_color: '#1f2937',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
