import { trpc } from '$lib/trpc'
import { toast } from './toast.svelte'

export interface Sprint {
	id: string
	projectId: string
	name: string
	goal: string | null
	startDate: string
	endDate: string
	status: 'planned' | 'active' | 'completed'
	plannedPoints: number | null
	createdAt: string
	updatedAt: string
}

export interface CreateSprintInput {
	projectId: string
	name: string
	goal?: string
	startDate: string
	endDate?: string
}

export interface UpdateSprintInput {
	name?: string
	goal?: string
	startDate?: string
	endDate?: string
}

function normalizeSprint(raw: unknown): Sprint {
	const s = raw as Record<string, unknown>
	return {
		id: String(s.id),
		projectId: String(s.projectId),
		name: String(s.name),
		goal: s.goal == null ? null : String(s.goal),
		startDate: String(s.startDate),
		endDate: s.endDate == null ? '' : String(s.endDate),
		status: s.status as Sprint['status'],
		plannedPoints: s.plannedPoints == null ? null : Number(s.plannedPoints),
		createdAt: String(s.createdAt),
		updatedAt: String(s.updatedAt),
	}
}

class SprintStore {
	sprints = $state<Sprint[]>([])
	isLoading = $state(false)
	isCreating = $state(false)
	isUpdating = $state(false)
	isCompleting = $state(false)
	isDeleting = $state(false)
	error = $state<string | null>(null)

	get activeSprint(): Sprint | null {
		return this.sprints.find((s) => s.status === 'active') ?? null
	}

	get plannedSprints(): Sprint[] {
		return this.sprints.filter((s) => s.status === 'planned')
	}

	get completedSprints(): Sprint[] {
		return this.sprints.filter((s) => s.status === 'completed')
	}

	async loadSprintsByProject(projectId: string) {
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
				trpc.sprint.list.query({ projectId }),
				timeoutPromise,
			])
			this.sprints = (result as unknown[]).map(normalizeSprint)
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load sprints'
			toast.show(this.error, 'error')
		} finally {
			if (timeoutId) clearTimeout(timeoutId)
			this.isLoading = false
		}
	}

	async createSprint(input: CreateSprintInput) {
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
				trpc.sprint.create.mutate(input),
				timeoutPromise,
			])
			toast.show('Sprint created successfully', 'success')
			await this.loadSprintsByProject(input.projectId)
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to create sprint'
			this.error = message
			toast.show(message, 'error')
		} finally {
			if (timeoutId) clearTimeout(timeoutId)
			this.isCreating = false
		}
	}

	async updateSprint(id: string, updates: UpdateSprintInput) {
		this.isUpdating = true
		try {
			await trpc.sprint.update.mutate({ id, ...updates })
			const index = this.sprints.findIndex((s) => s.id === id)
			if (index !== -1) {
				this.sprints = this.sprints.map((s) =>
					s.id === id ? { ...s, ...updates } : s
				)
			}
			toast.show('Sprint updated successfully', 'success')
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to update sprint'
			this.error = message
			toast.show(message, 'error')
		} finally {
			this.isUpdating = false
		}
	}

	async completeSprint(sprintId: string, action: 'backlog' | 'next_sprint') {
		this.isCompleting = true
		let timeoutId: ReturnType<typeof setTimeout> | null = null

		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(() => {
				reject(new Error('Request timed out. Please check your connection and try again.'))
			}, 10000)
		})

		try {
			const sprint = this.sprints.find((s) => s.id === sprintId)
			await Promise.race([
				trpc.sprint.complete.mutate({ sprintId, unfinishedTaskAction: action }),
				timeoutPromise,
			])
			toast.show('Sprint completed successfully', 'success')
			if (sprint) {
				await this.loadSprintsByProject(sprint.projectId)
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to complete sprint'
			this.error = message
			toast.show(message, 'error')
		} finally {
			if (timeoutId) clearTimeout(timeoutId)
			this.isCompleting = false
		}
	}

	async deleteSprint(id: string, projectId: string, deleteTasks = false) {
		this.isDeleting = true
		let timeoutId: ReturnType<typeof setTimeout> | null = null

		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(() => {
				reject(new Error('Request timed out. Please check your connection and try again.'))
			}, 10000)
		})

		try {
			await Promise.race([
				trpc.sprint.delete.mutate({ id, deleteTasks }),
				timeoutPromise,
			])
			toast.show('Sprint deleted successfully', 'success')
			await this.loadSprintsByProject(projectId)
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to delete sprint'
			this.error = message
			toast.show(message, 'error')
		} finally {
			if (timeoutId) clearTimeout(timeoutId)
			this.isDeleting = false
		}
	}
}

export const sprint = new SprintStore()