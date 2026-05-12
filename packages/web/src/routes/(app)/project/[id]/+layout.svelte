<script lang="ts">
  import { page } from '$app/stores'
  import { trpc } from '$lib/trpc'

  let project = $state<any>(null)
  let isLoading = $state(true)

  $effect(() => {
    const id = $page.params.id
    async function load() {
      isLoading = true
      try {
        project = await trpc.project.byId.query({ id })
      } catch (err) {
        console.error('Failed to load project:', err)
        project = null
      } finally {
        isLoading = false
      }
    }
    load()
  })

  let { children } = $props()
</script>

{#if isLoading}
  <p class="loading">Loading project...</p>
{:else if !project}
  <p class="error">Project not found</p>
{:else}
  <div class="project-layout">
    <header class="project-header">
      <a href="/projects" class="back-link">&larr; Projects</a>
      <h1 class="project-title">{project.name}</h1>
      {#if project.description}
        <p class="project-desc">{project.description}</p>
      {/if}
    </header>

    <nav class="project-tabs">
      <a
        href="/project/{project.id}/kanban"
        class="tab"
        aria-current={$page.url.pathname.includes('/kanban') ? 'page' : undefined}
      >
        Kanban
      </a>
      <a
        href="/project/{project.id}/sprints"
        class="tab"
        aria-current={$page.url.pathname.includes('/sprints') ? 'page' : undefined}
      >
        Sprints
      </a>
    </nav>

    <main class="project-content">
      {@render children()}
    </main>
  </div>
{/if}

<style>
  .project-layout {
    padding: 0 1rem;
  }
  .project-header {
    margin-bottom: 1rem;
  }
  .back-link {
    font-size: 0.875rem;
    color: var(--color-primary, #6366f1);
    text-decoration: none;
  }
  .project-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0.25rem 0;
  }
  .project-desc {
    color: var(--color-muted, #718096);
    font-size: 0.875rem;
  }
  .project-tabs {
    display: flex;
    gap: 0;
    border-bottom: 2px solid var(--color-border, #e2e8f0);
    margin-bottom: 1rem;
  }
  .tab {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    color: var(--color-muted, #718096);
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all 0.15s;
  }
  .tab[aria-current="page"] {
    color: var(--color-primary, #6366f1);
    border-bottom-color: var(--color-primary, #6366f1);
  }
  .loading, .error {
    padding: 2rem 1rem;
    color: var(--color-muted, #718096);
  }
</style>
