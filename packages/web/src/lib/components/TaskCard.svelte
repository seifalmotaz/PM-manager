<script lang="ts">
  import type { TaskSummary } from '$lib/stores/tasks'
  import { Clock, Calendar, MessageSquare, MoreVertical } from 'lucide-svelte'
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
      p0: '#ef4444', // Red 500
      p1: '#f97316', // Orange 500
      p2: '#eab308', // Yellow 500
      p3: '#71717a', // Zinc 500
    }
    return colors[priority.toLowerCase()] ?? '#71717a'
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
  class={clsx('task-card', isDeadlinePast && 'deadline-past')}
  role="button"
  tabindex="0"
  onclick={onclick}
  onkeydown={handleKeydown}
>
  <div class="priority-indicator" style:--p-color={priorityColor(task.priority ?? 'p3')}></div>
  
  <div class="card-content">
    <div class="card-header">
      <span class="task-title">{task.title}</span>
      <button class="more-btn" aria-label="Task options">
        <MoreVertical size={14} />
      </button>
    </div>

    <div class="card-meta">
      {#if task.project?.name}
        <span class="project-tag">{task.project.name}</span>
      {/if}
      
      {#if task.dueDate}
        <div class={clsx('meta-item', isOverdue && 'overdue')}>
          <Calendar size={12} />
          <span>{formatDueDate(task.dueDate)}</span>
        </div>
      {/if}

      <div class="meta-item dwell">
        <Clock size={12} />
        <span>{formatDwellTime(task)}</span>
      </div>

      <!-- Placeholder for comments/attachments -->
      <div class="meta-item-group">
        <div class="meta-item">
          <MessageSquare size={12} />
          <span>2</span>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .task-card {
    position: relative;
    background-color: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    padding: 0.75rem;
    padding-left: 1rem;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    gap: 0.75rem;
    overflow: hidden;
  }

  .task-card:hover {
    border-color: var(--zinc-600);
    background-color: var(--bg-surface-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .priority-indicator {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background-color: var(--p-color);
  }

  .task-card.deadline-past {
    border-color: #ef4444;
    background-color: rgba(239, 68, 68, 0.05);
  }

  .card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .task-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-main);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .more-btn {
    opacity: 0;
    color: var(--text-muted);
    transition: opacity 0.15s;
    padding: 2px;
    border-radius: 4px;
  }

  .task-card:hover .more-btn {
    opacity: 1;
  }

  .more-btn:hover {
    background-color: var(--zinc-700);
    color: var(--text-main);
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .project-tag {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.025em;
    background-color: var(--zinc-800);
    padding: 1px 6px;
    border-radius: 4px;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .meta-item.overdue {
    color: #ef4444;
    font-weight: 600;
  }

  .meta-item-group {
    margin-left: auto;
    display: flex;
    gap: 0.5rem;
  }

  .dwell {
    font-size: 0.6875rem;
    opacity: 0.8;
  }
</style>
