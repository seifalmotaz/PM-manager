<script lang="ts">
  import { workspaces, activeFilterIds, toggleWorkspaceFilter, selectAllWorkspaces, deselectAllWorkspaces } from '$lib/stores/workspaces'

  let open = $state(false)

  function handleToggle(id: string) {
    toggleWorkspaceFilter(id)
  }
</script>

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

<style>
  .filter-trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.375rem;
    background: var(--color-surface, #fff);
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--color-text, #1a202c);
  }
  .arrow {
    font-size: 0.625rem;
  }
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 9;
  }
  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 0.25rem;
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.375rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    min-width: 220px;
    z-index: 10;
    padding: 0.25rem 0;
  }
  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 0.875rem;
  }
  .dropdown-item:hover {
    background: var(--color-hover, #f7fafc);
  }
  .all-item {
    border-bottom: 1px solid var(--color-border, #e2e8f0);
    font-weight: 600;
  }
  .member-count {
    margin-left: auto;
    font-size: 0.75rem;
    color: var(--color-muted, #718096);
  }
</style>
