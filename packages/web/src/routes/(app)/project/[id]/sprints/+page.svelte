<script lang="ts">
  import { page } from '$app/stores'
  import { trpc } from '$lib/trpc'
  import SprintBoard from '$lib/components/SprintBoard.svelte'
  import CapacityTable from '$lib/components/CapacityTable.svelte'
  import ForecastView from '$lib/components/ForecastView.svelte'
  import { clsx } from 'clsx'
  import type { Sprint } from 'api/modules/sprint/sprint.type'
  import type { TaskSummary } from '$lib/stores/tasks'

  let { data } = $props()

  let projectId = $derived($page.params.id)
  let sprints = $state<Sprint[]>([])
  let tasks = $state<TaskSummary[]>([])
  let activeSubTab = $state<'board' | 'capacity'>('board')
  let selectedSprintId = $state('')

  const workspaceId = data.workspaceId

  $effect(() => {
    async function load() {
      try {
        const [s, t] = await Promise.all([
          trpc.sprint.list.query({ projectId }),
          trpc.task.list.query({ projectId }),
        ])
        sprints = s as unknown as Sprint[]
        tasks = t as unknown as TaskSummary[]

        // Set default sprint selection (first active sprint)
        if (!selectedSprintId && sprints.length > 0) {
          const firstActive = sprints.find((s) => s.status !== 'completed')
          selectedSprintId = firstActive?.id ?? sprints[0].id
        }
      } catch (err) {
        console.error('Failed to load sprint board data:', err)
      }
    }
    load()
  })

  async function handleSprintChange(taskId: string, newSprintId: string) {
    // Capture previous sprintId before optimistic update
    const previousTask = tasks.find((t) => t.id === taskId)
    const previousSprintId = previousTask?.sprintId ?? null

    // Optimistic update
    tasks = tasks.map((t) =>
      t.id === taskId ? { ...t, sprintId: newSprintId } : t
    )
    try {
      await trpc.task.update.mutate({ id: taskId, sprintId: newSprintId })
    } catch (err) {
      console.error('Failed to move task:', err)
      // Revert to previous sprintId
      tasks = tasks.map((t) =>
        t.id === taskId ? { ...t, sprintId: previousSprintId } : t
      )
    }
  }
</script>

<div class="sprint-selector-bar">
  <label for="sprint-select" class="selector-label">Sprint:</label>
  <select id="sprint-select" class="sprint-select" bind:value={selectedSprintId}>
    {#each sprints as s (s.id)}
      <option value={s.id}>{s.name} ({s.status})</option>
    {/each}
  </select>
</div>

<nav class="board-sub-tabs">
  <button
    class={clsx('sub-tab', activeSubTab === 'board' && 'active')}
    onclick={() => activeSubTab = 'board'}
  >Board</button>
  <button
    class={clsx('sub-tab', activeSubTab === 'capacity' && 'active')}
    onclick={() => activeSubTab = 'capacity'}
  >Capacity</button>
</nav>

{#if activeSubTab === 'board'}
  <SprintBoard {sprints} {tasks} onSprintChange={handleSprintChange} />
{:else}
  {#if selectedSprintId}
    <div class="capacity-tab-content">
      <CapacityTable sprintId={selectedSprintId} {workspaceId} />
    </div>
  {:else}
    <p class="empty-msg">Select a sprint to view capacity.</p>
  {/if}
{/if}

<ForecastView projectId={projectId} />

<style>
  .sprint-selector-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
  }

  .selector-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-muted);
  }

  .sprint-select {
    padding: 0.3125rem 0.5rem;
    border: 1px solid var(--border-main);
    border-radius: var(--radius-lg);
    font-size: 0.8125rem;
    color: var(--text-main);
    background: white;
    min-width: 200px;
  }

  .board-sub-tabs {
    display: flex;
    gap: 0;
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--border-main);
  }

  .sub-tab {
    padding: 0.4375rem 1rem;
    font-size: 0.8125rem;
    font-weight: 500;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s;
  }

  .sub-tab.active {
    color: var(--text-main);
    border-bottom-color: var(--color-primary, #6366f1);
  }

  .sub-tab:hover:not(.active) {
    color: var(--text-main);
  }

  .capacity-tab-content {
    padding: 0.5rem 0;
  }

  .empty-msg {
    text-align: center;
    color: var(--text-muted);
    padding: 2rem;
    font-size: 0.9375rem;
  }
</style>