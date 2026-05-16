export interface ChartDataPoint {
  sprintId: string
  name: string
  projectId: string
  startDate: Date
  endDate: Date
  planned: number
  completed: number
}

export interface TimeEfficiencyData {
  sprintId: string
  efficiency: number | null // null if no sessions or no estimates
}

export interface ChartResult {
  sprints: ChartDataPoint[]
  timeEfficiencies: TimeEfficiencyData[]
}

export interface PersonalVelocityRow {
  sprintId: string
  sprintName: string
  userTasks: number
  userSP: number
  teamSP: number
  userShare: number | null // null if teamSP is 0
}

export interface PersonalVelocityResult {
  sprints: PersonalVelocityRow[]
}
