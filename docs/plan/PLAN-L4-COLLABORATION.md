# Saha — Level 4: Collaboration & Polish

**Version:** 1.0  
**Date:** May 15, 2026  
**Status:** Approved  
**Theme:** @mentions, markdown, keyboard shortcuts, accessibility, error handling. The app feels finished.

---

## Objective

Polish the user experience. @mentions enable async collaboration. Markdown descriptions make tasks self-documenting. Keyboard shortcuts speed up power users. Accessibility fixes make the app usable by everyone. Error handling ensures users know when things fail.

---

## 1. @Mentions in Comments

### Scope: Basic

Type `@` → dropdown of current workspace members. Selecting one inserts their name. Notification sent to the mentioned user.

### Flow

```
Engineer types: "Good catch @jordan, this needs a backend change"
                    ↑
            Dropdown appears when @ is typed
            Shows workspace members
            Filters as you type
            Enter to select, or click
            Name inserted as: @username
            Mentioned user receives notification
```

### Component Integration

**File:** `CommentInput.svelte` (existing, to be enhanced)

```svelte
<!-- /packages/web/src/lib/components/CommentInput.svelte -->
<script lang="ts">
  import { onKeyDown } from '$lib/actions/keyboard'
  
  let content = $state('')
  let textareaEl = $state<HTMLTextAreaElement | null>(null)
  
  // Mention state
  let mentionSearch = $state('')
  let showMentionDropdown = $state(false)
  let members = $state<Member[]>([])
  let selectedMentionIndex = $state(0)
  let cursorBeforeMention = $state(0)
  
  function handleInput(e: InputEvent) {
    const value = (e.target as HTMLTextAreaElement).value
    const cursorPos = (e.target as HTMLTextAreaElement).selectionStart || 0
    
    // Check if @ was just typed
    const textBeforeCursor = value.slice(0, cursorPos)
    const atMatch = textBeforeCursor.match(/@(\w*)$/)
    
    if (atMatch) {
      mentionSearch = atMatch[1] || ''
      cursorBeforeMention = cursorPos - atMatch[0].length
      showMentionDropdown = true
      loadMembers()
    } else {
      showMentionDropdown = false
    }
    
    content = value
  }
  
  async function loadMembers() {
    // Fetch workspace members
    const result = await trpc.workspace.members.query({
      workspaceId: $activeWorkspace.id,
      search: mentionSearch,
    })
    members = result
    selectedMentionIndex = 0
  }
  
  function insertMention(member: Member) {
    const beforeText = content.slice(0, cursorBeforeMention)
    const afterText = content.slice(textareaEl?.selectionStart || 0)
    content = `${beforeText}@${member.name} ${afterText}`
    showMentionDropdown = false
    
    // Focus back on textarea
    setTimeout(() => textareaEl?.focus(), 0)
  }
  
  function handleKeyDown(e: KeyboardEvent) {
    if (!showMentionDropdown) return
    
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      selectedMentionIndex = Math.min(selectedMentionIndex + 1, members.length - 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      selectedMentionIndex = Math.max(selectedMentionIndex - 1, 0)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (members[selectedMentionIndex]) {
        insertMention(members[selectedMentionIndex])
      }
    } else if (e.key === 'Escape') {
      showMentionDropdown = false
    }
  }
</script>

<div class="comment-input">
  <textarea
    bind:this={textareaEl}
    value={content}
    oninput={handleInput}
    onkeydown={handleKeyDown}
    placeholder="Write a comment... (@ to mention)"
    rows="3"
  ></textarea>
  
  {#if showMentionDropdown}
    <div class="mention-dropdown">
      {#each members as member, index}
        <button
          class="mention-option"
          class:selected={index === selectedMentionIndex}
          on:click={() => insertMention(member)}
        >
          <span class="name">{member.name}</span>
          <span class="email">{member.email}</span>
        </button>
      {:else}
        <div class="no-results">No members found</div>
      {/each}
    </div>
  {/if}
  
  <button class="submit-btn" onclick={submitComment}>
    Post Comment
  </button>
</div>
```

