<script lang="ts">
  import type { TaskSummary } from '$lib/stores/tasks'
  import KanbanColumn from './KanbanColumn.svelte'

  let {
    tasks,
    onStatusChange,
    onTaskClick,
  }: {
    tasks: TaskSummary[]
    onStatusChange: (taskId: string, newStatus: string) => Promise<void>
    onTaskClick: (task: TaskSummary) => void
  } = $props()

  let tasksByColumn = $derived.by(() => {
    const grouped: Record<string, TaskSummary[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    }
    for (const task of tasks) {
      if (grouped[task.status]) {
        grouped[task.status].push(task)
      }
    }
    return grouped
  })

  const columns = [
    { id: 'todo', label: 'To Do' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'review', label: 'Review' },
    { id: 'done', label: 'Done' },
  ]
</script>

<div class="kanban-board-container">
  <div class="kanban-board">
    {#each columns as column (column.id)}
      <KanbanColumn
        title={column.label}
        tasks={tasksByColumn[column.id]}
        status={column.id}
        onDrop={(taskId, targetStatus) => onStatusChange(taskId, targetStatus)}
        onTaskClick={onTaskClick}
      />
    {/each}
  </div>
</div>

<style>
  .kanban-board-container {
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 1rem;
    scrollbar-width: none;
  }

  .kanban-board {
    display: flex;
    gap: 2rem;
    height: 100%;
    min-height: calc(100vh - 200px);
    padding: 1rem 0;
    justify-content: center;
  }

  @media (min-width: 1440px) {
    .kanban-board {
      justify-content: flex-start;
    }
  }
</style>
