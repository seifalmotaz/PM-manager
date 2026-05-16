import postgres from 'postgres'

const client = postgres(process.env.DATABASE_URL!)

async function reset() {
  console.log('Resetting database...')
  
  // Truncate all tables (cascade to handle foreign keys)
  await client.unsafe(`
    TRUNCATE TABLE
      sessions,
      audit_logs,
      checklist_items,
      comments,
      employee_capacity,
      notifications,
      org_sessions,
      organization_settings,
      projects,
      sprints,
      tasks,
      workspace_members,
      workspaces,
      users
    CASCADE
  `)
  
  console.log('✓ All tables truncated')
  
  await client.end()
}

reset().catch(console.error)
