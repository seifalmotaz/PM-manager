<script lang="ts">
  import type { TaskSummary } from '$lib/stores/tasks'
  import { trpc } from '$lib/trpc'

  let {
    task,
    projectId,
    onClose,
    onSaved,
    onDeleted,
  }: {
    task: TaskSummary | null
    projectId?: string
    onClose: () => void
    onSaved: () => void
    onDeleted?: () => void
  } = $props()

  let title = $state(task?.title ?? '')
  let description = $state(task?.description ?? '')
  let priority = $state<string | null>(task?.priority ?? null)
  let dueDate = $state<string | null>(task?.dueDate ?? null)
  let storyPoints = $state<number | null>(task?.storyPoints ?? null)
  let deadline = $state<string | null>(task?.deadline ?? null)
  let isSaving = $state(false)
  let isDeleting = $state(false)
  let openPopover = $state<string | null>(null)
  let projectIdForCreate = $state(projectId ?? '')

  // Sync projectId prop to local state for create mode
  $effect(() => {
    projectIdForCreate = projectId ?? ''
  })

  // Reset form when task changes
  $effect(() => {
    title = task?.title ?? ''
    description = task?.description ?? ''
    priority = task?.priority ?? null
    dueDate = task?.dueDate ?? null
    storyPoints = task?.storyPoints ?? null
    deadline = task?.deadline ?? null
  })

  function togglePopover(name: string) {
    openPopover = openPopover === name ? null : name
  }

  async function updateField(field: string, value: unknown) {
    if (!task) return
    try {
      await trpc.task.update.mutate({ id: task.id, [field]: value } as any)
    } catch (err) {
      console.error(`Failed to update ${field}:`, err)
    }
  }

  function formatDateLabel(dateStr: string | null): string {
    if (!dateStr) return '+Due Date'
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const date = new Date(dateStr)
    date.setHours(0, 0, 0, 0)

    const diffMs = date.getTime() - today.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[date.getMonth()]} ${date.getDate()}`
  }

  function getDateInputValue(dateStr: string | null): string {
    if (!dateStr) return ''
    return dateStr.split('T')[0]
  }

  function getTodayISO(): string {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }

  function getTomorrowISO(): string {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }

  function getNextWeekISO(): string {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }

  async function handleSave() {
    if (!title.trim() || !projectIdForCreate || isSaving) return
    isSaving = true
    try {
      await trpc.task.create.mutate({
        projectId: projectIdForCreate,
        title: title.trim(),
        description: description || undefined,
        priority: (priority as 'p0' | 'p1' | 'p2' | 'p3') ?? undefined,
        storyPoints: storyPoints ?? undefined,
        dueDate: dueDate ?? undefined,
      })
      onSaved()
    } catch (err) {
      console.error('Failed to create task:', err)
    } finally {
      isSaving = false
    }
  }

  async function handleDelete() {
    if (!task || isDeleting) return
    if (!confirm('Delete this task?')) return
    isDeleting = true
    try {
      await trpc.task.delete.mutate({ id: task.id })
      onDeleted?.()
    } catch (err) {
      console.error('Failed to delete task:', err)
    } finally {
      isDeleting = false
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  function handleEscape(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  function handleDueDateQuick(dateISO: string) {
    dueDate = dateISO
    if (task) updateField('dueDate', dateISO)
    openPopover = null
  }

  function handleDueDateCustom(e: Event) {
    const target = e.target as HTMLInputElement
    const val = target.value
    if (val) {
      const iso = new Date(val + 'T00:00:00').toISOString()
      dueDate = iso
      if (task) updateField('dueDate', iso)
    } else {
      dueDate = null
      if (task) updateField('dueDate', null)
    }
    openPopover = null
  }

  function handleSPQuick(sp: number) {
    storyPoints = sp
    if (task) updateField('storyPoints', sp)
    openPopover = null
  }

  function handleSPCustom(e: Event) {
    const target = e.target as HTMLInputElement
    const val = parseFloat(target.value)
    if (!isNaN(val)) {
      storyPoints = val
      if (task) updateField('storyPoints', val)
    } else if (target.value === '') {
      storyPoints = null
      if (task) updateField('storyPoints', null)
    }
  }

  let isEditMode = $derived(task !== null)
</script>

<svelte:window onkeydown={handleEscape} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={handleBackdropClick}>
  <div class="modal-card" role="dialog" aria-label={isEditMode ? 'Edit task' : 'Create task'}>
    <header class="modal-header">
      {#if isEditMode}
        <h2 class="modal-title">Edit Task</h2>
      {:else}
        <h2 class="modal-title">Create Task</h2>
      {/if}
      <button class="close-btn" onclick={onClose}>&times;</button>
    </header>

    <div class="modal-body">
      <!-- Title input (always editable) -->
      <input
        type="text"
        class="title-input"
        bind:value={title}
        placeholder="Task title"
        disabled={isSaving}
      />

      <!-- Chip row -->
      <div class="chip-row">
        <!-- Priority chip -->
        <div class="chip-wrapper">
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="chip" onclick={() => togglePopover('priority')}>
            {priority ? priority.toUpperCase() : '+Priority'}
            <span class="arrow">&#9660;</span>
          </div>
          {#if openPopover === 'priority'}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="popover" onclick={(e) => e.stopPropagation()}>
              {#each ['p0', 'p1', 'p2', 'p3'] as p}
                <button
                  class={['popover-item', priority === p ? 'active' : '']}
                  onclick={() => { priority = p; if (task) updateField('priority', p); openPopover = null; }}
                >
                  {p.toUpperCase()}
                </button>
              {/each}
              {#if priority}
                <button
                  class="popover-item clear"
                  onclick={() => { priority = null; if (task) updateField('priority', null); openPopover = null; }}
                >
                  Clear
                </button>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Due Date chip -->
        <div class="chip-wrapper">
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="chip" onclick={() => togglePopover('dueDate')}>
            {formatDateLabel(dueDate)}
            <span class="arrow">&#9660;</span>
          </div>
          {#if openPopover === 'dueDate'}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="popover" onclick={(e) => e.stopPropagation()}>
              <button class="popover-item" onclick={() => handleDueDateQuick(getTodayISO())}>
                Today
              </button>
              <button class="popover-item" onclick={() => handleDueDateQuick(getTomorrowISO())}>
                Tomorrow
              </button>
              <button class="popover-item" onclick={() => handleDueDateQuick(getNextWeekISO())}>
                Next Week
              </button>
              <div class="popover-divider" role="separator"></div>
              <input
                type="date"
                class="popover-date-input"
                value={getDateInputValue(dueDate)}
                onchange={handleDueDateCustom}
              />
              {#if dueDate}
                <button
                  class="popover-item clear"
                  onclick={() => { dueDate = null; if (task) updateField('dueDate', null); openPopover = null; }}
                >
                  Clear
                </button>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Story Points chip -->
        <div class="chip-wrapper">
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="chip" onclick={() => togglePopover('sp')}>
            {storyPoints !== null ? `SP:${storyPoints}` : '+SP'}
            <span class="arrow">&#9660;</span>
          </div>
          {#if openPopover === 'sp'}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="popover" onclick={(e) => e.stopPropagation()}>
              <div class="sp-quick-row">
                {#each [1, 2, 3, 5, 8, 13] as sp}
                  <button
                    class={['sp-btn', storyPoints === sp ? 'active' : '']}
                    onclick={() => handleSPQuick(sp)}
                  >
                    {sp}
                  </button>
                {/each}
              </div>
              <div class="popover-divider" role="separator"></div>
              <label class="popover-label">
                Custom:
                <input
                  type="number"
                  class="popover-sp-input"
                  min="0"
                  step="0.5"
                  value={storyPoints ?? ''}
                  onchange={handleSPCustom}
                  placeholder="e.g. 0.5"
                />
              </label>
              {#if storyPoints !== null}
                <button
                  class="popover-item clear"
                  onclick={() => { storyPoints = null; if (task) updateField('storyPoints', null); openPopover = null; }}
                >
                  Clear
                </button>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Assignee chip (stub) -->
        <div class="chip-wrapper">
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="chip" onclick={() => togglePopover('assignee')}>
            +Assignee
            <span class="arrow">&#9660;</span>
          </div>
          {#if openPopover === 'assignee'}
            <div class="popover">
              <p class="popover-stub">Coming soon</p>
            </div>
          {/if}
        </div>

        <!-- Sprint chip (stub) -->
        <div class="chip-wrapper">
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="chip" onclick={() => togglePopover('sprint')}>
            +Sprint
            <span class="arrow">&#9660;</span>
          </div>
          {#if openPopover === 'sprint'}
            <div class="popover">
              <p class="popover-stub">Coming in Phase 3</p>
            </div>
          {/if}
        </div>
      </div>

      <!-- Deadline inline input -->
      <div class="deadline-row">
        <label for="deadline-input">Deadline:</label>
        <input
          id="deadline-input"
          type="date"
          value={getDateInputValue(deadline)}
          onchange={(e) => {
            const target = e.target as HTMLInputElement
            const val = target.value ? new Date(target.value + 'T00:00:00').toISOString() : null
            deadline = val
            if (task) updateField('deadline', val)
          }}
        />
      </div>

      <!-- Description textarea -->
      <textarea
        class="description-input"
        bind:value={description}
        placeholder="Description (optional)"
        rows={4}
        disabled={isSaving}
        onchange={() => {
          if (task) updateField('description', description || undefined)
        }}
      ></textarea>
    </div>

    <footer class="modal-footer">
      {#if isEditMode}
        <button class="btn btn-danger" onclick={handleDelete} disabled={isDeleting}>
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
        <button class="btn btn-secondary" onclick={onClose}>Close</button>
      {:else}
        <button
          class="btn btn-primary"
          onclick={handleSave}
          disabled={isSaving || !title.trim() || !projectIdForCreate}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button class="btn btn-secondary" onclick={onClose}>Cancel</button>
      {/if}
    </footer>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .modal-card {
    background: var(--color-surface, #fff);
    border-radius: 0.75rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    width: 560px;
    max-width: calc(100vw - 2rem);
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border, #e2e8f0);
    flex-shrink: 0;
  }
  .modal-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text, #1a202c);
    margin: 0;
  }
  .close-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    font-size: 1.25rem;
    color: var(--color-muted, #718096);
    cursor: pointer;
    border-radius: 0.25rem;
    line-height: 1;
  }
  .close-btn:hover {
    background: var(--color-bg-subtle, #f7fafc);
    color: var(--color-text, #1a202c);
  }
  .modal-body {
    padding: 1.25rem;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .title-input {
    width: 100%;
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.5rem;
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-text, #1a202c);
    background: var(--color-surface, #fff);
    box-sizing: border-box;
  }
  .title-input:focus {
    outline: none;
    border-color: var(--color-primary, #3b82f6);
    box-shadow: 0 0 0 2px var(--color-primary-light, #eff6ff);
  }
  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .chip-wrapper {
    position: relative;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.3125rem 0.625rem;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-muted, #718096);
    background: var(--color-bg-subtle, #f7fafc);
    cursor: pointer;
    transition: border-color 0.15s ease, color 0.15s ease;
    white-space: nowrap;
  }
  .chip:hover {
    border-color: var(--color-primary, #3b82f6);
    color: var(--color-text, #1a202c);
  }
  .arrow {
    font-size: 0.5rem;
    line-height: 1;
  }
  .popover {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 1001;
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.5rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    padding: 0.375rem;
    min-width: 140px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .popover-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.375rem 0.625rem;
    border: none;
    background: transparent;
    font-size: 0.8125rem;
    color: var(--color-text, #1a202c);
    cursor: pointer;
    border-radius: 0.25rem;
  }
  .popover-item:hover {
    background: var(--color-bg-subtle, #f7fafc);
  }
  .popover-item.active {
    background: var(--color-primary-light, #eff6ff);
    color: var(--color-primary, #3b82f6);
    font-weight: 600;
  }
  .popover-item.clear {
    color: var(--color-danger, #ef4444);
    font-size: 0.75rem;
    margin-top: 2px;
    border-top: 1px solid var(--color-border, #e2e8f0);
    padding-top: 0.5rem;
  }
  .popover-divider {
    height: 1px;
    background: var(--color-border, #e2e8f0);
    margin: 0.25rem 0;
  }
  .popover-date-input {
    padding: 0.375rem 0.5rem;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.25rem;
    font-size: 0.8125rem;
    color: var(--color-text, #1a202c);
    background: var(--color-surface, #fff);
    width: 100%;
    box-sizing: border-box;
  }
  .popover-date-input:focus {
    outline: none;
    border-color: var(--color-primary, #3b82f6);
  }
  .popover-label {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    color: var(--color-muted, #718096);
    padding: 0.25rem 0.375rem;
  }
  .popover-sp-input {
    width: 80px;
    padding: 0.25rem 0.375rem;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.25rem;
    font-size: 0.8125rem;
    color: var(--color-text, #1a202c);
    background: var(--color-surface, #fff);
  }
  .popover-sp-input:focus {
    outline: none;
    border-color: var(--color-primary, #3b82f6);
  }
  .sp-quick-row {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }
  .sp-btn {
    padding: 0.3125rem 0.5rem;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.25rem;
    background: var(--color-surface, #fff);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text, #1a202c);
    cursor: pointer;
    min-width: 32px;
    text-align: center;
  }
  .sp-btn:hover {
    border-color: var(--color-primary, #3b82f6);
  }
  .sp-btn.active {
    background: var(--color-primary-light, #eff6ff);
    border-color: var(--color-primary, #3b82f6);
    color: var(--color-primary, #3b82f6);
  }
  .popover-stub {
    font-size: 0.75rem;
    color: var(--color-muted, #a0aec0);
    padding: 0.5rem;
    margin: 0;
    text-align: center;
  }
  .deadline-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .deadline-row label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-muted, #718096);
    white-space: nowrap;
  }
  .deadline-row input {
    padding: 0.375rem 0.625rem;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.375rem;
    font-size: 0.8125rem;
    color: var(--color-text, #1a202c);
    background: var(--color-surface, #fff);
  }
  .deadline-row input:focus {
    outline: none;
    border-color: var(--color-primary, #3b82f6);
  }
  .description-input {
    width: 100%;
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    color: var(--color-text, #1a202c);
    background: var(--color-surface, #fff);
    resize: vertical;
    font-family: inherit;
    box-sizing: border-box;
  }
  .description-input:focus {
    outline: none;
    border-color: var(--color-primary, #3b82f6);
    box-shadow: 0 0 0 2px var(--color-primary-light, #eff6ff);
  }
  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.625rem;
    padding: 0.75rem 1.25rem;
    border-top: 1px solid var(--color-border, #e2e8f0);
    flex-shrink: 0;
  }
  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, opacity 0.15s ease;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn-primary {
    background: var(--color-primary, #3b82f6);
    color: #fff;
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-dark, #2563eb);
  }
  .btn-secondary {
    background: var(--color-bg-subtle, #f7fafc);
    color: var(--color-text, #1a202c);
    border: 1px solid var(--color-border, #e2e8f0);
  }
  .btn-secondary:hover:not(:disabled) {
    background: var(--color-border, #e2e8f0);
  }
  .btn-danger {
    background: transparent;
    color: var(--color-danger, #ef4444);
    border: 1px solid var(--color-danger, #ef4444);
    margin-right: auto;
  }
  .btn-danger:hover:not(:disabled) {
    background: #fef2f2;
  }
</style>
