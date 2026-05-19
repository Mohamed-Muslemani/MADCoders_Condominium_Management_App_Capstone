import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: [
      'pacific-nurturing-production.up.railway.app',
      'condosmanager.com',
      'www.condosmanager.com',
    ],
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: [
      'pacific-nurturing-production.up.railway.app',
      'condosmanager.com',
      'www.condosmanager.com',
    ],
  },
})
