<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { getOrganization, loadOrganizations } from '$lib/stores/organization.svelte'
  import { trpc } from '$lib/trpc'
  import { Layers, Plus, Folder, ChevronRight } from 'lucide-svelte'

  let { data } = $props()
  let orgSlug = $derived(data.orgSlug)
  let projects = $state<any[]>([])
  let isLoading = $state(true)
  let orgName = $state('')
  let showCreateModal = $state(false)
  let newProjectName = $state('')
  let newProjectDesc = $state('')
  let isCreating = $state(false)

  onMount(async () => {
    // Load orgs if not present (page refresh scenario)
    let orgs = getOrganization().organizations
    if (orgs.length === 0) {
      orgs = await loadOrganizations()
    }

    // Also get workspace ID for project creation
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

  async function handleCreateProject() {
    if (!newProjectName.trim()) return
    isCreating = true
    try {
      // Find the personal workspace for this user
      const workspaces = await trpc.workspace.list.query() as any[]
      const personalWs = workspaces.find((w: any) => w.type === 'personal')
      if (!personalWs) {
        console.error('No personal workspace found')
        return
      }

      const result = await trpc.project.create.mutate({
        workspaceId: personalWs.id,
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || undefined,
      })
      projects = [...projects, result]
      newProjectName = ''
      newProjectDesc = ''
      showCreateModal = false
    } catch (err) {
      console.error('Failed to create project:', err)
    } finally {
      isCreating = false
    }
  }

  function openCreateModal() {
    showCreateModal = true
  }
</script>

<div class="projects-page">
  <header class="page-header">
    <div class="header-main">
      <h1 class="page-title">Projects</h1>
      <span class="page-subtitle">{orgName || orgSlug}</span>
    </div>
    <button class="new-project-btn" onclick={openCreateModal}>
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

<!-- Create Project Modal -->
{#if showCreateModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={() => showCreateModal = false}>
    <div class="modal" onclick={e => e.stopPropagation()}>
      <h2>Create Project</h2>
      <div class="modal-body">
        <label class="field-label">
          Name
          <input type="text" bind:value={newProjectName} placeholder="Project name" class="field-input" />
        </label>
        <label class="field-label">
          Description
          <textarea bind:value={newProjectDesc} placeholder="Optional description" class="field-textarea" />
        </label>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" onclick={() => showCreateModal = false}>Cancel</button>
        <button class="btn-primary" onclick={handleCreateProject} disabled={isCreating || !newProjectName.trim()}>
          {isCreating ? 'Creating...' : 'Create Project'}
        </button>
      </div>
    </div>
  </div>
{/if}

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

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 15vh;
    z-index: 999;
  }

  .modal {
    width: 100%;
    max-width: 420px;
    background: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-lg);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    animation: slideUp 0.15s ease-out;
  }

  @keyframes slideUp {
    from { transform: translateY(10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .modal h2 {
    font-size: 1rem;
    font-weight: 600;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-main);
    color: var(--text-main);
    margin: 0;
  }

  .modal-body {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .field-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-main);
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .field-input,
  .field-textarea {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    background: var(--bg-surface);
    color: var(--text-main);
    outline: none;
    transition: border-color 0.15s;
    font-family: inherit;
  }

  .field-input:focus,
  .field-textarea:focus {
    border-color: var(--brand-primary);
  }

  .field-textarea {
    min-height: 60px;
    resize: vertical;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--border-main);
  }

  .btn-cancel {
    padding: 0.5rem 1rem;
    font-size: 0.8125rem;
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--text-main);
    cursor: pointer;
  }

  .btn-cancel:hover {
    background: var(--bg-surface-hover);
  }

  .btn-primary {
    padding: 0.5rem 1rem;
    font-size: 0.8125rem;
    font-weight: 500;
    border: none;
    border-radius: var(--radius-md);
    background: var(--brand-primary);
    color: white;
    cursor: pointer;
  }

  .btn-primary:hover {
    opacity: 0.9;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>