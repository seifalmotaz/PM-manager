import { WorkOS } from '@workos-inc/node'
import { db } from '../../db/connection'
import { users, workspaces, workspaceMembers } from '../../db/schema'
import { eq } from 'drizzle-orm'

const workos = new WorkOS(process.env.WORKOS_API_KEY!, {
  clientId: process.env.WORKOS_CLIENT_ID!,
})

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'

function getAuthorizationUrl(): string {
  const url = workos.userManagement.getAuthorizationUrl({
    provider: 'authkit',
    redirectUri: `${BASE_URL}/auth/callback`,
    clientId: process.env.WORKOS_CLIENT_ID!,
  })
  return url
}

async function exchangeCode(code: string) {
  const { user: workosUser } = await workos.userManagement.authenticateWithCode({
    clientId: process.env.WORKOS_CLIENT_ID!,
    code,
  })

  // Upsert user
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, workosUser.email))
    .limit(1)

  let user: typeof users.$inferSelect
  let isNew = false

  if (existing) {
    const [updated] = await db
      .update(users)
      .set({
        name: `${workosUser.firstName ?? ''} ${workosUser.lastName ?? ''}`.trim(),
        avatarUrl: workosUser.profilePictureUrl ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))
      .returning()
    user = updated
  } else {
    isNew = true
    user = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          email: workosUser.email,
          name: `${workosUser.firstName ?? ''} ${workosUser.lastName ?? ''}`.trim(),
          avatarUrl: workosUser.profilePictureUrl ?? undefined,
        })
        .returning()

      // Auto-create personal workspace
      const [personalWorkspace] = await tx
        .insert(workspaces)
        .values({
          name: 'Personal',
          slug: `${newUser.id}-personal`,
          type: 'personal',
          createdBy: newUser.id,
        })
        .returning()

      // Add user as owner member
      await tx.insert(workspaceMembers).values({
        workspaceId: personalWorkspace.id,
        userId: newUser.id,
        role: 'owner',
      })

      return newUser
    })
  }

  return { user, isNew }
}

export const authService = { getAuthorizationUrl, exchangeCode }
