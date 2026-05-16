<script lang="ts">
  import { ArrowLeft } from 'lucide-svelte'
  import { trpc } from '$lib/trpc'
  import SprintBoard from '$lib/components/SprintBoard.svelte'
  import SprintCreateModal from '$lib/components/SprintCreateModal.svelte'
  import SprintCompleteModal from '$lib/components/SprintCompleteModal.svelte'
  import type { Sprint } from '$lib/stores/sprint'
  import type { TaskSummary } from '$lib/stores/tasks'

  let { data }: { data: any } = $props()

  let sprints = $state<Sprint[]>(data.sprints as Sprint[] ?? [])
  let tasks = $state<TaskSummary[]>(data.tasks as TaskSummary[] ?? [])
  let project = $state(data.project)

  let trpcAny = trpc as any

  let isCreateModalOpen = $state(false)
  let isCompleteModalOpen = $state(false)
  let selectedSprint = $state<Sprint | null>(null)
  let activeTab = $state<'board' | 'backlog'>('board')

  async function refresh() {
    const [newSprints, newTasks] = await Promise.all([
      trpc.sprint.list.query({ projectId: data.projectId }),
      trpc.task.list.query({ projectId: data.projectId }),
    ])
    sprints = newSprints as unknown as Sprint[]
    tasks = newTasks as unknown as TaskSummary[]
  }

  async function handleSprintChange(taskId: string, newSprintId: string) {
    try {
      await trpc.task.update.mutate({ id: taskId, sprintId: newSprintId })
      await refresh()
    } catch (err) {
      console.error('Failed to update task sprint:', err)
    }
  }

  function handleSprintCompleteClick(sprint: Sprint) {
    selectedSprint = sprint
    isCompleteModalOpen = true
  }

  async function handleSprintComplete(action: 'backlog' | 'next_sprint') {
    if (!selectedSprint) return

    try {
      await trpcAny.sprint.complete.mutate({
        sprintId: selectedSprint.id,
        unfinishedTaskAction: action,
      })
      isCompleteModalOpen = false
      selectedSprint = null
      await refresh()
    } catch (err) {
      console.error('Failed to complete sprint:', err)
    }
  }

  function handleSprintCreated() {
    isCreateModalOpen = false
    refresh()
  }

  let activeSprints = $derived(sprints.filter((s: Sprint) => s.status !== 'completed'))
  let sprintCount = $derived(sprints.length)
  let selectedSprintTasks = $derived(
    selectedSprint
      ? tasks.filter((t: TaskSummary) => t.sprintId === selectedSprint!.id)
      : []
  )

  let backlogTasks = $derived(tasks.filter((t: TaskSummary) => !t.sprintId))

  // Check if there's a next sprint available for the selected sprint
  let hasNextSprint = $derived(() => {
    if (!selectedSprint) return false
    const currentSprint = sprints.find((s: Sprint) => s.id === selectedSprint!.id)
    if (!currentSprint) return false
    return sprints.some((s: Sprint) =>
      s.projectId === currentSprint.projectId &&
      new Date(s.startDate) > new Date(currentSprint.startDate) &&
      s.status !== 'completed'
    )
  })

  async function handleAssignToSprint(taskId: string, sprintId: string | null) {
    try {
      await trpc.task.update.mutate({ id: taskId, sprintId: sprintId || null })
      await refresh()
    } catch (err) {
      console.error('Failed to assign task:', err)
    }
  }
</script>

