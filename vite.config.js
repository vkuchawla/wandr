import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'WANDR — AI Travel Planner',
        short_name: 'WANDR',
        description: 'Your AI travel companion. Vibe-first itineraries, beautiful story cards, offline access.',
        theme_color: '#1c1612',
        background_color: '#fdf6ed',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: '/icon-512.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
        categories: ['travel', 'lifestyle'],
        shortcuts: [
          {
            name: 'Plan a trip',
            short_name: 'Plan',
            description: 'Start planning a new trip',
            url: '/?action=plan',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // Cache strategies for different resource types
        runtimeCaching: [
          {
            // Itinerary JSON from backend
            urlPattern: /https:\/\/wandr-62i6\.onrender\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'wandr-api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 days
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Unsplash + Google Places photos
            urlPattern: /https:\/\/(images\.unsplash\.com|lh3\.googleusercontent\.com|maps\.googleapis\.com\/.+photo.*)\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'wandr-photo-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 days
            },
          },
          {
            // Fonts
            urlPattern: /https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    allowedHosts: ["plunder-storewide-radiator.ngrok-free.dev", "all"],
    proxy: {
      "/autocomplete": "http://localhost:3001",
      "/hotel-autocomplete": "http://localhost:3001",
      "/itinerary": "http://localhost:3001",
      "/enrich": "http://localhost:3001",
      "/place": "http://localhost:3001",
      "/validate-time": "http://localhost:3001",
      "/chat-edit": "http://localhost:3001",
      "/health": "http://localhost:3001",
      "/blend-profiles": "http://localhost:3001",
    }
  }
})
