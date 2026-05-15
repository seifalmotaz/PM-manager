import { writable } from 'svelte/store'

export interface Sprint {
  id: string
  projectId: string
  name: string
  goal?: string | null
  startDate: Date
  endDate: Date
  status: 'planned' | 'active' | 'completed'
  plannedPoints?: number | null
  createdAt: Date
  updatedAt: Date
}

export const sprints = writable<Sprint[]>([])