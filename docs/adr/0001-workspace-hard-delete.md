# Workspace hard-delete vs. Project soft-delete

Saha treats deletion differently at different hierarchy levels. **Projects** are soft-deleted (hidden but recoverable, with an archive option for completed work). **Workspaces** are hard-deleted with cascade (permanently destroying all contained Projects, Tasks, Sprints, and audit logs, after requiring the user to type the Workspace name to confirm).

The asymmetry is deliberate. Projects carry ongoing work with history worth preserving — they should be archived when done, and soft-deleted when created by mistake, giving the PM a recovery path. Workspaces are organizational scaffolding. If a Workspace was created by mistake (wrong team split, duplicate setup), the PM should be able to remove it completely rather than leaving orphaned containers accumulating in the system. The hard confirmation gate (typing the workspace name) prevents accidents while respecting the PM's judgment that a Workspace is truly unwanted.

Rejected alternative: soft-delete for Workspaces too. This would create zombie containers — workspaces with no members, no projects, but still appearing in filters and admin views. Over time, these accumulate and create confusion. Hard-delete with confirmation is cleaner.
