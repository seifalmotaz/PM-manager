<script lang="ts">
  import { workspaces, activeFilterIds, toggleWorkspaceFilter, selectAllWorkspaces, deselectAllWorkspaces } from '$lib/stores/workspaces'

  let open = $state(false)

  function handleToggle(id: string) {
    toggleWorkspaceFilter(id)
  }
</script>

<div class="workspace-filter-container">
  <button class="filter-trigger" onclick={() => (open = !open)}>
    Workspaces ({$activeFilterIds.length})
    <span class="arrow">{open ? '▲' : '▼'}</span>
  </button>

  {#if open}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="backdrop" role="presentation" onclick={() => (open = false)}></div>
    <div class="dropdown">
      <label class="dropdown-item all-item">
        <input
          type="checkbox"
          checked={$activeFilterIds.length === $workspaces.length && $workspaces.length > 0}
          onchange={() => {
            if ($activeFilterIds.length === $workspaces.length) {
              deselectAllWorkspaces()
            } else {
              selectAllWorkspaces()
            }
          }}
        />
        All Workspaces
      </label>
      {#each $workspaces as ws (ws.id)}
        <label class="dropdown-item">
          <input
            type="checkbox"
            checked={$activeFilterIds.includes(ws.id)}
            onchange={() => handleToggle(ws.id)}
          />
          {ws.name}
          <span class="member-count">{ws.memberCount}</span>
        </label>
      {/each}
    </div>
  {/if}
</div>

<style>
  .workspace-filter-container {
    position: relative;
    display: inline-block;
  }

  .filter-trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: var(--radius-md);
    background: transparent;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-muted);
    transition: color 0.15s, background-color 0.15s;
  }
  .filter-trigger:hover {
    color: var(--text-main);
    background-color: var(--bg-surface-hover);
  }
  .arrow {
    font-size: 0.625rem;
    opacity: 0.7;
  }
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 9;
  }
  .dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    background: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    min-width: 240px;
    z-index: 10;
    padding: 0.5rem 0;
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 1rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--text-main);
    transition: background-color 0.1s;
  }
  .dropdown-item:hover {
    background: var(--bg-surface-hover);
  }
  .all-item {
    border-bottom: 1px solid var(--border-muted);
    font-weight: 600;
    margin-bottom: 0.25rem;
    padding-bottom: 0.75rem;
  }
  .member-count {
    margin-left: auto;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    background-color: var(--td-border-muted);
    padding: 1px 6px;
    border-radius: 999px;
  }
  input[type="checkbox"] {
    accent-color: var(--brand-primary);
    width: 16px;
    height: 16px;
  }
</style>
