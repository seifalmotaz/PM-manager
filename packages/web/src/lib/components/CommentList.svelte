<script lang="ts">
  import { trpc } from '$lib/trpc'
  import { getAuth } from '$lib/stores/auth.svelte'
  import { MessageCircle, Trash2 } from 'lucide-svelte'

  let { entityType, entityId }: { entityType: 'task' | 'sprint' | 'project'; entityId: string } = $props()

  let comments = $state<Array<{
    id: string
    content: string
    authorId: string
    author: { id: string; name: string; email: string; avatarUrl: string | null } | null
    createdAt: string | Date
  }>>([])
  let loading = $state(true)
  let error = $state<string | null>(null)

  function timeAgo(date: Date | string): string {
    const now = new Date()
    const d = new Date(date)
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  $effect(() => {
    async function load() {
      loading = true
      error = null
      try {
        const result = await trpc.comment.list.query({ entityType, entityId })
        comments = result as unknown as typeof comments
      } catch {
        error = 'Failed to load comments'
      } finally {
        loading = false
      }
    }
    load()
  })

  async function handleDelete(commentId: string) {
    const comment = comments.find(c => c.id === commentId)
    if (!comment) return
    try {
      await trpc.comment.delete.mutate({ id: commentId })
      comments = comments.filter(c => c.id !== commentId)
    } catch {
      error = 'Failed to delete comment'
    }
  }
</script>

<div class="comment-list">
  {#if loading}
    <div class="skeleton-list">
      {#each [1, 2, 3] as _}
        <div class="skeleton-item">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-content">
            <div class="skeleton-name"></div>
            <div class="skeleton-text"></div>
          </div>
        </div>
      {/each}
    </div>
  {:else if error}
    <div class="error-state">
      <span>{error}</span>
      <button onclick={() => {
        loading = true
      error = null
      trpc.comment.list.query({ entityType, entityId }).then(r => {
        comments = r as unknown as typeof comments
        loading = false
      }).catch(() => {
          error = 'Failed to load comments'
          loading = false
        })
      }}>Retry</button>
    </div>
  {:else if comments.length === 0}
    <div class="empty-state">
      <MessageCircle size={24} />
      <span>No comments yet</span>
    </div>
  {:else}
    <div class="comments">
      {#each comments as comment (comment.id)}
        <div class="comment-item">
          <div class="comment-avatar">
            {comment.author?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div class="comment-body">
            <div class="comment-header">
              <span class="comment-author">{comment.author?.name ?? 'Unknown'}</span>
              <span class="comment-time">{timeAgo(comment.createdAt)}</span>
            </div>
            <p class="comment-content">{comment.content}</p>
          </div>
          {#if comment.authorId === getAuth().currentUser?.id}
            <button class="delete-btn" onclick={() => handleDelete(comment.id)} title="Delete comment">
              <Trash2 size={14} />
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .comment-list {
    display: flex;
    flex-direction: column;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem;
    color: var(--text-muted);
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem;
    color: var(--text-muted);
  }

  .error-state button {
    color: var(--brand-primary);
    font-size: 0.875rem;
  }

  .skeleton-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
  }

  .skeleton-item {
    display: flex;
    gap: 0.75rem;
  }

  .skeleton-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--bg-surface-hover);
    animation: pulse 1.5s ease-in-out infinite;
  }

  .skeleton-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .skeleton-name {
    width: 120px;
    height: 14px;
    border-radius: 4px;
    background: var(--bg-surface-hover);
    animation: pulse 1.5s ease-in-out infinite;
  }

  .skeleton-text {
    width: 80%;
    height: 14px;
    border-radius: 4px;
    background: var(--bg-surface-hover);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  .comments {
    display: flex;
    flex-direction: column;
  }

  .comment-item {
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-main);
    position: relative;
  }

  .comment-item:hover .delete-btn {
    opacity: 1;
  }

  .comment-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--brand-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .comment-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .comment-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .comment-author {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-main);
  }

  .comment-time {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .comment-content {
    font-size: 0.875rem;
    color: var(--text-main);
    line-height: 1.5;
    margin: 0;
    word-break: break-word;
  }

  .delete-btn {
    position: absolute;
    right: 0.75rem;
    top: 0.75rem;
    opacity: 0;
    transition: opacity 0.15s;
    color: var(--text-muted);
    padding: 0.25rem;
    border-radius: 4px;
  }

  .delete-btn:hover {
    color: #db4c3f;
    background-color: rgba(219, 76, 63, 0.1);
  }
</style>