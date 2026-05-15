export type OrganizationSettings = {
  organizationId: string
  defaultSprintLengthDays: number
  workingHoursStart: string
  workingHoursEnd: string
  workingDays: string // JSON array stored as text
  timezone: string
  requireClockIn: boolean
  createdAt: Date
  updatedAt: Date
}

export type ActiveOrganization = {
  id: string
  name: string
  slug: string
}