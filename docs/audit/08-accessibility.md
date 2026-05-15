# Accessibility Compliance Audit Report

**Audit Date:** May 15, 2026  
**Audited Module:** Accessibility (WCAG 2.1 Compliance)  
**Severity Distribution:** 8 Critical, 12 High, 6 Medium, 4 Low

---

## Executive Summary

This PM-manager application has **significant accessibility gaps** across multiple WCAG guidelines. The codebase shows **inconsistent ARIA usage, missing form labels, inadequate focus management, and no keyboard alternatives for interactive features**. While some components demonstrate awareness of accessibility (proper button roles, navigation landmarks), the majority of interactive elements **lack screen reader support and keyboard navigation**.

---

## 1. Keyboard Navigation

### CRITICAL Issues

| Severity | Issue | Location | WCAG Violation |
|----------|-------|----------|----------------|
| **Critical** | No keyboard alternative for drag-and-drop | `KanbanColumn.svelte` (lines 133-139) | 2.1.1 Keyboard |
| **Critical** | Dropdown menus lack keyboard navigation | `NotificationBell.svelte`, `TimeTracker.svelte`, `WorkspaceFilter.svelte` | 2.1.1 Keyboard |
| **High** | Modal focus traps not implemented | All modal components | 2.4.3 Focus Order |
| **High** | No focus restoration after modal close | `SprintEditModal.svelte`, `SprintCreateModal.svelte`, `QuickAddModal.svelte` | 2.4.3 Focus Order |

### Code Example - Drag-and-drop Issue

**KanbanColumn.svelte:**
```svelte
<div
  class="card-wrapper"
  onpointerdown={(e) => startDrag(e, task.id)}
  style="touch-action: none"
>
```
**No keyboard event handler provided for users who cannot use a mouse.**

---

## 2. Screen Reader Support & ARIA

### Critical Missing ARIA Attributes

| Severity | Issue | Location | WCAG Violation |
|----------|-------|----------|----------------|
| **Critical** | No dialog role on modals | All 4 modal/dialog components | 4.1.2 Name, Role, Value |
| **Critical** | No aria-modal attribute | `SprintEditModal`, `SprintCreateModal`, `QuickAddModal`, `SprintDeleteDialog` | 4.1.2 |
| **High** | Buttons missing accessible names | Icon-only buttons without aria-label | 4.1.2 |
| **High** | No aria-live regions for notifications | `NotificationBell.svelte` | 4.1.3 Status Messages |

### Current ARIA Usage

Only minimal ARIA usage found:
- `/routes/(app)/+layout.svelte`: `aria-current="page"` on nav links (good)
- `/routes/(app)/project/[id]/sprints/+layout.svelte`: `aria-current` on sub-tabs (good)
- `TaskCard.svelte` (line 104): Single `aria-label="More"` on action button

### Missing ARIA Attributes by Component

| Component | Missing ARIA |
|------------|--------------|
| `SprintEditModal.svelte` | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |
| `SprintDeleteDialog.svelte` | `role="alertdialog"`, `aria-modal="true"`, `aria-describedby` |
| `SprintCreateModal.svelte` | `role="dialog"`, `aria-modal="true"` |
| `QuickAddModal.svelte` | `role="dialog"`, `aria-modal="true"` |
| `CommandPalette.svelte` | `role="dialog"`, `aria-label` on input |
| `NotificationBell.svelte` | `aria-live` region for notification count, `aria-haspopup` on button |
| `WorkspaceFilter.svelte` | `aria-expanded`, `aria-controls` on trigger |

---

## 3. Focus Management

### Issues Found

| Severity | Issue | Location | WCAG Violation |
|----------|-------|----------|----------------|
| **Critical** | No focus trap in modals | All modal dialogs | 2.4.3 Focus Order |
| **High** | Focus not moved to modal on open | All modals except `CommandPalette` | 2.4.3 |
| **High** | Focus not restored on modal close | All modals | 2.4.3 |
| **Medium** | autofocus only used once | `SprintCreateModal.svelte:93` | 2.4.3 |

### Code Analysis

Only `SprintCreateModal` uses `autofocus`:
```svelte
<input
  id="sprint-name"
  autofocus
  ...
/>
```

`CommandPalette` uses manual focus with setTimeout:
```svelte
$effect(() => {
  if (isOpen) {
    setTimeout(() => inputEl?.focus(), 10)
```

Neither have focus restoration on close.

---

## 4. Form Accessibility

### Critical Issues

| Severity | Issue | Location | WCAG Violation |
|----------|-------|----------|----------------|
| **Critical** | Input fields without labels | Multiple files | 1.3.1 Info and Relationships |
| **Critical** | Error messages not linked to inputs | Forms with error states | 3.3.1 Error Identification |
| **High** | Textarea without label | `CommentInput.svelte:52-61` | 1.3.1 |

### Files with Proper Label Association

| File | Lines | Status |
|------|-------|--------|
| `SprintEditModal.svelte` | 109, 122-123, 132-133, 145 | **Good** - Labels with `for` attribute |
| `SprintCreateModal.svelte` | 85, 99, 108, 118-120 | **Good** - Labels with `for` attribute |

