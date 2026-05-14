import { trpc } from '$lib/trpc'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params }) => {
  const projectId = params.id

  // Fetch project to get workspaceId for capacity table member links
  let workspaceId = ''
  try {
    const project = await trpc.project.byId.query({ id: projectId })
    workspaceId = project?.workspaceId ?? ''
  } catch {
    workspaceId = ''
  }

  return {
    workspaceId,
  }
}