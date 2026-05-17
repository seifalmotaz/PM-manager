import { trpc } from '$lib/trpc'
import { toast } from './toast.svelte'

export interface Task {
	id: string
	projectId: string
	title: string
	description: string | null
	status: 'todo' | 'in_progress' | 'done'
	priority: 'p0' | 'p1' | 'p2' | 'p3' | null
	storyPoints: number | null
	estimatedHours: number | null
	assigneeId: string | null
	dueDate: string | null
	deadline: string | null
	sprintId: string | null
	sprintFlag: string | null
	order: number | null
	statusChangedAt: string
	startedAt: string | null
	completedAt: string | null
	createdAt: string
	updatedAt: string
	project?: { id: string; name: string; workspaceId?: string } | null
}

export interface CreateTaskInput {
	projectId: string
	title: string
	priority?: 'p0' | 'p1' | 'p2' | 'p3'
	storyPoints?: number
	estimatedHours?: number
	assigneeId?: string
	dueDate?: string
	sprintId?: string
	description?: string
	sprintFlag?: string
}

export interface UpdateTaskInput {
	title?: string
	priority?: 'p0' | 'p1' | 'p2' | 'p3' | null
	storyPoints?: number | null
	estimatedHours?: number | null
	assigneeId?: string | null
	dueDate?: string | null
	deadline?: string | null
	sprintId?: string | null
	sprintFlag?: string | null
	description?: string
}

function normalizeTask(raw: unknown): Task {
	const t = raw as Record<string, unknown>
	return {
		id: String(t.id),
		projectId: String(t.projectId),
		title: String(t.title),
		description: t.description == null ? null : String(t.description),
		status: t.status as Task['status'],
		priority: t.priority == null ? null : (t.priority as Task['priority']),
		storyPoints: t.storyPoints == null ? null : Number(t.storyPoints),
		estimatedHours: t.estimatedHours == null ? null : Number(t.estimatedHours),
		assigneeId: t.assigneeId == null ? null : String(t.assigneeId),
		dueDate: t.dueDate == null ? null : String(t.dueDate),
		deadline: t.deadline == null ? null : String(t.deadline),
		sprintId: t.sprintId == null ? null : String(t.sprintId),
		sprintFlag: t.sprintFlag == null ? null : String(t.sprintFlag),
		order: t.order == null ? null : Number(t.order),
		statusChangedAt: String(t.statusChangedAt),
		startedAt: t.startedAt == null ? null : String(t.startedAt),
		completedAt: t.completedAt == null ? null : String(t.completedAt),
		createdAt: String(t.createdAt),
		updatedAt: String(t.updatedAt),
		project: (t.project && typeof t.project === 'object')
			? {
					id: String((t.project as Record<string, unknown>).id),
					name: String((t.project as Record<string, unknown>).name),
					workspaceId: (t.project as Record<string, unknown>).workspaceId == null
						? undefined
						: String((t.project as Record<string, unknown>).workspaceId),
				}
			: null,
	}
}

class TaskStore {
	tasks = $state<Task[]>([])
	isLoading = $state(false)
	isCreating = $state(false)
	isUpdating = $state(false)
	isDeleting = $state(false)
	error = $state<string | null>(null)

	async loadTasksByProject(projectId: string) {
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
				trpc.task.list.query({ projectId }),
				timeoutPromise,
			])
			this.tasks = (result as unknown[]).map(normalizeTask)
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load tasks'
			toast.show(this.error, 'error')
		} finally {
			if (timeoutId) clearTimeout(timeoutId)
			this.isLoading = false
		}
	}

	async loadTasksBySprint(sprintId: string) {
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
				trpc.task.list.query({ sprintId }),
				timeoutPromise,
			])
			this.tasks = (result as unknown[]).map(normalizeTask)
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load tasks'
			toast.show(this.error, 'error')
		} finally {
			if (timeoutId) clearTimeout(timeoutId)
			this.isLoading = false
		}
	}

	async loadMyTasks(workspaceIds: string[], userId: string) {
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
				trpc.task.home.query({ workspaceIds, assigneeId: userId }),
				timeoutPromise,
			])
			this.tasks = (result as unknown[]).map(normalizeTask)
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load tasks'
			toast.show(this.error, 'error')
		} finally {
			if (timeoutId) clearTimeout(timeoutId)
			this.isLoading = false
		}
	}

	async createTask(input: CreateTaskInput) {
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
				trpc.task.create.mutate(input),
				timeoutPromise,
			])
			toast.show('Task created successfully', 'success')
			await this.loadTasksByProject(input.projectId)
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to create task'
			this.error = message
			toast.show(message, 'error')
		} finally {
			if (timeoutId) clearTimeout(timeoutId)
			this.isCreating = false
		}
	}

	async updateTask(id: string, updates: UpdateTaskInput) {
		this.isUpdating = true
		try {
			await trpc.task.update.mutate({ id, ...updates })
			const index = this.tasks.findIndex((t) => t.id === id)
			if (index !== -1) {
				this.tasks = this.tasks.map((t) =>
					t.id === id ? { ...t, ...updates } : t
				)
			}
			toast.show('Task updated successfully', 'success')
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to update task'
			this.error = message
			toast.show(message, 'error')
		} finally {
			this.isUpdating = false
		}
	}

	async changeStatus(id: string, status: Task['status']) {
		this.isUpdating = true
		try {
			await trpc.task.changeStatus.mutate({ id, status })
			this.tasks = this.tasks.map((t) =>
				t.id === id ? { ...t, status } : t
			)
			toast.show('Task status updated', 'success')
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to update task status'
			this.error = message
			toast.show(message, 'error')
		} finally {
			this.isUpdating = false
		}
	}

	async deleteTask(id: string, projectId?: string) {
		this.isDeleting = true
		let timeoutId: ReturnType<typeof setTimeout> | null = null

		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(() => {
				reject(new Error('Request timed out. Please check your connection and try again.'))
			}, 10000)
		})

		try {
			await Promise.race([
				trpc.task.delete.mutate({ id }),
				timeoutPromise,
			])
			this.tasks = this.tasks.filter((t) => t.id !== id)
			toast.show('Task deleted successfully', 'success')
			if (projectId) {
				await this.loadTasksByProject(projectId)
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to delete task'
			this.error = message
			toast.show(message, 'error')
		} finally {
			if (timeoutId) clearTimeout(timeoutId)
			this.isDeleting = false
		}
	}
}

export const task = new TaskStore()