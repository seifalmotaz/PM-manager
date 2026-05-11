<script>
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { PUBLIC_API_URL } from '$env/static/public'

  let error = $state('')
  let loading = $state(true)

  onMount(async () => {
    const code = $page.url.searchParams.get('code')

    if (!code) {
      error = 'No authentication code provided.'
      loading = false
      return
    }

    try {
      // Call the API callback endpoint with the OAuth code
      const response = await fetch(`${PUBLIC_API_URL}/auth/callback?code=${encodeURIComponent(code)}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        error = data.error || 'Authentication failed. Please try again.'
        loading = false
        return
      }

      // Redirect to /home on success
      await goto('/home')
    } catch (e) {
      error = 'Something went wrong. Please try again.'
      loading = false
    }
  })
</script>

<svelte:head>
  <title>Saha — Signing In</title>
</svelte:head>

<div class="callback-page">
  <div class="callback-card">
    {#if loading}
      <h1 class="callback-title">Saha</h1>
      <p class="callback-status">Signing you in...</p>
    {:else if error}
      <h1 class="callback-title">Oops</h1>
      <p class="callback-error">{error}</p>
      <a href="/auth/login" class="callback-link">Try again</a>
    {/if}
  </div>
</div>

<style>
  .callback-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #f8f9fa;
  }

  .callback-card {
    text-align: center;
    background: white;
    padding: 48px 40px;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    max-width: 400px;
    width: 100%;
  }

  .callback-title {
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 16px 0;
  }

  .callback-status {
    color: #6c757d;
    font-size: 16px;
    margin: 0;
  }

  .callback-error {
    color: #e03131;
    font-size: 16px;
    margin: 0 0 20px 0;
  }

  .callback-link {
    color: #4c6ef5;
    text-decoration: none;
    font-weight: 600;
  }

  .callback-link:hover {
    text-decoration: underline;
  }
</style>