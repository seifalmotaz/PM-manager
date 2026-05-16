<script lang="ts">
  import { trpc } from '$lib/trpc'
  import { fetchActiveSessions } from '$lib/stores/org-sessions.svelte'
  import { showToast } from '$lib/stores/toast.svelte'
  import { Clock, X } from 'lucide-svelte'

  let {
    sessionId,
    organizationName,
    startTime,
    onClose,
  }: {
    sessionId: string
    organizationName: string
    startTime: string
    onClose: () => void
  } = $props()

  let isProcessing = $state(false)
  let mode = $state<'now' | 'custom'>('now')
  let customEndTime = $state('')

  let formattedDate = $derived(
    new Date(startTime).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  )

  $effect(() => {
    // Pre-fill custom end time with current time
    if (!customEndTime) {
      const now = new Date()
      customEndTime = now.toISOString().slice(0, 16)
    }
  })

  async function handleCloseNow() {
    isProcessing = true
    try {
      await trpc.orgSession.retroactivelyClose.mutate({
        sessionId,
        endTime: new Date().toISOString(),
      })
      await fetchActiveSessions()
      onClose()
    } catch (err: any) {
      console.error('Failed to close session:', err)
      showToast('Failed to close session. Please try again.', 'error')
    } finally {
      isProcessing = false
    }
  }

  async function handleCloseCustom() {
    if (!customEndTime) return
    isProcessing = true
    try {
      const endDate = new Date(customEndTime)
      await trpc.orgSession.retroactivelyClose.mutate({
        sessionId,
        endTime: endDate.toISOString(),
      })
      await fetchActiveSessions()
      onClose()
    } catch (err: any) {
      console.error('Failed to close session:', err)
      showToast('Failed to close session. Please try again.', 'error')
    } finally {
      isProcessing = false
    }
  }

  function handleIgnore() {
    onClose()
  }
</script>

<div class="dialog-backdrop">
  <div class="dialog">
    <div class="dialog-header">
      <div class="header-left">
        <Clock size={18} />
        <h3>Active session found</h3>
      </div>
      <button class="close-btn" onclick={handleIgnore}>
        <X size={16} />
      </button>
    </div>

    <div class="dialog-body">
      <p>
        You still had a running session for <strong>{organizationName}</strong>
        from <strong>{formattedDate}</strong>. Close it?
      </p>

      <div class="mode-options">
        <label class="mode-option" class:selected={mode === 'now'}>
          <input
            type="radio"
            name="mode"
            value="now"
            checked={mode === 'now'}
            onchange={() => (mode = 'now')}
          />
          <div class="mode-content">
            <span class="mode-title">Close now</span>
            <span class="mode-desc">Ends the session at the current time</span>
          </div>
        </label>

        <label class="mode-option" class:selected={mode === 'custom'}>
          <input
            type="radio"
            name="mode"
            value="custom"
            checked={mode === 'custom'}
            onchange={() => (mode = 'custom')}
          />
          <div class="mode-content">
            <span class="mode-title">Set end time</span>
            <span class="mode-desc">Specify when the session actually ended</span>
          </div>
        </label>
      </div>

      {#if mode === 'custom'}
        <div class="time-picker">
          <label for="end-time-input">End time</label>
          <input
            id="end-time-input"
            type="datetime-local"
            bind:value={customEndTime}
          />
        </div>
      {/if}
    </div>

    <div class="dialog-footer">
      <button class="ignore-btn" onclick={handleIgnore}>Ignore</button>
      <button
        class="confirm-btn"
        onclick={mode === 'now' ? handleCloseNow : handleCloseCustom}
        disabled={isProcessing || (mode === 'custom' && !customEndTime)}
      >
        {#if isProcessing}
          Closing...
        {:else if mode === 'now'}
          Close now
        {:else}
          Close at selected time
        {/if}
      </button>
    </div>
  </div>
</div>

<style>
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .dialog {
    background-color: var(--bg-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-main);
    width: 480px;
    max-width: 90vw;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border-main);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    color: var(--brand-primary);
  }

  .header-left h3 {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-main);
  }

  .close-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    border-radius: 4px;
    transition: color 0.15s, background-color 0.15s;
  }

  .close-btn:hover {
    color: var(--text-main);
    background-color: var(--bg-surface-hover);
  }

  .dialog-body {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .dialog-body p {
    font-size: 0.875rem;
    color: var(--text-main);
    line-height: 1.5;
  }

  .mode-options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .mode-option {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: border-color 0.15s, background-color 0.15s;
  }

  .mode-option.selected {
    border-color: var(--brand-primary);
    background-color: color-mix(in srgb, var(--brand-primary) 8%, transparent);
  }

  .mode-option input[type="radio"] {
    margin-top: 2px;
    accent-color: var(--brand-primary);
  }

  .mode-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .mode-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-main);
  }

  .mode-desc {
    font-size: 0.8125rem;
    color: var(--text-muted);
  }

  .time-picker {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .time-picker label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-muted);
  }

  .time-picker input {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-main);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    color: var(--text-main);
    background-color: var(--bg-app);
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--border-main);
  }

  .ignore-btn {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-muted);
    border-radius: var(--radius-md);
    transition: color 0.15s, background-color 0.15s;
  }

  .ignore-btn:hover {
    color: var(--text-main);
    background-color: var(--bg-surface-hover);
  }

  .confirm-btn {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: white;
    background-color: var(--brand-primary);
    border-radius: var(--radius-md);
    transition: background-color 0.15s;
  }

  .confirm-btn:hover:not(:disabled) {
    background-color: var(--brand-hover);
  }

  .confirm-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>