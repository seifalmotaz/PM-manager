<script>
  import { PUBLIC_API_URL } from '$env/static/public'

  function handleLogin() {
    window.location.href = `${PUBLIC_API_URL}/auth/login`
  }
</script>

<svelte:head>
  <title>Saha — Sign In</title>
</svelte:head>

<div class="login-page">
  <div class="login-card">
    <h1 class="login-brand">Saha</h1>
    <p class="login-tagline">Project management for work across identities</p>
    <button class="login-button" on:click={handleLogin}>
      Sign in with WorkOS
    </button>
  </div>
</div>

<style>
  .login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #f8f9fa;
  }

  .login-card {
    text-align: center;
    background: white;
    padding: 48px 40px;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    max-width: 400px;
    width: 100%;
  }

  .login-brand {
    font-size: 36px;
    font-weight: 700;
    color: #212529;
    margin: 0 0 8px 0;
  }

  .login-tagline {
    color: #6c757d;
    font-size: 16px;
    margin: 0 0 32px 0;
  }

  .login-button {
    background: #4c6ef5;
    color: white;
    border: none;
    padding: 12px 32px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .login-button:hover {
    background: #3b5bdb;
  }
</style>
