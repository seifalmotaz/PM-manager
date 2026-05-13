<script lang="ts">
  interface Sprint {
    id: string
    name: string
    status: string
  }

  interface Workspace {
    id: string
    name: string
  }

  interface Project {
    id: string
    name: string
    workspaceId: string
  }

  interface Props {
    mode: 'live' | 'snapshot' | 'custom'
    onModeChange: (mode: 'live' | 'snapshot' | 'custom') => void
    // Sprints for live/snapshot dropdown
    sprints?: Sprint[]
    selectedSprintId?: string
    onSprintChange?: (sprintId: string) => void
    // Custom mode params
    customStartDate?: string
    customEndDate?: string
    customWorkspaceIds?: string[]
    customProjectIds?: string[]
    onCustomParamChange?: (params: { key: string; value: unknown }) => void
    // Available filter options
    workspaces?: Workspace[]
    projects?: Project[]
  }

  let {
    mode,
    onModeChange,
    sprints,
    selectedSprintId,
    onSprintChange,
    customStartDate,
    customEndDate,
    customWorkspaceIds,
    customProjectIds,
    onCustomParamChange,
    workspaces,
    projects,
  }: Props = $props()

  function handleWorkspaceCheckbox(wsId: string, checked: boolean) {
    onCustomParamChange?.({ key: 'workspaceIds', value: { id: wsId, checked } })
  }

  function handleProjectCheckbox(pId: string, checked: boolean) {
    onCustomParamChange?.({ key: 'projectIds', value: { id: pId, checked } })
  }
</script>

<div class="mode-selector">
  <div class="mode-toggles">
    <button class="toggle-btn" class:active={mode === 'live'} onclick={() => onModeChange('live')}>Live</button>
    <button class="toggle-btn" class:active={mode === 'snapshot'} onclick={() => onModeChange('snapshot')}>Snapshot</button>
    <button class="toggle-btn" class:active={mode === 'custom'} onclick={() => onModeChange('custom')}>Custom</button>
  </div>
  
  <div class="mode-controls">
    {#if mode === 'live' || mode === 'snapshot'}
      <div class="control-row">
        <label class="control-label">Sprint:</label>
        <select 
          value={selectedSprintId ?? ''} 
          onchange={(e) => onSprintChange?.((e.target as HTMLSelectElement).value)}
        >
          <option value="" disabled>Select a sprint...</option>
          {#if sprints}
            {#each sprints as sprint (sprint.id)}
              {#if mode === 'live' ? sprint.status !== 'completed' : sprint.status === 'completed'}
                <option value={sprint.id}>{sprint.name}</option>
              {/if}
            {/each}
          {/if}
        </select>
      </div>
    {:else if mode === 'custom'}
      <div class="control-group">
        <div class="control-row">
          <label class="control-label">Start:</label>
          <input type="date" value={customStartDate ?? ''} onchange={(e) => onCustomParamChange?.({ key: 'startDate', value: (e.target as HTMLInputElement).value })} />
          <label class="control-label">End:</label>
          <input type="date" value={customEndDate ?? ''} onchange={(e) => onCustomParamChange?.({ key: 'endDate', value: (e.target as HTMLInputElement).value })} />
        </div>
        <div class="control-row">
          <div class="checkbox-group">
            <span class="control-label">Workspaces:</span>
            {#each workspaces ?? [] as ws (ws.id)}
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={customWorkspaceIds?.includes(ws.id) ?? false} 
                  onchange={(e) => handleWorkspaceCheckbox(ws.id, (e.target as HTMLInputElement).checked)} 
                />
                {ws.name}
              </label>
            {/each}
          </div>
        </div>
        <div class="control-row">
          <div class="checkbox-group">
            <span class="control-label">Projects:</span>
            {#each projects ?? [] as p (p.id)}
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={customProjectIds?.includes(p.id) ?? false} 
                  onchange={(e) => handleProjectCheckbox(p.id, (e.target as HTMLInputElement).checked)} 
                />
                {p.name}
              </label>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .mode-selector {
    margin-bottom: 1.5rem;
  }

  .mode-toggles {
    display: flex;
    gap: 0;
    background: var(--bg-surface-hover);
    border-radius: var(--radius-lg);
    padding: 2px;
    width: fit-content;
    margin-bottom: 1rem;
  }

  .toggle-btn {
    padding: 0.375rem 1rem;
    font-size: 0.8125rem;
    font-weight: 500;
    border: none;
    border-radius: var(--radius-lg);
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s;
    background: none;
  }

  .toggle-btn.active {
    color: var(--text-main);
    background: white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .toggle-btn:hover:not(.active) {
    color: var(--text-main);
  }

  .mode-controls {
    margin-top: 0.5rem;
  }

  .control-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .control-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-muted);
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .checkbox-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8125rem;
    color: var(--text-main);
    cursor: pointer;
  }

  select,
  input[type="date"] {
    padding: 0.375rem 0.5rem;
    border: 1px solid var(--border-main);
    border-radius: var(--radius-lg);
    font-size: 0.8125rem;
    color: var(--text-main);
    background: white;
  }
</style>