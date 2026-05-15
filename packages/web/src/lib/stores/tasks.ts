import { writable } from 'svelte/store'
import { trpc } from '$lib/trpc'
import { getOrganization } from './organization.svelte'

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
  sprintId?: string | null
  sprintFlag?: string | null
  statusChangedAt: string
  startedAt?: string | null
  completedAt?: string | null
  project?: {
    id: string
    name: string
  }
  // Organization info for org badge display
  organization?: {
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

export async function fetchAllTasks(): Promise<TaskSummary[]> {
  isLoading.set(true)
  try {
    const orgs = getOrganization().organizations
    if (orgs.length === 0) {
      tasks.set([])
      return []
    }

    // Fetch tasks for each org and merge
    let allTasks: TaskSummary[] = []
    for (const org of orgs) {
      const orgTasks = await trpc.task.listByOrg.query({ organizationId: org.id }) as any[]
      allTasks = [
        ...allTasks,
        ...orgTasks.map((t: any) => ({
          ...t,
          organization: { id: org.id, name: org.name },
        })),
      ]
    }
    tasks.set(allTasks)
    return allTasks
  } catch (err) {
    console.error('Failed to fetch all tasks:', err)
    tasks.set([])
    return []
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
