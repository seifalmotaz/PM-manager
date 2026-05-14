export interface ForecastSprintBreakdown {
  sprintNumber: number
  estimatedSP: number
  taskCount: number
  estimatedStartDate: string | null
  estimatedEndDate: string | null
}

export interface ForecastResult {
  totalBacklogSP: number
  backlogTaskCount: number
  avgVelocity: number
  sprintsNeeded: number
  hasData: boolean
  breakdown: ForecastSprintBreakdown[]
}