<svelte:head>
  <title>Velocity — Saha</title>
</svelte:head>

<div class="page-velocity">
  <div class="empty-state">
    <span class="empty-icon">📊</span>
    <h2>Velocity</h2>
    <p>Track sprint velocity with live, snapshot, and custom date range views.</p>
    <p class="muted">Coming in Phase 4.</p>
  </div>
</div>

<style>
  .page-velocity {
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