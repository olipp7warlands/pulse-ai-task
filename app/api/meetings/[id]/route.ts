export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const [meeting] = await sql`
    SELECT m.*, p.name as project_name, p.color as project_color
    FROM meetings m LEFT JOIN projects p ON p.id = m.project_id
    WHERE m.id = ${params.id}
  `
  if (!meeting) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const attendees = await sql`SELECT * FROM meeting_attendees WHERE meeting_id = ${params.id}`
  const suggestedTasks = await sql`
    SELECT st.*, p.name as project_name FROM suggested_tasks st
    LEFT JOIN projects p ON p.id = st.project_id
    WHERE st.meeting_id = ${params.id}
    ORDER BY st.id ASC
  `
  return NextResponse.json({ ...meeting, attendees, suggestedTasks })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await sql`DELETE FROM meetings WHERE id = ${params.id}`
  return NextResponse.json({ ok: true })
}
