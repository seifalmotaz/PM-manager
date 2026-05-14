import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { db } from '../../db/connection'
import { auditLogs } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'

export const auditRouter = router({
  forEntity: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.string().uuid(),
      }),
    )
    .query(async ({ input }) => {
      const rows = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.entityId, input.entityId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(50)
      return rows
    }),
})