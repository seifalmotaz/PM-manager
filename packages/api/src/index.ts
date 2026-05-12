

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { trpcServer } from '@hono/trpc-server'
import { appRouter } from './router'
import { createContext } from './trpc'
import { db } from './db/connection'

// Environment variable validation at startup
const requiredEnvVars = ['DATABASE_URL', 'WORKOS_API_KEY', 'WORKOS_CLIENT_ID', 'BASE_URL'] as const
const missing = requiredEnvVars.filter(key => !process.env[key])
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
}

const app = new Hono()

app.use(
  '/*',
  cors({
    origin: [
      'http://localhost:5173',
      'https://saha.localhost',
      process.env.BASE_URL ?? '',
    ].filter(Boolean),
    credentials: true,
  }),
)

app.use('/trpc/*', trpcServer({ router: appRouter, createContext }))

app.get('/health', async (c) => {
  // check database connection
  const res = await db.execute('select 1')
  return c.json({ message: 'OK', connection: res[0] ? 'Connected' : 'Disconnected', time: new Date(), })
})

export default {
  port: Number(process.env.PORT || 3000),
  hostname: '127.0.0.1',
  fetch: app.fetch,
}

export type AppRouter = typeof appRouter
