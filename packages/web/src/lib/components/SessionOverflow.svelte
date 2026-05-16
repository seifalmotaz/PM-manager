<script lang="ts">
  import { getSessions, stopSession, formatDuration } from '$lib/stores/org-sessions.svelte'
  import { Square, ChevronDown } from 'lucide-svelte'
  import { clsx } from 'clsx'

  let isOpen = $state(false)
  let containerEl = $state<HTMLDivElement>()

  const sessionsState = getSessions()
  let count = $derived(sessionsState.sessions.length)

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

  async function handleStop(sessionId: string) {
    await stopSession(sessionId)
  }
</script>

<div class="session-overflow" bind:this={containerEl}>
  <button class="overflow-trigger" onclick={() => (isOpen = !isOpen)}>
    <span class="dot"></span>
    <span>{count} active</span>
    <ChevronDown size={12} class={clsx('chevron', isOpen && 'open')} />
  </button>

  {#if isOpen}
    <div class="overflow-dropdown">
      {#each sessionsState.sessions as s (s.session.id)}
        <div class="overflow-item">
          <span class="item-dot"></span>
          <span class="item-org">{s.organizationName}</span>
          <span class="item-time">{formatDuration(s.elapsedSeconds)}</span>
          <button class="item-stop" onclick={() => handleStop(s.session.id)}>
            <Square size={10} />
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .session-overflow {
    position: relative;
  }

  .overflow-trigger {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border: 1px solid var(--brand-primary);
    border-radius: 999px;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-main);
    background-color: var(--bg-surface);
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .overflow-trigger:hover {
    background-color: var(--bg-surface-hover);
  }

  .dot {
    width: 6px;
    height: 6px;
    background-color: #22c55e;
    border-radius: 50%;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

  .overflow-dropdown {
    position: absolute;
    top: calc(100% + 0.375rem);
    right: 0;
    min-width: 280px;
    background-color: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 50;
    padding: 0.375rem;
  }

  .overflow-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    border-radius: var(--radius-sm);
  }

  .overflow-item:hover {
    background-color: var(--bg-surface-hover);
  }

  .item-dot {
    width: 6px;
    height: 6px;
    background-color: #22c55e;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .item-org {
    flex: 1;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-main);
  }

  .item-time {
    font-family: monospace;
    font-size: 0.8125rem;
    color: var(--text-muted);
    min-width: 50px;
    text-align: right;
  }

  .item-stop {
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    border-radius: 4px;
    transition: color 0.15s, background-color 0.15s;
  }

  .item-stop:hover {
    color: var(--text-main);
    background-color: var(--bg-surface-hover);
  }
</style>