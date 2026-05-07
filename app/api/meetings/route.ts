export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET() {
  const meetings = await sql`
    SELECT m.*,
      p.name as project_name, p.color as project_color,
      COALESCE(json_agg(DISTINCT jsonb_build_object('id', ma.id, 'name', ma.name, 'initials', ma.initials))
        FILTER (WHERE ma.id IS NOT NULL), '[]') AS attendees
    FROM meetings m
    LEFT JOIN projects p ON p.id = m.project_id
    LEFT JOIN meeting_attendees ma ON ma.meeting_id = m.id
    GROUP BY m.id, p.name, p.color
    ORDER BY m.date DESC, m.start_time DESC NULLS LAST
  `
  return NextResponse.json(meetings)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { title, date, start_time, end_time, notes, project_id, attendees } = body

  if (!title || !date) return NextResponse.json({ error: 'title and date required' }, { status: 400 })

  const [meeting] = await sql`
    INSERT INTO meetings (title, date, start_time, end_time, notes, project_id)
    VALUES (${title}, ${date}, ${start_time ?? null}, ${end_time ?? null}, ${notes ?? null}, ${project_id ?? null})
    RETURNING *
  `

  if (Array.isArray(attendees) && attendees.length > 0) {
    for (const a of attendees) {
      await sql`INSERT INTO meeting_attendees (meeting_id, name, initials) VALUES (${meeting.id}, ${a.name}, ${a.initials ?? null})`
    }
  }

  return NextResponse.json(meeting, { status: 201 })
}
