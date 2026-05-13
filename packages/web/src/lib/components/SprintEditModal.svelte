<script lang="ts">
  import { X } from 'lucide-svelte'
  import { trpc } from '$lib/trpc'
  import SprintDeleteDialog from './SprintDeleteDialog.svelte'
  // Import Sprint type from the API package via relative path
  import type { Sprint } from 'api/modules/sprint/sprint.type'

  let {
    isOpen = $bindable(false),
    sprint = null,
    onUpdated,
  }: {
    isOpen?: boolean
    sprint: Sprint | null
    onUpdated: () => void
  } = $props()

  let name = $state('')
  let goal = $state('')
  let startDate = $state('')
  let endDate = $state('')
  let error = $state('')
  let isSubmitting = $state(false)
  let isDeleting = $state(false)

  // Sync sprint data to form when sprint changes
  $effect(() => {
    if (sprint && isOpen) {
      name = sprint.name
      goal = sprint.goal || ''
      startDate = sprint.startDate instanceof Date
        ? sprint.startDate.toISOString().split('T')[0]
        : new Date(sprint.startDate).toISOString().split('T')[0]
      endDate = sprint.endDate instanceof Date
        ? sprint.endDate.toISOString().split('T')[0]
        : new Date(sprint.endDate).toISOString().split('T')[0]
      error = ''
    }
  })

  function handleClose() {
    isOpen = false
    isDeleting = false
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') handleClose()
  }

  async function handleSubmit(e: Event) {
    e.preventDefault()
    error = ''
    if (!sprint) return

    if (!name.trim()) {
      error = 'Name is required'
      return
    }

    const updates: Record<string, any> = {}
    if (name.trim() !== sprint.name) updates.name = name.trim()
    if ((goal || '') !== (sprint.goal || '')) updates.goal = goal || undefined
    if (startDate !== new Date(sprint.startDate).toISOString().split('T')[0])
      updates.startDate = new Date(startDate).toISOString()
    if (endDate !== new Date(sprint.endDate).toISOString().split('T')[0])
      updates.endDate = new Date(endDate).toISOString()

    if (Object.keys(updates).length === 0) {
      handleClose()
      return
    }

    isSubmitting = true
    try {
      await trpc.sprint.update.mutate({ id: sprint.id, ...updates })
      onUpdated()
      handleClose()
    } catch (err: any) {
      error = err?.message || 'Failed to update sprint'
    } finally {
      isSubmitting = false
    }
  }

  let isCompleted = $derived(sprint?.status === 'completed')
</script>

{#if isOpen && sprint}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={handleClose} onkeydown={handleKeydown}>
    <div class="modal-container" onclick={e => e.stopPropagation()}>
      <div class="modal-header">
        <span class="modal-title">
          {sprint.name}
          <span class="status-badge status-{sprint.status}">{sprint.status}</span>
        </span>
        <button class="close-btn" onclick={handleClose}>
          <X size={16} />
        </button>
      </div>

      <form class="modal-body" onsubmit={handleSubmit}>
        {#if isCompleted}
          <p class="completed-warning">This sprint is completed and cannot be edited.</p>
        {/if}

        <div class="form-group">
          <label for="edit-sprint-name" class="form-label">Name</label>
          <input
            id="edit-sprint-name"
            type="text"
            class="form-input"
            bind:value={name}
            maxlength={200}
            disabled={isCompleted}
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="edit-sprint-start" class="form-label">Start Date</label>
            <input
              id="edit-sprint-start"
              type="date"
              class="form-input"
              bind:value={startDate}
              disabled={isCompleted}
            />
          </div>
          <div class="form-group">
            <label for="edit-sprint-end" class="form-label">End Date</label>
            <input
              id="edit-sprint-end"
              type="date"
              class="form-input"
              bind:value={endDate}
              disabled={isCompleted}
            />
          </div>
        </div>

        <div class="form-group">
          <label for="edit-sprint-goal" class="form-label">Goal</label>
          <textarea
            id="edit-sprint-goal"
            class="form-input form-textarea"
            bind:value={goal}
            rows={3}
            disabled={isCompleted}
          ></textarea>
        </div>

        {#if error}
          <p class="form-error">{error}</p>
        {/if}

        <div class="btn-row">
          {#if !isCompleted}
            <button type="submit" class="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          {/if}
          <button
            type="button"
            class="btn-danger"
            onclick={() => isDeleting = true}
            disabled={isSubmitting}
          >
            Delete Sprint
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Delete confirmation dialog -->
  {#if isDeleting}
    <SprintDeleteDialog
      sprintId={sprint.id}
      sprintName={sprint.name}
      onClose={() => isDeleting = false}
      onDeleted={() => { handleClose(); onUpdated(); }}
    />
  {/if}
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-badge {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    padding: 0.125rem 0.375rem;
    border-radius: 9999px;
    display: inline-block;
  }

  .status-planned { background: #e2e8f0; color: #475569; }
  .status-active { background: #dbeafe; color: #1d4ed8; }
  .status-completed { background: #d1fae5; color: #065f46; }

  .completed-warning {
    font-size: 0.75rem;
    color: #f59e0b;
    background: #fef3c7;
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    margin-bottom: 0.875rem;
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

  .form-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

  .btn-row {
    display: flex;
    gap: 0.5rem;
  }

  .btn-primary {
    flex: 1;
    padding: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: white;
    background: var(--color-primary, #6366f1);
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .btn-primary:hover:not(:disabled) { opacity: 0.9; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-danger {
    flex: 1;
    padding: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #ef4444;
    background: transparent;
    border: 1px solid #ef4444;
    border-radius: 4px;
    cursor: pointer;
  }

  .btn-danger:hover { background: rgba(239, 68, 68, 0.1); }
</style>