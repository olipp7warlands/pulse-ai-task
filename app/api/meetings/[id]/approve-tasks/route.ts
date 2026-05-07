import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { suggested_task_ids } = await req.json() as { suggested_task_ids: number[] }

  if (!Array.isArray(suggested_task_ids) || suggested_task_ids.length === 0) {
    return NextResponse.json({ error: 'suggested_task_ids required' }, { status: 400 })
  }

  const created = []
  for (const stId of suggested_task_ids) {
    const [st] = await sql`
      SELECT * FROM suggested_tasks WHERE id = ${stId} AND meeting_id = ${params.id} AND approved = false
    `
    if (!st) continue

    const [task] = await sql`
      INSERT INTO tasks (title, status, priority, project_id)
      VALUES (${st.title}, 'backlog', ${st.priority}, ${st.project_id})
      RETURNING *
    `
    await sql`UPDATE suggested_tasks SET approved = true, created_task_id = ${task.id} WHERE id = ${stId}`
    await sql`
      INSERT INTO activity_log (action, description, entity_type, entity_id)
      VALUES ('create_task', ${`tarea "${st.title}" creada desde reunión`}, 'task', ${task.id})
    `
    created.push(task)
  }

  return NextResponse.json({ created, count: created.length })
}
