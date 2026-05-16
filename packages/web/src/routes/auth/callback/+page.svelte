<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { auth } from '$lib/stores/auth.svelte'
  import { toast } from '$lib/stores/toast.svelte'
  
  $effect(() => {
    async function processCallback() {
      const code = $page.url.searchParams.get('code')
      if (!code) {
        goto('/auth/login')
        return
      }
      
      try {
        const { isNew, organizations } = await auth.handleCallback(code)
        
        // User needs onboarding if:
        // 1. They're new, OR
        // 2. They have no organizations in WorkOS
        if (isNew || organizations.length === 0) {
          goto('/auth/onboarding')
        } else {
          // Returning user with existing org(s)
          goto('/')
        }
      } catch (error) {
        console.error('Auth callback failed:', error)
        toast.show('Unable to complete sign in. Please try again.', 'error')
        goto('/auth/login?error=auth_failed')
      }
    }
    
    processCallback()
  })
</script>

<div class="callback-page">
  <p>Completing sign in...</p>
</div>

<style>
  .callback-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    color: var(--text-muted);
  }
</style>