<script lang="ts">
	import { X } from 'lucide-svelte'
	import type { Task, UpdateTaskInput } from '$lib/stores/task.svelte'
	import type { Sprint } from '$lib/stores/sprint.svelte'
	import { workspace, type WorkspaceMember } from '$lib/stores/workspace.svelte'
	import { auth } from '$lib/stores/auth.svelte'

	interface Props {
		isOpen: boolean
		task: Task | null
		sprints: Sprint[]
		isLoading: boolean
		onClose: () => void
		onSave: (id: string, updates: UpdateTaskInput) => void
		onDelete: (id: string) => void
		onChangeStatus: (id: string, status: Task['status']) => void
	}

	let { isOpen, task, sprints, isLoading, onClose, onSave, onDelete, onChangeStatus }: Props = $props()

	let formData = $state({
		title: '',
		priority: '' as 'p0' | 'p1' | 'p2' | 'p3' | '',
		storyPoints: null as number | null,
		estimatedHours: null as number | null,
		assigneeId: '' as string,
		dueDate: '' as string,
		deadline: '' as string,
		sprintId: '' as string,
		sprintFlag: '' as string,
		description: ''
	})

	let editingChip = $state<string | null>(null)
	let showDeleteConfirm = $state(false)
	let isLoadingMembers = $state(false)
	let membersError = $state<string | null>(null)

	function resetForm() {
		if (!task) return
		formData = {
			title: task.title,
			priority: task.priority ?? '',
			storyPoints: task.storyPoints,
			estimatedHours: task.estimatedHours,
			assigneeId: task.assigneeId ?? '',
			dueDate: task.dueDate ?? '',
			deadline: task.deadline ?? '',
			sprintId: task.sprintId ?? '',
			sprintFlag: task.sprintFlag ?? '',
			description: task.description ?? ''
		}
		showDeleteConfirm = false
		editingChip = null
	}

	function getDirtyFields(): UpdateTaskInput {
		if (!task) return {}
		const updates: UpdateTaskInput = {}
		if (formData.title !== task.title) updates.title = formData.title
		if (formData.priority !== (task.priority ?? '')) updates.priority = formData.priority || null
		if (formData.storyPoints !== task.storyPoints) updates.storyPoints = formData.storyPoints
		if (formData.estimatedHours !== task.estimatedHours) updates.estimatedHours = formData.estimatedHours
		if (formData.assigneeId !== (task.assigneeId ?? '')) updates.assigneeId = formData.assigneeId || null
		if (formData.dueDate !== (task.dueDate ?? '')) updates.dueDate = formData.dueDate || null
		if (formData.deadline !== (task.deadline ?? '')) updates.deadline = formData.deadline || null
		if (formData.sprintId !== (task.sprintId ?? '')) updates.sprintId = formData.sprintId || null
		if (formData.sprintFlag !== (task.sprintFlag ?? '')) updates.sprintFlag = formData.sprintFlag || null
		if (formData.description !== (task.description ?? '')) updates.description = formData.description
		return updates
	}

	let isDirty = $derived.by(() => {
		if (!task) return false
		return Object.keys(getDirtyFields()).length > 0
	})

	let hasErrors = $derived(formData.title.trim().length === 0)

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose()
		}
	}

	function handleSave() {
		if (!task || !isDirty || hasErrors) return
		const updates = getDirtyFields()
		onSave(task.id, updates)
	}

	function handleDelete() {
		if (!task) return
		onDelete(task.id)
	}

	function handleStatusClick(status: Task['status']) {
		if (!task) return
		if (status !== task.status) {
			onChangeStatus(task.id, status)
		}
	}

	function formatPriority(p: string): string {
		if (!p) return 'No Priority'
		return p.toUpperCase()
	}

	function formatSprintName(sprintId: string): string {
		if (!sprintId) return 'No Sprint'
		const found = sprints.find(s => s.id === sprintId)
		return found?.name ?? 'Unknown Sprint'
	}

	function getAssigneeName(taskItem: Task | null): string {
		if (!taskItem || !taskItem.assigneeId) return 'Unassigned'
		const member = workspace.members.find((m) => m.userId === taskItem.assigneeId)
		if (!member) return 'Unknown'
		if (member.userId === auth.user?.id) return 'Me'
		return member.user.name
	}

	async function loadWorkspaceMembers() {
		if (!task) return
		const workspaceId = task.project?.workspaceId ?? null
		if (!workspaceId) return

		isLoadingMembers = true
		membersError = null
		try {
			await workspace.loadMembers(workspaceId)
		} catch (err) {
			membersError = err instanceof Error ? err.message : 'Failed to load members'
		} finally {
			isLoadingMembers = false
		}
	}

	$effect(() => {
		if (isOpen && task) {
			resetForm()
		}
	})

	$effect(() => {
		if (isOpen && task) {
			loadWorkspaceMembers()
		}
	})

	$effect(() => {
		if (!isOpen) return
		function handleKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				onClose()
			}
		}
		document.addEventListener('keydown', handleKeydown)
		return () => document.removeEventListener('keydown', handleKeydown)
	})
