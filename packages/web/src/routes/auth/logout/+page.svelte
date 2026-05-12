<script lang="ts">
  import { logout } from '$lib/stores/auth.svelte'

  $effect(() => {
    logout()
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
    color: var(--muted-text);
  }
</style>
