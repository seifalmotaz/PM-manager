<script lang="ts">
  import type { TaskSummary } from '$lib/stores/tasks'
  import type { Sprint } from 'api/modules/sprint/sprint.type'
  import SprintColumn from './SprintColumn.svelte'
  import SprintEditModal from './SprintEditModal.svelte'
  import { clsx } from 'clsx'

  let {
    sprints,
    tasks,
    onSprintChange,
  }: {
    sprints: Sprint[]
    tasks: TaskSummary[]
    onSprintChange: (taskId: string, newSprintId: string) => Promise<void>
  } = $props()

  let activeSprints = $derived(sprints.filter(s => s.status !== 'completed'))
  let completedSprints = $derived(sprints.filter(s => s.status === 'completed'))

  let editingSprint = $state<Sprint | null>(null)
  let isEditModalOpen = $state(false)

  function tasksForSprint(sprintId: string): TaskSummary[] {
    return tasks.filter(t => t.sprintId === sprintId)
  }

  function isSprintLocked(sprint: Sprint): boolean {
    return sprint.status === 'completed'
  }

  function handleSprintClick(sprint: Sprint) {
    editingSprint = sprint
    isEditModalOpen = true
  }

  async function handleDrop(taskId: string, targetSprintId: string) {
    const targetSprint = sprints.find(s => s.id === targetSprintId)
    if (targetSprint && isSprintLocked(targetSprint)) {
      return // Don't drop on locked sprint
    }
    await onSprintChange(taskId, targetSprintId)
  }

  function handleModalUpdated() {
    // The parent page will re-fetch data via its effect
    // Just close the modal
  }
</script>

<div class="sprint-board">
  <div class="board-scroll">
    <div class="board-inner">
      {#each activeSprints as sprint (sprint.id)}
        <SprintColumn
          {sprint}
          tasks={tasksForSprint(sprint.id)}
          locked={isSprintLocked(sprint)}
          onDrop={(taskId, targetSprintId) => handleDrop(taskId, targetSprintId)}
          onSprintClick={() => handleSprintClick(sprint)}
        />
      {/each}

      {#if completedSprints.length > 0}
        <div class="completed-section">
          <div class="completed-divider">
            <span>Completed</span>
          </div>
          {#each completedSprints as sprint (sprint.id)}
            <SprintColumn
              {sprint}
              tasks={tasksForSprint(sprint.id)}
              locked={isSprintLocked(sprint)}
              onDrop={(taskId, targetSprintId) => handleDrop(taskId, targetSprintId)}
              onSprintClick={() => handleSprintClick(sprint)}
            />
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

<SprintEditModal
  bind:isOpen={isEditModalOpen}
  sprint={editingSprint}
  onUpdated={handleModalUpdated}
/>

<style>
  .sprint-board {
    width: 100%;
    height: 100%;
  }

  .board-scroll {
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 1rem;
  }

  .board-inner {
    display: flex;
    gap: 1rem;
    min-height: calc(100vh - 250px);
    padding: 0.5rem 0;
  }

  .completed-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-left: 1rem;
    border-left: 1px solid var(--border-main);
    opacity: 0.6;
  }

  .completed-divider {
    display: flex;
    align-items: center;
    padding: 0.5rem 0;
  }

  .completed-divider span {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>