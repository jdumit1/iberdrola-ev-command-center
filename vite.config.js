import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  preview: {
    // Allow Railway public domains when serving via `vite preview` in production.
    allowedHosts: ['.up.railway.app'],
  },
})
