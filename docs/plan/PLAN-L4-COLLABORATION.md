# Saha — Level 4: Collaboration & Polish

**Version:** 2.0
**Date:** May 15, 2026
**Status:** Approved
**Type:** Product Requirements & Specification

---

## Objective

Polish the user experience to a professional standard. @mentions enable async collaboration. Markdown descriptions make tasks self-documenting. Keyboard shortcuts speed up power users. Accessibility fixes make the app usable by everyone. Error handling ensures users know when things fail.

---

## Decision Log (Grilled Questions & Answers)

### Decision 1: @mentions — basic, smart, or cross-org?

**Question:** The audit found "placeholder text says `(@ to mention)` but no autocomplete dropdown, no notification." What scope do we build?

**Resolution (Option A from grilling):** Basic. Type `@` → dropdown of current workspace members. Selecting one inserts their name and sends a notification.

**Why basic, not smart or cross-org:** The app is targeting small teams (3–50 employees). A workspace typically has 3–15 members. The dropdown doesn't need smart prioritization at this scale. Cross-org mentions are blocked — you can only mention people in the task's workspace. This prevents accidental cross-org data leaks.

**Flow:**
1. User types `@` in the comment input
2. Dropdown appears showing workspace members
3. As user types more characters, the list filters (case-insensitive)
4. Arrow keys navigate the dropdown; Enter selects; click also works
5. Selected member's name is inserted as `@username` at the cursor position
6. On comment submit, the mentioned user receives a notification (type: `mentioned`)
7. Mentions are highlighted in the displayed comment

**What mentions trigger:**
- In-app notification (bell icon, unread count)
- Notification content: "[Author] mentioned you in [Task Title]"
- Click notification → navigates to the task's detail panel

**What mentions do NOT trigger (deferred):**
- Email notifications
- Slack integration
- Push notifications

---

### Decision 2: Export functionality — what scope?

**Question:** The audit identified "no export functionality" as a critical gap for PMs and executives. What do we build?

**Resolution:** Deferred. Export is NOT in scope for any current level.

**Rationale:** This was an explicit decision during grilling. The Product Owner said: "Do not include any export for now." Export will be considered for a future level when the core experience is complete and users are asking for it.

**Note for future:** When export is built, candidates are CSV for raw data and PDF for formatted reports. Target pages: velocity, timesheet, sprint summary.

---

### Decision 3: Rich text descriptions — markdown or WYSIWYG?

**Question:** The audit found: "Plain text descriptions only. No markdown rendering, no code blocks, no clickable links." Engineers need to paste PR links, code snippets, and formatted requirements.

**Resolution (Option A from grilling):** Markdown only. Textarea accepts markdown. A "Preview" toggle shows rendered output. No WYSIWYG toolbar.

**Why markdown, not WYSIWYG:**
- Engineers know markdown. It's their native format.
- Simpler to implement (parse + render, no editor library).
- WYSIWYG editors are heavy dependencies with accessibility issues of their own.
- Preview toggle gives visual confirmation without complexity.

**Supported markdown features:**
- Bold: `**text**`
- Italic: `*text*`
- Lists: unordered (`- item`) and ordered (`1. item`)
- Links: `[text](url)` — rendered as clickable, opens in new tab
- Code blocks: triple backtick with language hint for syntax highlighting
- Headings: `#` through `###`
- Inline code: single backtick

**Where markdown is used (L4):**
- Task description field
- Sprint goal field

**Where markdown is NOT used:**
- Comments (plain text only, only @mentions as special syntax)
- Task titles (plain text)
- Checklist items (plain text)

---

### Decision 4: Keyboard shortcuts — what's the minimum set?

**Question:** The audit found limited shortcuts (`Cmd+K`, `Cmd+N`). What shortcuts ship in L4?

**Resolution (Option A from grilling):** Core navigation shortcuts.

