<script lang="ts">
  import { trpc } from '$lib/trpc'
  import { BarChart3, TrendingUp, ChevronDown, ChevronRight, AlertCircle } from 'lucide-svelte'

  let { projectId }: { projectId: string } = $props()

  let forecast = $state<any>(null)
  let loading = $state(false)
  let isExpanded = $state(false)
  let error = $state<string | null>(null)

  async function loadForecast() {
    loading = true
    error = null
    try {
      forecast = await trpc.forecast.forProject.query({ projectId })
    } catch (err: any) {
      error = err.message || 'Failed to load forecast'
      forecast = null
    } finally {
      loading = false
    }
  }

  function toggle() {
    if (!isExpanded && !forecast) {
      loadForecast()
    }
    isExpanded = !isExpanded
  }

  function formatDate(isoString: string | null) {
    if (!isoString) return '-'
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
</script>

<div class="forecast-section">
  <button class="toggle-btn" onclick={toggle}>
    <TrendingUp size={16} />
    <span>Backlog Forecast</span>
    {#if isExpanded}
      <ChevronDown size={14} />
    {:else}
      <ChevronRight size={14} />
    {/if}
  </button>

  {#if isExpanded}
    <div class="forecast-content">
      {#if loading}
        <div class="skeleton-list">
          {#each Array(3) as _}
            <div class="skeleton-row"></div>
          {/each}
        </div>
      {:else if error}
        <div class="error-state">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button class="retry-btn" onclick={loadForecast}>Retry</button>
        </div>
      {:else if forecast && !forecast.hasData}
        <div class="no-data">
          <p>Complete at least one sprint to see forecasts.</p>
          <p class="sub">Average velocity is calculated from the last 3 completed sprints.</p>
        </div>
      {:else if forecast}
        <!-- Summary -->
        <div class="forecast-summary">
          <div class="summary-stat">
            <span class="stat-value">{forecast.totalBacklogSP}</span>
            <span class="stat-label">SP in backlog</span>
          </div>
          <div class="summary-stat">
            <span class="stat-value">{forecast.avgVelocity}</span>
            <span class="stat-label">Avg SP/sprint</span>
          </div>
          <div class="summary-stat">
            <span class="stat-value">~{forecast.sprintsNeeded}</span>
            <span class="stat-label">Sprints to clear</span>
          </div>
        </div>

        <!-- Breakdown table -->
        <table class="breakdown-table">
          <thead>
            <tr>
              <th>Sprint</th>
              <th>Dates (est.)</th>
              <th class="num">SP</th>
              <th class="num">Tasks</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {#each forecast.breakdown as sprint}
              <tr>
                <td class="sprint-label">Sprint +{sprint.sprintNumber}</td>
                <td class="dates">
                  {formatDate(sprint.estimatedStartDate)} — {formatDate(sprint.estimatedEndDate)}
                </td>
                <td class="num">{sprint.estimatedSP}</td>
                <td class="num">{sprint.taskCount}</td>
                <td>
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      style="width: {Math.min(100, (sprint.estimatedSP / forecast.avgVelocity) * 100)}%"
                    ></div>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {/if}
</div>

<style>
  .forecast-section {
    margin-top: 1.5rem;
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    background: var(--bg-surface);
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    color: var(--text-main);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    text-align: left;
  }
  .toggle-btn:hover {
    background: var(--bg-surface-hover);
  }
  .toggle-btn :global(svg:last-child) {
    margin-left: auto;
    color: var(--text-muted);
  }

  .forecast-content {
    padding: 1rem;
    border-top: 1px solid var(--border-main);
  }

  .forecast-summary {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 1.25rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-main);
  }

  .summary-stat {
    text-align: center;
    flex: 1;
  }
  .stat-value {
    display: block;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--brand-primary);
  }
  .stat-label {
    display: block;
    font-size: 0.7rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.125rem;
  }

  .breakdown-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8125rem;
  }
  .breakdown-table th {
    text-align: left;
    padding: 0.5rem 0.5rem;
    border-bottom: 1px solid var(--border-main);
    color: var(--text-muted);
    font-weight: 600;
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .breakdown-table td {
    padding: 0.625rem 0.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    color: var(--text-main);
  }
  .breakdown-table .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .breakdown-table .dates {
    color: var(--text-muted);
    font-size: 0.75rem;
  }
  .breakdown-table .sprint-label {
    font-weight: 600;
  }

  .progress-bar {
    width: 80px;
    height: 6px;
    background: rgba(255,255,255,0.08);
    border-radius: 3px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: var(--brand-primary);
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .no-data {
    text-align: center;
    padding: 1rem 0;
    color: var(--text-muted);
    font-size: 0.875rem;
  }
  .no-data .sub {
    font-size: 0.75rem;
    margin-top: 0.5rem;
  }

  .error-state {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #f87171;
    font-size: 0.875rem;
    padding: 0.75rem 0;
  }
  .retry-btn {
    margin-left: auto;
    padding: 0.25rem 0.75rem;
    background: var(--bg-surface-hover);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    color: var(--text-main);
    font-size: 0.75rem;
    cursor: pointer;
  }

  .skeleton-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .skeleton-row {
    height: 2rem;
    background: var(--bg-surface-hover);
    border-radius: var(--radius-md);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.7; }
  }
</style>