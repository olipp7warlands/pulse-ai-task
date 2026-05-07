import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function POST(req: Request) {
  const body = await req.json()
  const { task_id, url, title = '', type = 'other' } = body

  if (!task_id || !url) {
    return NextResponse.json({ error: 'task_id and url required' }, { status: 400 })
  }

  const [link] = await sql`
    INSERT INTO links (task_id, url, title, type)
    VALUES (${task_id}, ${url}, ${title}, ${type})
    RETURNING *
  `
  const [task] = await sql`SELECT title FROM tasks WHERE id = ${task_id}`
  await sql`
    INSERT INTO activity_log (action, description, entity_type, entity_id)
    VALUES ('add_link', ${`link añadido a "${task?.title || task_id}"`}, 'link', ${link.id})
  `
  return NextResponse.json(link, { status: 201 })
}
