import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const [project] = await sql`SELECT * FROM projects WHERE id = ${params.id}`
  if (!project) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const tasks = await sql`
    SELECT t.*, COUNT(l.id) as link_count
    FROM tasks t LEFT JOIN links l ON l.task_id = t.id
    WHERE t.project_id = ${params.id}
    GROUP BY t.id ORDER BY t.created_at ASC
  `
  const taskIds = (tasks as unknown as { id: number }[]).map(t => t.id)
  const links = taskIds.length > 0
    ? await sql`SELECT * FROM links WHERE task_id = ANY(${taskIds})`
    : []
  return NextResponse.json({ project, tasks, links })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { name, color } = body
  const [project] = await sql`
    UPDATE projects SET
      name  = COALESCE(${name ?? null}, name),
      color = COALESCE(${color ?? null}, color)
    WHERE id = ${params.id}
    RETURNING *
  `
  return NextResponse.json(project)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await sql`DELETE FROM projects WHERE id = ${params.id}`
  return NextResponse.json({ ok: true })
}
