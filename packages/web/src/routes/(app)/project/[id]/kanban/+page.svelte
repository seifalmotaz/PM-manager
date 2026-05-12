<script lang="ts">
  import { page } from '$app/stores'
  import { trpc } from '$lib/trpc'
  import KanbanBoard from '$lib/components/KanbanBoard.svelte'
  import QuickAddInput from '$lib/components/QuickAddInput.svelte'
  import TaskModal from '$lib/components/TaskModal.svelte'
  import { fetchOverdueCount } from '$lib/stores/tasks'
  import type { TaskSummary } from '$lib/stores/tasks'

  let tasks = $state<TaskSummary[]>([])
  let isLoading = $state(true)
  let selectedTask = $state<TaskSummary | null>(null)

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
    selectedTask = task
  }

  function closeModal() {
    selectedTask = null
  }

  function handleSaved() {
    closeModal()
    loadTasks($page.params.id)
    fetchOverdueCount()
  }

  function handleCreated() {
    loadTasks($page.params.id)
    fetchOverdueCount()
  }
</script>

<div class="project-kanban-page">
  <QuickAddInput onCreated={handleCreated} />

  {#if isLoading}
    <p class="loading">Loading tasks...</p>
  {:else if tasks.length === 0}
    <p class="empty">No tasks in this project yet. Create one above!</p>
  {:else}
    <KanbanBoard {tasks} onStatusChange={handleStatusChange} onTaskClick={handleTaskClick} />
  {/if}
</div>

{#if selectedTask}
  <TaskModal task={selectedTask} onClose={closeModal} onSaved={handleSaved} />
{/if}

<style>
  .project-kanban-page {
    padding: 0;
  }
  .loading, .empty {
    color: var(--color-muted, #718096);
    padding: 2rem 0;
    text-align: center;
  }
</style>
