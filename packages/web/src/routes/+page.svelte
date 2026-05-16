<script lang="ts">
  import { goto } from '$app/navigation'
  import { auth } from '$lib/stores/auth.svelte'
  import { trpc } from '$lib/trpc'
  import { toast } from '$lib/stores/toast.svelte'

  let isCheckingOrg = $state(true)
  let initialized = $state(false)

  $effect(() => {
    if (initialized) return
    initialized = true

    // If no user, redirect to login
    if (!auth.user) {
      goto('/auth/login')
      return
    }

    // Check if user has organization
    const storedWorkosUserId = sessionStorage.getItem('workosUserId')
    if (!storedWorkosUserId) {
      goto('/auth/login')
      return
    }

    trpc.auth.hasOrganization.query({ workosUserId: storedWorkosUserId })
      .then((result) => {
        if (!result.hasOrg) {
          goto('/auth/onboarding')
        }
      })
      .catch((error) => {
        console.error('Failed to check organization:', error)
        // On error, stay on page and let user proceed
      })
      .finally(() => {
        isCheckingOrg = false
      })
  })
  
  async function handleLogout() {
    try {
      await auth.logout()
      toast.show('Signed out successfully', 'info')
    } catch (error) {
      console.error('Logout failed:', error)
      toast.show('Failed to sign out. Please try again.', 'error')
    }
  }
</script>

{#if isCheckingOrg || auth.isLoading}
  <div class="loading-page">
    <p>Loading...</p>
  </div>
{:else if auth.user}
  <div class="home-page">
    <main class="home-content">
      <div class="welcome-section">
        <h1 class="welcome-title">Welcome to Saha, {auth.user.name || 'there'}</h1>
        <p class="coming-soon">Coming Soon</p>
        <p class="description">
          We're building powerful project management tools for the multi-identity worker. 
          Stay tuned for Kanban boards, sprint planning, velocity tracking, capacity planning, and more.
        </p>
        
        <div class="feature-list">
          <div class="feature-item">
            <span class="feature-icon">📋</span>
            <span>Kanban boards</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🏃</span>
            <span>Sprint management</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">📊</span>
            <span>Velocity tracking</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">⏱️</span>
            <span>Timesheets</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">📄</span>
            <span>Document management</span>
          </div>
        </div>
      </div>
      
      <div class="sign-out-section">
        <button class="sign-out-btn" onclick={handleLogout}>
          Sign out
        </button>
      </div>
    </main>
  </div>
{/if}

<style>
  .loading-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--bg-app);
    color: var(--text-muted);
  }
  
  .home-page {
    min-height: 100vh;
    background: var(--bg-app);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
  
  .home-content {
    max-width: 600px;
    text-align: center;
  }
  
  .welcome-section {
    margin-bottom: 3rem;
  }
  
  .welcome-title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-main);
    margin-bottom: 0.5rem;
  }
  
  .coming-soon {
    font-size: 1rem;
    font-weight: 600;
    color: var(--brand-primary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 1rem;
  }
  
  .description {
    color: var(--text-muted);
    font-size: 1rem;
    line-height: 1.6;
    margin-bottom: 2rem;
  }
  
  .feature-list {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem 2rem;
  }
  
  .feature-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
  
  .feature-icon {
    font-size: 1.25rem;
  }
  
  .sign-out-section {
    margin-top: 2rem;
  }
  
  .sign-out-btn {
    padding: 0.75rem 2rem;
    background: transparent;
    color: var(--text-muted);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .sign-out-btn:hover {
    color: var(--text-main);
    border-color: var(--text-muted);
  }
</style>