| Shortcut | Action | Context |
|----------|--------|---------|
| `Cmd+Enter` / `Ctrl+Enter` | Submit the active form | Any form in focus (comment, description edit, modal) |
| `/` | Focus the QuickAdd input | Any page where QuickAdd is visible (My Work, per-org Home) |
| `Esc` | Close/exit/deselect | Modal open → close modal. Task selected → deselect. Dropdown open → close. |

**Rules:**
- Shortcuts do NOT fire when the user is typing in a text field (except `Cmd+Enter` which is explicitly for form submission).
- `/` only fires when no input is focused — prevents interference with typing URLs or search queries.
- `Esc` is the universal "get me out of here" — it closes the deepest open layer first.

**What's NOT in L4 (deferred):**
- Number keys for status changes
- Arrow keys for Kanban task navigation
- `Ctrl+Z` undo
- Vim-style navigation
- Context-sensitive shortcuts beyond the core three

**Shortcut discovery:**
- A help panel accessible via `?` key (or button in sidebar footer)
- Shows all available shortcuts
- Dismissible with `Esc` or click-outside

---

### Decision 5: Accessibility — what's the minimum fix set?

**Question:** The audit found 8 critical WCAG violations and 12 high violations. What do we fix in L4?

**Resolution (Option A + B from grilling):** ARIA roles on modals + form labels.

**Fix Set A — ARIA Roles on All Modals:**
- Every modal gets: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the modal title
- Delete confirmation dialogs get: `role="alertdialog"`, `aria-describedby` for the warning text
- Close buttons get: `aria-label="Close dialog"`
- Focus moves to the modal's first interactive element when it opens
- Focus returns to the element that triggered the modal when it closes
- Modals affected: SprintCreateModal, SprintEditModal, SprintDeleteDialog, QuickAddModal, CommandPalette

**Fix Set B — Form Labels:**
- Every input, textarea, and select gets an associated `<label>` element
- Where the design doesn't show a visible label, use a screen-reader-only label (`.sr-only` class)
- Inputs affected: QuickAdd input, CommentInput textarea, TaskDetail title/description/storyPoints, TimeTracker search, ChecklistBlock add input, VelocityModeSelector date inputs

**What's NOT fixed in L4 (deferred to future):**
- Focus traps in modals (partially addressed by focus management)
- Keyboard navigation for dropdowns
- Skip links
- Color contrast issues
- Live regions for dynamic content
- Drag-and-drop keyboard alternatives

---

### Decision 6: Error handling — how does the toast system work?

**Question:** The audit found "most operations fail silently. No toast/notification system. Users don't know things failed."

**Resolution (Option A from grilling):** Simple store + component.

**Toast system design:**
- A central Svelte writable store (`toastStore`) holds an array of active toasts
- A `Toast.svelte` component renders in the root layout, always present
- Any component can call `toast.success("message")`, `toast.error("message")`, `toast.warning("message")`, `toast.info("message")`
- Toasts auto-dismiss after a configurable duration (default: 5s for success/info, 7s for error, 6s for warning)
- Toasts can be manually dismissed with a close button
- Maximum 5 toasts visible simultaneously; oldest is removed when limit reached
- Toast container positioned bottom-right, fixed
- `aria-live="polite"` on the container for screen reader announcements

**Toast types and their use:**

| Type | Icon | Color | When to Use |
|------|------|-------|-------------|
| Success | CheckCircle | Green | Task created, sprint completed, comment posted, clock-out confirmed |
| Error | AlertCircle | Red | API failure, validation error, permission denied, frozen session rejection |
| Warning | AlertTriangle | Yellow/Orange | Auto-created session, unestimated tasks, near-capacity warning |
| Info | Info | Blue | Session reminder, retroactive close prompt shown, sprint ending soon |

**Pattern for component usage:**
- Every `try/catch` block that currently does `console.error(...)` should call `toast.error(...)` instead
- Every successful mutation that the user initiated should call `toast.success(...)` for confirmation
- Warnings and info are supplementary — used sparingly to avoid toast fatigue

---

## User Stories (L4 Scope)

### @mention Stories

