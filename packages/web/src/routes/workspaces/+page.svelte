<script lang="ts">
	import { goto } from '$app/navigation'
	import { Plus } from 'lucide-svelte'
	import { workspace } from '$lib/stores/workspace.svelte'
	import { organization } from '$lib/stores/organization.svelte'
	import { auth } from '$lib/stores/auth.svelte'
	import WorkspaceCard from '$lib/components/workspaces/WorkspaceCard.svelte'
	import CreateWorkspaceModal from '$lib/components/workspaces/CreateWorkspaceModal.svelte'
	import EditWorkspaceModal from '$lib/components/workspaces/EditWorkspaceModal.svelte'

	let activeOrg = $derived(organization.activeOrganization)
	let isAdmin = $derived(activeOrg ? organization.isOrgAdmin(activeOrg.id) : false)

	$effect(() => {
		// Wait for auth restoration to complete
		if (auth.isLoading) return

		// Redirect to login if not authenticated
		if (!auth.user) {
			goto('/auth/login')
			return
		}

		// Only load workspaces once we have an active org and valid auth
		if (activeOrg) {
			workspace.loadWorkspaces(activeOrg.id)
		}
	})

	function handleCreate(name: string) {
		if (activeOrg) {
			workspace.createWorkspace(name, activeOrg.id)
			workspace.closeCreateModal()
		}
	}

	function handleEdit(name: string) {
		const editingWs = workspace.editingWorkspace
		if (editingWs) {
			workspace.updateWorkspace(editingWs.id, name)
			workspace.closeEditModal()
		}
	}

	function handleOpenCreate() {
		workspace.openCreateModal()
	}

	function handleOpenEdit(ws: typeof workspace.workspaces[0]) {
		workspace.openEditModal(ws)
	}

	function handleCloseCreate() {
		workspace.closeCreateModal()
	}

	function handleCloseEdit() {
		workspace.closeEditModal()
	}
</script>

<div class="page-container">
	<header class="page-header">
		<div class="header-content">
			<div class="header-text">
				<h1 class="page-title">Workspaces</h1>
				{#if activeOrg}
					<p class="page-subtitle">{activeOrg.name}</p>
				{/if}
			</div>
			{#if isAdmin}
				<button class="btn-create" onclick={handleOpenCreate}>
					<Plus size={18} />
					<span>Create workspace</span>
				</button>
			{/if}
		</div>
	</header>

	<main class="page-content">
		{#if workspace.isLoading}
			<div class="loading-state">
				<p>Loading workspaces...</p>
			</div>
		{:else if workspace.workspaces.length === 0}
			<div class="empty-state">
				<p class="empty-title">No workspaces yet</p>
				<p class="empty-subtitle">Create your first workspace to get started</p>
				{#if isAdmin}
					<button class="btn-create-empty" onclick={handleOpenCreate}>
						<Plus size={18} />
						<span>Create workspace</span>
					</button>
				{/if}
			</div>
		{:else}
			<div class="workspace-grid">
				{#each workspace.workspaces as ws (ws.id)}
					<WorkspaceCard workspace={ws} onEdit={handleOpenEdit} />
				{/each}
			</div>
		{/if}
	</main>
</div>

<CreateWorkspaceModal
	isOpen={workspace.showCreateModal}
	isLoading={workspace.isCreating}
	onClose={handleCloseCreate}
	onSubmit={handleCreate}
/>

<EditWorkspaceModal
	isOpen={workspace.showEditModal}
	isLoading={workspace.isUpdating}
	workspace={workspace.editingWorkspace}
	onClose={handleCloseEdit}
	onSubmit={handleEdit}
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

	.workspace-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 16px;
	}
</style>
