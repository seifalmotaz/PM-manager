import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: true,
    host: process.env.HOST || '127.0.0.1',
  },
})
