<script lang="ts">
  import { trpc } from '$lib/trpc'
  import { activeFilterIds } from '$lib/stores/workspaces'
  import { parseTaskInput, type ParsedTaskInput } from 'shared/nlp-parser'

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

  // Synchronous parse — recomputes in microseconds on every keystroke
  let parsed = $derived(parseTaskInput(input))

  // Fetch projects when activeFilterIds changes
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

    const diffMs = target.getTime() - today.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'tomorrow'
    if (diffDays === -1) return 'yesterday'

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[target.getMonth()]} ${target.getDate()}`
  }

  async function handleSubmit() {
    if (!input.trim() || !selectedProjectId || isCreating) return

    isCreating = true
    try {
      // Parse synchronously NOW — never use stale async state
      const parsed = parseTaskInput(input)
      const title = parsed.title || input.trim()
      const priority = parsed.priority ?? undefined
      const storyPoints = parsed.storyPoints ?? undefined
      const dueDate = parsed.dueDate ? parsed.dueDate.toISOString() : undefined

      await trpc.task.create.mutate({
        projectId: selectedProjectId,
        title,
        priority,
        storyPoints,
        dueDate,
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

<div class="quick-add">
  <select bind:value={selectedProjectId} class="project-select" disabled={isCreating}>
    <option value="">Select project...</option>
    {#each projects as project (project.id)}
      <option value={project.id}>{project.name}</option>
    {/each}
  </select>
  <div class="input-wrapper">
    <input
      type="text"
      bind:value={input}
      placeholder="Type a task title and press Enter"
      onkeydown={handleKeydown}
      disabled={isCreating}
      autofocus
    />
    {#if input.trim()}
      <div class="preview-tags">
        {#if parsed.priority}
          <span class="tag">P:{parsed.priority.toUpperCase()}</span>
        {/if}
        {#if parsed.storyPoints !== undefined}
          <span class="tag">SP:{parsed.storyPoints}</span>
        {/if}
        {#if parsed.dueDate}
          <span class="tag">Due:{formatPreviewDate(parsed.dueDate)}</span>
        {/if}
        {#if parsed.assigneeUsername}
          <span class="tag">@{parsed.assigneeUsername}</span>
        {/if}
      </div>
    {/if}
  </div>
  {#if onAddWithDetails && selectedProjectId}
    <button
      class="details-btn"
      onclick={() => onAddWithDetails(selectedProjectId)}
      title="Add with details"
    >+</button>
  {/if}
</div>

<style>
  .quick-add {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem 0;
  }
  .project-select {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.5rem;
    background: var(--color-surface, #fff);
    font-size: 0.8125rem;
    color: var(--color-text, #1a202c);
    min-width: 160px;
    cursor: pointer;
  }
  .project-select:focus {
    outline: none;
    border-color: var(--color-primary, #3b82f6);
  }
  .input-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .input-wrapper input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-text, #1a202c);
    background: var(--color-surface, #fff);
    box-sizing: border-box;
  }
  .input-wrapper input:focus {
    outline: none;
    border-color: var(--color-primary, #3b82f6);
    box-shadow: 0 0 0 2px var(--color-primary-light, #eff6ff);
  }
  .input-wrapper input::placeholder {
    color: var(--color-muted, #a0aec0);
  }
  .preview-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }
  .tag {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.6875rem;
    font-weight: 600;
    background: var(--color-bg-subtle, #f7fafc);
    color: var(--color-muted, #718096);
    border: 1px solid var(--color-border, #e2e8f0);
  }
  .details-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px dashed var(--color-border, #e2e8f0);
    border-radius: 0.5rem;
    background: var(--color-surface, #fff);
    color: var(--color-muted, #718096);
    font-size: 1.125rem;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
    transition: border-color 0.15s ease, color 0.15s ease;
  }
  .details-btn:hover {
    border-color: var(--color-primary, #3b82f6);
    color: var(--color-primary, #3b82f6);
  }
</style>
