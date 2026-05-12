<script lang="ts">
  import { login } from '$lib/stores/auth.svelte'
</script>

<div class="login-page">
  <main class="login-card">
    <h1 class="brand-title">Saha</h1>
    <p class="subtitle">Project management for the multi-identity worker</p>
    <button class="login-btn" onclick={login}>
      Sign in with WorkOS
    </button>
  </main>
</div>

<style>
  .login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--bg-color);
  }

  .login-card {
    text-align: center;
    padding: 3rem 2rem;
    max-width: 24rem;
    width: 100%;
  }

  .brand-title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--brand-color);
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: var(--muted-text);
    margin-bottom: 2rem;
  }

  .login-btn {
    background: var(--brand-color);
    color: white;
    border: none;
    border-radius: 0.5rem;
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    transition: opacity 0.15s;
  }

  .login-btn:hover {
    opacity: 0.9;
  }
</style>
