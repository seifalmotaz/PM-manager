<script lang="ts">
  import { page } from '$app/stores'
  import { getAuth, isAuthenticated, fetchSession } from '$lib/stores/auth.svelte'
  import { fetchWorkspaces, activeFilterIds } from '$lib/stores/workspaces'
  import { fetchOverdueCount, selectedTask, fetchTasks } from '$lib/stores/tasks'
  import { getOrganization, loadActiveOrganization } from '$lib/stores/organization.svelte'
  import { trpc } from '$lib/trpc'
  import {
    Home,
    Layers,
    BarChart2,
    Users,
    LayoutDashboard,
    Search,
    Settings,
    ChevronLeft,
    ChevronRight,
    Plus,
  } from 'lucide-svelte'
  import { clsx } from 'clsx'
  import OrgSwitcher from '$lib/components/OrgSwitcher.svelte'
  import CommandPalette from '$lib/components/CommandPalette.svelte'
  import QuickAddModal from '$lib/components/QuickAddModal.svelte'
  import DeadlineBadge from '$lib/components/DeadlineBadge.svelte'
  import TaskDetail from '$lib/components/TaskDetail.svelte'
  import NotificationBell from '$lib/components/NotificationBell.svelte'
  import ClockInOutButton from '$lib/components/ClockInOutButton.svelte'
  import SessionPill from '$lib/components/SessionPill.svelte'
  import SessionOverflow from '$lib/components/SessionOverflow.svelte'
  import { getSessions, fetchActiveSessions, startElapsedTimer, stopElapsedTimer } from '$lib/stores/org-sessions.svelte'
  import RetroactiveCloseDialog from '$lib/components/RetroactiveCloseDialog.svelte'

  let { children } = $props()
  let isSidebarCollapsed = $state(true)
  let isCommandPaletteOpen = $state(false)
  let isQuickAddOpen = $state(false)
  let retroactiveSession = $state<{ sessionId: string; organizationName: string; startTime: string } | null>(null)
  let hasCheckedRetroactive = $state(false)

  let isDetailPanelOpen = $derived($selectedTask !== null)

  let currentOrgSlug = $derived($page.params.orgSlug ?? '')

  $effect(() => {
    fetchSession()
  })

  $effect(() => {
    const auth = getAuth()
    if (auth.isLoading) return
    fetchWorkspaces()
    fetchOverdueCount()
    loadActiveOrganization()
    // After auth resolves, also fetch active sessions
    if (auth.currentUser) {
      fetchActiveSessions()
      startElapsedTimer()
    }
  })

  // Check for old live sessions (retroactive close)
  // Do this once per session, after auth resolves
  $effect(() => {
    if (getAuth().currentUser && !hasCheckedRetroactive) {
      checkForOldSessions()
    }
  })

  async function checkForOldSessions() {
    try {
      const oldSessions = await trpc.orgSession.getOldLive.query() as any[]
      hasCheckedRetroactive = true

      if (oldSessions && oldSessions.length > 0) {
        const session = oldSessions[0]
        const orgs = getOrganization().organizations
        const org = orgs.find((o: any) => o.id === session.organizationId)
        retroactiveSession = {
          sessionId: session.id,
          organizationName: org?.name ?? 'Unknown Org',
          startTime: session.startTime,
        }
      }
    } catch (err) {
      console.error('Failed to check old sessions:', err)
      hasCheckedRetroactive = true
    }
  }

  // Cleanup timer on unmount
  $effect(() => {
    return () => {
      stopElapsedTimer()
    }
  })

  $effect(() => {
    function handleGlobalKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        isQuickAddOpen = true
      }
    }
    window.addEventListener('keydown', handleGlobalKeydown)
    return () => window.removeEventListener('keydown', handleGlobalKeydown)
  })

  function toggleSidebar() {
    isSidebarCollapsed = !isSidebarCollapsed
  }

  function handleQuickAddCreated() {
    fetchTasks($activeFilterIds)
    fetchOverdueCount()
  }

  let navItems = $derived.by(() => {
    const slug = currentOrgSlug
    if (!slug) return []

    return [
      { href: `/${slug}`, label: 'Home', icon: Home },
      { href: `/${slug}/projects`, label: 'Projects', icon: Layers },
      { href: `/${slug}/velocity`, label: 'Velocity', icon: BarChart2 },
      { href: `/${slug}/people`, label: 'People', icon: Users },
      { href: `/${slug}/overview`, label: 'Overview', icon: LayoutDashboard },
    ]
  })
