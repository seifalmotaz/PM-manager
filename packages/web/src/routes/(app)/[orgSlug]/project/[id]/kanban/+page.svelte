<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { getOrganization } from '$lib/stores/organization.svelte'
  import { trpc } from '$lib/trpc'
  import type { TaskSummary } from '$lib/stores/tasks'
  import KanbanBoard from '$lib/components/KanbanBoard.svelte'
  import TaskCard from '$lib/components/TaskCard.svelte'
  import QuickAddInput from '$lib/components/QuickAddInput.svelte'
  import { ChevronLeft, LayoutGrid, List } from 'lucide-svelte'
  import { clsx } from 'clsx'

  let { data } = $props()
  let orgSlug = $derived(data.orgSlug)
  let projectId = $derived(data.projectId)

  let project = $state<any>(null)
  let tasks = $state<TaskSummary[]>([])
  let viewMode = $state<'kanban' | 'list'>('kanban')
  let isPageLoading = $state(true)

  onMount(async () => {
    try {
      project = await trpc.project.byId.query({ id: projectId }) as any
      // Fetch tasks for this project
      const projectTasks = await trpc.task.list.query({ projectId }) as any[]
      tasks = projectTasks
    } catch (err) {
      console.error('Failed to load project:', err)
      project = null
      tasks = []
    } finally {
      isPageLoading = false
    }
  })

  async function handleStatusChange(taskId: string, newStatus: string) {
    try {
      await trpc.task.changeStatus.mutate({ id: taskId, status: newStatus as any })
      const updated = await trpc.task.list.query({ projectId }) as any[]
      tasks = updated
    } catch (err) {
      console.error('Failed to change task status:', err)
    }
  }

  function handleTaskClick(task: TaskSummary) {
    // Could open task detail modal - for now just log
    console.log('Task clicked:', task)
  }

  function handleCreated() {
    // Refresh tasks after QuickAdd
    trpc.task.list.query({ projectId }).then(t => (tasks = t as any)).catch(() => {})
  }

  const columns = [
    { id: 'todo', label: 'To Do' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'done', label: 'Done' },
  ]
</script>

<div class="project-kanban-page">
  <div class="page-header">
    <div class="header-main">
      <a href={`/${orgSlug}/projects`} class="back-link">
        <ChevronLeft size={16} />
        <span>Projects</span>
      </a>
      <h1 class="page-title">{project?.name ?? 'Loading...'}</h1>
    </div>
    <div class="header-actions">
      <div class="view-toggle">
        <button
          class={clsx('toggle-btn', viewMode === 'kanban' && 'active')}
          onclick={() => (viewMode = 'kanban')}
        >
          <LayoutGrid size={16} />
        </button>
        <button
          class={clsx('toggle-btn', viewMode === 'list' && 'active')}
          onclick={() => (viewMode = 'list')}
        >
          <List size={16} />
        </button>
      </div>
      <div class="divider"></div>
      {#if project}
        <a href={`/${orgSlug}/project/${projectId}/sprints`} class="sprints-link">
          Sprints
        </a>
      {/if}
    </div>
  </div>

  <div class="quick-add-wrapper">
    <QuickAddInput
      onCreated={handleCreated}
      projectId={projectId}
    />
  </div>

  <div class="page-content">
    {#if isPageLoading}
      <div class="status-container">
        <div class="spinner"></div>
        <p>Loading project...</p>
      </div>
    {:else if !project}
      <div class="status-container">
        <p>Project not found.</p>
      </div>
    {:else if tasks.length === 0}
      <div class="status-container">
        <p class="empty-msg">No tasks in this project yet.</p>
      </div>
    {:else if viewMode === 'kanban'}
      <div class="kanban-wrapper">
        <KanbanBoard
          tasks={tasks}
          onStatusChange={handleStatusChange}
          onTaskClick={handleTaskClick}
          showOrgBadges={false}
        />
      </div>
    {:else}
      <div class="task-list-view">
        {#each columns as col}
          {@const colTasks = tasks.filter(t => t.status === col.id)}
          {#if colTasks.length > 0}
            <div class="list-section">
              <h3>{col.label} <span class="count">{colTasks.length}</span></h3>
              {#each colTasks as task (task.id)}
                <TaskCard task={task} onclick={() => handleTaskClick(task)} />
              {/each}
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .project-kanban-page {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 2rem;
    padding-top: 1.5rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-main);
  }

  .header-main {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8125rem;
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.15s;
  }

  .back-link:hover {
    color: var(--text-main);
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-main);
    line-height: 1.2;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .view-toggle {
    display: flex;
    padding: 2px;
    gap: 0.25rem;
  }

  .toggle-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    border-radius: 4px;
    transition: all 0.15s;
  }

  .toggle-btn.active {
    background-color: var(--td-hover);
    color: var(--text-main);
  }

  .divider {
    width: 1px;
    height: 16px;
    background-color: var(--border-main);
  }

  .sprints-link {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--brand-primary);
    text-decoration: none;
    border-radius: var(--radius-md);
    transition: background-color 0.15s;
  }

  .sprints-link:hover {
    background-color: var(--td-hover);
  }

  .quick-add-wrapper {
    max-width: 100%;
    margin-bottom: 1.5rem;
  }

  .page-content {
    flex: 1;
    overflow-y: auto;
  }

  .kanban-wrapper {
    height: 100%;
  }

  .status-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: var(--text-muted);
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border-main);
    border-top-color: var(--brand-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .empty-msg {
    font-size: 1rem;
    opacity: 0.7;
  }

  .task-list-view {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .list-section h3 {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-main);
    margin-bottom: 0.5rem;
  }

  .list-section .count {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-muted);
  }
</style>