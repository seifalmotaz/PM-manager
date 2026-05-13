<script lang="ts">
  import { trpc } from '$lib/trpc'

  let {
    sprintId,
    sprintName,
    onClose,
    onDeleted,
  }: {
    sprintId: string
    sprintName: string
    onClose: () => void
    onDeleted: () => void
  } = $props()

  let isDeleting = $state(false)
  let error = $state('')

  async function handleDelete(deleteTasks: boolean) {
    isDeleting = true
    error = ''
    try {
      await trpc.sprint.delete.mutate({ id: sprintId, deleteTasks })
      onDeleted()
    } catch (err: any) {
      error = err?.message || 'Failed to delete sprint'
    } finally {
      isDeleting = false
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="dialog-overlay" onclick={onClose} onkeydown={handleKeydown}>
  <div class="dialog-container" onclick={e => e.stopPropagation()}>
    <h3 class="dialog-title">Delete "{sprintName}"?</h3>
    <p class="dialog-message">What would you like to do with tasks in this sprint?</p>

    {#if error}
      <p class="dialog-error">{error}</p>
    {/if}

    <div class="dialog-actions">
      <button
        class="btn-delete-tasks"
        onclick={() => handleDelete(true)}
        disabled={isDeleting}
      >
        Delete Tasks
      </button>
      <button
        class="btn-move-backlog"
        onclick={() => handleDelete(false)}
        disabled={isDeleting}
      >
        Move to Backlog
      </button>
      <button
        class="btn-cancel"
        onclick={onClose}
        disabled={isDeleting}
      >
        Cancel
      </button>
    </div>
  </div>
</div>

<style>
  .dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1001;
  }

  .dialog-container {
    width: 100%;
    max-width: 380px;
    background: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-lg);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
    padding: 1.25rem;
  }

  .dialog-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--text-main);
    margin: 0 0 0.5rem;
  }

  .dialog-message {
    font-size: 0.8125rem;
    color: var(--text-muted);
    margin: 0 0 1rem;
  }

  .dialog-error {
    font-size: 0.75rem;
    color: #ef4444;
    margin-bottom: 0.75rem;
  }

  .dialog-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .btn-delete-tasks {
    padding: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: white;
    background: #ef4444;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .btn-delete-tasks:hover:not(:disabled) { background: #dc2626; }
  .btn-delete-tasks:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-move-backlog {
    padding: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-main);
    background: var(--bg-surface-hover);
    border: 1px solid var(--border-main);
    border-radius: 4px;
    cursor: pointer;
  }

  .btn-move-backlog:hover:not(:disabled) { background: var(--border-main); }
  .btn-move-backlog:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-cancel {
    padding: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-muted);
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .btn-cancel:hover:not(:disabled) { color: var(--text-main); }
  .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
</style>