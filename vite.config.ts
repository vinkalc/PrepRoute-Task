import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Determine base path: use '/PrepRoute-Task/' for GitHub Pages, '/' for local dev, Netlify, and Vercel
const isGithubPages = process.env.NODE_ENV === 'production' && !process.env.NETLIFY && !process.env.VERCEL;

export default defineConfig({
  base: isGithubPages ? '/PrepRoute-Task/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://admin-moderator-backend-staging.up.railway.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
