<script lang="ts">
  import { trpc } from '$lib/trpc'
  import { goto } from '$app/navigation'
  import { selectedTask } from '$lib/stores/tasks'
  import {
    Bell,
    BellOff,
    UserPlus,
    AtSign,
    PlayCircle,
    CheckCircle2,
    AlertTriangle
  } from 'lucide-svelte'

  interface Notification {
    id: string
    userId: string
    type: 'assigned' | 'deadline_soon' | 'sprint_started' | 'sprint_ended' | 'mentioned'
    title: string
    body: string | null
    entityType: string | null
    entityId: string | null
    isRead: boolean
    createdAt: Date
  }

  let unreadCount = $state(0)
  let isOpen = $state(false)
  let notifications = $state<Notification[]>([])
  let loading = $state(false)
  let error = $state<string | null>(null)

  let pollInterval: ReturnType<typeof setInterval> | null = null

  $effect(() => {
    async function initialLoad() {
      try {
        const [count, list] = await Promise.all([
          trpc.notification.unreadCount.query(),
          trpc.notification.list.query({ limit: 20 })
        ])
        unreadCount = count
        notifications = list as unknown as Notification[]
      } catch (e) {
        error = e instanceof Error ? e.message : 'Failed to load notifications'
      }
    }
    initialLoad()

    pollInterval = setInterval(async () => {
      try {
        unreadCount = await trpc.notification.unreadCount.query()
      } catch {
        // silent fail on polling
      }
    }, 30000)

    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  })

  // Click outside to close
  $effect(() => {
    if (!isOpen) return

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Element
      if (!target.closest('.notification-bell')) {
        isOpen = false
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  })

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

  async function handleMarkAllRead() {
    try {
      await trpc.notification.markAllRead.mutate()
      unreadCount = 0
      notifications = notifications.map(n => ({ ...n, isRead: true }))
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to mark all read'
    }
  }

  async function handleNotificationClick(notif: Notification) {
    // Mark as read
    if (!notif.isRead) {
      try {
        await trpc.notification.markRead.mutate({ id: notif.id })
        const idx = notifications.findIndex(n => n.id === notif.id)
        if (idx !== -1) {
          notifications[idx] = { ...notifications[idx], isRead: true }
        }
        unreadCount = Math.max(0, unreadCount - 1)
      } catch {
        // continue anyway
      }
    }

    // Navigate if possible
    if (notif.entityType && notif.entityId) {
      if (notif.entityType === 'task') {
        selectedTask.set({ id: notif.entityId } as any)
      } else if (notif.entityType === 'sprint') {
        // Sprint navigation requires projectId - need to fetch sprint to get projectId
        // For now, close dropdown. Could enhance with additional query.
        // goto(`/project/${projectId}/sprints`)
      } else if (notif.entityType === 'project') {
        goto(`/project/${notif.entityId}/kanban`)
      }
      // comment type - close only, can't resolve parent without extra query
    }

    isOpen = false
  }
</script>

<div class="notification-bell">
  <button
    class="topbar-action bell-btn"
    title="Notifications"
    onclick={() => isOpen = !isOpen}
  >
    <Bell size={20} />
    {#if unreadCount > 0}
      <span class="badge">
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    {/if}
  </button>

  {#if isOpen}
    <div class="dropdown">
      <div class="dropdown-header">
        <span class="dropdown-title">Notifications</span>
        {#if unreadCount > 0}
          <button class="mark-all-btn" onclick={handleMarkAllRead}>
            Mark all read
          </button>
        {/if}
      </div>

      <div class="dropdown-body">
        {#if error}
          <div class="state-error">
            <span>{error}</span>
            <button onclick={() => { error = null; /* retry */ }}>Retry</button>
          </div>
        {:else if loading}
          <div class="skeleton-list">
            {#each [1,2,3,4,5] as _}
              <div class="skeleton-item">
                <div class="skeleton-icon"></div>
                <div class="skeleton-text">
                  <div class="skeleton-line"></div>
                  <div class="skeleton-line short"></div>
                </div>
              </div>
            {/each}
          </div>
        {:else if notifications.length === 0}
          <div class="state-empty">
            <BellOff size={24} />
            <span>No notifications</span>
          </div>
        {:else}
          {#each notifications as notif (notif.id)}
            <button
              class="notif-item"
              class:unread={!notif.isRead}
              onclick={() => handleNotificationClick(notif)}
            >
              <div class="notif-icon-wrapper">
                {#if notif.type === 'assigned'}
                  <UserPlus size={16} />
                {:else if notif.type === 'mentioned'}
                  <AtSign size={16} />
                {:else if notif.type === 'sprint_started'}
                  <PlayCircle size={16} />
                {:else if notif.type === 'sprint_ended'}
                  <CheckCircle2 size={16} />
                {:else if notif.type === 'deadline_soon'}
                  <AlertTriangle size={16} />
                {:else}
                  <Bell size={16} />
                {/if}
              </div>
              <div class="notif-content">
                <div class="notif-title-row">
                  {#if !notif.isRead}
                    <span class="unread-dot"></span>
                  {/if}
                  <span class="notif-title" class:bold={!notif.isRead}>{notif.title}</span>
                </div>
                <span class="notif-time">{timeAgo(notif.createdAt)}</span>
              </div>
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .notification-bell {
    position: relative;
  }

  .bell-btn {
    position: relative;
  }

  .badge {
    position: absolute;
    top: -2px;
    right: -4px;
    min-width: 16px;
    height: 16px;
    background: #ef4444;
    color: white;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    box-sizing: border-box;
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 380px;
    max-height: 400px;
    overflow-y: auto;
    background: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    z-index: 100;
  }

  .dropdown-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-main);
    position: sticky;
    top: 0;
    background: var(--bg-surface);
  }

  .dropdown-title {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-main);
  }

  .mark-all-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 0.75rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-md);
    transition: all 0.15s;
  }

  .mark-all-btn:hover {
    background: var(--bg-surface-hover);
    color: var(--text-main);
  }

  .dropdown-body {
    overflow-y: auto;
  }

  .state-error,
  .state-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2rem;
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  .state-error button {
    background: none;
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    padding: 0.25rem 0.75rem;
    cursor: pointer;
    color: var(--text-main);
    font-size: 0.8125rem;
  }

  .skeleton-list {
    padding: 0.5rem;
  }

  .skeleton-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
  }

  .skeleton-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--bg-surface-hover);
    animation: pulse 1.5s ease-in-out infinite;
  }

  .skeleton-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .skeleton-line {
    height: 10px;
    border-radius: 4px;
    background: var(--bg-surface-hover);
    animation: pulse 1.5s ease-in-out infinite;
  }

  .skeleton-line.short {
    width: 50%;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .notif-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--text-main);
    transition: background 0.15s;
  }

  .notif-item:hover {
    background: var(--bg-surface-hover);
  }

  .notif-icon-wrapper {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--bg-surface-hover);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .notif-content {
    flex: 1;
    min-width: 0;
  }

  .notif-title-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .unread-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--brand-primary);
    flex-shrink: 0;
  }

  .notif-title {
    font-size: 0.875rem;
    color: var(--text-main);
  }

  .notif-title.bold {
    font-weight: 600;
  }

  .notif-time {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.125rem;
    display: block;
  }
</style>