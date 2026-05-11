<script>
  import { page } from '$app/stores'

  const navItems = [
    { label: 'Home',     icon: '🏠', href: '/home' },
    { label: 'Velocity', icon: '📊', href: '/velocity' },
    { label: 'Projects', icon: '📋', href: '/projects' },
  ]
</script>

<div class="app-shell">
  <!-- ─── Sidebar ─────────────────────────────────── -->
  <aside class="sidebar">
    <div class="sidebar-logo" aria-label="Saha">S</div>
    <nav class="sidebar-nav" aria-label="Main navigation">
      {#each navItems as item}
        <a
          href={item.href}
          class="sidebar-link"
          class:active={$page.url.pathname === item.href || $page.url.pathname.startsWith(item.href + '/')}
          title={item.label}
          aria-label={item.label}
        >
          <span class="sidebar-icon" aria-hidden="true">{item.icon}</span>
          <span class="sidebar-label">{item.label}</span>
        </a>
      {/each}
    </nav>

    <div class="sidebar-spacer"></div>

    <!-- User section placeholder -->
    <div class="sidebar-user">
      <span class="sidebar-user-icon" aria-hidden="true">👤</span>
    </div>
  </aside>

  <!-- ─── Main Area ───────────────────────────────── -->
  <div class="main-area">
    <!-- Top bar -->
    <header class="topbar">
      <div class="topbar-left">
        <span class="topbar-brand">Saha</span>
        <button class="topbar-filter" disabled title="Workspace filter — coming in Phase 2">
          All workspaces ▾
        </button>
      </div>

      <div class="topbar-right">
        <!-- Placeholder slots for Phase 2+ features -->
        <div class="topbar-slot" title="Notifications — coming soon"></div>
        <div class="topbar-slot" title="Search — coming soon"></div>
        <a href="/auth/logout" class="topbar-slot topbar-logout" title="Sign out">🚪</a>
      </div>
    </header>

    <!-- Page content -->
    <main class="content">
      <slot />
    </main>
  </div>
</div>

<style>
  .app-shell {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  /* ─── Sidebar ──────────────────────────────────── */
  .sidebar {
    width: var(--sidebar-width);
    background: var(--color-sidebar);
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 12px;
    flex-shrink: 0;
    user-select: none;
  }

  .sidebar-logo {
    width: 40px;
    height: 40px;
    border-radius: var(--radius);
    background: var(--color-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 20px;
    margin-bottom: 24px;
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    padding: 0 6px;
  }

  .sidebar-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 4px;
    border-radius: var(--radius);
    text-decoration: none;
    color: var(--color-text-muted);
    transition: background var(--transition-fast), color var(--transition-fast);
    font-size: 11px;
    gap: 2px;
    line-height: 1.2;
  }

  .sidebar-link:hover {
    background: var(--color-hover);
    color: var(--color-text);
  }

  .sidebar-link.active {
    background: var(--color-primary-light);
    color: var(--color-primary);
  }

  .sidebar-icon {
    font-size: 20px;
    line-height: 1;
  }

  .sidebar-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 56px;
  }

  .sidebar-spacer {
    flex: 1;
  }

  .sidebar-user {
    padding: 12px 0;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .sidebar-user-icon {
    font-size: 20px;
    opacity: 0.5;
  }

  /* ─── Main Area ─────────────────────────────────── */
  .main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  /* ─── Top Bar ────────────────────────────────────── */
  .topbar {
    height: var(--topbar-height);
    background: var(--color-topbar);
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    flex-shrink: 0;
    box-shadow: var(--shadow-sm);
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .topbar-brand {
    font-weight: 700;
    font-size: 18px;
    color: var(--color-text);
    letter-spacing: -0.3px;
  }

  .topbar-filter {
    background: var(--color-sidebar);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: 4px 14px;
    font-size: 13px;
    color: var(--color-text-muted);
    cursor: not-allowed;
    transition: background var(--transition-fast);
  }

  .topbar-filter:hover {
    background: var(--color-hover);
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .topbar-slot {
    width: 34px;
    height: 34px;
    border-radius: var(--radius-sm);
    background: var(--color-sidebar);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: var(--color-text-muted);
    transition: background var(--transition-fast), color var(--transition-fast);
  }

  .topbar-slot:hover {
    background: var(--color-hover);
    color: var(--color-text);
  }

  /* ─── Content ────────────────────────────────────── */
  .content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 32px;
    background: var(--color-bg);
  }

  /* ─── Responsive: Tablet ────────────────────────── */
  @media (max-width: 768px) {
    .sidebar {
      width: 56px;
    }

    .sidebar-label {
      display: none;
    }

    .topbar-brand {
      display: none;
    }

    .content {
      padding: 20px;
    }
  }

  /* ─── Responsive: Mobile ────────────────────────── */
  @media (max-width: 480px) {
    .sidebar {
      width: 48px;
    }

    .sidebar-link {
      padding: 6px 2px;
    }

    .sidebar-icon {
      font-size: 18px;
    }

    .topbar {
      padding: 0 10px;
    }

    .topbar-filter {
      padding: 4px 8px;
      font-size: 12px;
    }

    .content {
      padding: 12px;
    }
  }
</style>