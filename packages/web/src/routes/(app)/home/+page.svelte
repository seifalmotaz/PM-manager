<script lang="ts">
  import { activeFilterIds } from '$lib/stores/workspaces'
  import { tasks, fetchTasks, isLoading, fetchOverdueCount } from '$lib/stores/tasks'
  import KanbanBoard from '$lib/components/KanbanBoard.svelte'
  import QuickAddInput from '$lib/components/QuickAddInput.svelte'
  import TaskModal from '$lib/components/TaskModal.svelte'
  import { trpc } from '$lib/trpc'
  import type { TaskSummary } from '$lib/stores/tasks'

  let selectedTask = $state<TaskSummary | null>(null)
  let showCreateModal = $state(false)
  let createModalProjectId = $state('')

  // Reactive: re-fetch tasks whenever the active filter changes
  $effect(() => {
    const ids = $activeFilterIds
    fetchTasks(ids)
  })

  async function handleStatusChange(taskId: string, newStatus: string) {
    try {
      await trpc.task.changeStatus.mutate({ id: taskId, status: newStatus as 'todo' | 'in_progress' | 'review' | 'done' })
      // Re-fetch tasks to get updated state
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
  <h1>Home</h1>

  <QuickAddInput onCreated={handleCreated} onAddWithDetails={handleAddWithDetails} />

  {#if $isLoading}
    <p class="loading">Loading tasks...</p>
  {:else if $tasks.length === 0}
    <p class="empty">No tasks yet. Create one to get started!</p>
  {:else}
    <KanbanBoard
      tasks={$tasks}
      onStatusChange={handleStatusChange}
      onTaskClick={handleTaskClick}
    />
  {/if}
</div>

{#if selectedTask}
  <TaskModal task={selectedTask} onClose={closeModal} onSaved={handleSaved} onDeleted={handleDeleted} />
{/if}

{#if showCreateModal && createModalProjectId}
  <TaskModal task={null} projectId={createModalProjectId} onClose={closeModal} onSaved={handleSaved} />
{/if}

<style>
  .home-page {
    padding: 1rem;
  }
  .loading, .empty {
    color: var(--color-muted, #718096);
    padding: 2rem 0;
  }
</style>
