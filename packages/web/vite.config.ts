import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [sveltekit()],
  envDir: '../../',
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    host: process.env.HOST || 'localhost',
    strictPort: true,
  }
})