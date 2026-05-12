<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { handleCallback } from '$lib/stores/auth.svelte'

  $effect(() => {
    async function processCallback() {
      const code = $page.url.searchParams.get('code')
      if (!code) {
        goto('/auth/login')
        return
      }
      try {
        await handleCallback(code)
        goto('/home')
      } catch {
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
    color: var(--muted-text);
  }
</style>