### Backend: Mention Parsing & Notification

```typescript
// /packages/api/src/modules/comment/comment.service.ts
async function createComment(data: CreateCommentInput, authorId: string, organizationId: string) {
  // 1. Create comment
  const comment = await db.insert(comments).values({
    entityType: data.entityType,
    entityId: data.entityId,
    content: data.content,
    authorId,
  }).returning()
  
  // 2. Parse @mentions from content
  const mentions = extractMentions(data.content)
  
  // 3. For each mentioned user, create notification
  for (const mention of mentions) {
    const mentionedUser = await resolveMentionedUser(mention, organizationId)
    if (mentionedUser) {
      await createNotification({
        userId: mentionedUser.id,
        type: 'mentioned',
        title: `${getUserName(authorId)} mentioned you`,
        body: getSnippet(data.content),
        entityType: data.entityType,
        entityId: data.entityId,
      })
    }
  }
  
  return comment
}

function extractMentions(content: string): string[] {
  const mentions = content.match(/@(\w+)/g) || []
  return mentions.map(m => m.replace('@', ''))
}

async function resolveMentionedUser(username: string, orgId: string): Promise<User | null> {
  // Case-insensitive search, prefer current org members
  const users = await db
    .select()
    .from(users)
    .where(eq(sql`LOWER(${users.name})`, username.toLowerCase()))
  
  return users[0] || null
}
```

### Display: Mention Highlighting in Comments

```svelte
<!-- /packages/web/src/lib/components/CommentList.svelte -->
{#each comments as comment}
  <div class="comment">
    <span class="author">{comment.authorName}</span>
    <div class="content">
      {@html highlightMentions(comment.content)}
    </div>
    <span class="time">{formatTimeAgo(comment.createdAt)}</span>
  </div>
{/each}

<script>
function highlightMentions(text: string): string {
  return text.replace(/@(\w+)/g, '<span class="mention">@$1</span>')
}
</script>

<style>
  .mention {
    color: var(--mention-color);
    font-weight: 500;
    background: var(--mention-bg);
    padding: 0 2px;
    border-radius: 3px;
  }
</style>
```

---

## 2. Rich Text Descriptions

### Scope: Markdown Only

Textarea accepts markdown. Preview toggle shows rendered output. No WYSIWYG editor.

### Component

```svelte
<!-- /packages/web/src/lib/components/MarkdownEditor.svelte -->
<script lang="ts">
  import { marked } from 'marked'  // or a lightweight markdown parser
  
  let content = $state('')
  let isPreview = $state(false)
  let renderedHtml = $state('')
  
  function togglePreview() {
    isPreview = !isPreview
    if (isPreview) {
      renderedHtml = marked(content)
    }
  }
  
  function handleInput(e: InputEvent) {
    content = (e.target as HTMLTextAreaElement).value
    if (isPreview) {
      renderedHtml = marked(content)
    }
  }
</script>

<div class="markdown-editor">
  <div class="toolbar">
    <button onclick={togglePreview}>
      {isPreview ? 'Edit' : 'Preview'}
    </button>
    <span class="hint">Markdown supported</span>
  </div>
  
  {#if isPreview}
    <div class="preview">{@html renderedHtml}</div>
  {:else}
    <textarea
      value={content}
      oninput={handleInput}
      placeholder="Write description... (markdown supported)"
      rows="5"
    ></textarea>
  {/if}
</div>
```

### Supported Markdown Features

- **Bold:** `**text**`
- **Italic:** `*text*`
- **Lists:** `- item` or `1. item`
- **Links:** `[text](url)` → rendered as clickable
- **Code blocks:** ` ``` ` with basic syntax highlighting
- **Headings:** `# H1`, `## H2`, `### H3`

### Integration Points

