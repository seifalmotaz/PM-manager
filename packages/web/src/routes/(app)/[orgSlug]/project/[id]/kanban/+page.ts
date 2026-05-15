import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params }) => {
  return {
    orgSlug: params.orgSlug,
    projectId: params.id,
    title: 'Kanban Board',
  }
}