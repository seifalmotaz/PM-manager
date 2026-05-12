<script lang="ts">
  import { page } from '$app/stores'
  import { getAuth, isAuthenticated, fetchSession } from '$lib/stores/auth.svelte'
  import { fetchWorkspaces } from '$lib/stores/workspaces'
  import { fetchOverdueCount } from '$lib/stores/tasks'
  import { 
    Home, 
    BarChart2, 
    Layers, 
    Search, 
    Bell, 
    Clock, 
    Settings,
    ChevronLeft,
    ChevronRight,
    Plus
  } from 'lucide-svelte'
  import { clsx } from 'clsx'
  import CommandPalette from '$lib/components/CommandPalette.svelte'

  let { children } = $props()
  let isSidebarCollapsed = $state(true)
  let isDetailPanelOpen = $state(false) // Will be driven by store later
  let isCommandPaletteOpen = $state(false)

  $effect(() => {
    fetchSession()
  })

  $effect(() => {
    fetchWorkspaces()
    fetchOverdueCount()
  })

  function toggleSidebar() {
    isSidebarCollapsed = !isSidebarCollapsed
  }

  const navItems = [
    { label: 'Home', icon: Home, href: '/home' },
    { label: 'Velocity', icon: BarChart2, href: '/velocity' },
    { label: 'Projects', icon: Layers, href: '/projects' },
  ]
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
      {#each navItems as item}
        <a 
          href={item.href} 
          class="nav-link" 
          aria-current={$page.url.pathname === item.href ? 'page' : undefined}
          title={isSidebarCollapsed ? item.label : ''}
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
      <button class="command-trigger" onclick={() => isCommandPaletteOpen = true}>
        <Search size={16} />
        <span class="command-placeholder">Search or type a command...</span>
        <span class="command-shortcut">⌘K</span>
      </button>
    </div>

    <div class="topbar-right">
      <button class="topbar-action" title="Start Timer">
        <Clock size={20} />
      </button>
      <button class="topbar-action" title="Notifications">
        <Bell size={20} />
      </button>
      <button class="quick-add-btn">
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

  <CommandPalette bind:isOpen={isCommandPaletteOpen} />

  <!-- Detail Panel (Right) -->
  {#if isDetailPanelOpen}
    <aside class="detail-panel">
      <!-- Detail panel content will go here -->
    </aside>
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
    max-width: 600px;
  }

  .command-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background-color: transparent;
    border: none;
    padding: 0.5rem 0;
    color: var(--text-muted);
    transition: color 0.15s;
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

  /* Responsive Adjustments */
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
