
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { openApiPlugin } from './openapi'
import { authRoutes } from './modules/auth/auth.route'

const app = new Elysia()
  .use(cors({
    origin: process.env.BASE_URL || 'http://localhost:5173',
    credentials: true,
  }))
  .use(openApiPlugin)
  .use(authRoutes)
  .listen(process.env.PORT || 3000)

console.log(`🦊 Saha API running at http://localhost:${app.server?.port}`)

export type App = typeof app
export { app }