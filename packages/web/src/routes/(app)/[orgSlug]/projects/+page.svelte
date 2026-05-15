<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { getOrganization } from '$lib/stores/organization.svelte'
  import { trpc } from '$lib/trpc'
  import { Layers, Plus, Folder, ChevronRight } from 'lucide-svelte'

  let { data } = $props()
  let orgSlug = $derived(data.orgSlug)
  let projects = $state<any[]>([])
  let isLoading = $state(true)
  let orgName = $state('')

  onMount(async () => {
    const orgs = getOrganization().organizations
    const org = orgs.find(o => o.slug === orgSlug)
    
    if (org) {
      orgName = org.name
      try {
        projects = await trpc.project.listByOrg.query({ organizationId: org.id }) as any[]
      } catch (err) {
        console.error('Failed to fetch projects:', err)
        projects = []
      }
    }
    isLoading = false
  })
</script>

<div class="projects-page">
  <header class="page-header">
    <div class="header-main">
      <h1 class="page-title">Projects</h1>
      <span class="page-subtitle">{orgName || orgSlug}</span>
    </div>
    <button class="new-project-btn">
      <Plus size={16} />
      <span>New Project</span>
    </button>
  </header>

  <div class="page-content">
    {#if isLoading}
      <div class="empty-state">
        <div class="spinner"></div>
        <p>Loading projects...</p>
      </div>
    {:else if projects.length === 0}
      <div class="empty-state">
        <Folder size={48} class="empty-icon" />
        <h2>No projects yet</h2>
        <p>Create your first project to organize tasks.</p>
      </div>
    {:else}
      <div class="projects-grid">
        {#each projects as project (project.id)}
          <a href={`/${orgSlug}/project/${project.id}/kanban`} class="project-card">
            <div class="card-header">
              <div class="project-color" style="background-color: {project.color || '#6366f1'}"></div>
              <h3 class="project-name">{project.name}</h3>
            </div>
            {#if project.description}
              <p class="project-desc">{project.description}</p>
            {/if}
            <div class="card-footer">
              <span class="card-link">
                <span>Open board</span>
                <ChevronRight size={14} />
              </span>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .projects-page {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 2rem;
    padding-top: 1.5rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-main);
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-main);
    line-height: 1.2;
  }

  .page-subtitle {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .new-project-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background-color: var(--brand-primary);
    color: white;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 0.875rem;
    transition: background-color 0.15s;
  }

  .new-project-btn:hover {
    background-color: var(--brand-hover);
  }

  .page-content {
    flex: 1;
    overflow-y: auto;
  }

  .projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }

  .project-card {
    background-color: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    padding: 1.25rem;
    transition: border-color 0.15s, box-shadow 0.15s;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    text-decoration: none;
  }

  .project-card:hover {
    border-color: var(--brand-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .project-color {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .project-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-main);
  }

  .project-desc {
    font-size: 0.8125rem;
    color: var(--text-muted);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-footer {
    margin-top: auto;
    padding-top: 0.5rem;
  }

  .card-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--brand-primary);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 4rem 2rem;
    color: var(--text-muted);
    text-align: center;
  }

  .empty-icon {
    opacity: 0.3;
    margin-bottom: 0.5rem;
    color: var(--text-muted);
  }

  .empty-state h2 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-main);
  }

  .empty-state p {
    font-size: 0.875rem;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border-main);
    border-top-color: var(--brand-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>