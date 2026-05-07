import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('project_id')
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const overdue = searchParams.get('overdue')

  const conds: string[] = ['1=1']
  const vals: unknown[] = []
  let idx = 1

  if (projectId) { conds.push(`t.project_id = $${idx++}`); vals.push(projectId) }
  if (status)    { conds.push(`t.status = $${idx++}`);      vals.push(status) }
  if (priority)  { conds.push(`t.priority = $${idx++}`);    vals.push(priority) }
  if (overdue === 'true') {
    conds.push(`t.due_date < CURRENT_DATE AND t.status != 'done'`)
  }

  const tasks = await sql.unsafe(
    `SELECT t.*, COUNT(l.id) as link_count
     FROM tasks t LEFT JOIN links l ON l.task_id = t.id
     WHERE ${conds.join(' AND ')}
     GROUP BY t.id ORDER BY t.created_at DESC`,
    vals as string[]
  )
  return NextResponse.json(tasks)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { project_id, title, status = 'backlog', priority = 'medium', due_date = null } = body

  if (!project_id || !title) {
    return NextResponse.json({ error: 'project_id and title required' }, { status: 400 })
  }

  const [task] = await sql`
    INSERT INTO tasks (project_id, title, status, priority, due_date)
    VALUES (${project_id}, ${title}, ${status}, ${priority}, ${due_date})
    RETURNING *
  `
  await sql`
    INSERT INTO activity_log (action, description, entity_type, entity_id)
    VALUES ('create_task', ${`tarea "${title}" creada en ${status}`}, 'task', ${task.id})
  `
  return NextResponse.json(task, { status: 201 })
}
