import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const [task] = await sql`SELECT * FROM tasks WHERE id = ${params.id}`
  if (!task) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const links = await sql`SELECT * FROM links WHERE task_id = ${params.id}`
  return NextResponse.json({ ...task, links })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const [before] = await sql`SELECT * FROM tasks WHERE id = ${params.id}`
  if (!before) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const body = await req.json()
  const { title, status, priority, due_date } = body

  const [task] = await sql`
    UPDATE tasks SET
      title     = COALESCE(${title ?? null}, title),
      status    = COALESCE(${status ?? null}, status),
      priority  = COALESCE(${priority ?? null}, priority),
      due_date  = CASE WHEN ${due_date ?? null}::date IS NOT NULL THEN ${due_date ?? null}::date ELSE due_date END,
      updated_at = NOW()
    WHERE id = ${params.id}
    RETURNING *
  `

  if (status && status !== before.status) {
    await sql`
      INSERT INTO activity_log (action, description, entity_type, entity_id)
      VALUES ('move_task', ${`tarea "${task.title}" movida a ${status}`}, 'task', ${params.id})
    `
  }
  return NextResponse.json(task)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const [task] = await sql`SELECT title FROM tasks WHERE id = ${params.id}`
  if (!task) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await sql`DELETE FROM tasks WHERE id = ${params.id}`
  await sql`INSERT INTO activity_log (action, description, entity_type) VALUES ('delete_task', ${`tarea "${task.title}" eliminada`}, 'task')`
  return NextResponse.json({ ok: true })
}
