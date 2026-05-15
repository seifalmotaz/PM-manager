<script lang="ts">
  let { data } = $props()
</script>

<div class="placeholder-page">
  <h1>{data.title}</h1>
  <p>Organization slug: {data.orgSlug}</p>
  <p class="coming-soon">L1 will implement this view</p>
</div>

<style>
  .placeholder-page {
    padding: 2rem;
  }
  
  .coming-soon {
    color: var(--text-muted);
    font-style: italic;
    margin-top: 1rem;
  }
</style>