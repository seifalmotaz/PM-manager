import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { WorkOS } from '@workos-inc/node'
import { db } from '../../db/connection'
import { users, workspaces, organizationSettings } from '../../db/schema'
import { eq } from 'drizzle-orm'

const workos = new WorkOS(process.env.WORKOS_API_KEY!, {
  clientId: process.env.WORKOS_CLIENT_ID!,
})

export const repairRouter = router({
  createPersonalOrg: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.user.id
      
      // Get user
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
      if (!user) throw new Error('User not found')
      
      // Get personal workspace
      const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.createdBy, userId))
        .limit(1)
      
      if (!workspace) throw new Error('Personal workspace not found')
      
      // If already linked to an org, skip
      if (workspace.organizationId) {
        return { success: true, organizationId: workspace.organizationId, alreadyExists: true }
      }
      
      // Create WorkOS organization
      const personalOrg = await workos.organizations.createOrganization({
        name: `${user.name}'s Personal`,
      })
      
      // Update workspace
      await db
        .update(workspaces)
        .set({ organizationId: personalOrg.id })
        .where(eq(workspaces.id, workspace.id))
      
      // Create org settings
      const [existingSettings] = await db
        .select()
        .from(organizationSettings)
        .where(eq(organizationSettings.organizationId, personalOrg.id))
        .limit(1)
      
      if (!existingSettings) {
        await db.insert(organizationSettings).values({
          organizationId: personalOrg.id,
        })
      }
      
      // Note: WorkOS organization membership requires workosUserId
      // This may need to be done manually or via a separate flow
      
      return { success: true, organizationId: personalOrg.id }
    }),
})