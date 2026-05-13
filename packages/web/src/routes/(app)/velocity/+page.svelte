<script lang="ts">
  import { trpc } from '$lib/trpc'
  import VelocityView from '$lib/components/VelocityView.svelte'
  import VelocityModeSelector from '$lib/components/VelocityModeSelector.svelte'
  import { Loader2 } from 'lucide-svelte'

  let mode = $state<'live' | 'snapshot' | 'custom'>('live')
  let velocityData = $state<{
    completedPoints: number
    plannedPoints?: number
    overVelocity?: number
    flaggedTasks: Array<{
      taskId: string
      title: string
      storyPoints: number
      sprintFlag: string
    }>
    taskCount: number
  } | null>(null)
  let isLoading = $state(false)
  let error = $state<string | null>(null)

  // Workspaces and projects lists
  let workspaces = $state<Array<{ id: string; name: string }>>([])
  let projects = $state<Array<{ id: string; name: string; workspaceId: string }>>([])
  let sprints = $state<Array<{ id: string; name: string; status: string }>>([])

  // Sprint selection for live/snapshot
  let selectedSprintId = $state('')

  // Custom mode params
  let customStartDate = $state('')
  let customEndDate = $state('')
  let customWorkspaceIds = $state<string[]>([])
  let customProjectIds = $state<string[]>([])

  // Initial data loading
  $effect(() => {
    async function load() {
      try {
        const [wsList, projList] = await Promise.all([
          trpc.workspace.list.query(),
          trpc.project.list.query({}),
        ])
        workspaces = wsList as Array<{ id: string; name: string }>
        projects = projList as Array<{ id: string; name: string; workspaceId: string }>

        // Default: select all workspaces
        customWorkspaceIds = workspaces.map(w => w.id)
      } catch (e) {
        console.error('Failed to load workspaces and projects:', e)
      }
    }
    load()
  })

  // Load sprints when projects changes
  $effect(() => {
    async function loadSprints() {
      if (projects.length === 0) return

      try {
        const sprintResults = await Promise.all(
          projects.map(p => trpc.sprint.list.query({ projectId: p.id }))
        )
        const allSprints = sprintResults.flat()
        // Deduplicate by ID
        const seen = new Set<string>()
        sprints = allSprints.filter(s => {
          if (seen.has(s.id)) return false
          seen.add(s.id)
          return true
        }) as Array<{ id: string; name: string; status: string }>
      } catch (e) {
        console.error('Failed to load sprints:', e)
      }
    }
    loadSprints()
  })

  async function handleSprintChange(sprintId: string) {
    if (!sprintId) return
    selectedSprintId = sprintId
    if (mode === 'live') {
      fetchLive(sprintId)
    } else if (mode === 'snapshot') {
      fetchSnapshot(sprintId)
    }
  }

  function handleModeChange(newMode: 'live' | 'snapshot' | 'custom') {
    mode = newMode
    velocityData = null
    error = null
    // Don't auto-fetch — user must select sprint or set params first
  }

  function handleCustomParamChange(params: { key: string; value: unknown }) {
    const { key, value } = params

    if (key === 'startDate') {
      customStartDate = value as string
    } else if (key === 'endDate') {
      customEndDate = value as string
    } else if (key === 'workspaceIds' || key === 'projectIds') {
      const { id, checked } = value as { id: string; checked: boolean }
      if (key === 'workspaceIds') {
        if (checked && !customWorkspaceIds.includes(id)) {
          customWorkspaceIds = [...customWorkspaceIds, id]
        } else if (!checked) {
          customWorkspaceIds = customWorkspaceIds.filter(wid => wid !== id)
        }
      } else {
        if (checked && !customProjectIds.includes(id)) {
          customProjectIds = [...customProjectIds, id]
        } else if (!checked) {
          customProjectIds = customProjectIds.filter(pid => pid !== id)
        }
      }
    }

    // Auto-fetch if we have both dates
    if (mode === 'custom' && customStartDate && customEndDate) {
      fetchCustom()
    }
  }

  async function fetchLive(sprintId: string) {
    isLoading = true
    error = null
    try {
      velocityData = await trpc.velocity.live.query({ sprintId })
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load velocity'
      velocityData = null
    } finally {
      isLoading = false
    }
  }

  async function fetchSnapshot(sprintId: string) {
    isLoading = true
    error = null
    try {
      velocityData = await trpc.velocity.snapshot.query({ sprintId })
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load velocity'
      velocityData = null
    } finally {
      isLoading = false
    }
  }

  async function fetchCustom() {
    isLoading = true
    error = null
    try {
      velocityData = await trpc.velocity.custom.query({
        startDate: new Date(customStartDate).toISOString(),
        endDate: new Date(customEndDate).toISOString(),
        workspaceIds: customWorkspaceIds.length > 0 ? customWorkspaceIds : undefined,
        projectIds: customProjectIds.length > 0 ? customProjectIds : undefined,
      })
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load velocity'
      velocityData = null
    } finally {
      isLoading = false
    }
  }
</script>

<div class="velocity-page">
  <div class="page-container">
    <header class="page-header">
      <h1 class="page-title">Velocity</h1>
    </header>

    <VelocityModeSelector
      {mode}
      {sprints}
      {selectedSprintId}
      {customStartDate}
      {customEndDate}
      {customWorkspaceIds}
      {customProjectIds}
      {workspaces}
      {projects}
      onModeChange={handleModeChange}
      onSprintChange={handleSprintChange}
      onCustomParamChange={handleCustomParamChange}
    />

    <div class="velocity-content">
      {#if isLoading}
        <div class="status-msg">
          <Loader2 size={20} class="spinner-icon" />
          <span>Loading velocity data...</span>
        </div>
      {:else if error}
        <div class="status-msg error">
          <span>{error}</span>
        </div>
      {:else if velocityData}
        <VelocityView data={velocityData} />
      {:else}
        <div class="status-msg muted">
          <span>
            {#if mode === 'live'}Select an active sprint to see live velocity.
            {:else if mode === 'snapshot'}Select a completed sprint to see historical snapshot.
            {:else}Set a date range to compute custom velocity.
            {/if}
          </span>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .velocity-page {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 2rem;
    padding-top: 1.5rem;
  }

  .page-container {
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
  }

  .page-header {
    margin-bottom: 1.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-main);
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-main);
  }

  .velocity-content {
    margin-top: 1rem;
  }

  .status-msg {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.9375rem;
    justify-content: center;
  }

  .status-msg.error {
    color: var(--color-danger, #ef4444);
  }

  .status-msg.muted {
    color: var(--text-muted);
  }

  .spinner-icon {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>