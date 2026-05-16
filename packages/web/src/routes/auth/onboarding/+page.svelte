<script lang="ts">
  import { goto } from '$app/navigation'
  import { auth } from '$lib/stores/auth.svelte'
  import { toast } from '$lib/stores/toast.svelte'
  import { trpc } from '$lib/trpc'

  // Form state for company creation
  let showCompanyForm = $state(false)
  let orgName = $state('')
  let workspaceName = $state('Main')
  let isCreating = $state(false)
  let initialized = $state(false)

  // Check session on mount
  $effect(() => {
    if (initialized) return
    initialized = true

    if (!auth.user) {
      goto('/auth/login')
    }
  })

  async function createPersonalWorkspace() {
    if (!auth.workosUserId) {
      toast.show('Session expired. Please sign in again.', 'error')
      return
    }
    isCreating = true
    try {
      await trpc.auth.createPersonalOrg.mutate({ workosUserId: auth.workosUserId })
      toast.show('Personal workspace created!', 'success')
      goto('/')
    } catch (error) {
      console.error('Failed to create personal workspace:', error)
      toast.show('Failed to create workspace. Please try again.', 'error')
      isCreating = false
    }
  }

  async function createCompanyOrganization() {
    if (!auth.workosUserId || !orgName.trim() || !workspaceName.trim()) {
      toast.show('Please fill in all fields.', 'error')
      return
    }
    isCreating = true
    try {
      await trpc.auth.createCompanyOrg.mutate({
        workosUserId: auth.workosUserId,
        orgName: orgName.trim(),
        workspaceName: workspaceName.trim()
      })
      toast.show('Organization created!', 'success')
      goto('/')
    } catch (error) {
      console.error('Failed to create organization:', error)
      toast.show('Failed to create organization. Please try again.', 'error')
      isCreating = false
    }
  }
</script>

<div class="onboarding-page">
  <main class="onboarding-card">
    <h1 class="brand-title">Saha</h1>
    <h2 class="page-title">Set up your workspace</h2>
    <p class="subtitle">How will you use Saha?</p>
    
    {#if !showCompanyForm}
      <div class="options">
        <button
          class="option-card"
          onclick={createPersonalWorkspace}
          disabled={isCreating}
        >
          <div class="option-icon">👤</div>
          <h3>Personal Workspace</h3>
          <p>For freelancers and solo work</p>
        </button>
        
        <button
          class="option-card"
          onclick={() => showCompanyForm = true}
          disabled={isCreating}
        >
          <div class="option-icon">🏢</div>
          <h3>Company Workspace</h3>
          <p>For teams and organizations</p>
        </button>
      </div>
      
      <div class="divider">
        <span>or</span>
      </div>
      
      <div class="invite-section">
        <p class="muted-text">Expecting an invite from your team?</p>
        <p class="info-text">Contact your administrator for an invite link. This feature is coming soon.</p>
      </div>
    {:else}
      <div class="company-form">
        <button class="back-link" onclick={() => showCompanyForm = false}>
          ← Back
        </button>
        
        <h3>Create your organization</h3>
        
        <div class="form-group">
          <label for="orgName">Organization Name</label>
          <input
            type="text"
            id="orgName"
            bind:value={orgName}
            placeholder="Acme Inc."
            disabled={isCreating}
            aria-describedby="orgNameHint"
            autocomplete="organization"
          />
          <span id="orgNameHint" class="hint">Enter your company or team name</span>
        </div>

        <div class="form-group">
          <label for="workspaceName">First Workspace Name</label>
          <input
            type="text"
            id="workspaceName"
            bind:value={workspaceName}
            placeholder="Main"
            disabled={isCreating}
            aria-describedby="workspaceNameHint"
            autocomplete="off"
          />
          <span id="workspaceNameHint" class="hint">Give your first workspace a name</span>
        </div>
        
        <button
          class="submit-btn"
          onclick={createCompanyOrganization}
          disabled={isCreating || !orgName.trim() || !workspaceName.trim()}
        >
          {isCreating ? 'Creating...' : 'Create Organization'}
        </button>
      </div>
    {/if}
  </main>
</div>

<style>
  .onboarding-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--bg-app);
  }
  
  .onboarding-card {
    text-align: center;
    padding: 3rem 2rem;
    max-width: 32rem;
    width: 100%;
  }
  
  .brand-title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--brand-primary);
    margin-bottom: 0.5rem;
  }
  
  .page-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-main);
    margin-bottom: 0.25rem;
  }
  
  .subtitle {
    color: var(--text-muted);
    margin-bottom: 2rem;
  }
  
  .options {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .option-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .option-card:hover:not(:disabled) {
    background: var(--bg-surface-hover);
    border-color: var(--brand-primary);
  }
  
  .option-card:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .option-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }
  
  .option-card h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-main);
    margin-bottom: 0.25rem;
  }
  
  .option-card p {
    color: var(--text-muted);
    font-size: 0.875rem;
  }
  
  .divider {
    position: relative;
    text-align: center;
    margin: 1.5rem 0;
  }
  
  .divider::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 1px;
    background: var(--border-main);
  }
  
  .divider span {
    background: var(--bg-app);
    padding: 0 1rem;
    color: var(--text-muted);
    position: relative;
    font-size: 0.875rem;
  }
  
  .invite-section {
    text-align: center;
  }
  
  .muted-text {
    color: var(--text-muted);
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }
  
  .info-text {
    color: var(--text-muted);
    font-size: 0.75rem;
    opacity: 0.8;
  }
  
  .company-form {
    text-align: left;
  }
  
  .back-link {
    background: none;
    color: var(--text-muted);
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
    cursor: pointer;
  }
  
  .back-link:hover {
    color: var(--text-main);
  }
  
  .company-form h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-main);
    margin-bottom: 1.5rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-main);
    margin-bottom: 0.5rem;
  }
  
  .form-group input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    color: var(--text-main);
    font-size: 1rem;
  }
  
  .form-group input:focus {
    border-color: var(--brand-primary);
    outline: none;
  }
  
  .form-group input:disabled {
    opacity: 0.6;
  }
  
  .submit-btn {
    width: 100%;
    padding: 0.875rem 1.5rem;
    background: var(--brand-primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease;
    margin-top: 0.5rem;
  }
  
  .submit-btn:hover:not(:disabled) {
    background: var(--brand-hover);
  }
  
  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>