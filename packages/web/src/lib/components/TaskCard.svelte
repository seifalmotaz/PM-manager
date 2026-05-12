<script lang="ts">
  import type { TaskSummary } from '$lib/stores/tasks'

  let {
    task,
    onclick,
  }: {
    task: TaskSummary
    onclick: () => void
  } = $props()

  function priorityColor(priority: string): string {
    const colors: Record<string, string> = {
      p0: '#ef4444',
      p1: '#f97316',
      p2: '#eab308',
      p3: '#9ca3af',
    }
    return colors[priority.toLowerCase()] ?? '#9ca3af'
  }

  function formatDueDate(dueDate: string): string {
    const date = new Date(dueDate)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[date.getMonth()]} ${date.getDate()}`
  }

  let isOverdue = $derived(
    task.dueDate != null &&
    task.status !== 'done' &&
    new Date(task.dueDate) < new Date()
  )

  let isDeadlinePast = $derived(
    task.deadline != null &&
    task.status !== 'done' &&
    new Date(task.deadline) < new Date()
  )

  function formatDwellTime(task: TaskSummary): string {
    const dateStr = task.status === 'done' && task.completedAt
      ? task.completedAt
      : task.statusChangedAt
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d`
    const diffWeeks = Math.floor(diffDays / 7)
    return `${diffWeeks}w`
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onclick()
    }
  }
</script>

<div
  class={['task-card', isDeadlinePast ? 'deadline-past' : '']}
  role="button"
  tabindex="0"
  onclick={onclick}
  onkeydown={handleKeydown}
>
  <div class="card-header">
    <span class="card-title">{task.title}</span>
    {#if task.priority}
      <span class="priority-badge" style="background: {priorityColor(task.priority)}">
        {task.priority.toUpperCase()}
      </span>
    {/if}
  </div>
  <div class="card-meta">
    {#if task.project?.name}
      <span class="project-label">{task.project.name}</span>
    {/if}
    {#if task.dueDate}
      <span class={['due-date', isOverdue ? 'overdue' : '']}>
        {formatDueDate(task.dueDate)}
      </span>
    {/if}
  </div>
  <div class="card-footer">
    <span class="dwell-time">{formatDwellTime(task)}</span>
  </div>
</div>

<style>
  .task-card {
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.5rem;
    padding: 0.75rem;
    cursor: pointer;
    transition: box-shadow 0.15s ease, border-color 0.15s ease;
    user-select: none;
    -webkit-user-select: none;
  }
  .task-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border-color: var(--color-primary, #3b82f6);
  }
  .task-card.deadline-past {
    border-left: 3px solid #ef4444;
  }
  .card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .card-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text, #1a202c);
    line-height: 1.3;
    word-break: break-word;
  }
  .priority-badge {
    display: inline-flex;
    align-items: center;
    padding: 1px 6px;
    border-radius: 999px;
    font-size: 0.625rem;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .card-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.375rem;
    flex-wrap: wrap;
  }
  .project-label {
    font-size: 0.75rem;
    color: var(--color-muted, #718096);
  }
  .due-date {
    font-size: 0.75rem;
    color: var(--color-muted, #718096);
  }
  .due-date.overdue {
    color: #ef4444;
    font-weight: 600;
  }
  .card-footer {
    display: flex;
    align-items: center;
  }
  .dwell-time {
    font-size: 0.6875rem;
    color: var(--color-muted, #718096);
  }
</style>
