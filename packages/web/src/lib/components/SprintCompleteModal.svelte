<script lang="ts">
  import { X, ArrowRight, ListEnd } from 'lucide-svelte'
  import type { Sprint } from '$lib/stores/sprint'
  import type { TaskSummary } from '$lib/stores/tasks'

  let {
    sprint,
    tasks,
    isOpen,
    hasNextSprint = true,
    onComplete,
    onCancel,
  }: {
    sprint: Sprint | null
    tasks: TaskSummary[]
    isOpen: boolean
    hasNextSprint?: boolean
    onComplete: (action: 'backlog' | 'next_sprint') => void
    onCancel: () => void
  } = $props()

  let unfinishedTasks = $derived(
    tasks.filter(t => t.status !== 'done')
  )

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onCancel()
  }
</script>

{#if isOpen && sprint}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={onCancel} onkeydown={handleKeydown}>
    <div class="modal-container" onclick={e => e.stopPropagation()}>
      <div class="modal-header">
        <span class="modal-title">Complete Sprint</span>
        <button class="close-btn" onclick={onCancel}>
          <X size={16} />
        </button>
      </div>

      <div class="modal-body">
        <p class="sprint-name">{sprint.name}</p>

        {#if unfinishedTasks.length > 0}
          <p class="warning-text">
            This sprint has {unfinishedTasks.length} unfinished task{unfinishedTasks.length === 1 ? '' : 's'}.
          </p>

          <div class="task-list">
            {#each unfinishedTasks as task (task.id)}
              <div class="task-item">
                <span class="task-title">{task.title}</span>
                <span class="task-status">{task.status}</span>
              </div>
            {/each}
          </div>

          <p class="action-prompt">What would you like to do with these tasks?</p>

          <div class="action-buttons">
            <button
              class="action-btn"
              onclick={() => onComplete('backlog')}
            >
              <ListEnd size={16} />
              <span>Move to Backlog</span>
            </button>
            <button
              class="action-btn action-btn-secondary"
              class:disabled={!hasNextSprint}
              onclick={() => hasNextSprint && onComplete('next_sprint')}
              disabled={!hasNextSprint}
            >
              <ArrowRight size={16} />
              <span>Move to Next Sprint</span>
              {#if !hasNextSprint}
                <span class="hint">(no upcoming sprint)</span>
              {/if}
            </button>
          </div>
        {:else}
          <p class="success-text">All tasks in this sprint are complete.</p>
          <button class="complete-btn" onclick={() => onComplete('backlog')}>
            Complete Sprint
          </button>
        {/if}
      </div>
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
    max-width: 420px;
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

  .sprint-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-main);
    margin-bottom: 0.75rem;
  }

  .warning-text {
    font-size: 0.8125rem;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
  }

  .success-text {
    font-size: 0.8125rem;
    color: var(--text-muted);
    margin-bottom: 1rem;
  }

  .task-list {
    background: var(--bg-surface-hover);
    border-radius: var(--radius-md);
    padding: 0.5rem;
    margin-bottom: 1rem;
    max-height: 200px;
    overflow-y: auto;
  }

  .task-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem;
    border-bottom: 1px solid var(--border-main);
  }

  .task-item:last-child {
    border-bottom: none;
  }

  .task-title {
    font-size: 0.8125rem;
    color: var(--text-main);
  }

  .task-status {
    font-size: 0.6875rem;
    color: var(--text-muted);
    text-transform: capitalize;
  }

  .action-prompt {
    font-size: 0.8125rem;
    color: var(--text-main);
    margin-bottom: 0.75rem;
  }

  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: white;
    background: var(--color-primary, #6366f1);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .action-btn:hover {
    opacity: 0.9;
  }

  .action-btn-secondary {
    background: var(--bg-surface-hover);
    color: var(--text-main);
    border: 1px solid var(--border-main);
  }

  .action-btn-secondary:hover {
    background: var(--bg-surface);
  }

  .action-btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .hint {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-left: 0.5rem;
    font-weight: 400;
  }

  .complete-btn {
    width: 100%;
    padding: 0.625rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: white;
    background: var(--color-primary, #6366f1);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .complete-btn:hover {
    opacity: 0.9;
  }
</style>