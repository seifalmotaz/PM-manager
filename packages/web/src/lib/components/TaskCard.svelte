<script lang="ts">
  import type { TaskSummary } from '$lib/stores/tasks'
  import { Clock, Calendar, MoreVertical } from 'lucide-svelte'
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
    return colors[priority.toLowerCase()] ?? '#808080'
  }

  function formatDwellTime(changedAt: string): string {
    const ms = Date.now() - new Date(changedAt).getTime()
    const minutes = Math.floor(ms / 60000)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d`
    return `${Math.floor(days / 7)}w`
  }

  function formatDueDate(dueDate: string): string {
    const date = new Date(dueDate)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[date.getMonth()]} ${date.getDate()}`
  }

  let isOverdue = $derived(
    task.status !== 'done' && (
      // Primary: deadline (hard cutoff) is past
      (task.deadline != null && new Date(task.deadline) < new Date()) ||
      // Fallback: no deadline set, but dueDate (soft target) is past
      (task.deadline == null && task.dueDate != null && new Date(task.dueDate) < new Date())
    )
  )

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onclick()
    }
  }
</script>

<div
  class="task-card-v2"
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
    <div class="card-title-row">
      <span class="task-title">{task.title}</span>
    </div>

    <div class="card-meta">
      {#if task.project?.name}
        <span class="project-indicator">
          <span class="dot"></span>
          {task.project.name}
        </span>
      {/if}
      
      {#if task.dueDate}
        <div class={clsx('meta-item date', isOverdue && 'overdue')}>
          <Calendar size={12} />
          <span>{formatDueDate(task.dueDate)}</span>
        </div>
      {/if}

      {#if task.statusChangedAt && task.status !== 'done'}
        <div class="meta-item dwell-time">
          <Clock size={12} />
          <span>{formatDwellTime(task.statusChangedAt)}</span>
        </div>
      {/if}
    </div>
  </div>

  <div class="card-actions">
    <button class="action-icon" aria-label="More">
      <MoreVertical size={16} />
    </button>
  </div>
</div>

<style>
  .task-card-v2 {
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem 0.5rem;
    border-bottom: 1px solid var(--border-main);
    background-color: transparent;
    transition: background-color 0.1s;
    cursor: pointer;
    position: relative;
  }

  .task-card-v2:hover {
    background-color: var(--bg-surface-hover);
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
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-main);
    line-height: 1.4;
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .project-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--td-text-secondary);
    font-weight: 500;
  }

  .project-indicator .dot {
    width: 6px;
    height: 6px;
    background-color: var(--td-text-muted);
    border-radius: 50%;
  }

  .dwell-time {
    gap: 0.25rem;
  }

  .dwell-time span {
    font-variant-numeric: tabular-nums;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .meta-item.overdue {
    color: #db4c3f;
  }

  .card-actions {
    opacity: 0;
    transition: opacity 0.15s;
    display: flex;
    align-items: center;
  }

  .task-card-v2:hover .card-actions {
    opacity: 1;
  }

  .action-icon {
    color: var(--text-muted);
    padding: 4px;
    border-radius: 4px;
  }

  .action-icon:hover {
    background-color: var(--td-hover);
    color: var(--text-main);
  }
</style>