- TaskDetail description field → MarkdownEditor
- CommentInput → plain text only (not markdown, only @mentions)
- Sprint goal field → MarkdownEditor

---

## 3. Keyboard Shortcuts

### Scope: Core Navigation

| Shortcut | Action | Context |
|----------|--------|---------|
| `Cmd+Enter` / `Ctrl+Enter` | Submit active form | Any form in focus (comment, description, modal) |
| `/` | Focus QuickAdd input | Anywhere on My Work or Home page |
| `Esc` | Close modal, deselect task, close dropdown | Any modal, panel, or dropdown open |
| `Cmd+K` / `Ctrl+K` | Open Command Palette | Anywhere |

### Implementation

```svelte
<!-- /packages/web/src/lib/actions/keyboard.svelte.ts -->
<script lang="ts" context="module">
  // Action factory for keyboard shortcuts
  export function keyboardShortcut(node: HTMLElement, params: {
    key: string
    meta?: boolean
    ctrl?: boolean
    handler: () => void
    preventDefault?: boolean
    enabled?: boolean
  }) {
    function handleKeyDown(e: KeyboardEvent) {
      if (params.enabled === false) return
      
      const metaMatch = params.meta ? (e.metaKey || e.ctrlKey) : !(e.metaKey || e.ctrlKey)
      const ctrlMatch = params.ctrl ? e.ctrlKey : true
      
      if (e.key === params.key && metaMatch && ctrlMatch) {
        if (params.preventDefault !== false) {
          e.preventDefault()
        }
        params.handler()
      }
    }
    
    node.addEventListener('keydown', handleKeyDown)
    
    return {
      destroy() {
        node.removeEventListener('keydown', handleKeyDown)
      },
      update(newParams: typeof params) {
        params = newParams
      }
    }
  }
</script>
```

### Global Handler

```typescript
// /packages/web/src/lib/hooks/keyboard-handler.ts
export function setupGlobalKeyboardShortcuts() {
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    // / to focus quick-add
    if (e.key === '/' && !(e.metaKey || e.ctrlKey) && !isInputFocused()) {
      e.preventDefault()
      document.querySelector('[data-quick-add]')?.focus()
    }
    
    // Esc to close everything
    if (e.key === 'Escape') {
      closeAllModals()
      deselectTask()
      closeAllDropdowns()
    }
  })
}
```

### Shortcut Help Panel

Accessible via `?` key or button in sidebar footer.

```
Keyboard Shortcuts
─────────────────────────────────
Cmd+K       Command Palette
Cmd+Enter   Submit form
/           Focus QuickAdd
Esc         Close / Cancel
↑ ↓         Navigate lists
Enter       Select
```

---

## 4. Accessibility Fixes

### Scope: ARIA Roles + Form Labels

Two critical fix sets from the audit, addressing 20+ WCAG violations.

### A: ARIA Roles on Modals

Apply to: `SprintCreateModal`, `SprintEditModal`, `SprintDeleteDialog`, `QuickAddModal`, `CommandPalette`

**Template Change for Every Modal:**

```svelte
<!-- Before (current code): -->
{#if isOpen}
  <div class="modal-overlay" onclick={handleClose}>
    <div class="modal-container" onclick={e => e.stopPropagation()}>
      <div class="modal-header">
        <span class="modal-title">{name}</span>
      </div>
    </div>
  </div>
{/if}

<!-- After (accessible): -->
{#if isOpen}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="dialog-title-{id}"
    onkeydown={handleKeyDown}
  >
    <div class="modal-container" role="document">
      <div class="modal-header">
        <h2 id="dialog-title-{id}" class="modal-title">{name}</h2>
        <button
          class="close-button"
          aria-label="Close dialog"
          on:click={handleClose}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  </div>
{/if}
```

**Focus Management in Modals:**