### Files with Missing Labels

| File | Lines | Input Type | Issue |
|------|-------|------------|-------|
| `QuickAddInput.svelte` | 172-181 | Text input | No label, only placeholder |
| `CommentInput.svelte` | 52-61 | Textarea | No label, only placeholder |
| `TimeTracker.svelte` | 155-160 | Search input | No label |
| `VelocityModeSelector.svelte` | 90, 92 | Date inputs | No labels |
| `VelocityModeSelector.svelte` | 72-84 | Select | Label text not associated with `for` |
| `TaskDetail.svelte` | 270-284 | Number input | No label (story points) |
| `TaskDetail.svelte` | 153-159 | Textarea | No label (title) |
| `TaskDetail.svelte` | 295-300 | Textarea | No label (description) |

### Example of Missing Label

**CommentInput.svelte:**
```svelte
<textarea
  bind:this={textareaEl}
  value={content}
  oninput={handleInput}
  placeholder="Write a comment... (@ to mention)"
  disabled={isSubmitting}
  rows="2"
></textarea>
<!-- No label element associated -->
```

---

## 5. Interactive Elements

### Button Audit

**Good Patterns:**
```svelte
<!-- TaskCard.svelte:104 - Has aria-label -->
<button class="action-icon" aria-label="More">
  <MoreVertical size={16} />
</button>
```

**Problematic Patterns:**

| Severity | Issue | Location | WCAG |
|----------|-------|----------|------|
| **High** | Icon-only buttons without accessible names | Multiple files | 4.1.2 |

### Files with Unlabeled Icon Buttons

| File | Lines | Description |
|------|-------|-------------|
| `SprintEditModal.svelte` | 98 | Close button (X icon) |
| `SprintCreateModal.svelte` | 78 | Close button (X icon) |
| `QuickAddModal.svelte` | 36 | Close button (X icon) |
| `NotificationBell.svelte` | 137-148 | Bell button (has `title` but not `aria-label`) |
| `ActivityTimeline.svelte` | 105 | Toggle button |
| `KanbanColumn.svelte` | 121-125 | Icon buttons in column header |
| `TaskDetail.svelte` | 134-145 | Complete and delete buttons need better labels |

### Cards as Interactive Elements

**Good Implementation:**
**TaskCard.svelte** (lines 58-64):
```svelte
<div
  class="task-card-v2"
  role="button"
  tabindex="0"
  onclick={onclick}
  onkeydown={handleKeydown}
>
```
This correctly implements keyboard support with Enter/Space keys.

---

## 6. Modals and Overlays

### Modal Accessibility Deficiencies

| Severity | Issue | Files Affected | WCAG |
|----------|-------|----------------|------|
| **Critical** | Missing `role="dialog"` | All 4 modal/dialog components | 4.1.2 |
| **Critical** | Missing `aria-modal="true"` | All modals | 4.1.2 |
| **Critical** | Missing `aria-labelledby` | All modals | 4.1.2 |
| **Critical** | No focus trap | All modals | 2.4.3 |
| **High** | Background not marked inert | All modals | 2.4.3 |
| **Medium** | Svelte a11y warnings ignored | Lines 72-73 in multiple files | N/A |

### Example Modal Implementation

**SprintEditModal.svelte** (lines 88-95):
```svelte
{#if isOpen && sprint}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={handleClose} onkeydown={handleKeydown}>
    <div class="modal-container" onclick={e => e.stopPropagation()}>
      <div class="modal-header">
        <span class="modal-title">
          {sprint.name}
```

**What's Missing:**
- `<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">`
- `<span id="dialog-title" class="modal-title">...</span>`
- Focus trap implementation
- Focus restoration

---

## 7. Color Contrast

### Potential Issues Based on CSS

| File | Line | Issue | WCAG |
|------|------|-------|------|
| `app.css` | 13-14 | `--td-text-muted: #808080` on dark background may fail contrast | 1.4.3 |
| `app.css` | 24 | `--text-muted` inherits low contrast color | 1.4.3 |
| Multiple | N/A | Small text (0.6875rem, 0.75rem) with muted colors | 1.4.3 |

**Example:**
```css
--td-text-muted: #808080;  /* On #1f1f1f background = 3.54:1 */
```

WCAG AA requires 4.5:1 for normal text, 3:1 for large text.

---

## 8. Color-Only Information Indicators

### Priority Badges

**TaskCard.svelte** (lines 14-21):
```javascript
const colors: Record<string, string> = {
  p0: '#db4c3f', // Todoist Red
  p1: '#ff9a00', // Todoist Orange
  p2: '#246fe0', // Todoist Blue
  p3: '#808080', // Todoist Gray
}
```

**Good:** Text labels "P0", "P1", etc. are present alongside colors.

**Issue:** Screen readers may not associate the color meaning with the text.

**Recommended Fix:**
```svelte
<span class="priority-badge" aria-label="Priority {task.priority}">
  {(task.priority ?? 'P3').toUpperCase()}
</span>
```

---

## 9. Skip Links

**Status:** **NOT IMPLEMENTED**

