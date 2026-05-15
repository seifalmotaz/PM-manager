<script lang="ts">
  import { getOrganization } from '$lib/stores/organization.svelte'
  import { getSessions, startSession, fetchActiveSessions } from '$lib/stores/org-sessions.svelte'
  import { Play, ChevronDown } from 'lucide-svelte'
  import { clsx } from 'clsx'

  let isOpen = $state(false)
  let containerEl = $state<HTMLDivElement>()

  const orgState = getOrganization()
  const sessionsState = getSessions()

  let hasActiveSessions = $derived(sessionsState.sessions.length > 0)

  $effect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (containerEl && !containerEl.contains(e.target as Node)) {
        isOpen = false
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  })

  async function handleStartForOrg(orgId: string) {
    isOpen = false
    await startSession(orgId)
  }

  // If user has only one org, start directly. If multiple, show picker
  async function handleStartClick() {
    const orgs = orgState.organizations
    if (orgs.length === 1) {
      await handleStartForOrg(orgs[0].id)
    } else if (orgs.length > 1) {
      isOpen = true
    }
  }
</script>

{#if !hasActiveSessions}
  <div class="clock-in-btn-container" bind:this={containerEl}>
    <button class="clock-in-btn" onclick={handleStartClick}>
      <Play size={14} />
      <span>Start Working</span>
    </button>

    {#if isOpen}
      <div class="org-picker-dropdown">
        {#each orgState.organizations as org (org.id)}
          <button class="org-picker-item" onclick={() => handleStartForOrg(org.id)}>
            <div class="org-avatar-sm">{org.name[0]?.toUpperCase() ?? '?'}</div>
            <span>{org.name}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .clock-in-btn-container {
    position: relative;
  }

  .clock-in-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.875rem;
    border: 1px solid var(--brand-primary);
    border-radius: 999px;
    background-color: transparent;
    color: var(--brand-primary);
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s;
    white-space: nowrap;
  }

  .clock-in-btn:hover {
    background-color: var(--brand-primary);
    color: white;
  }

  .org-picker-dropdown {
    position: absolute;
    top: calc(100% + 0.375rem);
    right: 0;
    min-width: 220px;
    background-color: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 50;
    padding: 0.375rem;
  }

  .org-picker-item {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    padding: 0.5rem 0.625rem;
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-main);
    cursor: pointer;
    transition: background-color 0.1s;
    text-align: left;
  }

  .org-picker-item:hover {
    background-color: var(--bg-surface-hover);
  }

  .org-avatar-sm {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: var(--brand-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.6875rem;
    flex-shrink: 0;
  }
</style>