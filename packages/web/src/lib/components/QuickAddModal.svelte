<script lang="ts">
  import QuickAddInput from './QuickAddInput.svelte'
  import { X } from 'lucide-svelte'

  let {
    isOpen = $bindable(false),
    onCreated,
  }: {
    isOpen?: boolean
    onCreated: () => void
  } = $props()

  function handleClose() {
    isOpen = false
  }

  function handleCreated() {
    handleClose()
    onCreated()
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleClose()
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="quick-add-overlay" onclick={handleClose} onkeydown={handleKeydown}>
    <div class="quick-add-container" onclick={e => e.stopPropagation()}>
      <div class="modal-header">
        <span class="modal-title">New Task</span>
        <button class="close-btn" onclick={handleClose}>
          <X size={16} />
        </button>
      </div>
      <div class="modal-body">
        <QuickAddInput onCreated={handleCreated} autoFocus={true} />
      </div>
    </div>
  </div>
{/if}

<style>
  .quick-add-overlay {
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

  .quick-add-container {
    width: 100%;
    max-width: 560px;
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
  }

  .close-btn:hover {
    background: var(--bg-surface-hover);
  }

  .modal-body {
    padding: 0.75rem;
  }
</style>