| ID | Story | Acceptance |
|----|-------|------------|
| M-01 | As a team member, I want to @mention teammates in comments so I can notify them of questions or updates. | Type @ → dropdown → select → name inserted. Notification sent. |
| M-02 | As a team member, I want the @mention dropdown to filter as I type so I can find people fast. | List narrows with each character. Case-insensitive. |
| M-03 | As a team member, I want @mentions to be highlighted in displayed comments so I can see who was mentioned. | @username styled distinctly (color + background). |
| M-04 | As a mentioned user, I want to receive a notification when I'm @mentioned so I know to check the task. | Bell icon updates. Notification shows author + task title. |

### Markdown Stories

| ID | Story | Acceptance |
|----|-------|------------|
| MD-01 | As an engineer, I want to write task descriptions with markdown so I can include formatted requirements, code snippets, and links. | Markdown textarea. Preview toggle. |
| MD-02 | As an engineer, I want links in descriptions to be clickable so I can reference PRs and docs. | `[text](url)` renders as clickable link. Opens in new tab. |
| MD-03 | As an engineer, I want code blocks with syntax highlighting so I can document technical details. | Triple backtick blocks render with monospace and basic highlighting. |

### Keyboard Shortcut Stories

| ID | Story | Acceptance |
|----|-------|------------|
| KS-01 | As a power user, I want `Cmd+Enter` to submit forms so I don't need to click buttons. | Works in comment input, description edit, modals. |
| KS-02 | As a power user, I want `/` to focus QuickAdd so I can create tasks without touching the mouse. | Focuses QuickAdd input. Only fires when no input is focused. |
| KS-03 | As a power user, I want `Esc` to close/dismiss anything so I can exit quickly. | Closes modals, deselects tasks, closes dropdowns. |
| KS-04 | As a user, I want to discover available shortcuts so I know what I can do. | `?` opens shortcut help panel. |

### Accessibility Stories

| ID | Story | Acceptance |
|----|-------|------------|
| A11Y-01 | As a screen reader user, I want modals to announce themselves as dialogs so I understand context. | All modals have `role="dialog"`, `aria-modal`, `aria-labelledby`. |
| A11Y-02 | As a keyboard-only user, I want focus to move into modals when they open so I can interact with them. | Focus on first interactive element. |
| A11Y-03 | As a keyboard-only user, I want focus to return to where I was when a modal closes so I don't lose my place. | Focus restores to trigger element. |
| A11Y-04 | As a screen reader user, I want all form inputs to have labels so I know what to enter. | Every input has associated label (visible or `.sr-only`). |

### Error Handling Stories

| ID | Story | Acceptance |
|----|-------|------------|
| EH-01 | As a user, I want to know when an operation succeeds so I have confidence it worked. | Success toast appears for key actions. |
| EH-02 | As a user, I want to know when an operation fails so I can retry or adjust. | Error toast appears with message. Auto-dismisses after 7s. |
| EH-03 | As a user, I want to dismiss toasts manually so they don't block my view. | Close button on each toast. |
| EH-04 | As a user, I want important warnings to get my attention without being intrusive. | Warning/Info toasts appear for non-critical events. |

---

## Features Delivered

### @mentions
- Autocomplete dropdown triggered by `@` in CommentInput
- Member list filtered as user types (case-insensitive)
- Keyboard navigation (arrows + Enter)
- Mention inserted at cursor position
- Notification sent to mentioned user
- Mention highlighted in comment display

### Markdown
- Task description textarea accepts markdown
- Preview toggle shows rendered HTML
- Supported: bold, italic, lists, links, code blocks, headings, inline code
- Same for sprint goal field

### Keyboard Shortcuts
- `Cmd+Enter`: submit active form
- `/`: focus QuickAdd (when no input focused)
- `Esc`: close/dismiss deepest open layer
- `?`: show shortcut help panel

### Accessibility
- ARIA `role="dialog"`, `aria-modal`, `aria-labelledby` on all modals
- `role="alertdialog"`, `aria-describedby` on delete confirmations
- Focus moves into modal on open
- Focus returns to trigger on close
- All form inputs have associated labels

