import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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