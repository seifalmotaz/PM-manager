<script lang="ts">
  import { trpc } from '$lib/trpc'
  import { fetchAllTasks, fetchOverdueCount } from '$lib/stores/tasks'
  import { fetchActiveSessions } from '$lib/stores/org-sessions.svelte'
  import { X } from 'lucide-svelte'

  let {
    taskId,
    taskTitle,
    taskOrgId,
    taskOrgName,
    activeOrgId,
    activeOrgName,
    onClose,
  }: {
    taskId: string
    taskTitle: string
    taskOrgId: string
    taskOrgName: string
    activeOrgId: string
    activeOrgName: string
    onClose: () => void
  } = $props()

  let isProcessing = $state(false)
  let selectedOption = $state<'auto-create' | 'switch'>('auto-create')

  async function handleAutoCreate() {
    isProcessing = true
    try {
      await trpc.task.completeWithCrossOrgSession.mutate({
        taskId,
        organizationId: taskOrgId,
      })
      await fetchAllTasks()
      await fetchActiveSessions()
      fetchOverdueCount()
      onClose()
    } catch (err: any) {
      console.error('Auto-create session failed:', err)
    } finally {
      isProcessing = false
    }
  }

  async function handleSwitch() {
    isProcessing = true
    try {
      // Stop current session
      const sessions = (await trpc.orgSession.getAllActive.query()) as any[]
      const sessionForOrg = sessions.find((s: any) => s.organizationId === activeOrgId)
      if (sessionForOrg) {
        await trpc.orgSession.stop.mutate({ sessionId: sessionForOrg.id })
      }

      // Start session for task's org
      await trpc.orgSession.start.mutate({ organizationId: taskOrgId })

      // Complete the task
      await trpc.task.changeStatus.mutate({ id: taskId, status: 'done' })

      // Refresh
      await fetchAllTasks()
      await fetchActiveSessions()
      fetchOverdueCount()
      onClose()
    } catch (err: any) {
      console.error('Switch session failed:', err)
    } finally {
      isProcessing = false
    }
  }

  function handleCancel() {
    onClose()
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="dialog-backdrop" onclick={handleCancel} role="presentation">
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="dialog" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
    <div class="dialog-header">
      <h3>Complete cross-org task</h3>
      <button class="close-btn" onclick={handleCancel}>
        <X size={16} />
      </button>
    </div>

    <div class="dialog-body">
      <p>
        <strong>"{taskTitle}"</strong> belongs to <strong>{taskOrgName}</strong>,
        but you&apos;re currently clocked into <strong>{activeOrgName}</strong>.
      </p>

      <div class="options">
        <label class="option" class:selected={selectedOption === 'auto-create'}>
          <input
            type="radio"
            name="option"
            value="auto-create"
            checked={selectedOption === 'auto-create'}
            onchange={() => (selectedOption = 'auto-create')}
          />
          <div class="option-content">
            <span class="option-title">Auto-create session</span>
            <span class="option-desc">
              Backdate a session for {taskOrgName} covering this task's work period
            </span>
          </div>
        </label>

        <label class="option" class:selected={selectedOption === 'switch'}>
          <input
            type="radio"
            name="option"
            value="switch"
            checked={selectedOption === 'switch'}
            onchange={() => (selectedOption = 'switch')}
          />
          <div class="option-content">
            <span class="option-title">Switch to {taskOrgName}</span>
            <span class="option-desc">
              Stop the {activeOrgName} session and start working for {taskOrgName}
            </span>
          </div>
        </label>
      </div>
    </div>

    <div class="dialog-footer">
      <button class="cancel-btn" onclick={handleCancel}>Cancel</button>
      <button
        class="confirm-btn"
        onclick={selectedOption === 'auto-create' ? handleAutoCreate : handleSwitch}
        disabled={isProcessing}
      >
        {#if isProcessing}
          Processing...
        {:else if selectedOption === 'auto-create'}
          Auto-create session
        {:else}
          Switch to {taskOrgName}
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

  .dialog-header h3 {
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

  .options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .option {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: border-color 0.15s, background-color 0.15s;
  }

  .option.selected {
    border-color: var(--brand-primary);
    background-color: color-mix(in srgb, var(--brand-primary) 8%, transparent);
  }

  .option input[type="radio"] {
    margin-top: 2px;
    accent-color: var(--brand-primary);
  }

  .option-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .option-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-main);
  }

  .option-desc {
    font-size: 0.8125rem;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--border-main);
  }

  .cancel-btn {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-muted);
    border-radius: var(--radius-md);
    transition: color 0.15s, background-color 0.15s;
  }

  .cancel-btn:hover {
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