<script lang="ts">
  import type { TaskSummary } from '$lib/stores/tasks'
  import TaskCard from './TaskCard.svelte'
  import { MoreHorizontal, Plus } from 'lucide-svelte'
  import { clsx } from 'clsx'
  import { showToast } from '$lib/stores/toast.svelte'
  import { isValidTransition, type TaskStatus } from 'shared'

  interface DragState {
    active: boolean
    taskId: string | null
    cloneEl: HTMLElement | null
    offsetX: number
    offsetY: number
  }

  let {
    title,
    tasks,
    status,
    onDrop,
    onTaskClick,
    showOrgBadges = false,
  }: {
    title: string
    tasks: TaskSummary[]
    status: string
    onDrop: (taskId: string, targetStatus: string) => Promise<void>
    onTaskClick: (task: TaskSummary) => void
    showOrgBadges?: boolean
  } = $props()

  let dragState: DragState = $state({
    active: false,
    taskId: null,
    cloneEl: null,
    offsetX: 0,
    offsetY: 0,
  })

  let hoveredStatus: string | null = $state(null)

  let isDropTarget = $derived(dragState.active && hoveredStatus === status)

  function startDrag(e: PointerEvent, taskId: string) {
    if (e.button !== 0) return
    e.preventDefault()

    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()

    const clone = target.cloneNode(true) as HTMLElement
    clone.style.position = 'fixed'
    clone.style.left = `${rect.left}px`
    clone.style.top = `${rect.top}px`
    clone.style.width = `${rect.width}px`
    clone.style.pointerEvents = 'none'
    clone.style.opacity = '0.9'
    clone.style.zIndex = '9999'
    clone.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.2)'
    clone.style.borderRadius = 'var(--radius-md)'
    clone.style.transform = 'rotate(1deg)'
    document.body.appendChild(clone)

    dragState = {
      active: true,
      taskId,
      cloneEl: clone,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    }

    target.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: PointerEvent) {
    if (!dragState.active || !dragState.cloneEl) return
    dragState.cloneEl.style.left = `${e.clientX - dragState.offsetX}px`
    dragState.cloneEl.style.top = `${e.clientY - dragState.offsetY}px`

    const els = document.elementsFromPoint(e.clientX, e.clientY)
    let foundStatus: string | null = null
    for (const el of els) {
      const col = (el as HTMLElement).closest('[data-column-status]')
      if (col) {
        foundStatus = (col as HTMLElement).getAttribute('data-column-status')
        break
      }
    }
    hoveredStatus = foundStatus
  }

  async function handlePointerUp(e: PointerEvent) {
    if (!dragState.active || !dragState.taskId) return

    if (dragState.cloneEl) {
      dragState.cloneEl.remove()
    }

    const task = tasks.find(t => t.id === dragState.taskId)
    if (task && hoveredStatus && hoveredStatus !== task.status) {
      // Client-side validation for faster feedback
      if (!isValidTransition(task.status as TaskStatus, hoveredStatus as TaskStatus)) {
        showToast(`Cannot move from "${formatStatus(task.status)}" to "${formatStatus(hoveredStatus)}". Move through adjacent statuses.`, 'error')
        dragState = { active: false, taskId: null, cloneEl: null, offsetX: 0, offsetY: 0 }
        hoveredStatus = null
        return
      }

      try {
        await onDrop(dragState.taskId, hoveredStatus)
      } catch (err: any) {
        // Handle backend errors
        if (err.message?.includes('Invalid status transition')) {
          showToast(err.message, 'error')
        } else if (err.message?.includes('completed sprints')) {
          showToast(err.message, 'error')
        } else {
          showToast('Failed to update task status. Please try again.', 'error')
        }
      }
    }

    dragState = { active: false, taskId: null, cloneEl: null, offsetX: 0, offsetY: 0 }
    hoveredStatus = null
  }

  function formatStatus(status: string): string {
    const labels: Record<string, string> = {
      'todo': 'To Do',
      'in_progress': 'In Progress',
      'done': 'Done',
    }
    return labels[status] ?? status
  }
</script>

<svelte:window
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
/>

<div
  class={clsx('kanban-column', isDropTarget && 'drop-target')}
  data-column-status={status}
>
  <div class="column-header">
    <div class="header-left">
      <h3 class="column-title">{title}</h3>
      <span class="task-count">{tasks.length}</span>
    </div>
    <div class="header-actions">
      <button class="icon-btn" title="Quick Add Task">
        <Plus size={16} />
      </button>
      <button class="icon-btn" title="Column Options">
        <MoreHorizontal size={16} />
      </button>
    </div>
  </div>

  <div class="column-body">
    {#each tasks as task (task.id)}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="card-wrapper"
        onpointerdown={(e) => startDrag(e, task.id)}
        style="touch-action: none"
      >
        <TaskCard task={task} onclick={() => onTaskClick(task)} {showOrgBadges} />
      </div>
    {/each}
    
    {#if tasks.length === 0}
      <div class="empty-state">
        <p>No tasks yet</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .kanban-column {
    display: flex;
    flex-direction: column;
    background-color: transparent;
    border-radius: var(--radius-lg);
    border: none;
    transition: all 0.2s ease;
    min-width: 300px;
    max-width: 400px;
    height: 100%;
  }

  .kanban-column.drop-target {
    background-color: var(--td-border-muted);
    border-radius: var(--radius-lg);
  }

  .column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 0;
    margin-bottom: 0.5rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .column-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-main);
  }

  .task-count {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-muted);
  }

  .header-actions {
    display: flex;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .kanban-column:hover .header-actions {
    opacity: 1;
  }

  .icon-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    border-radius: 4px;
    transition: all 0.15s;
  }

  .icon-btn:hover {
    background-color: var(--bg-surface-hover);
    color: var(--text-main);
  }

  .column-body {
    flex: 1;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow-y: auto;
    scrollbar-width: none;
  }

  .card-wrapper {
    cursor: grab;
  }

  .card-wrapper:active {
    cursor: grabbing;
  }

  .empty-state {
    padding: 2rem 0;
    text-align: center;
    border: 1px dashed var(--border-main);
    border-radius: var(--radius-md);
    opacity: 0.5;
  }

  .empty-state p {
    font-size: 0.875rem;
    color: var(--text-muted);
  }
</style>
