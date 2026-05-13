<script lang="ts">
  import { trpc } from '$lib/trpc'

  interface Props {
    sprintId: string
  }

  let { sprintId }: Props = $props()

  interface MemberCapacityRow {
    userId: string
    user: { name: string; email: string }
    taskCount: number
    estimatedHours: number
    capacityHours: number | null
    note: string | null
    isOverloaded: boolean
    overloadPercent: number | null
  }

  let members = $state<MemberCapacityRow[]>([])
  let isLoading = $state(true)
  let error = $state<string | null>(null)
  let isSaving = $state(false)

  $effect(() => {
    async function load() {
      isLoading = true
      error = null
      try {
        members = await trpc.capacity.forSprint.query({ sprintId })
      } catch (e) {
        error = e instanceof Error ? e.message : 'Failed to load capacity data'
      } finally {
        isLoading = false
      }
    }
    load()
  })

  async function handleCapacityChange(userId: string, rawValue: string) {
    const hours = Number(rawValue)
    if (isNaN(hours) || hours < 0) return

    isSaving = true
    try {
      await trpc.capacity.set.mutate({ sprintId, userId, capacityHours: hours })
      members = await trpc.capacity.forSprint.query({ sprintId })
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save capacity'
    } finally {
      isSaving = false
    }
  }

  async function handleNoteChange(userId: string, note: string) {
    const member = members.find(m => m.userId === userId)
    const currentHours = member?.capacityHours ?? 0

    isSaving = true
    try {
      await trpc.capacity.set.mutate({ sprintId, userId, capacityHours: currentHours, note })
      members = await trpc.capacity.forSprint.query({ sprintId })
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save note'
    } finally {
      isSaving = false
    }
  }
</script>

<div class="capacity-table-wrapper">
  {#if error}
    <div class="capacity-error">{error}</div>
  {/if}

  {#if isLoading}
    <div class="capacity-loading">Loading capacity data...</div>
  {:else}
    <table class="capacity-table">
      <thead>
        <tr>
          <th>Employee</th>
          <th class="col-num">Tasks</th>
          <th class="col-num">Est. Hours</th>
          <th class="col-input">Capacity (h)</th>
          <th class="col-input">Note</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {#each members as m (m.userId)}
          <tr class:overloaded={m.isOverloaded}>
            <td class="col-name">
              <span class="member-name">{m.user.name}</span>
            </td>
            <td class="col-num">{m.taskCount}</td>
            <td class="col-num">{m.estimatedHours}h</td>
            <td class="col-input">
              <input
                type="number"
                min="0"
                step="0.5"
                value={m.capacityHours ?? ''}
                onchange={(e) => handleCapacityChange(m.userId, (e.target as HTMLInputElement).value)}
                placeholder="Set"
                disabled={isSaving}
              />
            </td>
            <td class="col-input">
              <input
                type="text"
                value={m.note ?? ''}
                onchange={(e) => handleNoteChange(m.userId, (e.target as HTMLInputElement).value)}
                placeholder="e.g. vacation"
                disabled={isSaving}
              />
            </td>
            <td class="col-status">
              {#if m.isOverloaded}
                <span class="status-overload">&#9888;&#65039; {m.overloadPercent}%</span>
              {:else if m.capacityHours !== null}
                <span class="status-ok">&#9989;</span>
              {:else}
                <span class="status-notset">Not set</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    {#if isSaving}
      <div class="capacity-saving">Saving...</div>
    {/if}
  {/if}
</div>

<style>
  .capacity-table-wrapper {
    width: 100%;
    padding: 1rem 0;
  }

  .capacity-error {
    color: var(--color-danger, #ef4444);
    padding: 1rem;
    text-align: center;
    font-size: 0.875rem;
  }

  .capacity-loading {
    text-align: center;
    padding: 2rem;
    color: var(--text-muted);
    font-size: 0.9375rem;
  }

  .capacity-saving {
    text-align: center;
    padding: 0.5rem;
    color: var(--text-muted);
    font-size: 0.8125rem;
    font-style: italic;
  }

  .capacity-table {
    width: 100%;
    border-collapse: collapse;
  }

  .capacity-table th {
    text-align: left;
    padding: 0.625rem 0.75rem;
    border-bottom: 2px solid var(--border-main);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--text-muted);
  }

  .capacity-table td {
    padding: 0.625rem 0.75rem;
    border-bottom: 1px solid var(--border-light, rgba(0,0,0,0.06));
    font-size: 0.875rem;
    color: var(--text-main);
  }

  .col-num {
    font-variant-numeric: tabular-nums;
    text-align: right;
    white-space: nowrap;
  }

  .col-name {
    font-weight: 500;
  }

  .col-input {
    padding: 0.25rem 0.5rem;
  }

  .col-input input {
    width: 100%;
    padding: 0.3125rem 0.5rem;
    border: 1px solid var(--border-main);
    border-radius: var(--radius-lg);
    font-size: 0.8125rem;
    color: var(--text-main);
    background: white;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }

  .col-input input:focus {
    outline: none;
    border-color: var(--color-primary, #6366f1);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
  }

  .col-input input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .col-input input::placeholder {
    color: var(--text-muted);
    opacity: 0.5;
  }

  .col-status {
    font-size: 0.8125rem;
    white-space: nowrap;
  }

  .status-overload {
    color: var(--color-danger, #ef4444);
    font-weight: 600;
  }

  .status-ok {
    color: var(--color-success, #22c55e);
  }

  .status-notset {
    color: var(--text-muted);
    font-style: italic;
  }

  .overloaded {
    background: rgba(239, 68, 68, 0.04);
  }

  .overloaded td:first-child {
    border-left: 3px solid var(--color-danger, #ef4444);
  }
</style>