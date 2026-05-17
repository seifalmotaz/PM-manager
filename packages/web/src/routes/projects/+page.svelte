<script lang="ts">
	import { goto } from '$app/navigation'
	import { Plus } from 'lucide-svelte'
	import { project, type ProjectWithWorkspace } from '$lib/stores/project.svelte'
	import { workspace } from '$lib/stores/workspace.svelte'
	import { organization } from '$lib/stores/organization.svelte'
	import { auth } from '$lib/stores/auth.svelte'
	import ProjectCard from '$lib/components/projects/ProjectCard.svelte'
	import CreateProjectModal from '$lib/components/projects/CreateProjectModal.svelte'
	import EditProjectModal from '$lib/components/projects/EditProjectModal.svelte'

	let activeOrg = $derived(organization.activeOrganization)
	let isAdmin = $derived(activeOrg ? organization.isOrgAdmin(activeOrg.id) : false)

	let groupedProjects = $derived.by(() => {
		const groups = new Map<string, ProjectWithWorkspace[]>()
		for (const p of project.projects) {
			const ws = workspace.workspaces.find(w => w.id === p.workspaceId)
			const wsName = ws?.name || 'Other'
			const enriched = { ...p, workspaceName: wsName }
			if (!groups.has(wsName)) groups.set(wsName, [])
			groups.get(wsName)!.push(enriched)
		}
		return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))
	})

	let shouldLoad = $derived.by(() => {
		if (auth.isLoading) return false
		if (!auth.user) return false
		if (!activeOrg) return false
		return true
	})

	$effect(() => {
		if (!shouldLoad) {
			if (!auth.isLoading && !auth.user) {
				goto('/auth/login')
			}
			return
		}
		console.log('[ProjectsPage] Triggering load for org:', activeOrg.id)
		project.loadProjects(activeOrg.id)
		workspace.loadWorkspaces(activeOrg.id)
	})

	function handleRetry() {
		if (activeOrg) {
			project.loadProjects(activeOrg.id)
		}
	}

	function handleOpenCreate() {
		console.log('[ProjectsPage] Opening create modal')
		project.openCreateModal()
	}

	function handleOpenEdit(p: ProjectWithWorkspace) {
		project.openEditModal(p)
	}

	function handleConfirmDelete(p: ProjectWithWorkspace) {
		console.log('[ProjectsPage] Deleting project:', p.name)
		if (confirm(`Are you sure you want to delete "${p.name}"? This action cannot be undone.`)) {
			if (activeOrg) {
				project.deleteProject(p.id, activeOrg.id)
			}
		}
	}

	function handleCreateSubmit(input: { workspaceId: string; name: string; description: string; color: string | null }) {
		console.log('[ProjectsPage] Creating project:', input.name)
		if (activeOrg) {
			project.createProject(
				{ ...input, color: input.color ?? undefined },
				activeOrg.id
			)
			project.closeCreateModal()
		}
	}

	function handleEditSubmit(updates: { name: string; description: string; color: string | null }) {
		if (project.editingProject) {
			project.updateProject(project.editingProject.id, {
				...updates,
				color: updates.color ?? undefined
			})
			project.closeEditModal()
		}
	}
</script>

<div class="page-container">
	<header class="page-header">
		<div class="header-content">
			<div class="header-text">
				<h1 class="page-title">Projects</h1>
				{#if activeOrg}
					<p class="page-subtitle">{activeOrg.name}</p>
				{/if}
			</div>
			{#if isAdmin}
				<button class="btn-create" onclick={handleOpenCreate}>
					<Plus size={18} />
					<span>Create project</span>
				</button>
			{/if}
		</div>
	</header>

	<main class="page-content">
		{#if project.isLoading}
			<div class="loading-state">
				<p>Loading projects...</p>
			</div>
		{:else if project.error}
			<div class="error-banner">
				<p class="error-message">{project.error}</p>
				<button class="btn-retry" onclick={handleRetry}>Retry</button>
			</div>
		{:else if project.projects.length === 0}
			<div class="empty-state">
				<p class="empty-title">No projects yet</p>
				<p class="empty-subtitle">Create your first project to get started</p>
				{#if isAdmin}
					<button class="btn-create-empty" onclick={handleOpenCreate}>
						<Plus size={18} />
						<span>Create project</span>
					</button>
				{/if}
			</div>
		{:else}
			{#each groupedProjects as [workspaceName, projects] (workspaceName)}
				<div class="workspace-group">
					<h3 class="group-title">{workspaceName}</h3>
					<div class="project-grid">
						{#each projects as p (p.id)}
							<ProjectCard
								project={p}
								onEdit={handleOpenEdit}
								onDelete={handleConfirmDelete}
							/>
						{/each}
					</div>
				</div>
			{/each}
		{/if}
	</main>
</div>

<CreateProjectModal
	isOpen={project.showCreateModal}
	isLoading={project.isCreating}
	workspaces={workspace.workspaces}
	onClose={() => project.closeCreateModal()}
	onSubmit={handleCreateSubmit}
/>

<EditProjectModal
	isOpen={project.showEditModal}
	isLoading={project.isUpdating}
	project={project.editingProject}
	onClose={() => project.closeEditModal()}
	onSubmit={handleEditSubmit}
/>

<style>
	.page-container {
		padding: 24px 32px;
		max-width: 1200px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 32px;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.header-text {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.page-title {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--text-main);
		margin: 0;
	}

	.page-subtitle {
		font-size: 0.9375rem;
		color: var(--text-muted);
		margin: 0;
	}

	.btn-create {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		background: var(--brand-primary);
		color: var(--text-inverse);
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: var(--radius-md);
		transition: background-color 0.15s ease;
	}

	.btn-create:hover {
		background: var(--brand-hover);
	}

	.page-content {
		min-height: 300px;
	}

	.loading-state {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 48px;
		color: var(--text-muted);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 64px 24px;
		text-align: center;
	}

	.empty-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-main);
		margin: 0 0 8px 0;
	}

	.empty-subtitle {
		font-size: 0.9375rem;
		color: var(--text-muted);
		margin: 0 0 24px 0;
	}

	.btn-create-empty {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		background: var(--brand-primary);
		color: var(--text-inverse);
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: var(--radius-md);
		transition: background-color 0.15s ease;
	}

	.btn-create-empty:hover {
		background: var(--brand-hover);
	}

	.workspace-group {
		margin-bottom: 32px;
	}

	.group-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin: 0 0 12px 0;
	}

	.project-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 16px;
	}

	.error-banner {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		padding: 48px 24px;
		text-align: center;
		background: rgba(219, 76, 63, 0.1);
		border: 1px solid rgba(219, 76, 63, 0.3);
		border-radius: var(--radius-lg);
	}

	.error-message {
		font-size: 0.9375rem;
		color: var(--brand-primary);
		margin: 0;
	}

	.btn-retry {
		padding: 10px 20px;
		font-size: 0.875rem;
		font-weight: 500;
		background: var(--brand-primary);
		color: var(--text-inverse);
		border-radius: var(--radius-md);
		transition: background-color 0.15s ease;
	}

	.btn-retry:hover {
		background: var(--brand-hover);
	}
</style>
