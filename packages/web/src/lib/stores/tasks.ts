import { writable } from 'svelte/store'
import { trpc } from '$lib/trpc'

export interface TaskSummary {
  id: string
  projectId: string
  title: string
  description?: string | null
  status: string
  priority?: string | null
  storyPoints?: number | null
  assigneeId?: string | null
  dueDate?: string | null
  deadline?: string | null
  statusChangedAt: string
  startedAt?: string | null
  completedAt?: string | null
  project?: {
    id: string
    name: string
  }
}

export const tasks = writable<TaskSummary[]>([])
export const isLoading = writable(true)
export const overdueCount = writable(0)
export const selectedTask = writable<TaskSummary | null>(null)

export async function fetchTasks(workspaceIds: string[]) {
  if (workspaceIds.length === 0) {
    tasks.set([])
    isLoading.set(false)
    return
  }

  isLoading.set(true)
  try {
    const data = await trpc.task.home.query({ workspaceIds })
    tasks.set(data as TaskSummary[])
  } catch (err) {
    console.error('Failed to fetch tasks:', err)
    tasks.set([])
  } finally {
    isLoading.set(false)
  }
}

export async function fetchOverdueCount() {
  try {
    const result = await trpc.task.overdueCount.query()
    overdueCount.set(result as number)
  } catch (err) {
    console.error('Failed to fetch overdue count:', err)
  }
}

export function refreshTasks(workspaceIds: string[]) {
  return fetchTasks(workspaceIds)
}
