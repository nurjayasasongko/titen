import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Served from https://nurjayasasongko.github.io/titen/ in production, but at
// the root during local dev so the LAN preview URL stays clean.
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/titen/' : '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
}))
