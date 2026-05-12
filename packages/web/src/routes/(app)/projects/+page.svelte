<script lang="ts">
  import { workspaces, fetchWorkspaces } from '$lib/stores/workspaces'
  import { trpc } from '$lib/trpc'

  let projectsByWorkspace = $state<Record<string, { workspace: { id: string; name: string; slug: string; type: string; memberCount: number }; projects: any[] }>>({})
  let isLoading = $state(true)
  let showCreateForm = $state(false)
  let newProjectName = $state('')
  let newProjectDesc = $state('')
  let newProjectColor = $state('#6366f1')
  let selectedWorkspaceId = $state('')
  let isCreating = $state(false)

  $effect(() => {
    async function load() {
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
    load()
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
    } catch (err) {
      console.error('Failed to create project:', err)
    } finally {
      isCreating = false
    }
  }
</script>

<div class="projects-page">
  <div class="page-header">
    <h1>Projects</h1>
    <button class="btn-primary" onclick={() => (showCreateForm = !showCreateForm)}>
      {showCreateForm ? 'Cancel' : '+ Create Project'}
    </button>
  </div>

  {#if showCreateForm}
    <div class="create-form">
      <select bind:value={selectedWorkspaceId} required>
        <option value="">Select workspace...</option>
        {#each Object.values(projectsByWorkspace) as { workspace } (workspace.id)}
          <option value={workspace.id}>{workspace.name}</option>
        {/each}
      </select>
      <input type="text" bind:value={newProjectName} placeholder="Project name" required />
      <input type="text" bind:value={newProjectDesc} placeholder="Description (optional)" />
      <input type="color" bind:value={newProjectColor} />
      <button class="btn-primary" onclick={handleCreate} disabled={isCreating || !newProjectName.trim() || !selectedWorkspaceId}>
        {isCreating ? 'Creating...' : 'Create'}
      </button>
    </div>
  {/if}

  {#if isLoading}
    <p class="loading">Loading projects...</p>
  {:else}
    {#each Object.values(projectsByWorkspace) as { workspace, projects } (workspace.id)}
      <section class="workspace-group">
        <h2 class="workspace-name">{workspace.name}</h2>
        <div class="project-grid">
          {#each projects as project (project.id)}
            <a href="/project/{project.id}/kanban" class="project-card">
              <div class="project-color" style="background: {project.color || '#6366f1'}"></div>
              <div class="project-info">
                <h3 class="project-name">{project.name}</h3>
                {#if project.description}
                  <p class="project-desc">{project.description}</p>
                {/if}
              </div>
            </a>
          {/each}
          {#if projects.length === 0}
            <p class="empty-workspace">No projects yet</p>
          {/if}
        </div>
      </section>
    {/each}
  {/if}
</div>

<style>
  .projects-page {
    padding: 1rem;
  }
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }
  .page-header h1 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
  }
  .btn-primary {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    background: var(--color-primary, #3b82f6);
    color: #fff;
    transition: background 0.15s ease;
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-dark, #2563eb);
  }
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .create-form {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: flex-end;
    padding: 1rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.5rem;
    background: var(--color-surface, #fff);
  }
  .create-form select,
  .create-form input[type="text"] {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.375rem;
    font-size: 0.8125rem;
    color: var(--color-text, #1a202c);
    background: var(--color-bg, #fff);
  }
  .create-form select:focus,
  .create-form input[type="text"]:focus {
    outline: none;
    border-color: var(--color-primary, #3b82f6);
    box-shadow: 0 0 0 2px var(--color-primary-light, #eff6ff);
  }
  .create-form input[type="color"] {
    width: 36px;
    height: 36px;
    padding: 2px;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.375rem;
    cursor: pointer;
  }
  .loading {
    color: var(--color-muted, #718096);
    padding: 2rem 0;
    text-align: center;
  }
  .workspace-group {
    margin-bottom: 2rem;
  }
  .workspace-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text, #1a202c);
    margin: 0 0 0.75rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border, #e2e8f0);
  }
  .project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.75rem;
  }
  .project-card {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.5rem;
    text-decoration: none;
    color: inherit;
    background: var(--color-surface, #fff);
    transition: box-shadow 0.15s ease, border-color 0.15s ease;
  }
  .project-card:hover {
    border-color: var(--color-primary, #3b82f6);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }
  .project-color {
    width: 12px;
    min-width: 12px;
    border-radius: 999px;
    align-self: stretch;
  }
  .project-info {
    min-width: 0;
  }
  .project-name {
    font-size: 0.9375rem;
    font-weight: 600;
    margin: 0 0 0.25rem 0;
    color: var(--color-text, #1a202c);
  }
  .project-desc {
    font-size: 0.8125rem;
    color: var(--color-muted, #718096);
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .empty-workspace {
    font-size: 0.8125rem;
    color: var(--color-muted, #a0aec0);
    grid-column: 1 / -1;
    text-align: center;
    padding: 1.5rem 0;
  }
</style>
