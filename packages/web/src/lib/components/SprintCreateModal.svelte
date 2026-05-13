<script lang="ts">
  import { X } from 'lucide-svelte'
  import { trpc } from '$lib/trpc'

  let {
    isOpen = $bindable(false),
    projectId,
    onCreated,
  }: {
    isOpen?: boolean
    projectId: string
    onCreated: () => void
  } = $props()

  let name = $state('')
  let goal = $state('')
  let startDate = $state('')
  let endDate = $state('')
  let error = $state('')
  let isSubmitting = $state(false)

  function resetForm() {
    name = ''
    goal = ''
    startDate = ''
    endDate = ''
    error = ''
  }

  function handleClose() {
    isOpen = false
    resetForm()
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') handleClose()
  }

  async function handleSubmit(e: Event) {
    e.preventDefault()
    error = ''

    if (!name.trim()) {
      error = 'Name is required'
      return
    }
    if (!startDate || !endDate) {
      error = 'Start and end dates are required'
      return
    }

    isSubmitting = true
    try {
      await trpc.sprint.create.mutate({
        projectId,
        name: name.trim(),
        goal: goal.trim() || undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      })
      onCreated()
      handleClose()
    } catch (err: any) {
      error = err?.message || 'Failed to create sprint'
    } finally {
      isSubmitting = false
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={handleClose} onkeydown={handleKeydown}>
    <div class="modal-container" onclick={e => e.stopPropagation()}>
      <div class="modal-header">
        <span class="modal-title">New Sprint</span>
        <button class="close-btn" onclick={handleClose}>
          <X size={16} />
        </button>
      </div>

      <form class="modal-body" onsubmit={handleSubmit}>
        <div class="form-group">
          <label for="sprint-name" class="form-label">Name</label>
          <input
            id="sprint-name"
            type="text"
            class="form-input"
            placeholder="e.g., Sprint 4"
            bind:value={name}
            maxlength={200}
            autofocus
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="sprint-start" class="form-label">Start Date</label>
            <input
              id="sprint-start"
              type="date"
              class="form-input"
              bind:value={startDate}
            />
          </div>
          <div class="form-group">
            <label for="sprint-end" class="form-label">End Date</label>
            <input
              id="sprint-end"
              type="date"
              class="form-input"
              bind:value={endDate}
            />
          </div>
        </div>

        <div class="form-group">
          <label for="sprint-goal" class="form-label">Goal (optional)</label>
          <textarea
            id="sprint-goal"
            class="form-input form-textarea"
            placeholder="What should this sprint achieve?"
            bind:value={goal}
            rows={3}
          ></textarea>
        </div>

        {#if error}
          <p class="form-error">{error}</p>
        {/if}

        <button type="submit" class="btn-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Sprint'}
        </button>
      </form>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 15vh;
    z-index: 999;
  }

  .modal-container {
    width: 100%;
    max-width: 500px;
    background: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-lg);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    animation: slideUp 0.15s ease-out;
  }

  @keyframes slideUp {
    from { transform: translateY(10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-main);
    background: var(--zinc-950);
  }

  .modal-title {
    font-size: 0.875rem;
    font-weight: 600;
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
    background: none;
    border: none;
    cursor: pointer;
  }

  .close-btn:hover {
    background: var(--bg-surface-hover);
  }

  .modal-body {
    padding: 1rem;
  }

  .form-group {
    margin-bottom: 0.875rem;
  }

  .form-row {
    display: flex;
    gap: 0.75rem;
  }

  .form-row .form-group {
    flex: 1;
  }

  .form-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-muted);
    margin-bottom: 0.25rem;
  }

  .form-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    color: var(--text-main);
    background: var(--bg-surface-hover);
    border: 1px solid var(--border-main);
    border-radius: 4px;
    outline: none;
    box-sizing: border-box;
  }

  .form-input:focus {
    border-color: var(--color-primary, #6366f1);
  }

  .form-textarea {
    resize: vertical;
    min-height: 60px;
  }

  .form-error {
    color: #ef4444;
    font-size: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .btn-submit {
    width: 100%;
    padding: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: white;
    background: var(--color-primary, #6366f1);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .btn-submit:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn-submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>