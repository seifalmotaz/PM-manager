<script lang="ts">
  let { data } = $props()
</script>

<div class="placeholder-page">
  <div class="centered-well">
    <header class="page-header">
      <h1 class="page-title">Velocity</h1>
      <span class="page-subtitle">{data.orgSlug}</span>
    </header>

    <div class="content-card">
      <div class="coming-soon-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      </div>
      <h2 class="feature-title">Velocity Analytics</h2>
      <p class="feature-description">Team velocity tracking, burndown charts, and sprint performance metrics are coming in a future update.</p>
    </div>
  </div>
</div>

<style>
  .placeholder-page {
    height: 100%;
    padding: 2rem;
    padding-top: 1.5rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 2.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-main);
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-main);
  }

  .page-subtitle {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .centered-well {
    max-width: 600px;
    margin: 0 auto;
  }

  .content-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 3rem 2rem;
    background-color: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-lg);
  }

  .coming-soon-icon {
    color: var(--text-muted);
    opacity: 0.5;
    margin-bottom: 1.5rem;
  }

  .feature-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-main);
    margin-bottom: 0.75rem;
  }

  .feature-description {
    font-size: 0.9375rem;
    color: var(--text-muted);
    line-height: 1.6;
    max-width: 400px;
  }
</style>