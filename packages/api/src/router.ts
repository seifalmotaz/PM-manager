import { router } from './trpc'
import { authRouter } from './modules/auth/auth.router'

export const appRouter = router({
  auth: authRouter,
})

export type AppRouter = typeof appRouter
