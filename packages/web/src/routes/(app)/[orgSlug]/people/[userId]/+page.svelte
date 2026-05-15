<script lang="ts">
  let { data } = $props()
</script>

<div class="placeholder-page">
  <div class="centered-well">
    <header class="page-header">
      <h1 class="page-title">Team Member</h1>
      <span class="page-subtitle">{data.orgSlug}</span>
    </header>

    <div class="content-card">
      <div class="coming-soon-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <h2 class="feature-title">Team Directory</h2>
      <p class="feature-description">Team member profiles, workload views, and capacity management are coming in a future update.</p>
      <div class="user-id">
        <span class="badge-label">User ID:</span>
        <span class="badge-value">{data.userId}</span>
      </div>
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
    margin-bottom: 1.5rem;
  }

  .user-id {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background-color: var(--bg-surface-hover);
    border-radius: var(--radius-md);
    font-size: 0.8125rem;
    font-family: var(--font-mono);
  }

  .badge-label {
    color: var(--text-muted);
  }

  .badge-value {
    color: var(--text-main);
    font-weight: 500;
  }
</style>