<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { getOrganization, loadActiveOrganization } from '$lib/stores/organization.svelte'
  
  onMount(async () => {
    await loadActiveOrganization()
    const org = getOrganization()
    
    if (org.activeOrganization) {
      // Redirect to org home
      goto(`/${org.activeOrganization.slug}`)
    } else {
      // No org — stay on root page (L1 will handle org selection/creation)
    }
  })
</script>

<div class="root-page">
  <h1>Welcome to Saha</h1>
  <p>Select an organization to continue...</p>
  <p class="l1-placeholder">L1 will implement organization selection here</p>
</div>

<style>
  .root-page {
    padding: 2rem;
    text-align: center;
    margin-top: 4rem;
  }
  
  .l1-placeholder {
    color: var(--text-muted);
    font-style: italic;
    margin-top: 2rem;
  }
</style>