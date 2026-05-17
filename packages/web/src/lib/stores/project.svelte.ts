import { trpc } from '$lib/trpc'
import { toast } from './toast.svelte'

export interface Project {
	id: string
	workspaceId: string
	name: string
	description: string | null
	color: string | null
	isInbox: boolean
	createdAt: string
}

export interface ProjectWithWorkspace extends Project {
	workspaceName?: string
}

class ProjectStore {
	projects = $state<ProjectWithWorkspace[]>([])
	isLoading = $state(false)
	isCreating = $state(false)
	isUpdating = $state(false)
	isDeleting = $state(false)
	showCreateModal = $state(false)
	showEditModal = $state(false)
	editingProject = $state<ProjectWithWorkspace | null>(null)
	error = $state<string | null>(null)

	async loadProjects(organizationId: string) {
		this.isLoading = true
		this.error = null
		let timeoutId: ReturnType<typeof setTimeout> | null = null

		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(() => {
				reject(new Error('Request timed out. Please check your connection and try again.'))
			}, 10000)
		})

		try {
			const result = await Promise.race([
				trpc.project.listByOrg.query({ organizationId }),
				timeoutPromise,
			])
			this.projects = result as ProjectWithWorkspace[]
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load projects'
			toast.show(this.error, 'error')
		} finally {
			if (timeoutId) clearTimeout(timeoutId)
			this.isLoading = false
		}
	}

	async createProject(
		input: { workspaceId: string; name: string; description?: string; color?: string },
		organizationId: string
	) {
		this.isCreating = true
		this.error = null
		let timeoutId: ReturnType<typeof setTimeout> | null = null

		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(() => {
				reject(new Error('Request timed out. Please check your connection and try again.'))
			}, 10000)
		})

		try {
			await Promise.race([
				trpc.project.create.mutate(input),
				timeoutPromise,
			])
			toast.show('Project created successfully', 'success')
			await this.loadProjects(organizationId)
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to create project'
			this.error = message
			toast.show(message, 'error')
		} finally {
			if (timeoutId) clearTimeout(timeoutId)
			this.isCreating = false
		}
	}

	async updateProject(id: string, updates: { name?: string; description?: string; color?: string }) {
		this.isUpdating = true
		try {
			await trpc.project.update.mutate({ id, ...updates })
			const index = this.projects.findIndex((p) => p.id === id)
			if (index !== -1) {
				this.projects[index] = { ...this.projects[index], ...updates }
			}
			toast.show('Project updated successfully', 'success')
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to update project'
			this.error = message
			toast.show(message, 'error')
		} finally {
			this.isUpdating = false
		}
	}

	async deleteProject(id: string, organizationId: string) {
		this.isDeleting = true
		let timeoutId: ReturnType<typeof setTimeout> | null = null

		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(() => {
				reject(new Error('Request timed out. Please check your connection and try again.'))
			}, 10000)
		})

		try {
			await Promise.race([
				trpc.project.delete.mutate({ id }),
				timeoutPromise,
			])
			toast.show('Project deleted successfully', 'success')
			await this.loadProjects(organizationId)
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to delete project'
			this.error = message
			toast.show(message, 'error')
		} finally {
			if (timeoutId) clearTimeout(timeoutId)
			this.isDeleting = false
		}
	}

	openCreateModal() {
		this.showCreateModal = true
	}

	closeCreateModal() {
		this.showCreateModal = false
	}

	openEditModal(project: ProjectWithWorkspace) {
		this.editingProject = project
		this.showEditModal = true
	}

	closeEditModal() {
		this.showEditModal = false
		this.editingProject = null
	}
}

export const project = new ProjectStore()
