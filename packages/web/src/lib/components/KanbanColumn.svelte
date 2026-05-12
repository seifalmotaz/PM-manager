<script lang="ts">
  import type { TaskSummary } from '$lib/stores/tasks'
  import TaskCard from './TaskCard.svelte'
  import { MoreHorizontal, Plus } from 'lucide-svelte'
  import { clsx } from 'clsx'

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
  }: {
    title: string
    tasks: TaskSummary[]
    status: string
    onDrop: (taskId: string, targetStatus: string) => Promise<void>
    onTaskClick: (task: TaskSummary) => void
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
      await onDrop(dragState.taskId, hoveredStatus)
    }

    dragState = { active: false, taskId: null, cloneEl: null, offsetX: 0, offsetY: 0 }
    hoveredStatus = null
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
        <TaskCard task={task} onclick={() => onTaskClick(task)} />
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
    background-color: var(--zinc-900);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-muted);
    transition: all 0.2s ease;
    min-width: 280px;
    max-width: 350px;
    height: 100%;
  }

  .kanban-column.drop-target {
    border-color: var(--brand-primary);
    background-color: var(--zinc-800);
    transform: scale(1.01);
  }

  .column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--border-muted);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .column-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-main);
    letter-spacing: -0.01em;
  }

  .task-count {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-muted);
    background-color: var(--zinc-800);
    padding: 1px 8px;
    border-radius: 999px;
  }

  .header-actions {
    display: flex;
    gap: 0.25rem;
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
    background-color: var(--zinc-800);
    color: var(--text-main);
  }

  .column-body {
    flex: 1;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  .card-wrapper {
    cursor: grab;
    transition: transform 0.1s;
  }

  .card-wrapper:active {
    cursor: grabbing;
    transform: scale(0.98);
  }

  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed var(--border-main);
    border-radius: var(--radius-md);
    margin: 0.5rem 0;
    min-height: 80px;
  }

  .empty-state p {
    font-size: 0.8125rem;
    color: var(--text-muted);
  }
</style>
