import { z } from 'zod'
import { db } from '../../db/connection'
import { auditLogs } from '../../db/schema'

const AuditEntrySchema = z.object({
  entityType: z.enum(['task', 'project', 'sprint', 'workspace', 'comment']),
  entityId: z.string().uuid(),
  action: z.enum(['created', 'updated', 'deleted', 'status_changed']),
  field: z.string().optional(),
  oldValue: z.string().optional(),
  newValue: z.string().optional(),
  userId: z.string().uuid(),
})

type AuditEntry = z.infer<typeof AuditEntrySchema>

/**
 * Create an audit log entry. Fire-and-forget pattern — never throws.
 * Failures are silently caught and logged to console.error.
 */
export async function createAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      ...entry,
      createdAt: new Date(),
    })
  } catch (err) {
    // Fire-and-forget: audit failures must not break the primary operation
    console.error('Audit log write failed:', err)
  }
}

/**
 * Convenience function for field changes. Fires and forgets the audit write.
 * Converts non-string old/new values via String().
 */
export function auditFieldChange(
  entityType: AuditEntry['entityType'],
  entityId: string,
  userId: string,
  field: string,
  oldValue: unknown,
  newValue: unknown,
): void {
  createAuditLog({
    entityType,
    entityId,
    action: 'updated',
    field,
    oldValue: oldValue !== undefined ? String(oldValue) : undefined,
    newValue: String(newValue),
    userId,
  })
}
