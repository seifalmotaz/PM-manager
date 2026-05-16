-- Migration: Remove review status, migrate to in_progress
-- Created: 2026-05-16

-- First, create audit log entries for tasks being migrated
-- (Do this BEFORE the UPDATE so we can identify which tasks had 'review')
INSERT INTO audit_logs (id, entity_type, entity_id, action, field, old_value, new_value, user_id, created_at)
SELECT 
  gen_random_uuid(),
  'task',
  id,
  'status_changed',
  'status',
  'review',
  'in_progress',
  '00000000-0000-0000-0000-000000000000',
  NOW()
FROM tasks
WHERE status = 'review';

-- Then migrate review tasks to in_progress
UPDATE tasks
SET status = 'in_progress',
    updated_at = NOW()
WHERE status = 'review';