</script>

{#if isOpen && task}
	<div class="modal-overlay" onclick={handleBackdropClick} role="dialog" aria-modal="true">
		<div class="modal-card">
			<div class="modal-header">
				<h2 class="modal-title">Task Details</h2>
				<button class="close-button" onclick={onClose} aria-label="Close">
					<X size={20} />
				</button>
			</div>

			<div class="modal-body">
				<!-- Title -->
				<div class="title-section">
					<input
						type="text"
						class="title-input"
						bind:value={formData.title}
						placeholder="Task title..."
						disabled={isLoading}
					/>
				</div>

				<!-- Status moves -->
				<div class="status-row">
					<button
						class="status-btn"
						class:active={task.status === 'todo'}
						class:current={task.status === 'todo'}
						disabled={isLoading}
						onclick={() => handleStatusClick('todo')}
					>To Do</button>
					<button
						class="status-btn"
						class:active={task.status === 'in_progress'}
						class:current={task.status === 'in_progress'}
						disabled={isLoading}
						onclick={() => handleStatusClick('in_progress')}
					>In Progress</button>
					<button
						class="status-btn"
						class:active={task.status === 'done'}
						class:current={task.status === 'done'}
						disabled={isLoading}
						onclick={() => handleStatusClick('done')}
					>Done</button>
				</div>

				<!-- Metadata chips row -->
				<div class="chips-row">
					<!-- Priority chip -->
					<div class="chip">
						{#if editingChip === 'priority'}
						<select
							class="chip-select"
							bind:value={formData.priority}
							onchange={() => editingChip = null}
							disabled={isLoading}
						>
								<option value="">No Priority</option>
								<option value="p0">P0</option>
								<option value="p1">P1</option>
								<option value="p2">P2</option>
								<option value="p3">P3</option>
							</select>
						{:else}
							<button class="chip-button" onclick={() => editingChip = 'priority'} disabled={isLoading}>
								{formatPriority(formData.priority)}
							</button>
						{/if}
					</div>

					<!-- Due date chip -->
					<div class="chip">
						{#if editingChip === 'dueDate'}
							<input
								type="date"
								class="chip-input"
								bind:value={formData.dueDate}
								onblur={() => editingChip = null}
								disabled={isLoading}
							/>
						{:else}
							<button class="chip-button" onclick={() => editingChip = 'dueDate'} disabled={isLoading}>
								{formData.dueDate ? formData.dueDate : 'No Due Date'}
							</button>
						{/if}
					</div>

					<!-- Story points chip -->
					<div class="chip chip-narrow">
						{#if editingChip === 'storyPoints'}
							<input
								type="number"
								class="chip-input chip-number"
								bind:value={formData.storyPoints}
								min="0"
								onblur={() => editingChip = null}
								disabled={isLoading}
							/>
						{:else}
							<button class="chip-button" onclick={() => editingChip = 'storyPoints'} disabled={isLoading}>
								{formData.storyPoints ?? '—'} SP
							</button>
						{/if}
					</div>

					<!-- Estimated hours chip -->
					<div class="chip chip-narrow">
						{#if editingChip === 'estimatedHours'}
							<input
								type="number"
								class="chip-input chip-number"
								bind:value={formData.estimatedHours}
								min="0"
								step="0.5"
								onblur={() => editingChip = null}
								disabled={isLoading}
							/>
						{:else}
							<button class="chip-button" onclick={() => editingChip = 'estimatedHours'} disabled={isLoading}>
								{formData.estimatedHours ?? '—'} h
							</button>
						{/if}
					</div>

					<!-- Sprint chip -->
					<div class="chip">
						{#if editingChip === 'sprint'}
							<select
								class="chip-select"
								bind:value={formData.sprintId}
								onchange={() => editingChip = null}
								disabled={isLoading}
							>
								<option value="">None (Backlog)</option>
								{#each sprints as s (s.id)}
									<option value={s.id}>{s.name}</option>
								{/each}
							</select>
						{:else}
							<button class="chip-button" onclick={() => editingChip = 'sprint'} disabled={isLoading}>
								{formatSprintName(formData.sprintId)}
							</button>
						{/if}
					</div>

					<!-- Assignee chip -->
					<div class="chip">
						{#if editingChip === 'assignee'}
							<select
								class="chip-select"
								bind:value={formData.assigneeId}
								onblur={() => editingChip = null}
								disabled={isLoading || isLoadingMembers}
							>
								<option value="">Unassigned</option>
								{#each workspace.members as member (member.userId)}
									<option value={member.userId}>
										{member.userId === auth.user?.id ? 'Me' : member.user.name}
									</option>
								{/each}
							</select>
						{:else}
							<button class="chip-button" onclick={() => editingChip = 'assignee'} disabled={isLoading}>
								{getAssigneeName(task)}
							</button>
						{/if}
					</div>
				</div>

				<!-- Deadline field -->
				<div class="form-group">
					<label class="form-label" for="task-deadline">Deadline</label>
					<input
						id="task-deadline"
						type="date"
						class="form-input"
						bind:value={formData.deadline}
						disabled={isLoading}
					/>
				</div>

				<!-- Description -->
				<div class="form-group">
					<label class="form-label" for="task-description">Description</label>
					<textarea
						id="task-description"
						class="form-textarea"
						bind:value={formData.description}
						placeholder="Add a description..."
						rows="4"
						disabled={isLoading}
					></textarea>
				</div>
			</div>

			<!-- Footer -->
			<div class="modal-footer">
				<div class="footer-left">
					{#if showDeleteConfirm}
						<span class="delete-confirm-text">Delete this task?</span>
						<button class="btn-delete-confirm" onclick={handleDelete} disabled={isLoading}>Yes</button>
						<button class="btn-cancel-delete" onclick={() => showDeleteConfirm = false} disabled={isLoading}>No</button>
					{:else}
						<button class="btn-delete" onclick={() => showDeleteConfirm = true} disabled={isLoading}>Delete</button>
					{/if}
				</div>
				<div class="footer-right">
					<button class="btn-cancel" onclick={onClose} disabled={isLoading}>Cancel</button>
					<button class="btn-save" onclick={handleSave} disabled={!isDirty || hasErrors || isLoading}>
						{#if isLoading}
							Saving...
						{:else}
							Save
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
	}

	.modal-card {
		background: var(--bg-surface);
		border-radius: var(--radius-lg);
		width: 100%;
		max-width: 560px;
		margin: 16px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-muted);
	}

	.modal-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-main);
		margin: 0;
	}

	.close-button {
		padding: 4px;
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		transition: color 0.15s ease;
	}

	.close-button:hover {
		color: var(--text-main);
	}

	.modal-body {
		padding: 20px;
	}

	.title-section {
		margin-bottom: 16px;
	}

	.title-input {
		width: 100%;
		padding: 12px;
		font-size: 1.25rem;
		font-weight: 500;
		background: var(--bg-app);
		border: 1px solid var(--border-main);
		border-radius: var(--radius-md);
		color: var(--text-main);
		transition: border-color 0.15s ease;
	}

	.title-input:focus {
		border-color: var(--brand-primary);
	}

	.title-input::placeholder {
		color: var(--text-muted);
	}

	.title-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.status-row {
		display: flex;
		gap: 8px;
		margin-bottom: 16px;
	}

	.status-btn {
		flex: 1;
		padding: 8px 12px;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-main);
		background: var(--bg-app);
		color: var(--text-muted);
		transition: all 0.15s ease;
	}

	.status-btn:hover:not(:disabled) {
		border-color: var(--brand-primary);
		color: var(--text-main);
	}

	.status-btn.current {
		border-color: var(--brand-primary);
		color: var(--brand-primary);
	}

	.status-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.chips-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 16px;
	}

	.chip {
		position: relative;
	}

	.chip-button {
		padding: 6px 12px;
		font-size: 0.8125rem;
		font-weight: 500;
		background: var(--bg-surface-hover);
		border: 1px solid var(--border-main);
		border-radius: var(--radius-sm);
		color: var(--text-main);
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
	}

	.chip-button:hover:not(:disabled) {
		border-color: var(--brand-primary);
	}

	.chip-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.chip-select,
	.chip-input {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		padding: 6px 12px;
		font-size: 0.8125rem;
		font-weight: 500;
		background: var(--bg-surface-hover);
		border: 1px solid var(--brand-primary);
		border-radius: var(--radius-sm);
		color: var(--text-main);
		appearance: none;
		cursor: pointer;
	}

	.chip-number {
		width: 60px;
	}

	.form-group {
		margin-bottom: 16px;
	}

	.form-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-main);
		margin-bottom: 6px;
	}

	.form-input {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid var(--border-main);
		border-radius: var(--radius-md);
		background: var(--bg-app);
		color: var(--text-main);
		font-size: 0.9375rem;
		transition: border-color 0.15s ease;
	}

	.form-input:focus {
		border-color: var(--brand-primary);
	}

	.form-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.form-textarea {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid var(--border-main);
		border-radius: var(--radius-md);
		background: var(--bg-app);
		color: var(--text-main);
		font-size: 0.9375rem;
		transition: border-color 0.15s ease;
		resize: vertical;
		font-family: inherit;
	}

	.form-textarea:focus {
		border-color: var(--brand-primary);
	}

	.form-textarea::placeholder {
		color: var(--text-muted);
	}

	.form-textarea:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.modal-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 20px;
		border-top: 1px solid var(--border-muted);
	}

	.footer-left {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.footer-right {
		display: flex;
		gap: 12px;
	}

	.btn-delete {
		padding: 10px 16px;
		font-size: 0.875rem;
		font-weight: 500;
		color: #db4c3f;
		border-radius: var(--radius-md);
		transition: all 0.15s ease;
	}

	.btn-delete:hover:not(:disabled) {
		background: rgba(219, 76, 63, 0.1);
	}

	.btn-delete:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.delete-confirm-text {
		font-size: 0.875rem;
		color: var(--text-main);
	}

	.btn-delete-confirm {
		padding: 8px 12px;
		font-size: 0.8125rem;
		font-weight: 500;
		background: #db4c3f;
		color: white;
		border-radius: var(--radius-sm);
	}

	.btn-cancel-delete {
		padding: 8px 12px;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-muted);
		border-radius: var(--radius-sm);
	}

	.btn-cancel {
		padding: 10px 16px;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-muted);
		border-radius: var(--radius-md);
		transition: color 0.15s ease;
	}

	.btn-cancel:hover:not(:disabled) {
		color: var(--text-main);
	}

	.btn-cancel:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-save {
		padding: 10px 20px;
		font-size: 0.875rem;
		font-weight: 500;
		background: var(--brand-primary);
		color: var(--text-inverse);
		border-radius: var(--radius-md);
		transition: background-color 0.15s ease;
	}

	.btn-save:hover:not(:disabled) {
		background: var(--brand-hover);
	}

	.btn-save:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>