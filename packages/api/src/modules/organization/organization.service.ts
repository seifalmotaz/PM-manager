import { db } from '../../db/connection'
import { organizationSettings } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { parseWorkingDays, serializeWorkingDays } from '../../shared/utils/working-days'

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
}