<div class="sprints-page">
  <header class="page-header">
    <div class="header-main">
      <a href={`/${data.orgSlug}/projects`} class="back-link">
        <ArrowLeft size={16} />
        <span>Projects</span>
      </a>
      <h1 class="page-title">{project?.name ?? 'Loading...'} — Sprints</h1>
    </div>
    <div class="header-actions">
      <div class="tabs">
        <button
          class="tab"
          class:active={activeTab === 'board'}
          onclick={() => activeTab = 'board'}
        >
          Board
        </button>
        <button
          class="tab"
          class:active={activeTab === 'backlog'}
          onclick={() => activeTab = 'backlog'}
        >
          Backlog ({backlogTasks.length})
        </button>
      </div>

      <button class="btn-primary" onclick={() => isCreateModalOpen = true}>
        New Sprint
      </button>
    </div>
  </header>

  <main class="page-content">
    {#if activeTab === 'board'}
      {#if activeSprints.length === 0}
        <div class="empty-state">
          <p>No sprints yet. Create your first sprint to start planning.</p>
        </div>
      {:else}
        <SprintBoard
          {sprints}
          {tasks}
          onSprintChange={handleSprintChange}
          onSprintCompleteClick={handleSprintCompleteClick}
        />
      {/if}
    {:else if activeTab === 'backlog'}
      <div class="backlog-view">
        {#if backlogTasks.length === 0}
          <div class="empty-state">
            <p>No tasks in backlog. All tasks are assigned to sprints.</p>
          </div>
        {:else}
          <div class="backlog-list">
            {#each backlogTasks as task (task.id)}
              <div class="backlog-item">
                <div class="task-info">
                  <span class="task-title">{task.title}</span>
                  {#if task.priority}
                    <span class="priority-badge {task.priority}">{task.priority}</span>
                  {/if}
                </div>
                <div class="task-actions">
                  <select
                    class="sprint-select"
                    onchange={(e) => handleAssignToSprint(task.id, (e.target as HTMLSelectElement).value || null)}
                  >
                    <option value="">Assign to Sprint...</option>
                    {#each sprints.filter(s => s.status !== 'completed') as sprint}
                      <option value={sprint.id}>{sprint.name}</option>
                    {/each}
                  </select>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </main>
</div>

<SprintCreateModal
  bind:isOpen={isCreateModalOpen}
  projectId={data.projectId}
  organizationSettings={data.orgSettings}
  existingSprintCount={sprintCount}
  onCreated={handleSprintCreated}
/>

<SprintCompleteModal
  sprint={selectedSprint}
  tasks={selectedSprintTasks}
  isOpen={isCompleteModalOpen}
  hasNextSprint={hasNextSprint()}
  onComplete={handleSprintComplete}
  onCancel={() => { isCompleteModalOpen = false; selectedSprint = null; }}
/>

<style>
  .sprints-page {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-main);
    background: var(--bg-surface);
  }

  .header-main {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .back-link {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--text-muted);
    text-decoration: none;
    font-size: 0.875rem;
  }

  .back-link:hover {
    color: var(--text-main);
  }

  .page-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-main);
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-primary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--accent, #3b82f6);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  .btn-primary:hover {
    opacity: 0.9;
  }

  .page-content {
    flex: 1;
    overflow: hidden;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
  }

  .tabs {
    display: flex;
    gap: 0.25rem;
    margin-right: 1rem;
  }

  .tab {
    padding: 0.5rem 1rem;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    color: var(--text-muted);
    cursor: pointer;
  }

  .tab:hover {
    background: var(--bg-surface-hover);
    color: var(--text-main);
  }

  .tab.active {
    background: var(--bg-surface);
    color: var(--text-main);
    font-weight: 500;
  }

  .backlog-view {
    padding: 1rem;
    overflow-y: auto;
  }

  .backlog-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .backlog-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
  }

  .task-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .task-title {
    font-size: 0.875rem;
    color: var(--text-main);
  }

  .priority-badge {
    padding: 0.125rem 0.375rem;
    border-radius: var(--radius-sm);
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .priority-badge.p0 { background: #fee2e2; color: #991b1b; }
  .priority-badge.p1 { background: #fef3c7; color: #92400e; }
  .priority-badge.p2 { background: #dbeafe; color: #1e40af; }
  .priority-badge.p3 { background: var(--bg-surface-hover); color: var(--text-muted); }

  .task-actions {
    display: flex;
    gap: 0.5rem;
  }

  .sprint-select {
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid var(--border-main);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    color: var(--text-main);
  }
</style>