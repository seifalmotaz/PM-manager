<script lang="ts">
  import { auth } from '$lib/stores/auth.svelte'

  $effect(() => {
    auth.logout()
  })
</script>

<div class="logout-page">
  <p>Logging out...</p>
</div>

<style>
  .logout-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    color: var(--text-muted);
  }
</style>