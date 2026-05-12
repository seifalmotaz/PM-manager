<script lang="ts">
  import { trpc } from '$lib/trpc'
  import { activeFilterIds } from '$lib/stores/workspaces'
  import { parseTaskInput } from 'shared/nlp-parser'
  import { Layers, Plus, Tag, Calendar, User, Zap } from 'lucide-svelte'
  import { clsx } from 'clsx'

  let {
    onCreated,
    onAddWithDetails,
  }: {
    onCreated: () => void
    onAddWithDetails?: (projectId: string) => void
  } = $props()

  interface ProjectSummary {
    id: string
    name: string
  }

  let input = $state('')
  let selectedProjectId = $state('')
  let projects = $state<ProjectSummary[]>([])
  let isCreating = $state(false)
  let isFocused = $state(false)

  // Synchronous parse
  let parsed = $derived(parseTaskInput(input))

  $effect(() => {
    const wsIds = $activeFilterIds
    async function load() {
      if (wsIds.length === 0) {
        projects = []
        return
      }
      try {
        const result = await trpc.project.list.query({ workspaceId: wsIds[0] })
        projects = result as ProjectSummary[]
        if (selectedProjectId === '' && projects.length > 0) {
          selectedProjectId = projects[0].id
        }
      } catch {
        projects = []
      }
    }
    load()
  })

  function formatPreviewDate(date: Date | undefined): string {
    if (!date) return ''
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'tomorrow'
    if (diffDays === -1) return 'yesterday'
    return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][target.getMonth()]} ${target.getDate()}`
  }

  async function handleSubmit() {
    if (!input.trim() || !selectedProjectId || isCreating) return
    isCreating = true
    try {
      const p = parseTaskInput(input)
      await trpc.task.create.mutate({
        projectId: selectedProjectId,
        title: p.title || input.trim(),
        priority: p.priority ?? undefined,
        storyPoints: p.storyPoints ?? undefined,
        dueDate: p.dueDate ? p.dueDate.toISOString() : undefined,
      })
      input = ''
      onCreated()
    } catch (err) {
      console.error('Failed to create task:', err)
    } finally {
      isCreating = false
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !isCreating) {
      e.preventDefault()
      handleSubmit()
    }
  }
</script>

<div class={clsx('quick-add-container', isFocused && 'focused', isCreating && 'loading')}>
  <div class="quick-add-header">
    <div class="project-selector">
      <Layers size={14} class="icon-muted" />
      <select bind:value={selectedProjectId} class="project-select" disabled={isCreating}>
        <option value="">Select project...</option>
        {#each projects as project (project.id)}
          <option value={project.id}>{project.name}</option>
        {/each}
      </select>
    </div>
  </div>

  <div class="input-area">
    <div class="input-icon">
      {#if isCreating}
        <div class="spinner-small"></div>
      {:else}
        <Plus size={18} class="icon-brand" />
      {/if}
    </div>
    
    <input
      type="text"
      bind:value={input}
      placeholder="Type a task title, add metadata like 'p1 tomorrow @me'..."
      onkeydown={handleKeydown}
      onfocus={() => isFocused = true}
      onblur={() => isFocused = false}
      disabled={isCreating}
      autofocus
    />

    {#if onAddWithDetails && selectedProjectId}
      <button
        class="action-btn"
        onclick={() => onAddWithDetails(selectedProjectId)}
        title="Open Full Form"
      >
        <Zap size={14} />
      </button>
    {/if}
  </div>

  {#if input.trim()}
    <div class="parsed-preview">
      {#if parsed.priority}
        <span class="preview-tag priority">
          <Tag size={10} />
          {parsed.priority.toUpperCase()}
        </span>
      {/if}
      {#if parsed.storyPoints !== undefined}
        <span class="preview-tag points">
          {parsed.storyPoints} SP
        </span>
      {/if}
      {#if parsed.dueDate}
        <span class="preview-tag date">
          <Calendar size={10} />
          {formatPreviewDate(parsed.dueDate)}
        </span>
      {/if}
      {#if parsed.assigneeUsername}
        <span class="preview-tag user">
          <User size={10} />
          @{parsed.assigneeUsername}
        </span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .quick-add-container {
    background-color: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-lg);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    overflow: hidden;
  }

  .quick-add-container.focused {
    border-color: var(--brand-primary);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    transform: translateY(-1px);
  }

  .quick-add-header {
    display: flex;
    align-items: center;
    padding: 0.5rem 1rem;
    background-color: var(--zinc-900);
    border-bottom: 1px solid var(--border-muted);
  }

  .project-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .project-select {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px 0;
  }

  .project-select:hover {
    color: var(--text-main);
  }

  .input-area {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    gap: 0.75rem;
  }

  .input-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  }

  .icon-brand {
    color: var(--brand-primary);
  }

  .icon-muted {
    color: var(--text-muted);
  }

  input {
    flex: 1;
    font-size: 0.9375rem;
    color: var(--text-main);
    background: none;
    border: none;
    outline: none;
  }

  input::placeholder {
    color: var(--text-muted);
    opacity: 0.6;
  }

  .action-btn {
    padding: 4px;
    color: var(--text-muted);
    border-radius: 4px;
    transition: all 0.15s;
  }

  .action-btn:hover {
    background-color: var(--zinc-800);
    color: var(--brand-primary);
  }

  .parsed-preview {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 1rem 0.75rem 1rem;
    margin-left: 2.25rem;
    flex-wrap: wrap;
  }

  .preview-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 2px 8px;
    background-color: var(--zinc-800);
    border-radius: 4px;
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--text-muted);
    border: 1px solid var(--border-muted);
  }

  .preview-tag.priority {
    color: #fca5a5;
    background-color: rgba(153, 27, 27, 0.2);
    border-color: rgba(153, 27, 27, 0.3);
  }

  .preview-tag.date {
    color: #93c5fd;
    background-color: rgba(30, 58, 138, 0.2);
    border-color: rgba(30, 58, 138, 0.3);
  }

  .spinner-small {
    width: 14px;
    height: 14px;
    border: 2px solid var(--zinc-700);
    border-top-color: var(--brand-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
