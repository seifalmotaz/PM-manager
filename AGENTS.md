## Agent skills

### Issue tracker

Issues are tracked as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses default triage labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout with CONTEXT.md and docs/adr/ at repo root. See `docs/agents/domain.md`.

### SvelteKit Coder

Always make the `coder` agent use the svelte skills that are avaliable to write the best code for svelte.

### MUST ALWAYS DO

1. Separate the frontend and backend phases in the plan.
2. ALways use the `coder` agent to write the code.
3. Make the phase not too long, we do not have limit for the number of phases in plan but we have limit for context lenght in each phase, but also do not split the phase in too many small pieces of code to commit.