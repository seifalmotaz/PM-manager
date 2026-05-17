<script lang="ts">
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import { Plus } from 'lucide-svelte'
	import { trpc } from '$lib/trpc'
	import { auth } from '$lib/stores/auth.svelte'
	import { organization } from '$lib/stores/organization.svelte'
	import { project, type ProjectWithWorkspace } from '$lib/stores/project.svelte'
	import type { Workspace } from '$lib/stores/workspace.svelte'
	import ProjectCard from '$lib/components/projects/ProjectCard.svelte'
	import CreateProjectModal from '$lib/components/projects/CreateProjectModal.svelte'

	let workspace = $state<Workspace | null>(null)
	let projects = $state<ProjectWithWorkspace[]>([])
	let isLoading = $state(true)
	let error = $state<string | null>(null)

	let activeOrg = $derived(organization.activeOrganization)
	let workspaceId = $derived($page.params.id)

	// Admin check using $derived.by to properly resolve the method
	let isAdmin = $derived.by(() => {
		if (!activeOrg) return false
		return organization.isOrgAdmin(activeOrg.id)
	})

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	}

	$effect(() => {
		if (auth.isLoading) return
		if (!auth.user) {
			goto('/auth/login')
			return
		}
		if (!workspaceId) return
		loadWorkspaceData()
	})

	async function loadWorkspaceData() {
		isLoading = true
		error = null
		try {
			const wsResult = await trpc.workspace.byId.query({ id: workspaceId })
			workspace = wsResult as Workspace
			const projResult = await trpc.project.list.query({ workspaceId })
			projects = (projResult as any[]).map(p => ({ ...p, workspaceName: workspace?.name }))
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load workspace'
		} finally {
			isLoading = false
		}
	}

	function handleRetry() {
		loadWorkspaceData()
	}

	function handleOpenCreate() {
		project.openCreateModal()
	}

	function handleCloseCreate() {
		project.closeCreateModal()
	}

	function handleCreateSubmit(input: { workspaceId: string; name: string; description: string; color: string | null }) {
		if (activeOrg) {
			project.createProject(
				{ ...input, color: input.color ?? undefined },
				activeOrg.id
			)
			project.closeCreateModal()
			// Reload projects after creation
			loadWorkspaceData()
		}
	}

	function handleEdit(p: ProjectWithWorkspace) {
		project.openEditModal(p)
	}

	function handleDelete(p: ProjectWithWorkspace) {
		if (confirm(`Are you sure you want to delete "${p.name}"? This action cannot be undone.`)) {
			if (activeOrg) {
				project.deleteProject(p.id, activeOrg.id)
				// Reload projects after deletion
				loadWorkspaceData()
			}
		}
	}
</script>

<div class="page-container">
	{#if isLoading}
		<div class="loading-state">
			<p>Loading workspace...</p>
		</div>
	{:else if error}
		<div class="error-banner">
			<p class="error-message">{error}</p>
			<button class="btn-retry" onclick={handleRetry}>Retry</button>
		</div>
	{:else if workspace}
		<header class="page-header">
			<div class="header-content">
				<div class="header-text">
					<h1 class="workspace-title">{workspace.name}</h1>
					<div class="workspace-meta">
						<span class="meta-item">{workspace.memberCount} member{workspace.memberCount !== 1 ? 's' : ''}</span>
						<span class="meta-separator">·</span>
						<span class="meta-item">Created {formatDate(workspace.createdAt)}</span>
						{#if workspace.type === 'personal'}
							<span class="meta-separator">·</span>
							<span class="badge-personal">Personal</span>
						{/if}
					</div>
				</div>
			</div>
		</header>

		<section class="projects-section">
			<div class="section-header">
				<h2 class="section-title">Projects</h2>
				{#if isAdmin}
					<button class="btn-create" onclick={handleOpenCreate}>
						<Plus size={18} />
						<span>Create project</span>
					</button>
				{/if}
			</div>

			<main class="page-content">
				{#if projects.length === 0}
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
					<div class="project-grid">
						{#each projects as p (p.id)}
							<ProjectCard
								project={p}
								onEdit={handleEdit}
								onDelete={handleDelete}
							/>
						{/each}
					</div>
				{/if}
			</main>
		</section>
	{/if}
</div>

<CreateProjectModal
	isOpen={project.showCreateModal}
	isLoading={project.isCreating}
	workspaces={workspace ? [workspace as Workspace] : []}
	onClose={handleCloseCreate}
	onSubmit={handleCreateSubmit}
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
		gap: 8px;
	}

	.workspace-title {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--text-main);
		margin: 0;
	}

	.workspace-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.875rem;
		color: var(--text-muted);
	}

	.meta-item {
		color: var(--text-muted);
	}

	.meta-separator {
		color: var(--text-muted);
	}

	.badge-personal {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		font-size: 0.75rem;
		font-weight: 500;
		background: var(--bg-surface-hover);
		color: var(--text-secondary);
		border-radius: var(--radius-sm);
	}

	.projects-section {
		margin-top: 24px;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
	}

	.section-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-main);
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