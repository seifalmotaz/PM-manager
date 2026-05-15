# Team & User Management Features Audit Report

**Audit Date:** May 15, 2026  
**Audited Module:** Team & User Management  
**Severity Distribution:** 6 Critical, 5 High, 5 Medium, 4 Low

---

## Executive Summary

This audit reveals **significant gaps in team and user management features**. While basic authentication and workspace membership exist, **critical functionality like invitations, role management, and user profile editing are completely absent**. Several security concerns and UX problems were identified.

---

## 1. User Authentication

### Current State

**Files:**
- `/packages/api/src/modules/auth/auth.router.ts`
- `/packages/api/src/modules/auth/auth.service.ts`
- `/packages/web/src/routes/auth/login/+page.svelte`
- `/packages/web/src/routes/auth/callback/+page.svelte`
- `/packages/web/src/lib/stores/auth.svelte.ts`

**What Exists:**
- WorkOS OAuth integration (login URL generation, code exchange)
- Automatic user creation on first login
- Session management via HTTP-only cookie
- Automatic personal workspace creation on signup
- Logout mechanism (backend exists, UI doesn't expose it)

### Issues Found

| Severity | Issue | Location |
|----------|-------|----------|
| **CRITICAL** | Session cookie stores raw user ID instead of secure session token. This is a security vulnerability - if user IDs are guessable (they are UUIDs), attackers could forge sessions | `auth.router.ts:16-18` |
| **CRITICAL** | No session expiration mechanism visible. Max-Age is hardcoded to 30 days (2592000 seconds) with no refresh mechanism | `auth.router.ts:16` |
| **HIGH** | No logout button in UI. Logout route exists at `/auth/logout` but there's no way for users to trigger it from the app | No logout UI in `+layout.svelte` |
| **MEDIUM** | No email verification or account confirmation | N/A |
| **LOW** | No password reset flow (relying on WorkOS, but should be documented) | N/A |

### Missing Elements

- Email/password authentication (only OAuth via WorkOS)
- Password reset functionality
- Email verification
- Two-factor authentication
- Account deletion/deactivation
- Session management (view active sessions, revoke)
- Remember me / persistent session options
- Password change (for non-OAuth users)

---

## 2. Workspace Management

### Current State

**Files:**
- `/packages/api/src/modules/workspace/workspace.router.ts`
- `/packages/api/src/modules/workspace/workspace.service.ts`
- `/packages/web/src/lib/stores/workspaces.ts`
- `/packages/web/src/lib/components/WorkspaceFilter.svelte`

**What Exists:**
- Create company workspace (backend only)
- List user's workspaces
- Get workspace by ID
- List workspace members
- Remove member from workspace (admin only)
- Personal workspace auto-created on signup

### Issues Found

| Severity | Issue | Location |
|----------|-------|----------|
| **CRITICAL** | NO UI for creating new workspaces. Backend endpoint exists (`workspace.create`) but no frontend page/modal | Missing UI |
| **HIGH** | No unique constraint on `workspace_members(userId, workspaceId)` - database allows duplicate memberships | `schema.ts:24-30` |
| **HIGH** | No way to delete/archive workspaces | Missing feature |
| **HIGH** | No way for users to leave a workspace themselves | Missing feature |
| **MEDIUM** | Personal workspace cannot be deleted but no UI indication of this restriction | CONTEXT.md says it's intentional, but users aren't told |
| **MEDIUM** | Orphan prevention mechanism absent. If last member leaves, workspace becomes inaccessible but data remains | `workspace.service.ts` - no check |
| **LOW** | Workspace owner cannot transfer ownership to another member | Missing feature |

### Missing Elements

- Workspace creation UI/page
- Workspace deletion/archival
- Workspace settings/management page
- Member list view in UI (API exists, no UI)
- Add member functionality
- Invite member functionality
- Leave workspace functionality
- Transfer ownership
- Workspace renaming/editing
- Organization-level workspace management (workspaces belong to orgs but no org UI)

---

## 3. Team Membership & Members

### Current State

**Files:**
- `/packages/web/src/routes/(app)/workspace/[wid]/member/[uid]/+page.svelte`
- `/packages/web/src/routes/(app)/workspace/[wid]/member/[uid]/+page.ts`
- `/packages/api/src/modules/workspace/workspace.service.ts` (lines 53-83)

**What Exists:**
- View individual member profile (shows name, email, role, tasks, velocity)
- List members API endpoint
- Remove member API endpoint (admin only)
- Member roles: `owner`, `admin`, `member`

### Issues Found

| Severity | Issue | Location |
|----------|-------|----------|
| **CRITICAL** | NO way to add members to workspace. The only path to workspace membership is auto-creation during signup | `workspace.service.ts` - no `addMember` endpoint |
| **CRITICAL** | NO invitation system whatsoever. Users cannot invite others to join their workspace | Completely missing |
| **HIGH** | Member list not browsable in UI. Must know member UUID to view their profile, no directory | Missing UI at `/workspace/[wid]` |
| **HIGH** | No way to change member roles. Once someone is a `member`, they can't be promoted to `admin` | `workspace.service.ts` - missing update endpoint |
| **MEDIUM** | Role badges exist in code but not clearly visible/meaningful in most UI locations | `member/[uid]/+page.svelte:49-51` |
| **MEDIUM** | No bulk operations (bulk add, bulk remove, bulk role change) | Missing feature |
| **LOW** | No "recent members" or "member activity" tracking | Missing feature |

### Missing Elements

- Invitation system (create, send, accept/decline invitations)
- Add member button/dialog
- Member directory/list view page
- Role change functionality (promote/demote)
- Member search within workspace
- Member activity tracking
- Member permissions management
- Team overview page showing all members

---

## 4. User Profiles

### Current State

**Files:**
- `/packages/api/src/db/schema.ts` (lines 4-11) - User model
- `/packages/web/src/routes/(app)/(app)/+layout.svelte` - Shows avatar with email initial

**What Exists:**
- User model: id, email, name, avatarUrl, createdAt, updatedAt
- Basic user info displayed in top-right corner (email initial as avatar)
- Name and avatar populated from WorkOS on login

### Issues Found

| Severity | Issue | Location |
|----------|-------|----------|
| **HIGH** | NO profile editing functionality. Users cannot change their name or avatar | Missing feature - no `/profile` or `/settings/profile` page |
| **HIGH** | Placeholder Settings button does nothing. Links to nowhere | `+layout.svelte:104-109` |
| **MEDIUM** | Avatar always shows initial - if avatarUrl exists, it's not displayed | `+layout.svelte:135-137` - should show image if avatarUrl exists |
| **MEDIUM** | No way to view own profile (only other members' profiles) | Missing route |
| **LOW** | No email visibility/editing (emails come from WorkOS) | Expected for OAuth-only auth |

### Missing Elements

- User profile page (`/profile` or `/settings/profile`)
- Profile editing (name, avatar)
- Avatar upload/management
- Account settings page
- Email preferences
- Notification preferences
- Timezone/locale settings
- User preferences storage (theme, etc.)

---

## 5. Invitations System

### Current State

**Files:** None

### Issues Found

| Severity | Issue | Location |
|----------|-------|----------|
| **CRITICAL** | Entire invitation system is missing | N/A |

### Missing Elements

This is a **completely absent feature**:

- No `invitations` table in database
- No invitation routes/endpoints
- No invitation service
- No invitation UI components
- No email invitation sending
- No invitation acceptance workflow
- No invitation expiration
- No invitation management (view pending, resend, revoke)
- No invitation links or codes
- No support for:
  - Email-based invitations
  - Invitation codes
  - Invitation acceptance/decline flow
  - Bulk invitations
  - Invitation tracking

**Impact:** No way for existing users to add new members to workspaces. The only way to get into a workspace is:
1. Create the workspace (become owner)
2. Auto-created personal workspace on signup

---

## 6. Permissions & Roles

### Current State

**Files:**
- `/packages/api/src/trpc.ts` (lines 50-187)

**What Exists:**
- Three roles: `owner`, `admin`, `member`
- `adminProcedure` middleware checks for admin/owner role
- Role resolution system for workspace context (resolves through project→workspace, sprint→project→workspace, etc.)
- Permission checks in place for:
  - Delete project
  - Delete sprint
  - Delete task
  - Remove workspace member
  - Set employee capacity
  - Delete comments (author or admin)

### Role Capabilities

| Action | owner | admin | member |
|--------|-------|-------|--------|
| Create project | ✅ | ✅ | ✅ |
| Delete project | ✅ | ✅ | ❌ |
| Create sprint | ✅ | ✅ | ✅ |
| Delete sprint | ✅ | ✅ | ❌ |
| Create task | ✅ | ✅ | ✅ |
| Delete task | ✅ | ✅ | ❌ |
| Create workspace | ✅ | ✅ | ✅ |
| List members | ✅ | ✅ | ✅ |
| Remove member | ✅ | ✅ | ❌ |
| Set capacity | ✅ | ✅ | ❌ |

### Issues Found

| Severity | Issue | Location |
|----------|-------|----------|
| **CRITICAL** | NO role assignment UI. Cannot promote members to admin or demote admins | Missing feature |
| **HIGH** | Role management only on backend. No API to change roles | `workspace.service.ts` - missing `changeRole` endpoint |
| **HIGH** | First workspace member hardcoded as 'owner', but subsequent members get no explicit role assignment | `auth.service.ts:72-76` |
| **MEDIUM** | No role descriptions or permission documentation shown to users | Missing UI |
| **MEDIUM** | No audit log viewing for permission changes | Missing feature |
| **LOW** | Roles are hardcoded strings, not enum or lookup table | `schema.ts:28` - `text('role')` |
| **LOW** | No custom roles or fine-grained permissions | Not in scope per design, but worth noting |

### Missing Elements

- Role change API endpoint
- Role management UI (promote/demote members)
- Permission matrix documentation (for users)
- Role descriptions and capabilities list
- Permission breakdown by feature
- Audit trail for role changes
- Bulk role operations

---

## 7. UX Problems (User Experience)

### Critical UX Issues

1. **Settings is a dead end** (`/packages/web/src/routes/(app)/+layout.svelte:104-109`)
   - Settings button visible in navigation
   - Clicking it does nothing (no link, no action)
   - Users expect settings to exist

2. **No way to create workspace**
   - WorkspaceFilter shows existing workspaces
   - Projects page shows projects per workspace
   - But no UI to create a new workspace
   - Backend capability exists (`workspace.create` mutation)

3. **Can't add team members**
   - View other members' profiles
   - See member counts in workspace filter
   - But zero UI to add or invite new members

4. **Workspace member list not accessible**
   - Member count shown in dropdown
   - Individual member profile accessible via URL
   - But no page listing all workspace members

5. **No workspace administration hub**
   - Workspaces have members, settings, ownership
   - But no `/workspace/[wid]/settings` page
   - No central place to manage workspace

### Navigation Confusion

6. **Dead-end navigation links:**
   - Settings button → nowhere
   - Workspace filter shows `memberCount` but no way to see who

7. **Hidden member profiles:**
   - Route exists: `/workspace/[wid]/member/[uid]`
   - Accessible only if you know the exact UUID
   - No directory or list view

8. **No visual role indicators:**
   - Roles exist but no badges in most places
   - Can't tell who is admin/owner without visiting their profile

9. **Personal workspace mystique:**
   - Personal workspace auto-created but not marked as special
   - Can't be deleted (per design) but no UI indication
   - No differentiation from company workspaces

---

## 8. Security Concerns

### Authentication Security

| Severity | Issue | Location |
|----------|-------|----------|
| **CRITICAL** | Session stored as raw user ID in cookie. Should use opaque session token | `auth.router.ts:16-18` |
| **HIGH** | No session validation beyond UUID check | `trpc.ts:26-32` |
| **HIGH** | No session expiration or rotation mechanism | `auth.router.ts:18` |
| **MEDIUM** | No CSRF token validation visible | Should check HTTP headers |
| **LOW** | Cookie uses `SameSite=Lax` - correct, but should verify | `auth.router.ts:17` |

### Database Constraints

| Severity | Issue | Location |
|----------|-------|----------|
| **HIGH** | Missing unique constraint on `workspace_members(workspaceId, userId)` allows duplicates | `schema.ts:24-30` |
| **MEDIUM** | No cascade rules for some deletions (tasks.assigneeId uses `ON DELETE no action`) | `schema.ts:65` |
| **MEDIUM** | No soft-delete mechanism for audit/evidence preservation | Design choice, but worth noting |

### Authorization Gaps

| Severity | Issue | Location |
|----------|-------|----------|
| **MEDIUM** | Comment delete allows author OR workspace admin, but doesn't verify author is workspace member | `comment.service.ts:196-204` |
| **LOW** | Some operations miss authorization comments about who can do what | Various routers |

---

## 9. Orphaned Users & Teams

### Potential Orphan Scenarios

1. **Orphaned Workspaces:**
   - When last member leaves or is removed, workspace remains
   - No members can access it
   - No cleanup mechanism
   - Data lives forever in database
   - **File:** `workspace.service.ts:109-143` - `removeMember` doesn't check if it's last member

2. **Orphaned Tasks:**
   - Tasks remain assigned to departed users (by design per CONTEXT.md)
   - No mechanism to reassign tasks when user leaves
   - Incomplete task visibility for remaining admins

3. **Personal Workspace Accumulation:**
   - Every signup creates personal workspace
   - Cannot be deleted
   - Accumulate indefinitely even if users never use them
   - **File:** `auth.service.ts:60-78`

### Mitigations Present

- Workspace member cascade delete when user deleted
- Project cascade delete when workspace deleted
- Task cascade delete when project deleted

### Missing Mitigations

- Detection of orphaned workspaces
- Workspace cleanup for departed users
- "Claim orphaned workspace" functionality for org admins

---

## 10. File References Summary

### Backend Files Reviewed

- `/packages/api/src/db/schema.ts` - Database schema
- `/packages/api/src/trpc.ts` - Auth middleware and role checking
- `/packages/api/src/modules/auth/auth.router.ts` - Auth endpoints
- `/packages/api/src/modules/auth/auth.service.ts` - Auth business logic
- `/packages/api/src/modules/workspace/workspace.router.ts` - Workspace endpoints
- `/packages/api/src/modules/workspace/workspace.service.ts` - Workspace logic
- `/packages/api/src/modules/comment/comment.service.ts` - Comment permissions
- `/packages/api/src/modules/project/project.router.ts` - Project endpoints
- `/packages/api/src/modules/task/task.router.ts` - Task endpoints
- `/packages/api/src/modules/sprint/sprint.router.ts` - Sprint endpoints
- `/packages/shared/src/index.ts` - Shared types

### Frontend Files Reviewed

- `/packages/web/src/routes/(app)/+layout.svelte` - Main app layout
- `/packages/web/src/routes/auth/login/+page.svelte` - Login page
- `/packages/web/src/routes/auth/callback/+page.svelte` - OAuth callback
- `/packages/web/src/routes/auth/logout/+page.svelte` - Logout page
- `/packages/web/src/routes/(app)/workspace/[wid]/member/[uid]/+page.svelte` - Member profile
- `/packages/web/src/routes/(app)/projects/+page.svelte` - Projects page
- `/packages/web/src/routes/(app)/home/+page.svelte` - Home page
- `/packages/web/src/lib/stores/auth.svelte.ts` - Auth state
- `/packages/web/src/lib/stores/workspaces.ts` - Workspace state
- `/packages/web/src/lib/components/WorkspaceFilter.svelte` - Workspace dropdown

---

## 11. Recommendations by Priority

### P0 - Critical (Must Fix)

1. **Implement proper session management:**
   - Replace user ID cookie with opaque session token
   - Add session expiration and rotation
   - Consider using JWT with proper validation

2. **Add invitation system:**
   - Create `invitations` table
   - Build invite flow (email → accept/decline)
   - Expose via `workspace.inviteMember` endpoint

3. **Create workspace management UI:**
   - Workspace creation page/modal
   - Workspace settings page at `/workspace/[id]/settings`
   - Member list view

4. **Add member addition flow:**
   - API endpoint: `workspace.addMember`
   - UI: "Add member" button in workspace settings
   - Integrate with invitation system

### P1 - High (Should Fix Soon)

5. **Add role management:**
   - API: `workspace.changeMemberRole`
   - UI: Role dropdown in member list
   - Document role capabilities

6. **Fix database constraints:**
   - Add unique constraint on `workspace_members(workspaceId, userId)`
   - Add proper cascade rules

7. **Implement user profile editing:**
   - Create `/settings/profile` page
   - Allow name and avatar changes
   - Connect avatar display in UI

8. **Add workspace leave functionality:**
   - API: `workspace.leave`
   - Prevent last member from leaving (or auto-delete workspace)

9. **Prevent orphaned workspaces:**
   - Check if removing last member
   - Either block with error or force workspace deletion

### P2 - Medium (Should Plan For)

10. **Build member directory:**
    - `/workspace/[id]/members` page
    - List all members with roles
    - Link to member profiles

11. **Add workspace member search:**
    - Filter members by name
    - Search within workspace

12. **Implement workspace deletion (for non-personal):**
    - Soft-delete vs hard-delete decision
    - Confirmation flow
    - Cascade to projects/tasks

13. **Add last-member-leaving prevention:**
    - Either force delete workspace
    - Or require ownership transfer first
    - Document decision

14. **Create settings page:**
    - Account settings
    - Notification preferences
    - Workspace settings

### P3 - Low (Nice to Have)

15. **Avatar image support:**
    - Display `avatarUrl` as image when present
    - Upload functionality

16. **Bulk member operations:**
    - Bulk invite
    - Bulk role change

17. **Activity/audit log viewer:**
    - See who changed what roles
    - Member add/remove history

18. **Custom roles:**
    - Fine-grained permissions
    - Role templates

---

## Conclusion

The authentication foundation is solid (WorkOS OAuth), and workspace membership basics exist. However, **the entire member management lifecycle is incomplete**:

- No way to add members (invitation system missing)
- No way to manage roles (role assignment missing)
- No way to administer workspaces (settings UI missing)
- No profile editing
- Security concerns with session management

The application currently only supports:
1. Auto-created personal workspaces
2. Company workspaces created via API (not UI)
3. Membership added programmatically

**Without an invitation system, the workspace feature is largely non-functional for team collaboration.**