<script lang="ts">
  import { trpc } from '$lib/trpc'
  import { Plus, Hash, FolderKanban } from 'lucide-svelte'
  import { clsx } from 'clsx'

  let projectsByWorkspace = $state<Record<string, { workspace: { id: string; name: string; slug: string; type: string; memberCount: number }; projects: any[] }>>({})
  let isLoading = $state(true)
  let showCreateForm = $state(false)
  
  let newProjectName = $state('')
  let newProjectDesc = $state('')
  let newProjectColor = $state('#db4c3f')
  let selectedWorkspaceId = $state('')
  let isCreating = $state(false)

  async function loadProjects() {
    isLoading = true
    try {
      const projects = await trpc.project.list.query({})
      const wsList = await trpc.workspace.list.query()

      const grouped: Record<string, any> = {}
      for (const ws of wsList as any[]) {
        grouped[ws.id] = { workspace: ws, projects: [] }
      }
      for (const proj of projects as any[]) {
        if (grouped[proj.workspaceId]) {
          grouped[proj.workspaceId].projects.push(proj)
        }
      }
      projectsByWorkspace = grouped

      if (selectedWorkspaceId === '' && wsList.length > 0) {
        selectedWorkspaceId = (wsList[0] as any).id
      }
    } catch (err) {
      console.error('Failed to load projects:', err)
    } finally {
      isLoading = false
    }
  }

  $effect(() => {
    loadProjects()
  })

  async function handleCreate() {
    if (!newProjectName.trim() || !selectedWorkspaceId) return
    isCreating = true
    try {
      await trpc.project.create.mutate({
        workspaceId: selectedWorkspaceId,
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || undefined,
        color: newProjectColor,
      })
      newProjectName = ''
      newProjectDesc = ''
      showCreateForm = false
      await loadProjects()
    } catch (err) {
      console.error('Failed to create project:', err)
    } finally {
      isCreating = false
    }
  }
</script>

<div class="projects-page">
  <div class="centered-well">
    <header class="page-header">
      <div class="header-main">
        <h1 class="page-title">Projects</h1>
      </div>
      
      <div class="header-actions">
        <button class="add-project-btn" onclick={() => (showCreateForm = !showCreateForm)}>
          <Plus size={16} />
          <span>{showCreateForm ? 'Cancel' : 'Add Project'}</span>
        </button>
      </div>
    </header>

    {#if showCreateForm}
      <div class="create-form-container">
        <div class="form-row">
          <select bind:value={selectedWorkspaceId} required class="td-input">
            <option value="">Select workspace...</option>
            {#each Object.values(projectsByWorkspace) as { workspace } (workspace.id)}
              <option value={workspace.id}>{workspace.name}</option>
            {/each}
          </select>
          <input type="text" class="td-input flex-1" bind:value={newProjectName} placeholder="Project name" required />
          <input type="color" class="color-picker" bind:value={newProjectColor} title="Project Color" />
        </div>
        <div class="form-row">
          <input type="text" class="td-input flex-1" bind:value={newProjectDesc} placeholder="Description (optional)" />
          <button class="submit-btn" onclick={handleCreate} disabled={isCreating || !newProjectName.trim() || !selectedWorkspaceId}>
            {isCreating ? 'Creating...' : 'Add Project'}
          </button>
        </div>
      </div>
    {/if}

    <div class="page-content">
      {#if isLoading}
        <div class="status-container">
          <div class="spinner"></div>
          <p>Loading projects...</p>
        </div>
      {:else}
        {#each Object.values(projectsByWorkspace) as { workspace, projects } (workspace.id)}
          <section class="workspace-section">
            <h2 class="workspace-title">{workspace.name}</h2>
            <div class="project-list">
              {#each projects as project (project.id)}
                <a href="/project/{project.id}/kanban" class="project-list-item">
                  <div class="project-icon" style:color={project.color || '#db4c3f'}>
                    <Hash size={18} />
                  </div>
                  <div class="project-details">
                    <span class="project-name">{project.name}</span>
                    {#if project.description}
                      <span class="project-desc">{project.description}</span>
                    {/if}
                  </div>
                </a>
              {/each}
              {#if projects.length === 0}
                <div class="empty-state">
                  <FolderKanban size={24} class="empty-icon" />
                  <p>No projects in this workspace</p>
                </div>
              {/if}
            </div>
          </section>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .projects-page {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding-top: 1.5rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 2.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-main);
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-main);
    line-height: 1.2;
    margin: 0;
  }

  .add-project-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--brand-primary);
    font-weight: 600;
    font-size: 0.875rem;
    padding: 0.5rem 0;
    transition: color 0.15s;
  }

  .add-project-btn:hover {
    color: var(--brand-hover);
  }

  .create-form-container {
    background-color: var(--bg-surface);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
    margin-bottom: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .flex-1 {
    flex: 1;
  }

  .td-input {
    background-color: var(--bg-app);
    border: 1px solid var(--border-main);
    color: var(--text-main);
    border-radius: var(--radius-md);
    padding: 0.625rem 0.75rem;
    font-size: 0.875rem;
    transition: border-color 0.15s;
  }

  .td-input:focus {
    border-color: var(--brand-primary);
    outline: none;
  }

  .td-input::placeholder {
    color: var(--text-muted);
  }

  .color-picker {
    width: 36px;
    height: 36px;
    padding: 2px;
    background-color: var(--bg-app);
    border: 1px solid var(--border-main);
    border-radius: var(--radius-md);
    cursor: pointer;
  }

  .submit-btn {
    background-color: var(--brand-primary);
    color: white;
    font-weight: 600;
    font-size: 0.875rem;
    padding: 0.625rem 1.25rem;
    border-radius: var(--radius-md);
    transition: background-color 0.15s;
  }

  .submit-btn:hover:not(:disabled) {
    background-color: var(--brand-hover);
  }

  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .page-content {
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
    padding-bottom: 3rem;
  }

  .workspace-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .workspace-title {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-main);
    margin: 0;
    padding-left: 0.25rem;
  }

  .project-list {
    display: flex;
    flex-direction: column;
  }

  .project-list-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 0.5rem;
    border-bottom: 1px solid var(--border-main);
    text-decoration: none;
    transition: background-color 0.1s;
    border-radius: var(--radius-sm);
  }

  .project-list-item:hover {
    background-color: var(--bg-surface-hover);
  }

  .project-list-item:last-child {
    border-bottom: none;
  }

  .project-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .project-details {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .project-name {
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--text-main);
  }

  .project-desc {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .status-container, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: var(--text-muted);
    padding: 2rem 0;
  }

  .empty-icon {
    opacity: 0.5;
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