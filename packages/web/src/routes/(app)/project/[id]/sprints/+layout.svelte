<script lang="ts">
  import { page } from '$app/stores'
  import SprintCreateModal from '$lib/components/SprintCreateModal.svelte'

  let { children } = $props()

  let projectId = $derived($page.params.id)
  let isCreateModalOpen = $state(false)

  // Refresh state to trigger component reloads after create
  let refreshKey = $state(0)

  function handleSprintCreated() {
    refreshKey++
  }
</script>

<div class="sprints-layout">
  <div class="sprints-header">
    <nav class="sprints-sub-tabs">
      <a
        href="/project/{projectId}/sprints"
        class="sub-tab"
        aria-current={!$page.url.pathname.includes('/backlog') ? 'page' : undefined}
      >
        Board
      </a>
      <a
        href="/project/{projectId}/sprints/backlog"
        class="sub-tab"
        aria-current={$page.url.pathname.includes('/backlog') ? 'page' : undefined}
      >
        Backlog
      </a>
    </nav>

    <button class="btn-primary" onclick={() => isCreateModalOpen = true}>
      + New Sprint
    </button>
  </div>

  <main class="sprints-content">
    {#key refreshKey}
      {@render children()}
    {/key}
  </main>
</div>

<SprintCreateModal
  bind:isOpen={isCreateModalOpen}
  {projectId}
  onCreated={handleSprintCreated}
/>

<style>
  .sprints-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .sprints-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-main);
  }

  .sprints-sub-tabs {
    display: flex;
    gap: 0;
  }

  .sub-tab {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    text-decoration: none;
    color: var(--text-muted);
    border-radius: var(--radius-lg);
    transition: all 0.15s;
  }

  .sub-tab[aria-current="page"] {
    color: var(--text-main);
    background: var(--bg-surface-hover);
  }

  .sub-tab:hover:not([aria-current="page"]) {
    color: var(--text-main);
  }

  .btn-primary {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: white;
    background: var(--color-primary, #6366f1);
    border: none;
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .btn-primary:hover {
    opacity: 0.9;
  }

  .sprints-content {
    flex: 1;
    overflow: hidden;
    padding: 0 1rem;
  }
</style>