### Error Handling
- Toast store (success/error/warning/info)
- Toast component in root layout
- Auto-dismiss with configurable duration
- Manual dismiss
- Max 5 visible
- Screen reader accessible (`aria-live`)

---

## Components Affected

| Component | Change |
|-----------|--------|
| `CommentInput.svelte` | @mention autocomplete added |
| `CommentList.svelte` | Mention highlighting in displayed comments |
| `TaskDetail.svelte` | Description uses MarkdownEditor. Sprint flag dropdown aria. |
| `SprintCreateModal.svelte` | ARIA roles added. Goal uses MarkdownEditor. |
| `SprintEditModal.svelte` | ARIA roles added. Goal uses MarkdownEditor. |
| `SprintDeleteDialog.svelte` | ARIA roles added (alertdialog). |
| `QuickAddModal.svelte` | ARIA roles added. |
| `QuickAddInput.svelte` | Label added. `/` shortcut handler. |
| `CommandPalette.svelte` | ARIA role added. |
| All forms | `Cmd+Enter` submission. |
| Root layout | Toast component added. Shortcut handler added. |

---

## Testing Requirements

### @mentions
- Dropdown appears when `@` is typed
- Dropdown filters by input text
- Arrow keys navigate dropdown correctly
- Enter selects highlighted member
- Name inserted at cursor position
- Notification created for mentioned user
- Notification bell updates unread count
- Mentions highlighted in comment display
- No dropdown when `@` typed outside CommentInput

### Markdown
- Preview toggle switches between edit and rendered views
- All supported syntax renders correctly
- Links are clickable and open in new tab
- Code blocks render with monospace font
- Switching back to edit preserves raw markdown
- Empty description shows placeholder text
- Very long markdown doesn't break layout

### Keyboard Shortcuts
- `Cmd+Enter` submits form when form is focused
- `Cmd+Enter` does nothing when no form is focused
- `/` focuses QuickAdd on My Work and per-org Home
- `/` does not fire when typing in an input
- `Esc` closes open modal
- `Esc` deselects selected task
- `Esc` closes open dropdown
- `?` opens shortcut help panel
- Shortcut panel closes with `Esc` or click-outside

### Accessibility
- All modals have correct ARIA attributes
- Close buttons have accessible names
- Focus moves into modal on open
- Focus returns on modal close
- All form inputs have associated labels
- Screen-reader-only labels are hidden visually but accessible

### Error Handling
- Success toast appears for confirmed actions
- Error toast appears for failures
- Toast auto-dismisses after correct duration
- Manual dismiss works
- Max 5 toasts enforced
- Toast container has `aria-live="polite"`
- Toasts animate in and out smoothly

---

## Edge Cases Catalog

| Edge Case | Resolution |
|-----------|------------|
| User types `@` but no members in workspace | Dropdown shows "No members found." |
| User types `@@` or `@ ` (space after @) | Dropdown does not appear. Only `@` followed by alphanumeric triggers. |
| Mentioned user is not a member of the task's workspace | Mention is blocked. Comment is created without notification for that user. |
| Two users have the same name (e.g., two "John Smith") | Email is shown in the dropdown for disambiguation. |
| Markdown contains malicious HTML (XSS via `<script>`) | Markdown renderer sanitizes output. Raw HTML is not rendered. |
| Very long code block (500+ lines) | Code block scrolls horizontally and vertically. No truncation. |
| `Cmd+Enter` on a form with validation errors | Shortcut triggers validation. If errors, form shows them; does not submit. |
| `/` key pressed while in a modal | QuickAdd should NOT focus (user is in a modal context). `Esc` should handle the modal first. |
| Toast fired during page navigation | Toast persists across navigation (root layout keeps it mounted). |
| Multiple rapid success toasts (e.g., 5 tasks created quickly) | Each gets its own toast. Oldest removed if limit reached. Consider debouncing identical messages. |
| Screen reader announces toast but user is in middle of another task | `aria-live="polite"` means it won't interrupt. It announces when the screen reader is idle. |
