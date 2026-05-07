export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET() {
  const projects = await sql`
    SELECT
      p.*,
      COUNT(t.id) as task_count,
      SUM(CASE WHEN t.due_date < CURRENT_DATE AND t.status != 'done' THEN 1 ELSE 0 END) as overdue_count
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `
  return NextResponse.json(projects)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { name, color = '#4a6e9a' } = body
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const [project] = await sql`
    INSERT INTO projects (name, color) VALUES (${name}, ${color}) RETURNING *
  `
  await sql`
    INSERT INTO activity_log (action, description, entity_type, entity_id)
    VALUES ('create_project', ${`proyecto "${name}" creado`}, 'project', ${project.id})
  `
  return NextResponse.json(project, { status: 201 })
}
