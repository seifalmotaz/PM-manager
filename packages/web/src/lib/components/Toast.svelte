<script lang="ts">
  import { toasts, dismissToast } from '$lib/stores/toast.svelte'
  import { X } from 'lucide-svelte'
  import { clsx } from 'clsx'

  const typeStyles = {
    error: 'bg-red-500',
    success: 'bg-green-500',
    info: 'bg-zinc-700',
  }
</script>

<div class="toast-container">
  {#each toasts as toast, i (toast.id)}
    <div
      class={clsx('toast-item', typeStyles[toast.type])}
      style="--index: {i}"
    >
      <span class="toast-message">{toast.message}</span>
      <button class="toast-close" onclick={() => dismissToast(toast.id)}>
        <X size={14} />
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    pointer-events: none;
  }

  .toast-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
    min-width: 280px;
    max-width: 400px;
    pointer-events: auto;
    animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .toast-message {
    flex: 1;
    line-height: 1.4;
  }

  .toast-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.8);
    transition: color 0.15s, background-color 0.15s;
    flex-shrink: 0;
  }

  .toast-close:hover {
    color: white;
    background-color: rgba(255, 255, 255, 0.15);
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>