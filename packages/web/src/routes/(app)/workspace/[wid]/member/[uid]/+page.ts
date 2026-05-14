import { trpc } from '$lib/trpc'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params }) => {
  const { wid, uid } = params

  // Fetch workspace (also verifies user has access)
  const workspace = await trpc.workspace.byId.query({ id: wid })

  // Fetch workspace members to find this user
  const members = await trpc.workspace.members.query({ workspaceId: wid })
  const member = members.find((m: any) => m.userId === uid || m.user?.id === uid)

  // Fetch tasks assigned to this user (across all projects in workspace)
  const tasks = await trpc.task.list.query({ assigneeId: uid })

  // Fetch velocity for last 90 days
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  let velocity = null
  try {
    velocity = await trpc.velocity.custom.query({
      startDate: ninetyDaysAgo.toISOString(),
      endDate: new Date().toISOString(),
      workspaceIds: [wid],
      userId: uid,
    })
  } catch {
    velocity = null
  }

  return {
    workspace,
    member: member || { user: { name: 'Unknown', email: '' }, role: 'member' },
    tasks,
    velocity,
  }
}