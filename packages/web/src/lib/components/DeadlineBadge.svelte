<script lang="ts">
  import { overdueCount } from '$lib/stores/tasks'
</script>

{#if $overdueCount > 0}
  <span class="deadline-badge" title="{$overdueCount} tasks past deadline">
    {$overdueCount} overdue
  </span>
{/if}

<style>
  .deadline-badge {
    background: var(--color-danger, #ef4444);
    color: white;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
  }
</style>
