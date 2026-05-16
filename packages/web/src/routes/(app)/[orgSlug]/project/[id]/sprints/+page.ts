import { trpc } from '$lib/trpc'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params }) => {
  const projectId = params.id

  const [sprints, tasks, project, orgSettings] = await Promise.all([
    trpc.sprint.list.query({ projectId }),
    trpc.task.list.query({ projectId }),
    trpc.project.byId.query({ id: projectId }),
    trpc.organization.getSettings.query({ organizationId: params.orgSlug }),
  ])

  return {
    sprints,
    tasks,
    project,
    projectId,
    orgSlug: params.orgSlug,
    orgSettings,
  }
}