No skip link exists in:
- `/routes/+layout.svelte`
- `/routes/(app)/+layout.svelte`

**WCAG 2.4.1 Bypass Blocks violation.**

---

## 10. Live Regions for Dynamic Content

### Missing

| Component | Location | Needed ARIA |
|------------|----------|-------------|
| `NotificationBell` | Notification count badge | `aria-live="polite"` on badge container |
| `QuickAddInput` | Parsing chips | `aria-live="polite"` for parsed priority/date display |
| `TimeTracker` | Timer display | `aria-live="off"` or `aria-atomic` for elapsed time |
| `CommandPalette` | Results list | `aria-live="polite"` for results count |

### Example Issue

**NotificationBell.svelte** (lines 143-147):
```svelte
{#if unreadCount > 0}
  <span class="badge">
    {unreadCount > 99 ? '99+' : unreadCount}
  </span>
{/if}
```

Should be:
```svelte
<span class="badge" aria-live="polite" aria-atomic="true">
  {unreadCount > 99 ? '99+' : unreadCount}
</span>
```

---

## Summary of Critical Violations

| WCAG Criterion | Level | Count | Severity |
|-----------------|-------|-------|----------|
| 1.3.1 Info and Relationships | A | 12 | Critical |
| 2.1.1 Keyboard | A | 4 | Critical |
| 2.4.1 Bypass Blocks | A | 1 | High |
| 2.4.3 Focus Order | A | 8 | Critical |
| 3.3.1 Error Identification | A | 4 | High |
| 4.1.2 Name, Role, Value | A | 15+ | Critical |
| 4.1.3 Status Messages | AA | 3 | High |
| 1.4.3 Contrast (Minimum) | AA | 2+ | Medium |

---

## Recommendations

### Priority 1: Critical (Immediate)

1. **Add ARIA roles to all modals:**
   - `role="dialog"` / `role="alertdialog"`
   - `aria-modal="true"`
   - `aria-labelledby` pointing to title
   - Implement focus trap

2. **Add labels to all form inputs:**
   - Use `<label for="id">` pattern
   - Or use `aria-label` for inputs without visible labels

3. **Implement keyboard navigation for dropdowns:**
   - Arrow keys to navigate
   - Enter/Space to select
   - Escape to close

4. **Add focus management to modals:**
   - Focus first interactive element on open
   - Restore focus to trigger on close

### Priority 2: High (Short-term)

5. **Add accessible names to icon-only buttons:**
   - `aria-label` attribute on all buttons without visible text

6. **Link error messages to form fields:**
   - Use `aria-describedby` to associate errors with inputs

7. **Add skip link to main content:**
   ```html
   <a href="#main-content" class="skip-link">Skip to main content</a>
   ```

8. **Verify color contrast:**
   - Increase text-muted color luminance or decrease background luminance

### Priority 3: Medium (Medium-term)

9. **Add live regions for dynamic updates:**
   - Notification counts
   - Loading states
   - Search results

10. **Add keyboard alternatives for drag-and-drop:**
    - Provide a menu or dialog alternative

11. **Standardize focus indicators:**
    - Ensure visible focus rings on all interactive elements

---

## File Reference Summary

### Components with Accessibility Issues

| File | Lines | Issues |
|------|-------|--------|
| `SprintEditModal.svelte` | 88-175 | Missing dialog role, no focus trap, no focus restoration |
| `SprintCreateModal.svelte` | 71-138 | Missing dialog role, no focus trap |
| `SprintDeleteDialog.svelte` | 37-72 | Missing alertdialog role, buttons need accessible names |
| `QuickAddModal.svelte` | 29-44 | Missing dialog role, no focus management |
| `CommandPalette.svelte` | 217-290 | Missing dialog role, results need live region |
| `NotificationBell.svelte` | 136-221 | Dropdown lacks keyboard support, notification badge needs live region |
| `WorkspaceFilter.svelte` | 11-48 | Dropdown needs aria-expanded, keyboard navigation |
| `TimeTracker.svelte` | 127-188 | Dropdown needs keyboard navigation, input lacks label |
| `TaskDetail.svelte` | 132-326 | Multiple inputs without labels, popover needs keyboard handling |
| `CommentInput.svelte` | 52-78 | Textarea without label |
| `QuickAddInput.svelte` | 169-231 | Input without label |
| `ChecklistBlock.svelte` | 90-149 | Add input without label |
| `KanbanColumn.svelte` | 105-148 | Drag-and-drop needs keyboard alternative |
| `VelocityModeSelector.svelte` | 61-127 | Inputs without labels, checkboxes need explicit association |

---

## Conclusion

This application requires **significant accessibility improvements** to meet WCAG 2.1 Level AA standards. The most critical issues are:

1. **Modal dialogs** completely lack screen reader support
2. **Form inputs** predominantly lack proper labels
3. **Focus management** is almost non-existent
4. **Dropdowns** have no keyboard navigation
5. **Drag-and-drop** features have no alternative input methods

The codebase uses Svelte's `<!-- svelte-ignore a11y_* -->` comments in several places, **actively disabling accessibility warnings rather than addressing the underlying issues**. This pattern should be replaced with proper implementations.