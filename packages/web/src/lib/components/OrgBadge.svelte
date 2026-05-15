<script lang="ts">
  let { name }: { name: string } = $props()
</script>

<span class="org-badge" title={name}>{name}</span>

<style>
  .org-badge {
    display: inline-flex;
    align-items: center;
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 4px;
    background-color: var(--td-border-muted);
    color: var(--text-muted);
    border: 1px solid var(--border-main);
    white-space: nowrap;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
