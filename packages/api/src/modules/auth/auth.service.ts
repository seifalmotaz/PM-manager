import { WorkOS } from '@workos-inc/node'
import type { OrganizationMembership } from '@workos-inc/node'
import { randomBytes } from 'crypto'
import { db } from '../../db/connection'
import { users, workspaces, workspaceMembers, organizationSettings, projects, sessions } from '../../db/schema'
import { eq } from 'drizzle-orm'

const SESSION_DURATION_DAYS = 30

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

    // Create user only — no automatic org/workspace/project creation
    const [newUser] = await db
      .insert(users)
      .values({
        email: workosUser.email,
        name: `${workosUser.firstName ?? ''} ${workosUser.lastName ?? ''}`.trim(),
        avatarUrl: workosUser.profilePictureUrl ?? undefined,
      })
      .returning()

    user = newUser
  }

  // Fetch user's organizations via organization memberships from WorkOS
  let organizations: Array<{ id: string; name: string; slug: string }> = []
  try {
    const memberships = await workos.userManagement.listOrganizationMemberships({
      userId: workosUser.id,
    })

    organizations = (memberships.data || []).map((membership: OrganizationMembership) => ({
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
    return (memberships.data || []).map((membership: OrganizationMembership) => ({
      id: membership.organizationId,
      name: membership.organizationName,
      slug: (membership.organizationName || '').toLowerCase().replace(/\s+/g, '-'),
    }))
  } catch (err) {
    console.warn('Failed to fetch WorkOS organizations:', err)
    return []
  }
}

async function hasOrganization(workosUserId: string): Promise<boolean> {
  const memberships = await workos.userManagement.listOrganizationMemberships({
    userId: workosUserId,
  })
  return memberships.data.length > 0
}

interface OrganizationResult {
  organization: { id: string; name: string }
  workspace: { id: string; name: string; slug: string; type: string }
}

async function createPersonalOrganization(
  userId: string,
  workosUserId: string,
  userName: string
): Promise<OrganizationResult> {
  // Idempotency check: verify user doesn't already have workspaces (has completed onboarding)
  const [existingMembership] = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1)

  if (existingMembership) {
    throw new Error('User has already completed onboarding')
  }

  let workosOrg: { id: string; name: string } | null = null

  try {
    // Create WorkOS organization BEFORE transaction (external API call)
    const newOrg = await workos.organizations.createOrganization({
      name: `${userName}'s Personal`,
    })
    workosOrg = newOrg

    // Start database transaction for local data
    const [workspace] = await db.transaction(async (tx) => {
      // Create Saha workspace
      const [ws] = await tx
        .insert(workspaces)
        .values({
          name: 'Personal',
          slug: `${userId}-personal`,
          type: 'personal',
          organizationId: workosOrg!.id,
          createdBy: userId,
        })
        .returning()

      // Create organization settings with defaults
      await tx.insert(organizationSettings).values({
        organizationId: workosOrg!.id,
      })

      // Create workspace member as owner
      await tx.insert(workspaceMembers).values({
        workspaceId: ws.id,
        userId: userId,
        role: 'owner',
      })

      // Create default "Inbox" project
      await tx.insert(projects).values({
        workspaceId: ws.id,
        name: 'Inbox',
        isInbox: true,
        color: '#6366f1',
      })

      return [ws]
    })

    // Create WorkOS org membership AFTER transaction commits
    await workos.userManagement.createOrganizationMembership({
      userId: workosUserId,
      organizationId: workosOrg!.id,
    })

    return {
      organization: { id: workosOrg!.id, name: workosOrg!.name },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        type: workspace.type,
      },
    }
  } catch (error) {
    // Rollback: Delete WorkOS org if it was created
    if (workosOrg) {
      try {
        await workos.organizations.deleteOrganization(workosOrg.id)
      } catch (cleanupError) {
        console.error('Failed to cleanup WorkOS org:', cleanupError)
      }
    }
    throw error
  }
}

async function createCompanyOrganization(
  userId: string,
  workosUserId: string,
  orgName: string,
  workspaceName: string
): Promise<OrganizationResult> {
  // Idempotency check: verify user doesn't already have workspaces (has completed onboarding)
  const [existingMembership] = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1)

  if (existingMembership) {
    throw new Error('User has already completed onboarding')
  }

  let workosOrg: { id: string; name: string } | null = null

  try {
    // Create WorkOS organization BEFORE transaction (external API call)
    const newOrg = await workos.organizations.createOrganization({
      name: orgName,
    })
    workosOrg = newOrg

    // Generate slug from workspace name
    const slug = workspaceName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .slice(0, 50)

    // Start database transaction for local data
    const [workspace] = await db.transaction(async (tx) => {
      // Create Saha workspace
      const [ws] = await tx
        .insert(workspaces)
        .values({
          name: workspaceName,
          slug: slug,
          type: 'company',
          organizationId: workosOrg!.id,
          createdBy: userId,
        })
        .returning()

      // Create organization settings with defaults
      await tx.insert(organizationSettings).values({
        organizationId: workosOrg!.id,
      })

      // Create workspace member as owner
      await tx.insert(workspaceMembers).values({
        workspaceId: ws.id,
        userId: userId,
        role: 'owner',
      })

      // Create default "Inbox" project
      await tx.insert(projects).values({
        workspaceId: ws.id,
        name: 'Inbox',
        isInbox: true,
        color: '#6366f1',
      })

      return [ws]
    })

    // Create WorkOS org membership AFTER transaction commits
    await workos.userManagement.createOrganizationMembership({
      userId: workosUserId,
      organizationId: workosOrg!.id,
    })

    return {
      organization: { id: workosOrg!.id, name: workosOrg!.name },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        type: workspace.type,
      },
    }
  } catch (error) {
    // Rollback: Delete WorkOS org if it was created
    if (workosOrg) {
      try {
        await workos.organizations.deleteOrganization(workosOrg.id)
      } catch (cleanupError) {
        console.error('Failed to cleanup WorkOS org:', cleanupError)
      }
    }
    throw error
  }
}

async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)

  await db.insert(sessions).values({
    token,
    userId,
    expiresAt,
  })

  return token
}

async function validateSession(token: string): Promise<typeof users.$inferSelect | null> {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1)

  if (!session) return null
  if (new Date() > session.expiresAt) {
    // Clean up expired session
    await db.delete(sessions).where(eq(sessions.token, token))
    return null
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1)

  return user || null
}

async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token))
}

export const authService = {
  getAuthorizationUrl,
  exchangeCode,
  listOrganizations,
  hasOrganization,
  createPersonalOrganization,
  createCompanyOrganization,
  createSession,
  validateSession,
  deleteSession,
}
