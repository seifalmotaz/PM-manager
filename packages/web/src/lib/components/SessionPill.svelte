<script lang="ts">
  import { getSessions, stopSession, formatDuration } from '$lib/stores/org-sessions.svelte'
  import { Square } from 'lucide-svelte'

  // Props for a single session
  let { sessionId, onStop }: { sessionId: string; onStop?: () => void } = $props()

  const sessionsState = getSessions()
  let session = $derived(sessionsState.sessions.find(s => s.session.id === sessionId))

  async function handleStop() {
    await stopSession(sessionId)
    onStop?.()
  }
</script>

{#if session}
  <div class="session-pill">
    <span class="session-dot"></span>
    <span class="session-org">{session.organizationName}</span>
    <span class="session-time">{formatDuration(session.elapsedSeconds)}</span>
    <button class="stop-btn" onclick={handleStop} title="Stop session">
      <Square size={10} />
    </button>
  </div>
{/if}

<style>
  .session-pill {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    background-color: var(--bg-surface);
    border: 1px solid var(--brand-primary);
    border-radius: 999px;
    padding: 0.25rem 0.625rem 0.25rem 0.5rem;
    font-size: 0.8125rem;
    white-space: nowrap;
  }

  .session-dot {
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

  .session-org {
    color: var(--text-main);
    font-weight: 500;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .session-time {
    color: var(--text-muted);
    font-family: monospace;
    font-size: 0.75rem;
    min-width: 40px;
    text-align: center;
  }

  .stop-btn {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    border-radius: 4px;
    transition: color 0.15s;
  }

  .stop-btn:hover {
    color: var(--text-main);
    background-color: var(--bg-surface-hover);
  }
</style>