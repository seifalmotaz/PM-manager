export type OrgSession = {
  id: string
  userId: string
  organizationId: string
  startTime: Date
  endTime: Date | null
  note: string | null
  tasksCompleted: number | null
  storyPointsCompleted: string | null
  estimatedHoursSum: string | null
  frozen: boolean
  createdAt: Date
  updatedAt: Date
}