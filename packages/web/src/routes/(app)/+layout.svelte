<script lang="ts">
  import { page } from '$app/stores'
  import { getAuth, isAuthenticated, fetchSession, logout } from '$lib/stores/auth.svelte'
  import WorkspaceFilter from '$lib/components/WorkspaceFilter.svelte'
  import DeadlineBadge from '$lib/components/DeadlineBadge.svelte'
  import { fetchWorkspaces } from '$lib/stores/workspaces'
  import { fetchOverdueCount } from '$lib/stores/tasks'

  let { children } = $props()

  $effect(() => {
    fetchSession()
  })

  $effect(() => {
    fetchWorkspaces()
    fetchOverdueCount()
  })
</script>

<div class="app-shell">
  <!-- Top bar -->
  <header class="topbar">
    <span class="brand">Saha</span>
    <WorkspaceFilter />
    <DeadlineBadge />
    <input class="search-input" placeholder="Search..." disabled />
  </header>

  <!-- Sidebar -->
  <nav class="sidebar">
    <a href="/home" class="nav-item" aria-current={$page.url.pathname === '/home' ? 'page' : undefined}>
      <span class="nav-icon">🏠</span>
      <span class="nav-label">Home</span>
    </a>
    <a href="/velocity" class="nav-item" aria-current={$page.url.pathname === '/velocity' ? 'page' : undefined}>
      <span class="nav-icon">📊</span>
      <span class="nav-label">Velocity</span>
    </a>
    <a href="/projects" class="nav-item" aria-current={$page.url.pathname === '/projects' ? 'page' : undefined}>
      <span class="nav-icon">📋</span>
      <span class="nav-label">Projects</span>
    </a>
  </nav>

  <!-- Main content -->
  <main class="content">
    {#if getAuth().isLoading}
      <p class="loading">Loading...</p>
    {:else if !isAuthenticated()}
      <p class="loading">Redirecting to login...</p>
    {:else}
      {@render children()}
    {/if}
  </main>
</div>

<style>
  .app-shell {
    display: grid;
    grid-template-columns: var(--sidebar-width) 1fr;
    grid-template-rows: var(--topbar-height) 1fr;
    min-height: 100vh;
  }

  /* Top bar spans full width */
  .topbar {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0 1rem;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-color);
  }

  .brand {
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--brand-color);
  }

  .search-input {
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    padding: 0.25rem 0.75rem;
    font-size: 0.875rem;
    color: var(--muted-text);
    background: var(--bg-color);
  }

  /* Sidebar */
  .sidebar {
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border-color);
    padding: 0.75rem 0.375rem;
    gap: 0.375rem;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    border-radius: 0.375rem;
    text-decoration: none;
    color: var(--text-color);
    font-size: 0.875rem;
    white-space: nowrap;
    transition: background 0.15s;
  }

  .nav-item:hover {
    background: var(--hover-bg);
  }

  .nav-item[aria-current="page"] {
    background: var(--hover-bg);
    font-weight: 600;
  }

  .nav-icon {
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .nav-label {
    overflow: hidden;
  }

  /* Content area */
  .content {
    padding: 1.5rem;
    overflow: auto;
  }

  .loading {
    color: var(--muted-text);
  }

  /* Responsive: icon-only sidebar on mobile */
  @media (max-width: 768px) {
    :root {
      --sidebar-width: 3rem;
    }

    .nav-label {
      display: none;
    }

    .nav-item {
      justify-content: center;
      padding: 0.5rem;
    }
  }
</style>
