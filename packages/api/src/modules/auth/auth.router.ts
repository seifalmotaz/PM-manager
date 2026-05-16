import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../../trpc'
import { authService } from './auth.service'

export const authRouter = router({
  loginUrl: publicProcedure.query(() => {
    const url = authService.getAuthorizationUrl()
    return { url }
  }),

  callback: publicProcedure
    .input(z.object({ code: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const result = await authService.exchangeCode(input.code)

      const cookieValue = `session=${result.user.id}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000${
        process.env.NODE_ENV === 'production' ? '; Secure' : ''
      }`
      ctx.resHeaders.set('Set-Cookie', cookieValue)

      return {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          avatarUrl: result.user.avatarUrl,
        },
        organizations: result.organizations,
        isNew: result.isNew,
        workosUserId: result.workosUserId,
      }
    }),

  session: protectedProcedure.query(({ ctx }) => {
    const u = ctx.user
    return {
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        avatarUrl: u.avatarUrl,
      },
    }
  }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieValue = 'session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0'
    ctx.resHeaders.set('Set-Cookie', cookieValue)
    return { success: true }
  }),
})
