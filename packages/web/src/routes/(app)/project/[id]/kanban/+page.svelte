<script lang="ts">
  import { page } from '$app/stores'
  import { trpc } from '$lib/trpc'
  import KanbanBoard from '$lib/components/KanbanBoard.svelte'
  import QuickAddInput from '$lib/components/QuickAddInput.svelte'
  import { fetchOverdueCount, selectedTask } from '$lib/stores/tasks'
  import type { TaskSummary } from '$lib/stores/tasks'
  import { LayoutGrid, List, Filter, SortAsc } from 'lucide-svelte'
  import { clsx } from 'clsx'

  let tasks = $state<TaskSummary[]>([])
  let isLoading = $state(true)
  let viewMode = $state<'kanban' | 'list'>('kanban')

  $effect(() => {
    const id = $page.params.id
    loadTasks(id)
  })

  async function loadTasks(projectId: string) {
    isLoading = true
    try {
      const result = await trpc.task.list.query({ projectId })
      tasks = result as unknown as TaskSummary[]
    } catch (err) {
      console.error('Failed to load tasks:', err)
    } finally {
      isLoading = false
    }
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    try {
      await trpc.task.changeStatus.mutate({ id: taskId, status: newStatus as any })
      loadTasks($page.params.id)
    } catch (err) {
      console.error('Failed to change status:', err)
    }
  }

  function handleTaskClick(task: TaskSummary) {
    selectedTask.set(task)
  }

  function handleCreated() {
    loadTasks($page.params.id)
    fetchOverdueCount()
  }
</script>

<div class="project-kanban-page">
  <div class="centered-well">
    <header class="page-header">
      <div class="header-main">
        <h1 class="page-title">Project Kanban</h1>
      </div>

      <div class="header-actions">
        <div class="view-toggle">
          <button 
            class={clsx('toggle-btn', viewMode === 'kanban' && 'active')} 
            onclick={() => viewMode = 'kanban'}
            title="Kanban View"
          >
            <LayoutGrid size={16} />
          </button>
          <button 
            class={clsx('toggle-btn', viewMode === 'list' && 'active')} 
            onclick={() => viewMode = 'list'}
            title="List View"
          >
            <List size={16} />
          </button>
        </div>

        <div class="divider"></div>

        <button class="action-btn">
          <Filter size={16} />
          <span>Filter</span>
        </button>
        <button class="action-btn">
          <SortAsc size={16} />
          <span>Sort</span>
        </button>
      </div>
    </header>

    <div class="quick-add-wrapper">
      <QuickAddInput onCreated={handleCreated} />
    </div>
  </div>

  <div class="page-content">
    {#if isLoading}
      <div class="centered-well">
        <div class="status-container">
          <div class="spinner"></div>
          <p>Loading tasks...</p>
        </div>
      </div>
    {:else if tasks.length === 0}
      <div class="centered-well">
        <div class="status-container">
          <p class="empty-msg">No tasks in this project yet. Create one above!</p>
        </div>
      </div>
    {:else if viewMode === 'kanban'}
      <div class="kanban-outer-container">
        <KanbanBoard {tasks} onStatusChange={handleStatusChange} onTaskClick={handleTaskClick} />
      </div>
    {:else}
      <div class="centered-well">
        <!-- List view can be added here if needed -->
        <p>List view coming soon...</p>
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
    margin-bottom: 2.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-main);
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

  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
    background-color: transparent;
    border: none;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-muted);
    transition: color 0.15s;
  }

  .action-btn:hover {
    color: var(--text-main);
  }

  .page-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    min-height: 0;
  }

  .kanban-outer-container {
    width: 100%;
    padding: 0 2rem;
    flex: 1;
    overflow-x: auto;
  }

  .quick-add-wrapper {
    max-width: 800px;
    margin: 0 auto;
    margin-bottom: 2rem;
  }

  .status-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: var(--text-muted);
    padding: 2rem 0;
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
</style>
