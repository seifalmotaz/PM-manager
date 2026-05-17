<script lang="ts">
	import { trpc } from '$lib/trpc'

	interface Props {
		placeholder?: string
		onSubmit: (title: string, parsed?: { priority?: string; dueDate?: string; storyPoints?: number; assignee?: string }) => void
	}

	let { placeholder = 'Add task...', onSubmit }: Props = $props()

	let inputValue = $state('')
	let isParsing = $state(false)

	const PARSE_TIMEOUT_MS = 3000

	async function parseInput(text: string): Promise<{ title?: string; priority?: string; dueDate?: string; storyPoints?: number; assignee?: string } | undefined> {
		if (!text.trim()) return undefined

		const parsePromise = trpc.task.parse.query({ input: text })

		const timeoutPromise = new Promise<undefined>((resolve) => {
			setTimeout(() => resolve(undefined), PARSE_TIMEOUT_MS)
		})

		try {
		const result = await Promise.race([parsePromise, timeoutPromise])
			if (result && typeof result === 'object') {
				const parsed = result as { title?: string; priority?: string; dueDate?: string; storyPoints?: number; assigneeUsername?: string }
			// Return the parsed fields (including the cleaned title)
				return {
					title: parsed.title,
					priority: parsed.priority,
					dueDate: parsed.dueDate,
					storyPoints: parsed.storyPoints,
					assignee: parsed.assigneeUsername
				}
			}
			return undefined
		} catch {
			return undefined
		}
	}

	async function handleSubmit() {
		const trimmed = inputValue.trim()
		if (!trimmed) return

		isParsing = true
		const parsed = await parseInput(trimmed)
		isParsing = false

		// Use the parser's cleaned title (with shortcuts stripped) if available
		const title = parsed?.title ?? trimmed
		onSubmit(title, parsed)
		inputValue = ''
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleSubmit()
		}
	}
</script>

<div class="quick-add">
	<input
		type="text"
		class="quick-add-input"
		{placeholder}
		bind:value={inputValue}
		onkeydown={handleKeydown}
		disabled={isParsing}
	/>
	{#if isParsing}
		<div class="parsing-indicator">Parsing...</div>
	{/if}
	<div class="hint-row">
		<span class="hint">Shortcuts:</span>
		<span class="hint-item">p0–p3</span>
		<span class="hint-item">today</span>
		<span class="hint-item">tomorrow</span>
		<span class="hint-item">sp:3</span>
		<span class="hint-item">@me</span>
	</div>
</div>

<style>
	.quick-add {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.quick-add-input {
		width: 100%;
		padding: 10px 12px;
		font-size: 0.875rem;
		background: var(--bg-app);
		border: 1px solid var(--border-main);
		border-radius: var(--radius-md);
		color: var(--text-main);
		transition: border-color 0.15s ease;
	}

	.quick-add-input:focus {
		border-color: var(--brand-primary);
	}

	.quick-add-input::placeholder {
		color: var(--text-muted);
	}

	.quick-add-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.parsing-indicator {
		font-size: 0.75rem;
		color: var(--text-muted);
		padding: 2px 0;
	}

	.hint-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}

	.hint {
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.hint-item {
		font-size: 0.6875rem;
		color: var(--text-muted);
		background: var(--bg-surface-hover);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
	}
</style>