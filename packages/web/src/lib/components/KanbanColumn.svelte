<script lang="ts">
  import type { TaskSummary } from '$lib/stores/tasks'
  import TaskCard from './TaskCard.svelte'

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
    clone.style.opacity = '0.85'
    clone.style.zIndex = '9999'
    clone.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)'
    clone.style.borderRadius = '0.5rem'
    clone.style.transform = 'rotate(2deg)'
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

    // Hit-test to find the column under the pointer
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

    // Clean up clone
    if (dragState.cloneEl) {
      dragState.cloneEl.remove()
    }

    // If dropped on a different column, trigger the status change
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
  class={['kanban-column', isDropTarget ? 'drop-target' : '']}
  data-column-status={status}
>
  <div class="column-header">
    <h3 class="column-title">{title}</h3>
    <span class="task-count">{tasks.length}</span>
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
      <p class="empty-column">No tasks</p>
    {/if}
  </div>
</div>

<style>
  .kanban-column {
    display: flex;
    flex-direction: column;
    background: var(--color-bg-subtle, #f7fafc);
    border-radius: 0.75rem;
    border: 2px solid transparent;
    transition: border-color 0.15s ease, background 0.15s ease;
    min-height: 200px;
  }
  .kanban-column.drop-target {
    border-color: var(--color-primary, #3b82f6);
    background: var(--color-primary-light, #eff6ff);
  }
  .column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border, #e2e8f0);
  }
  .column-title {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--color-text, #1a202c);
    margin: 0;
  }
  .task-count {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-muted, #718096);
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 999px;
    padding: 0 0.5rem;
    line-height: 1.5;
  }
  .column-body {
    flex: 1;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }
  .card-wrapper {
    touch-action: none;
    cursor: grab;
  }
  .card-wrapper:active {
    cursor: grabbing;
  }
  .empty-column {
    font-size: 0.8125rem;
    color: var(--color-muted, #718096);
    text-align: center;
    padding: 2rem 0;
    margin: 0;
  }
</style>
