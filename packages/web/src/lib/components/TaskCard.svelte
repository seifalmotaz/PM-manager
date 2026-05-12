<script lang="ts">
  import type { TaskSummary } from '$lib/stores/tasks'
  import { Clock, Calendar, MessageSquare, MoreVertical, Circle } from 'lucide-svelte'
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
    <div class="priority-circle" style:--p-color={priorityColor(task.priority ?? 'p3')}>
      <Circle size={18} strokeWidth={2} />
    </div>
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

      {#if task.statusChangedAt}
        <div class="meta-item">
          <Clock size={12} />
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

  .card-left {
    padding-top: 2px;
  }

  .priority-circle {
    color: var(--p-color);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.8;
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
