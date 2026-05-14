<script lang="ts">
  import { trpc } from '$lib/trpc'
  import { Clock, ChevronDown, ChevronRight } from 'lucide-svelte'

  let { taskId }: { taskId: string } = $props()

  let entries = $state<Array<{
    id: string
    entityType: string
    entityId: string
    action: string
    field?: string | null
    oldValue?: string | null
    newValue?: string | null
    userId: string
    createdAt: string | Date
  }>>([])
  let loading = $state(false)
  let isExpanded = $state(false)

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

  function humanizeField(field: string): string {
    const map: Record<string, string> = {
      dueDate: 'due date',
      storyPoints: 'story points',
      estimatedHours: 'estimated hours',
      sprintId: 'sprint',
      sprintFlag: 'sprint flag',
      assigneeId: 'assignee',
      deadline: 'deadline',
      title: 'title',
      description: 'description',
      priority: 'priority',
      status: 'status',
    }
    return map[field] ?? field.replace(/([A-Z])/g, ' $1').toLowerCase()
  }

  function renderEntry(entry: typeof entries[0]): string {
    const userName = entry.userId.slice(0, 8)
    if (entry.action === 'created') {
      return `${userName} created this task`
    }
    if (entry.action === 'status_changed') {
      return `${userName} moved from ${entry.oldValue} to ${entry.newValue}`
    }
    if (entry.action === 'updated') {
      if (entry.field === 'assigneeId') {
        if (entry.oldValue && entry.newValue) {
          return `${userName} reassigned from ${entry.oldValue.slice(0, 8)} to ${entry.newValue.slice(0, 8)}`
        }
      }
      if (!entry.oldValue && entry.newValue) {
        return `${userName} set ${humanizeField(entry.field ?? '')} to ${entry.newValue}`
      }
      if (entry.oldValue && !entry.newValue) {
        return `${userName} cleared ${humanizeField(entry.field ?? '')}`
      }
      return `${userName} changed ${humanizeField(entry.field ?? '')} from ${entry.oldValue ?? 'none'} to ${entry.newValue ?? 'none'}`
    }
    return `${userName} performed ${entry.action}`
  }

  async function toggleExpanded() {
    if (isExpanded) {
      isExpanded = false
      return
    }
    isExpanded = true
    if (entries.length === 0) {
      loading = true
      try {
        const result = await trpc.audit.forEntity.query({
          entityType: 'task',
          entityId: taskId,
        })
        entries = result as typeof entries
      } catch {
        entries = []
      } finally {
        loading = false
      }
    }
  }

  let displayedEntries = $derived(entries.slice(0, 20))
  let hasMore = $derived(entries.length > 20)
</script>

<div class="activity-timeline">
  <button class="toggle-btn" onclick={toggleExpanded}>
    <Clock size={14} />
    <span>Activity</span>
    {#if isExpanded}
      <ChevronDown size={14} />
    {:else}
      <ChevronRight size={14} />
    {/if}
  </button>

  {#if isExpanded}
    <div class="timeline-body">
      {#if loading}
        <div class="loading">Loading activity...</div>
      {:else if entries.length === 0}
        <div class="empty">No activity recorded</div>
      {:else}
        <div class="timeline">
          {#each displayedEntries as entry (entry.id)}
            <div class="timeline-entry">
              <div class="timeline-dot"></div>
              <div class="entry-content">
                <span class="entry-text">{renderEntry(entry)}</span>
                <span class="entry-time">{timeAgo(entry.createdAt)}</span>
              </div>
            </div>
          {/each}
          {#if hasMore}
            <button class="show-all-btn">
              Show all {entries.length} entries
            </button>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .activity-timeline {
    display: flex;
    flex-direction: column;
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-muted);
    transition: color 0.15s;
  }

  .toggle-btn:hover {
    color: var(--text-main);
  }

  .timeline-body {
    margin-top: 0.75rem;
    padding-left: 1rem;
  }

  .loading,
  .empty {
    font-size: 0.875rem;
    color: var(--text-muted);
    padding: 0.5rem 0;
  }

  .timeline {
    display: flex;
    flex-direction: column;
    gap: 0;
    position: relative;
  }

  .timeline::before {
    content: '';
    position: absolute;
    left: 3px;
    top: 6px;
    bottom: 6px;
    width: 2px;
    background-color: var(--border-main);
  }

  .timeline-entry {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    position: relative;
    padding-bottom: 0.75rem;
  }

  .timeline-entry:last-child {
    padding-bottom: 0;
  }

  .timeline-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--brand-primary);
    flex-shrink: 0;
    margin-top: 4px;
    position: relative;
    z-index: 1;
  }

  .entry-content {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    flex: 1;
  }

  .entry-text {
    font-size: 0.875rem;
    color: var(--text-main);
  }

  .entry-time {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .show-all-btn {
    font-size: 0.875rem;
    color: var(--brand-primary);
    margin-top: 0.25rem;
  }

  .show-all-btn:hover {
    text-decoration: underline;
  }
</style>