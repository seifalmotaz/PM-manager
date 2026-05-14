<script lang="ts">
  import { trpc } from '$lib/trpc'

  let {
    entityType,
    entityId,
    onCreated,
  }: {
    entityType: 'task' | 'sprint' | 'project'
    entityId: string
    onCreated?: () => void
  } = $props()

  let content = $state('')
  let isSubmitting = $state(false)
  let textareaEl: HTMLTextAreaElement | null = $state(null)

  function handleInput(e: Event) {
    const target = e.currentTarget as HTMLTextAreaElement
    content = target.value
    // Auto-resize
    target.style.height = 'auto'
    target.style.height = Math.min(target.scrollHeight, 200) + 'px'
  }

  async function handleSubmit() {
    const trimmed = content.trim()
    if (!trimmed || isSubmitting) return

    isSubmitting = true
    try {
      await trpc.comment.create.mutate({ entityType, entityId, content: trimmed })
      content = ''
      if (textareaEl) {
        textareaEl.style.height = 'auto'
      }
      onCreated?.()
    } catch {
      // keep content for retry
    } finally {
      isSubmitting = false
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit()
    }
  }
</script>

<div class="comment-input">
  <textarea
    bind:this={textareaEl}
    value={content}
    oninput={handleInput}
    onkeydown={handleKeydown}
    placeholder="Write a comment... (@ to mention)"
    disabled={isSubmitting}
    rows="2"
  ></textarea>
  <div class="input-footer">
    {#if content.length > 4500}
      <span class="char-count">{content.length}/5000</span>
    {/if}
    <button
      class="submit-btn"
      onclick={handleSubmit}
      disabled={!content.trim() || isSubmitting}
    >
      {#if isSubmitting}
        Posting...
      {:else}
        Comment
      {/if}
    </button>
  </div>
</div>

<style>
  .comment-input {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  textarea {
    min-height: 60px;
    max-height: 200px;
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--text-main);
    padding: 0.75rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-main);
    background-color: var(--bg-app);
    resize: none;
    font-family: inherit;
    transition: border-color 0.15s;
  }

  textarea:focus {
    outline: none;
    border-color: var(--brand-primary);
  }

  textarea:disabled {
    opacity: 0.6;
  }

  .input-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .char-count {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .submit-btn {
    font-size: 0.875rem;
    font-weight: 600;
    color: white;
    background-color: var(--brand-primary);
    padding: 0.375rem 0.875rem;
    border-radius: var(--radius-sm);
    transition: background-color 0.15s;
  }

  .submit-btn:hover:not(:disabled) {
    background-color: var(--brand-hover);
  }

  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>