```typescript
function openModal() {
  isOpen = true
  // Focus the first focusable element after render
  requestAnimationFrame(() => {
    const firstFocusable = modalEl.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    firstFocusable?.focus()
    // Store element that opened the modal for focus restoration
    previousFocus = document.activeElement
  })
}

function closeModal() {
  isOpen = false
  // Restore focus to trigger element
  previousFocus?.focus()
}
```

### B: Form Labels

Add `<label for="id">` associations to all inputs currently missing labels.

**Files Affected:**

| File | Input | Fix |
|------|-------|-----|
| `CommentInput.svelte` | Textarea | Add `<label class="sr-only" for="comment-input">Comment</label>` |
| `QuickAddInput.svelte` | Text input | Add `<label class="sr-only" for="quick-add">Quick Add Task</label>` |
| `TimeTracker.svelte` | Search input | Add `<label class="sr-only" for="timer-search">Search tasks</label>` |
| `TaskDetail.svelte:270-284` | Story points input | Add `<label for="story-points">Story Points</label>` |
| `TaskDetail.svelte:153-159` | Title textarea | Add `<label for="task-title">Title</label>` |
| `TaskDetail.svelte:295-300` | Description textarea | Add `<label for="task-description">Description</label>` |
| `ChecklistBlock.svelte:90` | Checklist add input | Add `<label class="sr-only" for="checklist-add">New checklist item</label>` |

**Pattern:**

```svelte
<!-- Label with visible text -->
<label for="task-title">Title</label>
<textarea id="task-title" bind:value={task.title} />

<!-- Screen-reader-only label (when design doesn't show label) -->
<label class="sr-only" for="quick-add">Quick Add Task</label>
<input id="quick-add" type="text" placeholder="e.g. Fix login bug p1 today @jordan" />
```

---

## 5. Error Handling (Toast Notifications)

### Scope: Simple Store + Component

A central toast system that any component can fire.

### Toast Store

```typescript
// /packages/web/src/lib/stores/toast.svelte.ts
import { writable } from 'svelte/store'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number  // ms, default 5000
  dismissible?: boolean  // default true
}

let toastId = 0

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([])
  
  function addToast(type: Toast['type'], message: string, duration = 5000) {
    const id = `toast-${++toastId}`
    const toast: Toast = { id, type, message, duration, dismissible: true }
    
    update(toasts => {
      // Limit to 5 toasts
      if (toasts.length >= 5) {
        toasts = toasts.slice(1)
      }
      return [...toasts, toast]
    })
    
    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration)
    }
    
    return id
  }
  
  function dismissToast(id: string) {
    update(toasts => toasts.filter(t => t.id !== id))
  }
  
  return {
    subscribe,
    success: (msg: string) => addToast('success', msg),
    error: (msg: string) => addToast('error', msg, 7000),
    info: (msg: string) => addToast('info', msg),
    warning: (msg: string) => addToast('warning', msg, 6000),
    dismiss: dismissToast,
  }
}

export const toast = createToastStore()
```

### Toast Component

```svelte
<!-- /packages/web/src/lib/components/Toast.svelte -->
<script lang="ts">
  import { toast } from '$lib/stores/toast.svelte'
  import { fly, fade } from 'svelte/transition'
  import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-svelte'
  
  const icons: Record<string, typeof CheckCircle> = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  }
  
  const colors: Record<string, string> = {
    success: 'var(--color-success)',
    error: 'var(--color-error)',
    info: 'var(--color-info)',
    warning: 'var(--color-warning)',
  }
</script>

{#if $toast.length > 0}
  <div class="toast-container" aria-live="polite">
    {#each $toast as t (t.id)}
      <div
        class="toast toast-{t.type}"
        style="--toast-color: {colors[t.type]}"
        in:fly={{ y: 20, duration: 200 }}
        out:fade={{ duration: 150 }}
      >
        <svelte:component this={icons[t.type]} size={18} />
        <span class="message">{t.message}</span>
        {#if t.dismissible}
          <button
            class="dismiss"
            aria-label="Dismiss"
            on:click={() => toast.dismiss(t.id)}
          >
            <X size={14} />
          </button>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 400px;
  }
  
  .toast {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: var(--bg-surface);
    border: 1px solid var(--color-border);
    border-left: 4px solid var(--toast-color);
    border-radius: 8px;
    box-shadow: var(--shadow-lg);
    font-size: 14px;
  }
  
  .toast .message {
    flex: 1;
  }
  
  .dismiss {
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.5;
    padding: 2px;
  }
  
  .dismiss:hover {
    opacity: 1;
  }
</style>
```

