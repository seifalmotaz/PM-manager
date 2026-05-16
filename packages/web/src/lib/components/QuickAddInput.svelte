<script lang="ts">
  import { trpc } from '$lib/trpc'
  import { activeFilterIds } from '$lib/stores/workspaces'
  import { parseTaskInput } from 'shared/nlp-parser'
  import { Layers, Plus, Tag, Calendar, User, Zap, Send } from 'lucide-svelte'
  import { clsx } from 'clsx'
  import { getSessions } from '$lib/stores/org-sessions.svelte'
  import { getOrganization } from '$lib/stores/organization.svelte'
  import { showToast } from '$lib/stores/toast.svelte'

  let {
    onCreated,
    onAddWithDetails,
    autoFocus = false,
    projectId = '',
    orgId = '',
  }: {
    onCreated: () => void
    onAddWithDetails?: (projectId: string) => void
    autoFocus?: boolean
    projectId?: string
    orgId?: string
  } = $props()

  interface ProjectSummary {
    id: string
    name: string
    isInbox?: boolean
  }

  let input = $state('')
  let inputEl = $state<HTMLInputElement>()
  let containerEl = $state<HTMLDivElement>()
  let blurTimeout = $state<ReturnType<typeof setTimeout>>()
  let selectedProjectId = $state('')
  let projects = $state<ProjectSummary[]>([])
  let isCreating = $state(false)
  let isFocused = $state(false)
  let isLoadingProjects = $state(true)
  let selectedOrgId = $state('')

  $effect(() => {
    if (autoFocus && inputEl) {
      inputEl.focus()
    }
  })

  // If a projectId is provided, auto-select it (project detail pages)
  $effect(() => {
    if (projectId) {
      selectedProjectId = projectId
    }
  })

  // Clean up blur timeout on unmount
  $effect(() => {
    return () => {
      clearTimeout(blurTimeout)
    }
  })

  // Synchronous parse
  let parsed = $derived(parseTaskInput(input))

  // All organizations the user belongs to
  let allOrgs = $derived(getOrganization().organizations)

  // Determine if we need to show org picker based on L1 Decision 7 rules:
  // - If on per-org page (orgId prop provided), don't show picker
  // - If clocked in to exactly 1 org, don't show picker (use that org)
  // - If clocked in to 0 or 2+ orgs, show picker with ALL orgs
  let needsOrgPicker = $derived(
    !orgId && getSessions().sessions.length !== 1
  )

  // Get the effective target org ID based on context
  let targetOrgId = $derived(
    orgId || (getSessions().sessions.length === 1 ? getSessions().sessions[0].session.organizationId : selectedOrgId)
  )

  // Find inbox project - if org has isInbox project, use it
  let inboxProjectId = $derived(
    (() => {
      const inbox = projects.find(p => p.isInbox === true)
      if (inbox) return inbox.id
      return projects[0]?.id ?? ''
    })()
  )

  // Fetch projects based on org context
  $effect(() => {
    const wsIds = $activeFilterIds
    isLoadingProjects = true

    if (!targetOrgId) {
      // No org context - fetch based on workspaces
      if (wsIds.length === 0) {
        projects = []
        isLoadingProjects = false
        return
      }

      ;(async () => {
        try {
          const result = await trpc.project.list.query({ workspaceId: wsIds[0] })
          projects = result as ProjectSummary[]
          if (selectedProjectId === '' && projects.length > 0) {
            selectedProjectId = projects[0].id
          }
        } catch (err) {
          console.error('Failed to fetch projects:', err)
          showToast('Failed to load projects', 'error')
          projects = []
        } finally {
          isLoadingProjects = false
        }
      })()
    } else {
      // Has org context - fetch projects for that org using listByOrg
      ;(async () => {
        try {
          const result = await trpc.project.listByOrg.query({ organizationId: targetOrgId })
          projects = result as ProjectSummary[]
          // Auto-select inbox project if available, otherwise first project
          const inbox = projects.find(p => p.isInbox === true)
          selectedProjectId = inbox?.id ?? projects[0]?.id ?? ''
        } catch (err) {
          console.error('Failed to fetch projects:', err)
          showToast('Failed to load projects', 'error')
          projects = []
        } finally {
          isLoadingProjects = false
        }
      })()
    }
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
    const trimmedInput = input.trim()
    if (!trimmedInput || !selectedProjectId || isCreating) return
    isCreating = true
    try {
      const p = parseTaskInput(trimmedInput)
      // Use the parsed title (stripped of shortcuts), or the full input if stripping results in empty
      const finalTitle = p.title || trimmedInput

      // Resolve @username to assigneeId
      let assigneeId: string | undefined = undefined
      if (p.assigneeUsername) {
        try {
          const project = await trpc.project.byId.query({ id: selectedProjectId })
          if (project && project.workspaceId) {
            const membersResult = await trpc.workspace.members.query({ workspaceId: project.workspaceId })
            const matched = (membersResult as any[]).find(
              (m) => m.user?.name?.toLowerCase() === p.assigneeUsername?.toLowerCase()
            )
            if (matched) {
              assigneeId = matched.userId
            }
          }
        } catch {
          // Silently fail — task still gets created without assignee
        }
      }

      // Also call server-side parser for validation (fire-and-forget)
      trpc.task.parse.query({ input: trimmedInput }).catch(() => {})

      await trpc.task.create.mutate({
        projectId: selectedProjectId,
        title: finalTitle,
        priority: p.priority ?? undefined,
        storyPoints: p.storyPoints ?? undefined,
        dueDate: p.dueDate ? p.dueDate.toISOString() : undefined,
        assigneeId,
      })
      input = ''
      onCreated()
    } catch (err) {
      console.error('Failed to create task:', err)
      showToast(err instanceof Error ? err.message : 'Failed to create task', 'error')
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

  function handleInputFocus() {
    if (blurTimeout) {
      clearTimeout(blurTimeout)
    }
    isFocused = true
  }

  function handleInputBlur() {
    // Cancel any pending blur timeout
    clearTimeout(blurTimeout)
    // Delay blur to check if focus moved inside the component
    blurTimeout = setTimeout(() => {
      if (containerEl && !containerEl.contains(document.activeElement)) {
        isFocused = false
      }
    }, 0)
  }
</script>

<div class={clsx('quick-add-v2', isFocused && 'focused', (isCreating || isLoadingProjects) && 'loading')} bind:this={containerEl} onfocusout={handleInputBlur}>
  <div class="input-row">
    <div class="input-wrapper">
      <input
        type="text"
        bind:value={input}
        bind:this={inputEl}
        placeholder="e.g. Meet Seif at 5pm p1"
        onkeydown={handleKeydown}
        onfocus={handleInputFocus}
        onblur={handleInputBlur}
disabled={isCreating || isLoadingProjects}
      />
    </div>
    
    <div class="actions-right">
      {#if input.trim()}
        <button class="submit-btn" onclick={handleSubmit} disabled={isCreating}>
          <Send size={18} />
        </button>
      {/if}
      <button class="action-icon-btn" onclick={() => selectedProjectId = ''} title="Switch Project">
        <Layers size={18} />
      </button>
    </div>
  </div>

  {#if isFocused || input.trim()}
    <div class="meta-footer">
      <div class="preview-chips">
        {#if parsed.priority}
          <span class={clsx('chip priority', parsed.priority)}>
            <Tag size={12} />
            {parsed.priority.toUpperCase()}
          </span>
        {/if}
        {#if parsed.dueDate}
          <span class="chip date">
            <Calendar size={12} />
            {formatPreviewDate(parsed.dueDate)}
          </span>
        {/if}
        {#if parsed.assigneeUsername}
          <span class="chip user">
            <User size={12} />
            @{parsed.assigneeUsername}
          </span>
        {/if}
      </div>

      {#if !projectId}
        <div class="project-picker-inline">
          <Layers size={14} class="icon-muted" />
          {#if needsOrgPicker}
            <select
              bind:value={selectedOrgId}
              disabled={isCreating}
              onchange={() => {
                // Reset project selection when org changes
                selectedProjectId = ''
              }}
            >
              <option value="">Which org?</option>
              {#each allOrgs as org}
                <option value={org.id}>
                  {org.name}
                </option>
              {/each}
            </select>
          {:else}
            <select bind:value={selectedProjectId} disabled={isCreating}>
              {#each projects as project (project.id)}
                <option value={project.id}>{project.name}</option>
              {/each}
            </select>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .quick-add-v2 {
    background-color: transparent;
    border: 1px solid var(--border-main);
    border-radius: var(--radius-lg);
    transition: all 0.2s ease;
    margin-bottom: 2rem;
  }

  .quick-add-v2.focused {
    border-color: var(--td-text-muted);
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }

  .input-row {
    display: flex;
    align-items: center;
    padding: 0.5rem 0.75rem;
    gap: 0.5rem;
  }

  .input-wrapper {
    flex: 1;
  }

  input {
    width: 100%;
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-main);
    padding: 0.5rem 0;
  }

  input::placeholder {
    color: var(--text-muted);
    font-weight: 400;
  }

  .actions-right {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .submit-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--brand-primary);
    color: white;
    border-radius: 50%;
    transition: transform 0.1s;
  }

  .submit-btn:active {
    transform: scale(0.9);
  }

  .action-icon-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    border-radius: 4px;
  }

  .action-icon-btn:hover {
    background-color: var(--bg-surface-hover);
    color: var(--text-main);
  }

  .meta-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-top: 1px solid var(--border-muted);
    background-color: var(--td-border-muted);
    border-bottom-left-radius: var(--radius-lg);
    border-bottom-right-radius: var(--radius-lg);
  }

  .preview-chips {
    display: flex;
    gap: 0.5rem;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    background-color: var(--bg-surface-hover);
    color: var(--text-muted);
    border: 1px solid var(--border-main);
  }

  .chip.priority.p0 { color: #db4c3f; border-color: rgba(219, 76, 63, 0.3); }
  .chip.priority.p1 { color: #ff9a00; border-color: rgba(255, 154, 0, 0.3); }
  .chip.priority.p2 { color: #246fe0; border-color: rgba(36, 111, 224, 0.3); }

  .project-picker-inline {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .project-picker-inline select {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-muted);
    background: none;
    cursor: pointer;
  }

  .project-picker-inline select:hover {
    color: var(--text-main);
  }

  .icon-muted {
    color: var(--text-muted);
    opacity: 0.7;
  }

  .loading {
    opacity: 0.7;
    pointer-events: none;
  }
</style>
