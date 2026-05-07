export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import sql from '@/lib/db'

async function calcStreak(): Promise<number> {
  const days = await sql<{ day: string }[]>`
    SELECT DISTINCT created_at::date AS day
    FROM agent_log
    ORDER BY day DESC
    LIMIT 365
  `
  if (days.length === 0) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let streak = 0
  for (let i = 0; i < days.length; i++) {
    const expected = new Date(today.getTime() - i * 86400000).toISOString().split('T')[0]
    if (days[i].day === expected) streak++
    else break
  }
  return streak
}

export async function GET() {
  // KPIs
  const [{ count: createdCount }] = await sql<{ count: string }[]>`
    SELECT COUNT(*) as count FROM tasks
    WHERE created_at::date >= CURRENT_DATE - INTERVAL '6 days'
  `
  const tasksCreatedThisWeek = Number(createdCount)

  const [totals] = await sql<{ total: string; done: string }[]>`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done
    FROM tasks
  `
  const totalTasks = Number(totals.total)
  const doneTasks = Number(totals.done ?? 0)
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const [{ count: activeProjCount }] = await sql<{ count: string }[]>`
    SELECT COUNT(DISTINCT p.id) as count FROM projects p
    JOIN tasks t ON t.project_id = p.id
    WHERE t.status != 'done'
  `
  const activeProjects = Number(activeProjCount)
  const streak = await calcStreak()

  // Weekly activity
  const weekRows = await sql<{ day: string; count: string }[]>`
    SELECT updated_at::date AS day, COUNT(*) as count
    FROM tasks
    WHERE updated_at::date >= CURRENT_DATE - INTERVAL '6 days'
    GROUP BY updated_at::date
  `
  const weekMap = new Map(weekRows.map(r => [r.day, Number(r.count)]))
  const dayLabels = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today.getTime() - (6 - i) * 86400000)
    const dateStr = date.toISOString().split('T')[0]
    const isToday = i === 6
    return { label: isToday ? 'H' : dayLabels[date.getDay()], count: weekMap.get(dateStr) ?? 0, isToday }
  })

  // On time vs overdue
  const [timing] = await sql<{ no_date: string; on_time: string; overdue: string }[]>`
    SELECT
      SUM(CASE WHEN due_date IS NULL THEN 1 ELSE 0 END) as no_date,
      SUM(CASE WHEN due_date IS NOT NULL AND due_date >= updated_at::date THEN 1 ELSE 0 END) as on_time,
      SUM(CASE WHEN due_date IS NOT NULL AND due_date < updated_at::date THEN 1 ELSE 0 END) as overdue
    FROM tasks WHERE status = 'done'
  `
  const onTimeVsOverdue = {
    onTime: Number(timing.on_time ?? 0),
    overdue: Number(timing.overdue ?? 0),
    noDate: Number(timing.no_date ?? 0),
  }

  // Project progress
  const projectRows = await sql<{ id: number; name: string; total: string; done: string }[]>`
    SELECT p.id, p.name, COUNT(t.id) as total,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    GROUP BY p.id
    HAVING COUNT(t.id) > 0
    ORDER BY COUNT(t.id) DESC
  `
  const projectProgress = projectRows.map(r => ({
    id: r.id, name: r.name,
    done: Number(r.done ?? 0), total: Number(r.total),
    pct: Number(r.total) > 0 ? Math.round((Number(r.done ?? 0) / Number(r.total)) * 100) : 0,
  }))

  // Agent stats
  const [{ count: agentCreated }] = await sql<{ count: string }[]>`SELECT COUNT(*) as count FROM agent_log WHERE action_type = 'created'`
  const [{ count: agentMoved }] = await sql<{ count: string }[]>`SELECT COUNT(*) as count FROM agent_log WHERE action_type IN ('moved','completed')`
  const [{ count: agentSummarized }] = await sql<{ count: string }[]>`SELECT COUNT(*) as count FROM agent_log WHERE action_type = 'summarized'`

  // Recent log
  const recentLog = await sql`
    SELECT id, action_type, entity_name, project_name, created_at
    FROM agent_log ORDER BY created_at DESC LIMIT 20
  `

  return NextResponse.json({
    kpis: { tasksCreatedThisWeek, tasksCompleted: doneTasks, completionRate, activeProjects, streak },
    weeklyActivity, onTimeVsOverdue, projectProgress,
    agentStats: { tasksCreated: Number(agentCreated), tasksMoved: Number(agentMoved), linksSummarized: Number(agentSummarized) },
    recentLog,
  })
}
