import { WorkOS } from '@workos-inc/node'
import { db } from '../../db/connection'
import { users, workspaces, workspaceMembers, organizationSettings } from '../../db/schema'
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

  // Fetch user's organizations via organization memberships from WorkOS
  let organizations: Array<{ id: string; name: string; slug: string }> = []
  try {
    const memberships = await workos.userManagement.listOrganizationMemberships({
      userId: workosUser.id,
    })

    organizations = (memberships.data || []).map((membership: any) => ({
      id: membership.organizationId,
      name: membership.organizationName,
      slug: (membership.organizationName || '').toLowerCase().replace(/\s+/g, '-'),
    }))

    // Auto-create organization_settings for each org (with defaults)
    for (const org of organizations) {
      const [existingSettings] = await db
        .select()
        .from(organizationSettings)
        .where(eq(organizationSettings.organizationId, org.id))
        .limit(1)

      if (!existingSettings) {
        await db.insert(organizationSettings).values({
          organizationId: org.id,
        }).onConflictDoNothing()
      }
    }
  } catch (err) {
    // If WorkOS org listing fails, non-critical — user can still use personal workspace
    console.warn('Failed to fetch WorkOS organizations:', err)
    organizations = []
  }

  return { user, isNew, organizations, workosUserId: workosUser.id }
}

async function listOrganizations(workosUserId: string) {
  try {
    const memberships = await workos.userManagement.listOrganizationMemberships({
      userId: workosUserId,
    })
    return (memberships.data || []).map((membership: any) => ({
      id: membership.organizationId,
      name: membership.organizationName,
      slug: (membership.organizationName || '').toLowerCase().replace(/\s+/g, '-'),
    }))
  } catch (err) {
    console.warn('Failed to fetch WorkOS organizations:', err)
    return []
  }
}

export const authService = { getAuthorizationUrl, exchangeCode, listOrganizations }
