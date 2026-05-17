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

      // Create proper session with cryptographic token
      const token = await authService.createSession(result.user.id)

      const cookieValue = `session=${token}; HttpOnly; Path=/; SameSite=None; Secure; Domain=.saha.localhost; Max-Age=2592000`
      ctx.resHeaders.set('Set-Cookie', cookieValue)

      return {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          avatarUrl: result.user.avatarUrl,
        },
        organizations: result.organizations,
        orgRoles: result.orgRoles,
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
        workosUserId: u.workosUserId,
      },
    }
  }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    const cookieHeader = ctx.req.headers.get('Cookie')
    const tokenMatch = cookieHeader?.match(/(?:^|;\s*)session=([^;]*)/)
    const token = tokenMatch ? tokenMatch[1] : null

    if (token) {
      await authService.deleteSession(token)
    }

    const cookieValue = 'session=; HttpOnly; Path=/; SameSite=None; Secure; Domain=.saha.localhost; Max-Age=0'
    ctx.resHeaders.set('Set-Cookie', cookieValue)
    return { success: true }
  }),

  hasOrganization: protectedProcedure
    .input(z.object({ workosUserId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const hasOrg = await authService.hasOrganization(input.workosUserId)
      return { hasOrg }
    }),

  createPersonalOrg: protectedProcedure
    .input(z.object({ workosUserId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await authService.createPersonalOrganization(
        ctx.user.id,
        input.workosUserId,
        ctx.user.name
      )
      return result
    }),

  createCompanyOrg: protectedProcedure
    .input(
      z.object({
        workosUserId: z.string().min(1),
        orgName: z.string().min(1).max(100),
        workspaceName: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await authService.createCompanyOrganization(
        ctx.user.id,
        input.workosUserId,
        input.orgName,
        input.workspaceName
      )
      return result
    }),
})
