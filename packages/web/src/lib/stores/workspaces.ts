import { writable } from 'svelte/store'
import { trpc } from '$lib/trpc'

export interface WorkspaceSummary {
  id: string
  name: string
  slug: string
  type: string
  memberCount: number
}

export const workspaces = writable<WorkspaceSummary[]>([])
export const activeFilterIds = writable<string[]>([])

export async function fetchWorkspaces() {
  try {
    const data = await trpc.workspace.list.query()
    workspaces.set(data as WorkspaceSummary[])
    // Default to all workspaces selected (session-reset behavior)
    const filteredIds = data.map((w: WorkspaceSummary) => w.id)
    activeFilterIds.set(filteredIds)
  } catch (err) {
    console.error('Failed to fetch workspaces:', err)
  }
}

export function toggleWorkspaceFilter(id: string) {
  activeFilterIds.update((ids) => {
    if (ids.includes(id)) return ids.filter((i) => i !== id)
    return [...ids, id]
  })
}

export function selectAllWorkspaces() {
  let current: WorkspaceSummary[] = []
  const unsub = workspaces.subscribe((v) => { current = v })
  unsub()
  activeFilterIds.set(current.map((w) => w.id))
}

export function deselectAllWorkspaces() {
  activeFilterIds.set([])
}
