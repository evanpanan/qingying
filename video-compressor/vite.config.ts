import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Tauri expects the dev server on port 1420
  server: {
    port: 1420,
    strictPort: true,
  },
  // Prevent Vite from clearing the screen (Tauri dev output is useful).
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
})