</script>

<div class={clsx('app-shell', isSidebarCollapsed && 'sidebar-collapsed', isDetailPanelOpen && 'detail-open')}>
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="brand-logo">S</div>
      {#if !isSidebarCollapsed}
        <span class="brand-name">Saha</span>
      {/if}
      <button class="sidebar-toggle" onclick={toggleSidebar}>
        {#if isSidebarCollapsed}
          <ChevronRight size={16} />
        {:else}
          <ChevronLeft size={16} />
        {/if}
      </button>
    </div>

    <nav class="sidebar-nav">
      {#each navItems as item (item.href)}
        <a
          href={item.href}
          class="nav-link"
          aria-current={$page.url.pathname === item.href ? 'page' : undefined}
        >
          <item.icon size={20} />
          {#if !isSidebarCollapsed}
            <span class="nav-label">{item.label}</span>
          {/if}
        </a>
      {/each}
    </nav>

    <div class="sidebar-footer">
      <button class="nav-link" title="Settings">
        <Settings size={20} />
        {#if !isSidebarCollapsed}
          <span class="nav-label">Settings</span>
        {/if}
      </button>
    </div>
  </aside>

  <!-- Top bar -->
  <header class="topbar">
    <div class="topbar-left">
      <div class="topbar-left-row">
        <OrgSwitcher />
        <div class="topbar-divider"></div>
        <button class="command-trigger" onclick={() => (isCommandPaletteOpen = true)}>
          <Search size={16} />
          <span class="command-placeholder">Search or type a command...</span>
          <span class="command-shortcut">⌘K</span>
        </button>
      </div>
    </div>

    <div class="topbar-right">
      <ClockInOutButton />

      {#if getSessions().sessions.length > 0}
        {#if getSessions().sessions.length <= 2}
          {#each getSessions().sessions as s (s.session.id)}
            <SessionPill sessionId={s.session.id} />
          {/each}
        {:else}
          <SessionOverflow />
        {/if}
      {/if}

      <DeadlineBadge />
      <NotificationBell />
      <button class="quick-add-btn" onclick={() => (isQuickAddOpen = true)}>
        <Plus size={20} />
        <span>New Task</span>
      </button>
      <div class="user-avatar">
        {getAuth().currentUser?.email?.[0].toUpperCase() ?? 'U'}
      </div>
    </div>
  </header>

  <!-- Main content -->
  <main class="main-content">
    {#if getAuth().isLoading}
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Syncing workspace...</p>
      </div>
    {:else if !isAuthenticated()}
      <div class="loading-container">
        <p>Redirecting to login...</p>
      </div>
    {:else}
      {@render children()}
    {/if}
  </main>

  <CommandPalette bind:isOpen={isCommandPaletteOpen} onNewTask={() => (isQuickAddOpen = true)} />

  <QuickAddModal bind:isOpen={isQuickAddOpen} onCreated={handleQuickAddCreated} />

  {#if isDetailPanelOpen && $selectedTask}
    <aside class="detail-panel">
      {#key $selectedTask.id}
        <TaskDetail task={$selectedTask} onRefresh={() => { fetchTasks($activeFilterIds); fetchOverdueCount() }} />
      {/key}
    </aside>
  {/if}

  {#if retroactiveSession}
    <RetroactiveCloseDialog
      sessionId={retroactiveSession.sessionId}
      organizationName={retroactiveSession.organizationName}
      startTime={retroactiveSession.startTime}
      onClose={() => (retroactiveSession = null)}
    />
  {/if}
</div>

<style>
  .app-shell {
    display: grid;
    grid-template-columns: var(--sidebar-width) 1fr 0px;
    grid-template-rows: var(--topbar-height) 1fr;
    height: 100vh;
    transition: grid-template-columns 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .app-shell.sidebar-collapsed {
    --sidebar-width: var(--sidebar-collapsed-width);
  }

  .app-shell.detail-open {
    grid-template-columns: var(--sidebar-width) 1fr var(--detail-panel-width);
  }

  /* Sidebar */
  .sidebar {
    grid-row: 1 / -1;
    background-color: var(--bg-sidebar);
    border-right: 1px solid var(--border-main);
    display: flex;
    flex-direction: column;
    z-index: 20;
  }

  .sidebar-header {
    height: var(--topbar-height);
    display: flex;
    align-items: center;
    padding: 0 1.5rem;
    gap: 0.75rem;
    position: relative;
    margin-bottom: 1.5rem;
  }

  .brand-logo {
    width: 24px;
    height: 24px;
    background-color: var(--brand-primary);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 0.875rem;
    flex-shrink: 0;
  }

  .brand-name {
    font-weight: 700;
    font-size: 1.25rem;
    letter-spacing: -0.02em;
    color: var(--brand-primary);
  }

  .sidebar-toggle {
    position: absolute;
    right: -12px;
    top: 50%;
    transform: translateY(-50%);
    width: 24px;
    height: 24px;
    background-color: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    opacity: 0;
    transition: opacity 0.2s, color 0.2s;
  }

  .sidebar:hover .sidebar-toggle {
    opacity: 1;
  }

  .sidebar-toggle:hover {
    color: var(--text-main);
    background-color: var(--bg-surface-hover);
  }

  .sidebar-nav {
    flex: 1;
    padding: 1rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    border-radius: var(--radius-md);
    color: var(--text-muted);
    transition: all 0.15s ease;
    height: 48px;
    font-weight: 500;
    overflow: hidden;
    text-decoration: none;
  }

  .sidebar-collapsed .nav-link {
    justify-content: center;
    padding: 0.75rem 0;
    gap: 0;
  }

  .nav-link:hover {
    background-color: var(--bg-surface-hover);
    color: var(--text-main);
  }

  .nav-link[aria-current="page"] {
    background-color: var(--td-hover);
    color: var(--text-main);
    font-weight: 600;
  }

  .sidebar-footer {
    padding: 0.75rem;
    border-top: 1px solid var(--border-main);
  }

  /* Top bar */
  .topbar {
    grid-column: 2;
    grid-row: 1;
    background-color: var(--bg-app);
    border-bottom: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2rem;
    gap: 2rem;
    height: 64px;
  }

  .topbar-left {
    flex: 1;
    max-width: 700px;
  }

  .topbar-left-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .topbar-divider {
    width: 1px;
    height: 24px;
    background-color: var(--border-main);
    opacity: 0.5;
  }

  .command-trigger {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background-color: transparent;
    border: none;
    padding: 0.5rem 0;
    color: var(--text-muted);
    transition: color 0.15s;
    flex: 1;
  }

  .command-trigger:hover {
    color: var(--text-main);
  }

  .command-placeholder {
    font-size: 0.875rem;
    flex: 1;
    text-align: left;
  }

  .command-shortcut {
    font-size: 0.75rem;
    background-color: var(--zinc-800);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .topbar-action {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    border-radius: var(--radius-md);
    transition: background-color 0.15s, color 0.15s;
  }

  .topbar-action:hover {
    background-color: var(--bg-surface-hover);
    color: var(--text-main);
  }

  .quick-add-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background-color: var(--brand-primary);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-md);
    font-weight: 600;
    transition: background-color 0.15s;
  }

  .quick-add-btn:hover {
    background-color: var(--brand-hover);
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    background-color: var(--zinc-700);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
    margin-left: 0.5rem;
  }

  /* Main Content */
  .main-content {
    grid-column: 2;
    grid-row: 2;
    background-color: var(--bg-app);
    overflow-y: auto;
    position: relative;
  }

  .loading-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: var(--text-muted);
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border-main);
    border-top-color: var(--brand-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Detail Panel */
  .detail-panel {
    grid-column: 3;
    grid-row: 1 / -1;
    background-color: var(--bg-surface);
    border-left: 1px solid var(--border-main);
    z-index: 10;
  }

  @media (max-width: 1024px) {
    .app-shell.detail-open {
      grid-template-columns: var(--sidebar-width) 1fr 0px;
    }
    .detail-panel {
      position: fixed;
      top: var(--topbar-height);
      right: 0;
      bottom: 0;
      width: var(--detail-panel-width);
      box-shadow: -4px 0 12px rgba(0,0,0,0.1);
    }
  }

  @media (max-width: 768px) {
    .command-placeholder, .command-shortcut, .nav-label, .quick-add-btn span {
      display: none;
    }
    .topbar-left {
      max-width: 40px;
    }
    .command-trigger {
      padding: 0.5rem;
      justify-content: center;
    }
  }
</style>