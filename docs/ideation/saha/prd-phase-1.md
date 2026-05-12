# PRD: Saha - Phase 1

**Contract**: ./contract.md
**Phase**: 1 of 4
**Focus**: Monorepo foundation, database schema, WorkOS authentication, and privacy-safe layout shell

## Phase Overview

Phase 1 sets up the entire technical foundation for Saha. This includes the Bun monorepo workspace structure (web + api packages), the PostgreSQL database with the full Drizzle schema for all v1 entities, WorkOS authentication (login, callback, session management), and the application layout shell with the privacy-safe sidebar and top bar.

This phase blocks everything else. No feature work can begin until auth works, the database is scaffolded, and the layout provides the frame that every subsequent page renders into.

After this phase, a user can sign in via WorkOS, their personal workspace is auto-created on first login, and they see the empty layout shell with the sidebar and top bar ready for Phase 2 to populate.

## User Stories

1. As a new user, I want to sign up with my email via WorkOS so that I can access Saha
2. As a returning user, I want to log in and resume my session so that I don't lose my place
3. As a new user, I want my personal workspace to exist immediately after signup so that I can start tracking work without setup
4. As a user in a meeting, I want the sidebar to show no company names so that my client relationships remain private during screen sharing

## Functional Requirements

### Auth

- **FR-1.1**: User clicks "Sign in" → redirected to WorkOS OAuth flow
- **FR-1.2**: WorkOS callback creates user record if first login, updates existing otherwise
- **FR-1.3**: On first-ever login: personal workspace auto-created with name "Personal" and type "personal"
- **FR-1.4**: Session token stored in httpOnly cookie, validated on every API request
- **FR-1.5**: User can log out → session cleared, redirected to login page
- **FR-1.6**: Protected routes redirect to login if no valid session

### Database Schema

- **FR-1.7**: Full Drizzle schema defined for all v1 tables: users, workspaces, workspace_members, projects, sprints, tasks, audit_logs, employee_capacity
- **FR-1.8**: Drizzle migrations generated and runnable with single command
- **FR-1.9**: Database connection managed via Drizzle, configured via environment variable

### Layout Shell

- **FR-1.10**: Sidebar displays three items: Home, Velocity, Projects — no workspace or company names ever appear
- **FR-1.11**: Sidebar icons/links navigate to their respective routes
- **FR-1.12**: Top bar displays: workspace filter dropdown button (inactive — populated in Phase 2)
- **FR-1.13**: Layout wraps all authenticated pages (/(app) route group)

### Monorepo Setup

- **FR-1.14**: Bun workspaces configured with packages/web, packages/api, packages/shared
- **FR-1.15**: `bun dev` command starts both SvelteKit dev server and Hono API server
- **FR-1.16**: tRPC client configured so web package imports typed API client from api package

## Non-Functional Requirements

- **NFR-1.1**: Auth flow completes in under 3 seconds from click to dashboard
- **NFR-1.2**: Database migrations run idempotently (safe to re-run)
- **NFR-1.3**: Layout renders correctly at viewport widths 360px to 2560px (responsive)
- **NFR-1.4**: No secrets or credentials committed to repository

## Dependencies

### Prerequisites

- None — this is Phase 1

### Outputs for Next Phase

- User model with authenticated sessions
- Personal workspace auto-created per user
- Full database schema with all v1 tables
- Layout shell with sidebar and top bar
- tRPC client configured for Phase 2 feature development

## Acceptance Criteria

- [ ] User can sign in via WorkOS OAuth
- [ ] First-time user gets personal workspace auto-created
- [ ] User can log out and session is destroyed
- [ ] Protected routes redirect to login when unauthenticated
- [ ] `bun db:migrate` creates all tables successfully
- [ ] `bun dev` starts both frontend and backend
- [ ] Sidebar shows only Home, Velocity, Projects (no workspace names)
- [ ] Sidebar has zero hardcoded workspace or company strings
- [ ] Layout renders correctly on desktop and mobile viewports
- [ ] Auth middleware rejects requests without valid session
