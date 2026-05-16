<script lang="ts">
  import type { TaskSummary } from '$lib/stores/tasks'
  import { selectedTask } from '$lib/stores/tasks'
  import { getAuth } from '$lib/stores/auth.svelte'
  import { trpc } from '$lib/trpc'
  import { X, Tag, Calendar, User, Clock, Trash2, CheckCircle2, Hash, AlertTriangle, Layers, Flag } from 'lucide-svelte'
  import { clsx } from 'clsx'
  import CommentList from './CommentList.svelte'
  import CommentInput from './CommentInput.svelte'
  import ChecklistBlock from './ChecklistBlock.svelte'
  import ActivityTimeline from './ActivityTimeline.svelte'

  let { task, onRefresh }: { task: TaskSummary; onRefresh?: () => void } = $props()

  // svelte-ignore state_referenced_locally
  let title = $state(task.title)
  // svelte-ignore state_referenced_locally
  let description = $state(task.description ?? '')
  // svelte-ignore state_referenced_locally
  let priority = $state<string | null>(task.priority ?? null)
  // svelte-ignore state_referenced_locally
  let dueDate = $state<string | null>(task.dueDate ?? null)
  // svelte-ignore state_referenced_locally
  let storyPoints = $state<number | null>(task.storyPoints ?? null)
  // svelte-ignore state_referenced_locally
  let deadline = $state<string | null>(task.deadline ?? null)
  let isSaving = $state(false)
  let isDeleting = $state(false)
  let openPopover = $state<string | null>(null)
  let members = $state<Array<{ userId: string; role?: string; user: { id: string; name: string; email: string; avatarUrl?: string | null } }>>([])
  let isLoadingMembers = $state(false)
  // svelte-ignore state_referenced_locally
  let commentKey = $state(0)
  // svelte-ignore state_referenced_locally
  let sprintFlag = $state<string | null>(task.sprintFlag ?? null)
  let sprintStatus = $state<string | null>(null)

  // Determine if current user can manage sprint flags (PM/Admin = owner or admin role)
  let canManageSprintFlag = $derived(() => {
    const auth = getAuth()
    if (!auth.currentUser) return false
    const member = members.find(m => m.userId === auth.currentUser!.id)
    return member?.role === 'owner' || member?.role === 'admin'
  })

  $effect(() => {
    async function loadSprintStatus() {
      if (!task.sprintId) {
        sprintStatus = null
        return
      }
      try {
        const sprint = await trpc.sprint.byId.query({ id: task.sprintId })
        sprintStatus = sprint.status ?? null
      } catch {
        sprintStatus = null
      }
    }
    loadSprintStatus()
  })

  $effect(() => {
    async function loadMembers() {
      if (!task.projectId) return
      isLoadingMembers = true
      try {
        const project = await trpc.project.byId.query({ id: task.projectId })
        if (project && project.workspaceId) {
          const result = await trpc.workspace.members.query({ workspaceId: project.workspaceId })
          members = Array.isArray(result) ? result : []
        }
      } catch {
        members = []
      } finally {
        isLoadingMembers = false
      }
    }
    loadMembers()
  })

  function close() {
    selectedTask.set(null)
  }

  async function updateField(field: string, value: unknown) {
    try {
      await trpc.task.update.mutate({ id: task.id, [field]: value } as any)
      // Optimistically update the store task if needed, or just refresh
      onRefresh?.()
    } catch (err) {
      console.error(`Failed to update ${field}:`, err)
    }
  }

  async function handleTitleBlur() {
    if (title.trim() && title !== task.title) {
      await updateField('title', title.trim())
    }
  }

  async function handleDescriptionBlur() {
    if (description !== (task.description ?? '')) {
      await updateField('description', description)
    }
  }

  async function handleDelete() {
    if (isDeleting) return
    if (!confirm('Delete this task?')) return
    isDeleting = true
    try {
      await trpc.task.delete.mutate({ id: task.id })
      selectedTask.set(null)
      onRefresh?.()
    } catch (err) {
      console.error('Failed to delete task:', err)
    } finally {
      isDeleting = false
    }
  }

  function togglePopover(name: string) {
    openPopover = openPopover === name ? null : name
  }

  function formatDateLabel(dateStr: string | null): string {
    if (!dateStr) return 'Set due date'
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

  function handlePrioritySelect(p: string) {
    priority = p
    updateField('priority', p)
    openPopover = null
  }

  async function toggleComplete() {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    await trpc.task.changeStatus.mutate({ id: task.id, status: newStatus as any })
    onRefresh?.()
  }

  function handleCommentCreated() {
    commentKey++
  }

  async function handleSprintFlagChange() {
    try {
      await trpc.task.update.mutate({
        id: task.id,
        sprintFlag: sprintFlag || null
      })
      onRefresh?.()
    } catch (err) {
      console.error('Failed to update sprint flag:', err)
    }
  }

  function formatSprintFlag(flag: string | null): string {
    if (!flag) return 'Planned'
    const labels: Record<string, string> = {
      'unscheduled': 'Unscheduled',
      'pulled_forward': 'Pulled Forward',
      'emergency': 'Emergency',
      'reopened': 'Reopened',
    }
    return labels[flag] ?? flag
  }
</script>

<div class="task-detail">
  <header class="detail-header">
    <button class="complete-btn" onclick={toggleComplete} class:completed={task.status === 'done'}>
      <CheckCircle2 size={20} />
      <span>{task.status === 'done' ? 'Completed' : 'Mark complete'}</span>
    </button>
    <div class="header-actions">
      <button class="icon-btn danger" onclick={handleDelete} title="Delete Task">
        <Trash2 size={18} />
      </button>
      <button class="icon-btn" onclick={close} title="Close">
        <X size={20} />
      </button>
    </div>
  </header>

  <div class="detail-body">
    <div class="project-path">
      <span class="path-item">{task.project?.name ?? 'No Project'}</span>
    </div>

    <textarea
      class="title-textarea"
      bind:value={title}
      onblur={handleTitleBlur}
      placeholder="Task title"
      rows="1"
    ></textarea>

    <div class="metadata-grid">
      <div class="meta-row">
        <div class="meta-label"><User size={14} /> Assignee</div>
        <div class="meta-value-wrapper">
          <button class="meta-value" onclick={() => togglePopover('assignee')}>
            {#if task.assigneeId && members.length > 0}
              {@const assigned = members.find(m => m.userId === task.assigneeId)}
              {assigned?.user?.name ?? 'Unknown'}
            {:else}
              Unassigned
            {/if}
          </button>
          {#if openPopover === 'assignee'}
            <div class="popover">
              <button 
                class="popover-item" 
                onclick={() => {
                  updateField('assigneeId', null)
                  openPopover = null
                }}
              >
                Unassigned
              </button>
              {#each members as member (member.userId)}
                <button 
                  class="popover-item" 
                  class:active={task.assigneeId === member.userId}
                  onclick={() => {
                    updateField('assigneeId', member.userId)
                    openPopover = null
                  }}
                >
                  {member.user?.name ?? member.user?.email ?? 'Unknown'}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <div class="meta-row">
        <div class="meta-label"><Calendar size={14} /> Due Date</div>
        <div class="meta-value-wrapper">
          <button class="meta-value" onclick={() => togglePopover('dueDate')}>
            {formatDateLabel(dueDate)}
          </button>
          {#if openPopover === 'dueDate'}
            <div class="popover">
              <input 
                type="date" 
                value={dueDate?.split('T')[0] ?? ''} 
                onchange={(e) => {
                  const val = e.currentTarget.value
                  const iso = val ? new Date(val + 'T00:00:00').toISOString() : null
                  dueDate = iso
                  updateField('dueDate', iso)
                  openPopover = null
                }}
              />
            </div>
          {/if}
        </div>
      </div>

      <div class="meta-row">
        <div class="meta-label"><AlertTriangle size={14} /> Deadline</div>
        <div class="meta-value-wrapper">
          <button class="meta-value" onclick={() => togglePopover('deadline')}>
            {deadline ? formatDateLabel(deadline) : 'Set deadline'}
          </button>
          {#if openPopover === 'deadline'}
            <div class="popover">
              <input 
                type="date" 
                value={deadline?.split('T')[0] ?? ''} 
                onchange={(e) => {
                  const val = e.currentTarget.value
                  const iso = val ? new Date(val + 'T00:00:00').toISOString() : null
                  deadline = iso
                  updateField('deadline', iso)
                  openPopover = null
                }}
              />
            </div>
          {/if}
        </div>
      </div>

      <div class="meta-row">
        <div class="meta-label"><Tag size={14} /> Priority</div>
        <div class="meta-value-wrapper">
          <button class="meta-value" onclick={() => togglePopover('priority')}>
            {priority ? priority.toUpperCase() : 'Set priority'}
          </button>
          {#if openPopover === 'priority'}
            <div class="popover">
              {#each ['p0', 'p1', 'p2', 'p3'] as p}
                <button class="popover-item" onclick={() => handlePrioritySelect(p)}>
                  {p.toUpperCase()}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <div class="meta-row">
        <div class="meta-label"><Hash size={14} /> Story Points</div>
        <div class="meta-value-wrapper">
          <input
            type="number"
            class="meta-input"
            min="0"
            step="0.5"
            value={storyPoints ?? ''}
            onblur={(e) => {
              const val = e.currentTarget.value
              const num = val ? parseFloat(val) : null
              storyPoints = num
              updateField('storyPoints', num)
            }}
            placeholder="0"
          />
        </div>
      </div>

      <div class="meta-row">
        <div class="meta-label"><Layers size={14} /> Sprint</div>
        {#if task.sprintId}
          <button class="meta-value stub">In sprint</button>
        {:else}
          <button class="meta-value stub">Not in a sprint</button>
        {/if}
      </div>

      {#if task.sprintId}
        <div class="meta-row">
          <div class="meta-label"><Flag size={14} /> Sprint Flag</div>
          <div class="meta-value-wrapper">
            {#if canManageSprintFlag() && sprintStatus !== 'completed'}
              <select
                bind:value={sprintFlag}
                onchange={handleSprintFlagChange}
                class="meta-select"
              >
                <option value="">Planned (no flag)</option>
                <option value="unscheduled">Unscheduled</option>
                <option value="pulled_forward">Pulled Forward</option>
                <option value="emergency">Emergency</option>
                <option value="reopened">Reopened</option>
              </select>
            {:else}
              {#if task.sprintFlag}
                <span class="flag-badge {task.sprintFlag}">{formatSprintFlag(task.sprintFlag)}</span>
              {:else}
                <span class="flag-badge planned">Planned</span>
              {/if}
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <div class="description-section">
      <div class="section-label">Description</div>
      <textarea
        class="description-textarea"
        bind:value={description}
        onblur={handleDescriptionBlur}
        placeholder="Add a more detailed description..."
      ></textarea>
    </div>

    <hr class="section-divider" />

    <ChecklistBlock taskId={task.id} />

    <hr class="section-divider" />

    <ActivityTimeline taskId={task.id} />

    <hr class="section-divider" />

    {#key commentKey}
      <CommentList entityType="task" entityId={task.id} />
    {/key}

    <CommentInput entityType="task" entityId={task.id} onCreated={handleCommentCreated} />
  </div>

  <footer class="detail-footer">
    <div class="timestamp">
      <Clock size={12} />
      <span>Created on {new Date(task.statusChangedAt).toLocaleDateString()}</span>
    </div>
  </footer>
</div>

<style>
  .task-detail {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-surface);
  }

  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-main);
  }

  .complete-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-muted);
    font-size: 0.875rem;
    font-weight: 600;
    transition: color 0.15s;
  }

  .complete-btn:hover {
    color: var(--text-main);
  }

  .complete-btn.completed {
    color: #22c55e;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .icon-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    border-radius: var(--radius-sm);
    transition: all 0.1s;
  }

  .icon-btn:hover {
    background-color: var(--bg-surface-hover);
    color: var(--text-main);
  }

  .icon-btn.danger:hover {
    color: #db4c3f;
    background-color: rgba(219, 76, 63, 0.1);
  }

  .detail-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .project-path {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .title-textarea {
    width: 100%;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-main);
    line-height: 1.3;
    resize: none;
    padding: 0;
  }

  .metadata-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .meta-row {
    display: grid;
    grid-template-columns: 120px 1fr;
    align-items: center;
  }

  .meta-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .meta-value-wrapper {
    position: relative;
  }

  .meta-value {
    font-size: 0.875rem;
    color: var(--text-main);
    font-weight: 500;
    padding: 0.25rem 0.5rem;
    margin-left: -0.5rem;
    border-radius: 4px;
    transition: background-color 0.1s;
    text-align: left;
    width: fit-content;
  }

  .meta-value:hover {
    background-color: var(--bg-surface-hover);
  }

  .meta-value.stub {
    color: var(--text-muted);
    cursor: not-allowed;
  }

  .popover {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 100;
    background-color: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    padding: 0.25rem;
    min-width: 160px;
  }

  .popover-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    border-radius: 4px;
  }

  .popover-item:hover {
    background-color: var(--bg-surface-hover);
  }

  .popover-item.active {
    background-color: var(--brand-primary-alpha);
    color: var(--brand-primary);
  }

  .meta-input {
    font-size: 0.875rem;
    color: var(--text-main);
    font-weight: 500;
    padding: 0.25rem 0.5rem;
    margin-left: -0.5rem;
    border-radius: 4px;
    border: 1px solid transparent;
    background: transparent;
    width: 80px;
    transition: border-color 0.15s;
  }

  .meta-input:focus {
    border-color: var(--border-main);
    background-color: var(--bg-app);
    outline: none;
  }

  .meta-select {
    font-size: 0.875rem;
    color: var(--text-main);
    font-weight: 500;
    padding: 0.25rem 0.5rem;
    margin-left: -0.5rem;
    border-radius: 4px;
    border: 1px solid var(--border-main);
    background-color: var(--bg-app);
    cursor: pointer;
  }

  .meta-select:focus {
    outline: none;
    border-color: var(--brand-primary);
  }

  .flag-badge {
    display: inline-flex;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .flag-badge.unscheduled { background: #fef3c7; color: #92400e; }
  .flag-badge.pulled_forward { background: #dbeafe; color: #1e40af; }
  .flag-badge.emergency { background: #fee2e2; color: #991b1b; }
  .flag-badge.reopened { background: #f3e8ff; color: #6b21a8; }
  .flag-badge.planned { background: var(--bg-surface-hover); color: var(--text-muted); }

  .description-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .section-label {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-main);
  }

  .description-textarea {
    width: 100%;
    min-height: 120px;
    font-size: 0.9375rem;
    line-height: 1.6;
    color: var(--text-main);
    padding: 0.5rem;
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    transition: border-color 0.15s;
    background-color: transparent;
    margin-left: -0.5rem;
  }

  .description-textarea:focus {
    border-color: var(--border-main);
    background-color: var(--bg-app);
  }

  .detail-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-main);
    color: var(--text-muted);
    font-size: 0.75rem;
  }

  .timestamp {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .section-divider {
    border: none;
    border-top: 1px solid var(--border-main);
    margin: 1rem 0;
  }
</style>
