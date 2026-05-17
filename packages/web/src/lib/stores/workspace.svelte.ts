import { trpc } from '$lib/trpc'
import { toast } from './toast.svelte'

export interface Workspace {
	id: string
	name: string
	slug: string
	type: 'personal' | 'company'
	organizationId: string | null
	createdBy: string
	memberCount: number
	createdAt: string
	updatedAt: string
}

class WorkspaceStore {
	workspaces = $state<Workspace[]>([])
	isLoading = $state(false)
	isCreating = $state(false)
	isUpdating = $state(false)
	showCreateModal = $state(false)
	showEditModal = $state(false)
	editingWorkspace = $state<Workspace | null>(null)
	error = $state<string | null>(null)

	async loadWorkspaces(organizationId: string) {
		this.isLoading = true
		this.error = null
		try {
			const result = await trpc.workspace.list.query({ organizationId })
			this.workspaces = result as Workspace[]
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load workspaces'
			toast.show(this.error, 'error')
		} finally {
			this.isLoading = false
		}
	}

	async createWorkspace(name: string, organizationId: string) {
		this.isCreating = true
		this.error = null
		try {
			await trpc.workspace.create.mutate({ name, organizationId })
			await this.loadWorkspaces(organizationId)
			toast.show('Workspace created successfully', 'success')
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to create workspace'
			this.error = message
			toast.show(message, 'error')
		} finally {
			this.isCreating = false
		}
	}

	async updateWorkspace(id: string, name: string) {
		this.isUpdating = true
		try {
			await trpc.workspace.update.mutate({ id, name })
			// Update locally without reloading
			const index = this.workspaces.findIndex((w) => w.id === id)
			if (index !== -1) {
				this.workspaces[index] = { ...this.workspaces[index], name }
			}
			toast.show('Workspace updated successfully', 'success')
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to update workspace'
			this.error = message
			toast.show(message, 'error')
		} finally {
			this.isUpdating = false
		}
	}

	openCreateModal() {
		this.showCreateModal = true
	}

	closeCreateModal() {
		this.showCreateModal = false
	}

	openEditModal(workspace: Workspace) {
		this.editingWorkspace = workspace
		this.showEditModal = true
	}

	closeEditModal() {
		this.showEditModal = false
		this.editingWorkspace = null
	}
}

export const workspace = new WorkspaceStore()