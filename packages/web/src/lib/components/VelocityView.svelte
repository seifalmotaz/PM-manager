<script lang="ts">
  interface FlaggedTask {
    taskId: string
    title: string
    storyPoints: number
    sprintFlag: string
  }

  interface VelocityData {
    completedPoints: number
    plannedPoints?: number
    overVelocity?: number
    flaggedTasks: FlaggedTask[]
    taskCount: number
  }

  interface Props {
    data: VelocityData | null
  }

  let { data = null }: Props = $props()

  let overVelocityDisplay = $derived(
    data?.overVelocity !== undefined && data?.overVelocity !== null
      ? `${(data.overVelocity * 100).toFixed(0)}%`
      : 'N/A'
  )

  let overVelocityClass = $derived(
    data?.overVelocity !== undefined && data?.overVelocity > 1
  )

  let hasFlaggedTasks = $derived(
    (data?.flaggedTasks?.length ?? 0) > 0
  )
</script>

{#if data}
  <div class="velocity-view">
    <div class="metrics-grid">
      <div class="metric-card">
        <span class="metric-label">Completed</span>
        <span class="metric-value">{data.completedPoints}</span>
        <span class="metric-unit">points</span>
      </div>
      
      {#if data.plannedPoints !== undefined}
        <div class="metric-card">
          <span class="metric-label">Planned</span>
          <span class="metric-value">{data.plannedPoints}</span>
          <span class="metric-unit">points</span>
        </div>
        <div class="metric-card" class:over-perform={overVelocityClass}>
          <span class="metric-label">Ratio</span>
          <span class="metric-value">{overVelocityDisplay}</span>
          <span class="metric-unit">&nbsp;</span>
        </div>
      {/if}
      
      <div class="metric-card">
        <span class="metric-label">Tasks</span>
        <span class="metric-value">{data.taskCount}</span>
        <span class="metric-unit">completed</span>
      </div>
    </div>
    
    {#if hasFlaggedTasks}
      <div class="flagged-section">
        <h3 class="flagged-heading">Flagged Tasks ({data.flaggedTasks.length})</h3>
        <div class="flagged-list">
          {#each data.flaggedTasks as task (task.taskId)}
            <div class="flagged-row">
              <span class="flag-badge">{task.sprintFlag}</span>
              <span class="flag-title">{task.title}</span>
              <span class="flag-sp">{task.storyPoints} SP</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .velocity-view {
    padding: 1.5rem;
    background: var(--bg-surface-hover);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-main);
  }

  .metrics-grid {
    display: flex;
    gap: 2rem;
    margin-bottom: 1.5rem;
  }

  .metric-card {
    text-align: center;
    flex: 1;
  }

  .metric-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--text-muted);
    display: block;
  }

  .metric-value {
    font-size: 2rem;
    font-weight: 700;
    display: block;
    color: var(--text-main);
    font-variant-numeric: tabular-nums;
  }

  .metric-unit {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .over-perform .metric-value {
    color: var(--color-success, #22c55e);
  }

  .flagged-section {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-main);
  }

  .flagged-heading {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
  }

  .flagged-list {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .flagged-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.5rem;
    background: rgba(245, 158, 11, 0.05);
    border-radius: var(--radius-lg);
  }

  .flag-badge {
    background: var(--color-warning, #f59e0b);
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .flag-title {
    flex: 1;
    font-size: 0.875rem;
    color: var(--text-main);
  }

  .flag-sp {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
</style>