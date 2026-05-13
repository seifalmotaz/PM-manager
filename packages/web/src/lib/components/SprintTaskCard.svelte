<script lang="ts">
  import type { TaskSummary } from '$lib/stores/tasks'
  import { Calendar } from 'lucide-svelte'
  import { clsx } from 'clsx'

  let {
    task,
    onclick,
  }: {
    task: TaskSummary
    onclick: () => void
  } = $props()

  function priorityColor(priority: string): string {
    const colors: Record<string, string> = {
      p0: '#db4c3f', // Todoist Red
      p1: '#ff9a00', // Todoist Orange
      p2: '#246fe0', // Todoist Blue
      p3: '#808080', // Todoist Gray
    }
    return colors[priority?.toLowerCase() ?? 'p3'] ?? '#808080'
  }

  function formatDueDate(dueDate: string): string {
    const date = new Date(dueDate)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[date.getMonth()]} ${date.getDate()}`
  }

  function statusColor(status: string): string {
    const colors: Record<string, string> = {
      'todo': '#808080',
      'in_progress': '#246fe0',
      'review': '#a855f7',
      'done': '#22c55e',
    }
    return colors[status?.toLowerCase()] ?? '#808080'
  }

  function statusLabel(status: string): string {
    const labels: Record<string, string> = {
      'todo': 'To Do',
      'in_progress': 'In Progress',
      'review': 'Review',
      'done': 'Done',
    }
    return labels[status?.toLowerCase()] ?? status
  }

  let isOverdue = $derived(
    task.status !== 'done' &&
    task.dueDate != null &&
    new Date(task.dueDate) < new Date()
  )

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onclick()
    }
  }
</script>

<div
  class="sprint-task-card"
  role="button"
  tabindex="0"
  onclick={onclick}
  onkeydown={handleKeydown}
>
  <div class="card-left">
    <span
      class="priority-badge"
      style:--p-color={priorityColor(task.priority ?? 'p3')}
    >
      {(task.priority ?? 'P3').toUpperCase()}
    </span>
  </div>

  <div class="card-content">
    <span class="task-title">{task.title}</span>

    <div class="card-meta">
      {#if task.dueDate}
        <div class={clsx('meta-item date', isOverdue && 'overdue')}>
          <Calendar size={12} />
          <span>{formatDueDate(task.dueDate)}</span>
        </div>
      {/if}

      {#if task.sprintFlag}
        <span class="sprint-flag">{task.sprintFlag}</span>
      {/if}

      {#if task.status}
        <span
          class="status-badge"
          style:--s-color={statusColor(task.status)}
        >
          {statusLabel(task.status)}
        </span>
      {/if}
    </div>
  </div>
</div>

<style>
  .sprint-task-card {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem 0.5rem;
    border-bottom: 1px solid var(--border-main);
    background-color: transparent;
    transition: background-color 0.1s;
    cursor: pointer;
  }

  .sprint-task-card:hover {
    background-color: var(--bg-surface-hover);
  }

  .card-left {
    flex-shrink: 0;
  }

  .priority-badge {
    font-size: 0.6875rem;
    font-weight: 700;
    color: var(--p-color);
    padding: 2px 5px;
    border-radius: 3px;
    background-color: color-mix(in srgb, var(--p-color) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--p-color) 30%, transparent);
    line-height: 1;
    letter-spacing: 0.02em;
  }

  .card-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .task-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-main);
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.6875rem;
    color: var(--text-muted);
  }

  .meta-item.overdue {
    color: #db4c3f;
  }

  .sprint-flag {
    font-size: 0.625rem;
    font-weight: 500;
    color: #92400e;
    background: #fef3c7;
    padding: 1px 5px;
    border-radius: 3px;
    border: 1px solid #fde68a;
  }

  .status-badge {
    font-size: 0.625rem;
    font-weight: 600;
    color: var(--s-color);
    padding: 1px 5px;
    border-radius: 3px;
    background-color: color-mix(in srgb, var(--s-color) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--s-color) 30%, transparent);
  }
</style>