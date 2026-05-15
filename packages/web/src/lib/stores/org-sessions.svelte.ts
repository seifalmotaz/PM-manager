import { trpc } from '$lib/trpc'
import { getOrganization, type Organization } from './organization.svelte'

interface ActiveSession {
  id: string
  userId: string
  organizationId: string
  startTime: string  // ISO string from backend
  endTime: string | null
  note: string | null
  tasksCompleted: number | null
  storyPointsCompleted: string | null
  estimatedHoursSum: string | null
  frozen: boolean
}

interface EnhancedSession {
  session: ActiveSession
  organizationName: string
  elapsedSeconds: number
}

interface SessionsState {
  sessions: EnhancedSession[]
  isLoading: boolean
  error: string | null
}

const _state = $state<SessionsState>({
  sessions: [],
  isLoading: true,
  error: null,
})

function getOrgName(organizationId: string): string {
  const orgs = getOrganization().organizations
  return orgs.find(o => o.id === organizationId)?.name ?? 'Unknown Org'
}

// Compute elapsed seconds for a session
function computeElapsed(startTime: string): number {
  return Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function getSessions() {
  return _state
}

export async function fetchActiveSessions(): Promise<void> {
  _state.isLoading = true
  _state.error = null
  try {
    const rawSessions: ActiveSession[] = await trpc.orgSession.getAllActive.query() as any
    _state.sessions = rawSessions.map(s => ({
      session: s,
      organizationName: getOrgName(s.organizationId),
      elapsedSeconds: computeElapsed(s.startTime),
    }))
  } catch (err: any) {
    console.error('Failed to fetch active sessions:', err)
    _state.error = err?.message ?? 'Failed to fetch sessions'
    _state.sessions = []
  } finally {
    _state.isLoading = false
  }
}

export async function startSession(organizationId: string): Promise<void> {
  try {
    const session = await trpc.orgSession.start.mutate({ organizationId })
    // Add to list
    _state.sessions = [
      {
        session: session as any,
        organizationName: getOrgName(organizationId),
        elapsedSeconds: 0,
      },
      ..._state.sessions,
    ]
  } catch (err: any) {
    console.error('Failed to start session:', err)
    _state.error = err?.message ?? 'Failed to start session'
  }
}

export async function stopSession(sessionId: string): Promise<void> {
  try {
    const updated = await trpc.orgSession.stop.mutate({ sessionId })
    // Remove from active sessions (it's no longer active)
    _state.sessions = _state.sessions.filter(s => s.session.id !== sessionId)
  } catch (err: any) {
    console.error('Failed to stop session:', err)
    _state.error = err?.message ?? 'Failed to stop session'
  }
}

// Timer update — called every second
let timerInterval: ReturnType<typeof setInterval> | null = null

export function startElapsedTimer(): void {
  if (timerInterval) return
  timerInterval = setInterval(() => {
    _state.sessions = _state.sessions.map(s => ({
      ...s,
      elapsedSeconds: computeElapsed(s.session.startTime),
    }))
  }, 1000)
}

export function stopElapsedTimer(): void {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

export { formatDuration }