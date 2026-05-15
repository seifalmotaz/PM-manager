import { db } from '../../db/connection'
import { organizationSettings } from '../../db/schema'
import { eq } from 'drizzle-orm'

const DEFAULT_SETTINGS = {
  defaultSprintLengthDays: 14,
  workingHoursStart: '09:00',
  workingHoursEnd: '17:00',
  workingDays: '[1,2,3,4,5]',
  timezone: 'UTC',
  requireClockIn: false,
}

async function getOrCreateSettings(organizationId: string) {
  const [existing] = await db
    .select()
    .from(organizationSettings)
    .where(eq(organizationSettings.organizationId, organizationId))
    .limit(1)

  if (existing) {
    return existing
  }

  // Create with defaults
  const [created] = await db
    .insert(organizationSettings)
    .values({
      organizationId,
      ...DEFAULT_SETTINGS,
    })
    .returning()

  return created
}

async function updateSettings(
  organizationId: string,
  updates: Partial<{
    defaultSprintLengthDays: number
    workingHoursStart: string
    workingHoursEnd: string
    workingDays: string
    timezone: string
    requireClockIn: boolean
  }>
) {
  const [updated] = await db
    .update(organizationSettings)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(organizationSettings.organizationId, organizationId))
    .returning()

  return updated
}

export const organizationService = {
  getOrCreateSettings,
  updateSettings,
}