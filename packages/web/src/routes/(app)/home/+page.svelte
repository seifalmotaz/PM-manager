<svelte:head>
  <title>Home — Saha</title>
</svelte:head>

<div class="page-home">
  <div class="empty-state">
    <span class="empty-icon">🏠</span>
    <h2>Welcome to Saha</h2>
    <p>Your personal workspace is ready.</p>
    <p class="muted">Phase 2 will bring workspace management, projects, and Kanban boards here.</p>
  </div>
</div>

<style>
  .page-home {
    max-width: 960px;
    margin: 0 auto;
  }

  .empty-state {
    text-align: center;
    padding: 80px 20px 60px;
  }

  .empty-icon {
    font-size: 48px;
    display: block;
    margin-bottom: 20px;
  }

  h2 {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 8px;
    color: var(--color-text);
  }

  p {
    font-size: 15px;
    color: var(--color-text-muted);
    margin-bottom: 6px;
    line-height: 1.5;
  }
</style>