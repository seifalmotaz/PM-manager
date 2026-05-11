# statusChangedAt Timestamp for Dwell Time

Tasks track when they entered their current status via a `statusChangedAt` timestamp column. This enables dwell time computation ("2 days in In Progress") for workflow bottleneck analysis.

The column is added in Phase 2 alongside task management. It's updated on every `POST /tasks/:id/status` transition. Cumulative dwell time (tracking all sessions across all status changes) is deferred to a future phase — v1 only tracks the current session.

**Alternatives considered:**

1. **Query audit_logs for transitions** — Would work but requires scanning large audit tables for a common read path. Performance degrades as audit logs grow.

2. **No dwell time in v1** — Delaying this column would require a migration and backfill later if we decide to add it.

**Decision:** Add the column now. The cost is minimal (one timestamp column), and it unblocks a core PM feature.