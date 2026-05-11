<script>
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { PUBLIC_API_URL } from '$env/static/public'

  onMount(async () => {
    try {
      await fetch(`${PUBLIC_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (e) {
      // Even if fetch fails, redirect to login
    }

    await goto('/auth/login')
  })
</script>

<svelte:head>
  <title>Saha — Signing Out</title>
</svelte:head>

<div class="logout-page">
  <p>Signing you out...</p>
</div>

<style>
  .logout-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #f8f9fa;
  }
</style>