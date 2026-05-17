import { WorkOS } from '@workos-inc/node'
import { db } from '../../db/connection'
import { workspaces, workspaceMembers, organizationSettings, projects } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { parseWorkingDays, serializeWorkingDays } from '../../shared/utils/working-days'

const workos = new WorkOS(process.env.WORKOS_API_KEY!, {
  clientId: process.env.WORKOS_CLIENT_ID!,
})

const DEFAULT_SETTINGS = {
  defaultSprintLengthDays: 14,
  workingHoursStart: '09:00',
  workingHoursEnd: '17:00',
  workingDays: '[1,2,3,4,5]',
  timezone: 'UTC',
  requireClockIn: false,
}

async function getSettings(organizationId: string): Promise<{
  defaultSprintLengthDays: number
  workingHoursStart: string
  workingHoursEnd: string
  workingDays: number[]
  timezone: string
  requireClockIn: boolean
} | null> {
  const [settings] = await db
    .select()
    .from(organizationSettings)
    .where(eq(organizationSettings.organizationId, organizationId))
    .limit(1)

  if (!settings) return null

  return {
    defaultSprintLengthDays: settings.defaultSprintLengthDays,
    workingHoursStart: settings.workingHoursStart,
    workingHoursEnd: settings.workingHoursEnd,
    workingDays: parseWorkingDays(settings.workingDays),
    timezone: settings.timezone,
    requireClockIn: settings.requireClockIn,
  }
}

async function getOrCreateSettings(organizationId: string) {
  const [existing] = await db
    .select()
    .from(organizationSettings)
    .where(eq(organizationSettings.organizationId, organizationId))
    .limit(1)

  if (existing) {
    return {
      ...existing,
      workingDays: parseWorkingDays(existing.workingDays),
    }
  }

  // Create with defaults
  const [created] = await db
    .insert(organizationSettings)
    .values({
      organizationId,
      ...DEFAULT_SETTINGS,
    })
    .returning()

  return {
    ...created,
    workingDays: parseWorkingDays(created.workingDays),
  }
}

interface CreateOrganizationResult {
  organization: { id: string; name: string }
  workspace: { id: string; name: string; slug: string; type: string }
}

async function createOrganization(
  userId: string,
  workosUserId: string,
  orgName: string
): Promise<CreateOrganizationResult> {
  let workosOrg: { id: string; name: string } | null = null

  try {
    // Create WorkOS organization BEFORE transaction (external API call)
    const newOrg = await workos.organizations.createOrganization({ name: orgName })
    workosOrg = newOrg

    // Generate slug from org name
    const slug = orgName.toLowerCase().replace(/\s+/g, '-').slice(0, 50)

    // Start database transaction for local data
    const [workspace] = await db.transaction(async (tx) => {
      // Create workspace
      const [ws] = await tx
        .insert(workspaces)
        .values({
          name: 'Main',
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
      roleSlug: 'admin',
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

async function updateSettings(
  organizationId: string,
  updates: Partial<{
    defaultSprintLengthDays: number
    workingHoursStart: string
    workingHoursEnd: string
    workingDays: number[]
    timezone: string
    requireClockIn: boolean
  }>
) {
  // Build update object for DB - workingDays must be serialized to string
  const { workingDays, ...rest } = updates
  const dbUpdates: Partial<{
    defaultSprintLengthDays: number
    workingHoursStart: string
    workingHoursEnd: string
    workingDays: string
    timezone: string
    requireClockIn: boolean
  }> = rest

  if (workingDays !== undefined) {
    dbUpdates.workingDays = serializeWorkingDays(workingDays)
  }

  const [updated] = await db
    .update(organizationSettings)
    .set({ ...dbUpdates, updatedAt: new Date() })
    .where(eq(organizationSettings.organizationId, organizationId))
    .returning()

  return updated
}

export const organizationService = {
  getSettings,
  getOrCreateSettings,
  updateSettings,
  createOrganization,
}