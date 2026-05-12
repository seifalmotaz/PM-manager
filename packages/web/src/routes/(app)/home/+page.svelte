<script lang="ts">
  import { activeFilterIds } from '$lib/stores/workspaces'
  import { tasks, fetchTasks, isLoading, fetchOverdueCount } from '$lib/stores/tasks'
  import KanbanBoard from '$lib/components/KanbanBoard.svelte'
  import QuickAddInput from '$lib/components/QuickAddInput.svelte'
  import TaskModal from '$lib/components/TaskModal.svelte'
  import { trpc } from '$lib/trpc'
  import type { TaskSummary } from '$lib/stores/tasks'
  import { Filter, SortAsc, LayoutGrid, List } from 'lucide-svelte'

  let selectedTask = $state<TaskSummary | null>(null)
  let showCreateModal = $state(false)
  let createModalProjectId = $state('')

  $effect(() => {
    const ids = $activeFilterIds
    fetchTasks(ids)
  })

  async function handleStatusChange(taskId: string, newStatus: string) {
    try {
      await trpc.task.changeStatus.mutate({ id: taskId, status: newStatus as 'todo' | 'in_progress' | 'review' | 'done' })
      fetchTasks($activeFilterIds)
    } catch (err) {
      console.error('Failed to change task status:', err)
    }
  }

  function handleTaskClick(task: TaskSummary) {
    selectedTask = task
  }

  function closeModal() {
    selectedTask = null
    showCreateModal = false
  }

  function handleSaved() {
    closeModal()
    fetchTasks($activeFilterIds)
    fetchOverdueCount()
  }

  function handleDeleted() {
    closeModal()
    fetchTasks($activeFilterIds)
    fetchOverdueCount()
  }

  function handleCreated() {
    fetchTasks($activeFilterIds)
    fetchOverdueCount()
  }

  function handleAddWithDetails(projectId: string) {
    createModalProjectId = projectId
    showCreateModal = true
  }
</script>

<div class="home-page">
  <header class="page-header">
    <div class="header-main">
      <h1 class="page-title">Home</h1>
      <span class="page-subtitle">Your tasks across all workspaces</span>
    </div>

    <div class="header-actions">
      <div class="view-toggle">
        <button class="toggle-btn active" title="Kanban View">
          <LayoutGrid size={16} />
        </button>
        <button class="toggle-btn" title="List View">
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

  <div class="page-content">
    <div class="quick-add-wrapper">
      <QuickAddInput onCreated={handleCreated} onAddWithDetails={handleAddWithDetails} />
    </div>

    {#if $isLoading}
      <div class="status-container">
        <div class="spinner"></div>
        <p>Loading your tasks...</p>
      </div>
    {:else if $tasks.length === 0}
      <div class="status-container">
        <p class="empty-msg">No tasks yet. Create one to get started!</p>
      </div>
    {:else}
      <KanbanBoard
        tasks={$tasks}
        onStatusChange={handleStatusChange}
        onTaskClick={handleTaskClick}
      />
    {/if}
  </div>
</div>

{#if selectedTask}
  <TaskModal task={selectedTask} onClose={closeModal} onSaved={handleSaved} onDeleted={handleDeleted} />
{/if}

{#if showCreateModal && createModalProjectId}
  <TaskModal task={null} projectId={createModalProjectId} onClose={closeModal} onSaved={handleSaved} />
{/if}

<style>
  .home-page {
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
  }

  .page-title {
    font-size: 1.875rem;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: var(--text-main);
    line-height: 1.2;
  }

  .page-subtitle {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .view-toggle {
    display: flex;
    background-color: var(--zinc-900);
    padding: 2px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-main);
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
    background-color: var(--zinc-800);
    color: var(--text-main);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .divider {
    width: 1px;
    height: 24px;
    background-color: var(--border-main);
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.875rem;
    background-color: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-main);
    transition: all 0.15s;
  }

  .action-btn:hover {
    background-color: var(--bg-surface-hover);
    border-color: var(--zinc-600);
  }

  .page-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    min-height: 0;
  }

  .quick-add-wrapper {
    max-width: 800px;
  }

  .status-container {
    flex: 1;
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
</style>
