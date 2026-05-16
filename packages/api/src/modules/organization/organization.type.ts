export type OrganizationSettings = {
  organizationId: string
  defaultSprintLengthDays: number
  workingHoursStart: string
  workingHoursEnd: string
  workingDays: number[] // JSON array parsed to number array
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