<script lang="ts">
  import { trpc } from '$lib/trpc'
  import { Clock } from 'lucide-svelte'

  let { taskId, onCreated }: { taskId: string; onCreated?: () => void } = $props()

  let mode = $state<'quick' | 'range'>('quick')
  let hours = $state<number | null>(null)
  let startTime = $state('')
  let endTime = $state('')
  let note = $state('')
  let isSubmitting = $state(false)
  let error = $state<string | null>(null)

  async function handleSubmit() {
    error = null

    if (mode === 'quick') {
      if (!hours || hours <= 0) {
        error = 'Please enter a valid number of hours'
        return
      }
      const end = new Date().toISOString()
      const start = new Date(Date.now() - hours * 3600000).toISOString()
      isSubmitting = true
      try {
        await trpc.timeEntry.create.mutate({
          taskId,
          startTime: start,
          endTime: end,
          note: note || undefined
        })
        hours = null
        note = ''
        onCreated?.()
      } catch (err: any) {
        error = err?.message ?? 'Failed to create time entry'
      } finally {
        isSubmitting = false
      }
    } else {
      // Range mode
      if (!startTime || !endTime) {
        error = 'Please enter both start and end times'
        return
      }
      const startDate = new Date(startTime)
      const endDate = new Date(endTime)
      if (endDate <= startDate) {
        error = 'End time must be after start time'
        return
      }
      isSubmitting = true
      try {
        await trpc.timeEntry.create.mutate({
          taskId,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          note: note || undefined
        })
        startTime = ''
        endTime = ''
        note = ''
        onCreated?.()
      } catch (err: any) {
        error = err?.message ?? 'Failed to create time entry'
      } finally {
        isSubmitting = false
      }
    }
  }
</script>

<div class="time-entry-form">
  <div class="form-header">
    <Clock size={16} />
    <span>Log Time</span>
    <button class="mode-toggle" onclick={() => mode = mode === 'quick' ? 'range' : 'quick'}>
      {mode === 'quick' ? 'Switch to date range' : 'Switch to quick log'}
    </button>
  </div>

  {#if mode === 'quick'}
    <div class="quick-form">
      <div class="form-row">
        <label for="hours-input">Hours</label>
        <input
          id="hours-input"
          type="number"
          step="0.25"
          min="0"
          placeholder="e.g. 2.5"
          bind:value={hours}
        />
      </div>
    </div>
  {:else}
    <div class="range-form">
      <div class="form-row">
        <label for="start-input">Start time</label>
        <input
          id="start-input"
          type="datetime-local"
          bind:value={startTime}
        />
      </div>
      <div class="form-row">
        <label for="end-input">End time</label>
        <input
          id="end-input"
          type="datetime-local"
          bind:value={endTime}
        />
      </div>
    </div>
  {/if}

  <div class="form-row">
    <label for="note-input">Note (optional)</label>
    <textarea
      id="note-input"
      rows="2"
      placeholder="What were you working on?"
      bind:value={note}
    ></textarea>
  </div>

  {#if error}
    <div class="error-msg">{error}</div>
  {/if}

  <button 
    class="submit-btn" 
    onclick={handleSubmit}
    disabled={isSubmitting}
  >
    {isSubmitting ? 'Saving...' : 'Log Time'}
  </button>
</div>

<style>
  .time-entry-form {
    background-color: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  .form-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-main);
    font-weight: 600;
    font-size: 0.875rem;
  }

  .form-header span {
    flex: 1;
  }

  .mode-toggle {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-decoration: underline;
    transition: color 0.15s;
  }

  .mode-toggle:hover {
    color: var(--text-main);
  }

  .quick-form,
  .range-form {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .form-row {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  label {
    font-size: 0.8125rem;
    color: var(--text-muted);
    font-weight: 500;
  }

  input,
  textarea {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-main);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    color: var(--text-main);
    background-color: var(--bg-app);
    transition: border-color 0.15s;
  }

  input:focus,
  textarea:focus {
    outline: none;
    border-color: var(--brand-primary);
  }

  input::placeholder,
  textarea::placeholder {
    color: var(--text-muted);
  }

  textarea {
    resize: none;
  }

  .error-msg {
    font-size: 0.8125rem;
    color: #db4c3f;
    padding: 0.5rem;
    background-color: rgba(219, 76, 63, 0.1);
    border-radius: var(--radius-sm);
  }

  .submit-btn {
    padding: 0.625rem 1rem;
    background-color: var(--brand-primary);
    color: white;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 0.875rem;
    transition: background-color 0.15s;
  }

  .submit-btn:hover:not(:disabled) {
    background-color: var(--brand-hover);
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>