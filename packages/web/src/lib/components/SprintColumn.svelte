<script lang="ts">
  import type { TaskSummary } from '$lib/stores/tasks'
  import type { Sprint } from 'api/modules/sprint/sprint.type'
  import SprintTaskCard from './SprintTaskCard.svelte'
  import { clsx } from 'clsx'

  interface DragState {
    active: boolean
    taskId: string | null
    cloneEl: HTMLElement | null
    offsetX: number
    offsetY: number
  }

  let {
    sprint,
    tasks,
    locked,
    onDrop,
    onSprintClick,
  }: {
    sprint: Sprint
    tasks: TaskSummary[]
    locked: boolean
    onDrop: (taskId: string, targetSprintId: string) => void
    onSprintClick: () => void
  } = $props()

  let dragState: DragState = $state({
    active: false,
    taskId: null,
    cloneEl: null,
    offsetX: 0,
    offsetY: 0,
  })

  let hoveredSprintId: string | null = $state(null)

  let isDropTarget = $derived(dragState.active && hoveredSprintId === sprint.id && !locked)

  function formatDate(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[d.getMonth()]} ${d.getDate()}`
  }

  function formatDateRange(start: Date | string, end: Date | string): string {
    return `${formatDate(start)} — ${formatDate(end)}`
  }

  function statusBadgeClass(status: string): string {
    return `status-${status}`
  }

  function startDrag(e: PointerEvent, taskId: string) {
    if (e.button !== 0) return
    if (locked) return
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
    let foundSprintId: string | null = null
    for (const el of els) {
      const col = (el as HTMLElement).closest('[data-column-sprint-id]')
      if (col) {
        foundSprintId = (col as HTMLElement).getAttribute('data-column-sprint-id')
        break
      }
    }
    hoveredSprintId = foundSprintId
  }

  async function handlePointerUp(e: PointerEvent) {
    if (!dragState.active || !dragState.taskId) return

    if (dragState.cloneEl) {
      dragState.cloneEl.remove()
    }

    const task = tasks.find(t => t.id === dragState.taskId)
    const targetSprintId = hoveredSprintId

    // Only call onDrop if target sprint exists, is different from current sprint,
    // and the source column's sprint is not completed (locked sprints can't initiate drops)
    if (task && targetSprintId && targetSprintId !== task.sprintId) {
      onDrop(dragState.taskId, targetSprintId)
    }

    dragState = { active: false, taskId: null, cloneEl: null, offsetX: 0, offsetY: 0 }
    hoveredSprintId = null
  }
</script>

<svelte:window
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
/>

<div
  class={clsx('sprint-column', isDropTarget && 'drop-target', locked && 'locked')}
  data-column-sprint-id={sprint.id}
>
  <div class="column-header" onclick={onSprintClick} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSprintClick() }}>
    <div class="header-content">
      <h3 class="sprint-name">{sprint.name}</h3>
      <span class={clsx('status-badge', statusBadgeClass(sprint.status))}>{sprint.status}</span>
    </div>
    <div class="header-meta">
      <span class="date-range">{formatDateRange(sprint.startDate, sprint.endDate)}</span>
      <span class="task-count">{tasks.length} task(s)</span>
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
        <SprintTaskCard {task} onclick={() => {}} />
      </div>
    {/each}

    {#if tasks.length === 0}
      <div class="empty-state">
        <p>No tasks in this sprint</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .sprint-column {
    display: flex;
    flex-direction: column;
    background-color: transparent;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-main);
    min-width: 280px;
    max-width: 320px;
    height: 100%;
    transition: all 0.2s ease;
  }

  .sprint-column.drop-target {
    background-color: var(--bg-surface-hover);
    border-color: var(--color-primary);
  }

  .sprint-column.locked {
    opacity: 0.6;
  }

  .column-header {
    padding: 0.75rem 0.75rem 0.5rem;
    cursor: pointer;
    border-bottom: 1px solid var(--border-main);
  }

  .column-header:hover {
    background-color: var(--bg-surface-hover);
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .sprint-name {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-main);
  }

  .status-badge {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    padding: 0.125rem 0.375rem;
    border-radius: 9999px;
    display: inline-block;
  }

  .status-planned { background: #e2e8f0; color: #475569; }
  .status-active { background: #dbeafe; color: #1d4ed8; }
  .status-completed { background: #d1fae5; color: #065f46; }

  .header-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .date-range {
    font-size: 0.6875rem;
    color: var(--text-muted);
  }

  .task-count {
    font-size: 0.6875rem;
    color: var(--text-muted);
  }

  .column-body {
    flex: 1;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
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
    padding: 2rem 0.75rem;
    text-align: center;
    border: 1px dashed var(--border-main);
    border-radius: var(--radius-md);
    margin: 0.5rem;
    opacity: 0.5;
  }

  .empty-state p {
    font-size: 0.75rem;
    color: var(--text-muted);
  }
</style>