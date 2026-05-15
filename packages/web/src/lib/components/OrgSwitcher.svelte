<script lang="ts">
  import { page } from '$app/stores'
  import { getOrganization, navigateToOrg, type Organization } from '$lib/stores/organization.svelte'
  import { ChevronDown, Plus } from 'lucide-svelte'
  import { clsx } from 'clsx'

  let isOpen = $state(false)
  let dropdownEl = $state<HTMLDivElement>()

  const orgState = getOrganization()

  $effect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownEl && !dropdownEl.contains(e.target as Node)) {
        isOpen = false
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  })

  function handleSelect(org: Organization) {
    isOpen = false
    navigateToOrg(org)
  }

  function handleAddOrg() {
    isOpen = false
    console.log('Add organization — WorkOS join flow')
  }
</script>

<div class="org-switcher" bind:this={dropdownEl}>
  <button class="org-trigger" onclick={() => (isOpen = !isOpen)}>
    <span class="org-name">
      {orgState.activeOrganization?.name ?? 'Select Organization'}
    </span>
    <ChevronDown size={14} class={clsx('chevron', isOpen && 'open')} />
  </button>

  {#if isOpen}
    <div class="org-dropdown">
      <div class="org-list">
        {#each orgState.organizations as org (org.id)}
          <button
            class={clsx('org-item', org.id === orgState.activeOrganization?.id && 'active')}
            onclick={() => handleSelect(org)}
          >
            <div class="org-avatar">{org.name[0]?.toUpperCase() ?? '?'}</div>
            <span class="org-label">{org.name}</span>
            {#if org.id === orgState.activeOrganization?.id}
              <span class="check">✓</span>
            {/if}
          </button>
        {/each}
      </div>
      <div class="org-footer">
        <button class="add-org-btn" onclick={handleAddOrg}>
          <Plus size={14} />
          <span>Add Organization</span>
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .org-switcher {
    position: relative;
  }

  .org-trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: var(--radius-md);
    background: transparent;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-main);
    transition: background-color 0.15s;
    white-space: nowrap;
  }

  .org-trigger:hover {
    background-color: var(--bg-surface-hover);
  }

  .chevron {
    transition: transform 0.2s;
    color: var(--text-muted);
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .org-dropdown {
    position: absolute;
    top: calc(100% + 0.375rem);
    left: 0;
    min-width: 240px;
    background-color: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 50;
    overflow: hidden;
  }

  .org-list {
    padding: 0.375rem;
  }

  .org-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.5rem 0.625rem;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background-color 0.1s;
    text-align: left;
    border: none;
    background: none;
  }

  .org-item:hover {
    background-color: var(--bg-surface-hover);
  }

  .org-item.active {
    background-color: var(--td-hover);
  }

  .org-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background-color: var(--brand-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  .org-label {
    flex: 1;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-main);
  }

  .check {
    color: var(--brand-primary);
    font-weight: 700;
    font-size: 0.875rem;
  }

  .org-footer {
    border-top: 1px solid var(--border-main);
    padding: 0.375rem;
  }

  .add-org-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.625rem;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-muted);
    transition: background-color 0.1s, color 0.15s;
    border: none;
    background: none;
  }

  .add-org-btn:hover {
    background-color: var(--bg-surface-hover);
    color: var(--text-main);
  }
</style>