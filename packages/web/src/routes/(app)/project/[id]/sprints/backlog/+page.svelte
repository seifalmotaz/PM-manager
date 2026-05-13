<script lang="ts">
  import { page } from '$app/stores'
  import { trpc } from '$lib/trpc'
  import type { Sprint } from 'api/modules/sprint/sprint.type'
  import type { TaskSummary } from '$lib/stores/tasks'

  let projectId = $derived($page.params.id)
  let allTasks = $state<TaskSummary[]>([])
  let sprints = $state<Sprint[]>([])
  let error = $state('')
  let errorTimeout: ReturnType<typeof setTimeout> | undefined

  let backlogTasks = $derived(allTasks.filter((t) => !t.sprintId))
  let assignableSprints = $derived(
    sprints.filter((s) => s.status !== 'completed')
  )

  $effect(() => {
    async function load() {
      try {
        const [t, s] = await Promise.all([
          trpc.task.list.query({ projectId }),
          trpc.sprint.list.query({ projectId }),
        ])
        allTasks = t as unknown as TaskSummary[]
        sprints = s as unknown as Sprint[]
      } catch (err) {
        console.error('Failed to load backlog data:', err)
      }
    }
    load()
  })

  function showError(msg: string) {
    error = msg
    if (errorTimeout) clearTimeout(errorTimeout)
    errorTimeout = setTimeout(() => { error = '' }, 5000)
  }

  async function handleSprintAssign(task: TaskSummary, newSprintId: string) {
    const previousSprintId = task.sprintId
    // Optimistic update
    allTasks = allTasks.map((t) =>
      t.id === task.id ? { ...t, sprintId: newSprintId } : t
    )

    try {
      await trpc.task.update.mutate({ id: task.id, sprintId: newSprintId })
    } catch (err) {
      // Revert
      allTasks = allTasks.map((t) =>
        t.id === task.id ? { ...t, sprintId: previousSprintId } : t
      )
      showError(err instanceof Error ? err.message : 'Failed to assign task to sprint')
    }
  }

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function isOverdue(task: any): boolean {
    if (!task.dueDate || task.status === 'done') return false
    return new Date(task.dueDate) < new Date()
  }

  function priorityLabel(p: string | null | undefined): string {
    if (!p) return ''
    return p.toUpperCase()
  }

  function statusLabel(s: string): string {
    const map: Record<string, string> = {
      todo: 'To Do',
      in_progress: 'In Progress',
      review: 'Review',
      done: 'Done',
    }
    return map[s] || s
  }

  function dismissError() {
    error = ''
    if (errorTimeout) clearTimeout(errorTimeout)
  }
</script>

<div class="backlog-page">
  <div class="backlog-header">
    <h2 class="backlog-title">Backlog</h2>
    <span class="backlog-count">{backlogTasks.length} task{backlogTasks.length !== 1 ? 's' : ''}</span>
  </div>

  {#if error}
    <div class="error-banner">
      <span>{error}</span>
      <button class="error-dismiss" onclick={dismissError}>&times;</button>
    </div>
  {/if}

  {#if backlogTasks.length === 0}
    <div class="empty-state">
      <p>No tasks in the backlog.</p>
      <p class="empty-hint">Create tasks from the Kanban tab or unassign tasks from sprints.</p>
    </div>
  {:else}
    <div class="task-list">
      {#each backlogTasks as task (task.id)}
        <div class="task-row">
          <div class="task-row-left">
            {#if task.priority}
              <span
                class="priority-badge"
                class:priority-p0={task.priority === 'p0'}
                class:priority-p1={task.priority === 'p1'}
                class:priority-p2={task.priority === 'p2'}
                class:priority-p3={task.priority === 'p3'}
              >
                {priorityLabel(task.priority)}
              </span>
            {/if}
            <span class="task-title">{task.title}</span>
            <span class="status-badge status-{task.status}">
              {statusLabel(task.status)}
            </span>
          </div>

          <div class="task-row-right">
            {#if task.dueDate}
              <span class="due-date" class:overdue={isOverdue(task)}>
                {isOverdue(task) ? 'Overdue' : formatDate(task.dueDate)}
              </span>
            {/if}
            <span class="assignee-name">
              {task.assigneeId || 'Unassigned'}
            </span>
            <select
              class="sprint-select"
              value={task.sprintId || ''}
              onchange={(e) => {
                const value = (e.target as HTMLSelectElement).value
                if (value) handleSprintAssign(task, value)
              }}
            >
              <option value="" disabled>Assign to sprint...</option>
              {#each assignableSprints as sprint}
                <option value={sprint.id}>{sprint.name}</option>
              {/each}
            </select>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .backlog-page {
    padding: 1rem 0;
  }

  .backlog-header {
    display: flex;
    align-items: baseline;
    gap: 0.625rem;
    margin-bottom: 1rem;
  }

  .backlog-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-main);
    margin: 0;
  }

  .backlog-count {
    font-size: 0.8125rem;
    color: var(--text-muted);
  }

  .error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.75rem;
    font-size: 0.8125rem;
    color: #b91c1c;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 4px;
  }

  .error-dismiss {
    background: none;
    border: none;
    font-size: 1.125rem;
    color: #b91c1c;
    cursor: pointer;
    padding: 0 0.25rem;
  }

  .empty-state {
    padding: 3rem 0;
    text-align: center;
    color: var(--text-muted);
  }

  .empty-hint {
    font-size: 0.8125rem;
    margin-top: 0.5rem;
  }

  .task-list {
    display: flex;
    flex-direction: column;
  }

  .task-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--border-main);
    transition: background 0.1s;
    gap: 1rem;
  }

  .task-row:hover {
    background: var(--bg-surface-hover);
  }

  .task-row-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    flex: 1;
  }

  .task-title {
    font-size: 0.8125rem;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .priority-badge {
    font-size: 0.5625rem;
    font-weight: 700;
    padding: 0.125rem 0.3125rem;
    border-radius: 9999px;
    flex-shrink: 0;
  }

  .priority-p0 { background: #fecaca; color: #991b1b; }
  .priority-p1 { background: #fed7aa; color: #9a3412; }
  .priority-p2 { background: #dbeafe; color: #1e40af; }
  .priority-p3 { background: #e2e8f0; color: #475569; }

  .status-badge {
    font-size: 0.625rem;
    font-weight: 500;
    padding: 0.125rem 0.375rem;
    border-radius: 9999px;
    flex-shrink: 0;
  }

  .status-todo { background: #e2e8f0; color: #475569; }
  .status-in_progress { background: #dbeafe; color: #1d4ed8; }
  .status-review { background: #fef3c7; color: #92400e; }
  .status-done { background: #d1fae5; color: #065f46; }

  .task-row-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .due-date {
    font-size: 0.75rem;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .due-date.overdue {
    color: #ef4444;
    font-weight: 500;
  }

  .assignee-name {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .sprint-select {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    color: var(--text-main);
    background: var(--bg-surface-hover);
    border: 1px solid var(--border-main);
    border-radius: 4px;
    outline: none;
    min-width: 140px;
  }

  .sprint-select:focus {
    border-color: var(--color-primary, #6366f1);
  }
</style>