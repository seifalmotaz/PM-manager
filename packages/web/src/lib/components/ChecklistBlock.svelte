<script lang="ts">
  import { trpc } from '$lib/trpc'
  import { Square, CheckSquare, X } from 'lucide-svelte'

  let { taskId }: { taskId: string } = $props()

  let items = $state<Array<{
    id: string
    content: string
    isCompleted: boolean
    sortOrder: number
  }>>([])
  let loading = $state(true)
  let newItemContent = $state('')
  let editingId = $state<string | null>(null)
  let editContent = $state('')

  let completedCount = $derived(items.filter(i => i.isCompleted).length)
  let progressPercent = $derived(items.length > 0 ? (completedCount / items.length) * 100 : 0)

  $effect(() => {
    async function load() {
      loading = true
      try {
        const result = await trpc.checklist.list.query({ taskId })
        items = result as typeof items
      } catch {
        items = []
      } finally {
        loading = false
      }
    }
    load()
  })

  async function handleAddItem() {
    const trimmed = newItemContent.trim()
    if (!trimmed) return
    try {
      const created = await trpc.checklist.create.mutate({ taskId, content: trimmed })
      items = [...items, created as typeof items[0]]
      newItemContent = ''
    } catch {
      // keep content for retry
    }
  }

  async function handleToggle(item: typeof items[0]) {
    const original = item.isCompleted
    // Optimistic update
    item.isCompleted = !original
    try {
      await trpc.checklist.toggle.mutate({ id: item.id, isCompleted: !original })
    } catch {
      // Revert
      item.isCompleted = original
    }
  }

  function startEdit(item: typeof items[0]) {
    editingId = item.id
    editContent = item.content
  }

  async function handleEditSave(item: typeof items[0]) {
    if (!editContent.trim()) return
    try {
      const updated = await trpc.checklist.update.mutate({ id: item.id, content: editContent.trim() })
      item.content = (updated as typeof items[0]).content
      editingId = null
    } catch {
      // keep editingId for retry
    }
  }

  function cancelEdit() {
    editingId = null
    editContent = ''
  }

  async function handleDeleteItem(itemId: string) {
    try {
      await trpc.checklist.delete.mutate({ id: itemId })
      items = items.filter(i => i.id !== itemId)
    } catch {
      // ignore
    }
  }
</script>

<div class="checklist-block">
  <div class="checklist-header">
    <span class="checklist-title">Checklist</span>
    <span class="checklist-progress">{completedCount}/{items.length} completed</span>
  </div>
  <div class="progress-bar">
    <div class="progress-fill" style="width: {progressPercent}%"></div>
  </div>

  {#if loading}
    <div class="loading">Loading...</div>
  {:else}
    <div class="items">
      {#each items as item (item.id)}
        <div class="item" class:completed={item.isCompleted}>
          <button class="checkbox-btn" onclick={() => handleToggle(item)}>
            {#if item.isCompleted}
              <CheckSquare size={16} />
            {:else}
              <Square size={16} />
            {/if}
          </button>

          {#if editingId === item.id}
            <input
              class="edit-input"
              bind:value={editContent}
              onblur={() => handleEditSave(item)}
              onkeydown={(e) => {
                if (e.key === 'Enter') handleEditSave(item)
                if (e.key === 'Escape') cancelEdit()
              }}
            />
          {:else}
            <span class="item-content" role="button" tabindex="0" ondblclick={() => startEdit(item)}>{item.content}</span>
          {/if}

          <button class="delete-btn" onclick={() => handleDeleteItem(item.id)}>
            <X size={14} />
          </button>
        </div>
      {/each}
    </div>

    <div class="add-item">
      <input
        class="add-input"
        bind:value={newItemContent}
        placeholder="Add checklist item..."
        onkeydown={(e) => {
          if (e.key === 'Enter') handleAddItem()
        }}
      />
      <button class="add-btn" onclick={handleAddItem} disabled={!newItemContent.trim()}>
        Add
      </button>
    </div>
  {/if}
</div>

<style>
  .checklist-block {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .checklist-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .checklist-title {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-main);
  }

  .checklist-progress {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .progress-bar {
    height: 4px;
    background-color: var(--border-main);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background-color: var(--brand-primary);
    transition: width 0.2s ease;
  }

  .loading {
    font-size: 0.875rem;
    color: var(--text-muted);
    padding: 0.5rem 0;
  }

  .items {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.25rem;
    border-radius: var(--radius-sm);
    position: relative;
  }

  .item:hover .delete-btn {
    opacity: 1;
  }

  .item.completed .item-content {
    text-decoration: line-through;
    color: var(--text-muted);
  }

  .checkbox-btn {
    color: var(--text-muted);
    flex-shrink: 0;
    padding: 0;
    display: flex;
    align-items: center;
  }

  .item.completed .checkbox-btn {
    color: var(--brand-primary);
  }

  .item-content {
    flex: 1;
    font-size: 0.875rem;
    color: var(--text-main);
    cursor: default;
  }

  .edit-input {
    flex: 1;
    font-size: 0.875rem;
    color: var(--text-main);
    padding: 0.25rem 0.375rem;
    border: 1px solid var(--brand-primary);
    border-radius: var(--radius-sm);
    background: var(--bg-app);
    font-family: inherit;
  }

  .edit-input:focus {
    outline: none;
  }

  .delete-btn {
    opacity: 0;
    transition: opacity 0.15s;
    color: var(--text-muted);
    padding: 0.125rem;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .delete-btn:hover {
    color: #db4c3f;
    background-color: rgba(219, 76, 63, 0.1);
  }

  .add-item {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .add-input {
    flex: 1;
    font-size: 0.875rem;
    color: var(--text-main);
    padding: 0.375rem 0.5rem;
    border: 1px solid var(--border-main);
    border-radius: var(--radius-sm);
    background: var(--bg-app);
    font-family: inherit;
  }

  .add-input:focus {
    outline: none;
    border-color: var(--brand-primary);
  }

  .add-input::placeholder {
    color: var(--text-muted);
  }

  .add-btn {
    font-size: 0.875rem;
    font-weight: 600;
    color: white;
    background-color: var(--brand-primary);
    padding: 0.375rem 0.75rem;
    border-radius: var(--radius-sm);
    transition: background-color 0.15s;
  }

  .add-btn:hover:not(:disabled) {
    background-color: var(--brand-hover);
  }

  .add-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>