### Integration in Root Layout

```svelte
<!-- /packages/web/src/routes/+layout.svelte -->
<script>
  import Toast from '$lib/components/Toast.svelte'
</script>

<Toast />
<slot />
```

### Usage Examples Across Components

```typescript
// Sprint creation success
await trpc.sprint.create.mutate(data)
toast.success(`Sprint "${data.name}" created`)

// Task completion failure
try {
  await trpc.task.changeStatus.mutate({ taskId, status: 'done' })
  toast.success('Task completed')
} catch (err) {
  toast.error('Failed to complete task: ' + err.message)
}

// Auto-capture warning
toast.warning('Task completed, but no active session. Auto-created session entry.')

// Clock-out reminder
toast.info('You have a running session. Remember to clock out when done!')
```

---

## Testing Requirements

### @mentions

- [ ] Typing @ triggers member dropdown
- [ ] Dropdown filters by input text
- [ ] Arrow keys navigate dropdown
- [ ] Enter selects highlighted member
- [ ] Mention inserted at cursor position
- [ ] Notification sent to mentioned user
- [ ] Mention highlighted in comment display

### Markdown

- [ ] Preview toggle shows rendered markdown
- [ ] Bold/italic/headings render correctly
- [ ] Links render as clickable
- [ ] Code blocks render with monospace
- [ ] Switching back to edit preserves raw text

### Keyboard Shortcuts

- [ ] Cmd+Enter submits active form
- [ ] / focuses QuickAdd when not in input
- [ ] Esc closes modals
- [ ] Esc deselects task in detail panel
- [ ] Shortcuts don't fire when typing in text fields

### Accessibility

- [ ] All modals have `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- [ ] Close buttons have `aria-label`
- [ ] All form inputs have associated labels (visible or sr-only)
- [ ] Focus moves to modal on open
- [ ] Focus restores on modal close
- [ ] Color contrast passes WCAG AA for text-muted

### Error Handling

- [ ] Success toast appears for successful operations
- [ ] Error toast appears for failures
- [ ] Toast auto-dismisses after specified duration
- [ ] Toast can be manually dismissed
- [ ] Max 5 toasts visible simultaneously
- [ ] Toast container has `aria-live="polite"`

---

## Dependencies

- L0 (Foundation) must be complete
- L1 (Multi-Org Core) must be complete
- L2 (Task & Sprint Flow) must be complete
- L3 (Visibility & Intelligence) must be complete

---

## Deliverables

1. ✅ @mention autocomplete in CommentInput
2. ✅ Mention notification backend
3. ✅ Mention highlighting in comment display
4. ✅ Markdown editor with preview toggle
5. ✅ Markdown rendering in TaskDetail description
6. ✅ Cmd+Enter submit shortcut
7. ✅ `/` QuickAdd focus shortcut
8. ✅ Esc close everything shortcut
9. ✅ Shortcut help panel
10. ✅ ARIA roles on all modals
11. ✅ Focus management in modals
12. ✅ Form label associations on all inputs
13. ✅ Toast store
14. ✅ Toast component
15. ✅ Toast integration in root layout
16. ✅ Toast calls in error/success paths

---

## Next Level

L4 makes the app feel professional and usable. L5 (HR & Executive) builds the "company pays" features: organization dashboard, employee directory, and HR visibility tools.
