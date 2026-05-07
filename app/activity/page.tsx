'use client'

import { useState, useEffect } from 'react'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'

interface ActivityData {
  kpis: {
    tasksCreatedThisWeek: number
    tasksCompleted: number
    completionRate: number
    activeProjects: number
    streak: number
  }
  weeklyActivity: { label: string; count: number; isToday: boolean }[]
  onTimeVsOverdue: { onTime: number; overdue: number; noDate: number }
  projectProgress: { id: number; name: string; done: number; total: number; pct: number }[]
  agentStats: { tasksCreated: number; tasksMoved: number; linksSummarized: number }
  recentLog: { id: number; action_type: string; entity_name: string; project_name: string | null; created_at: string }[]
}

const DOT_COLORS: Record<string, string> = {
  created: '#67d7a8',
  moved: '#9474f6',
  completed: '#67d7a8',
  project_created: '#5b2af3',
  summarized: '#c8a030',
  deleted: '#e05050',
}

const ACTION_LABELS: Record<string, string> = {
  created: 'creada',
  moved: 'movida',
  completed: 'completada',
  project_created: 'proyecto',
  summarized: 'resumida',
  deleted: 'eliminada',
}

const TAG_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  created: { bg: 'rgba(103,215,168,0.08)', color: '#52c49a', border: 'rgba(103,215,168,0.2)' },
  moved: { bg: 'rgba(148,116,246,0.1)', color: '#9474f6', border: 'rgba(148,116,246,0.25)' },
  completed: { bg: 'rgba(103,215,168,0.08)', color: '#52c49a', border: 'rgba(103,215,168,0.2)' },
  project_created: { bg: 'rgba(91,42,243,0.2)', color: '#7a54f0', border: 'rgba(91,42,243,0.35)' },
  summarized: { bg: 'rgba(220,170,50,0.1)', color: '#c8a030', border: 'rgba(220,170,50,0.25)' },
  deleted: { bg: 'rgba(220,60,60,0.12)', color: '#e05050', border: 'rgba(220,60,60,0.25)' },
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="uppercase font-semibold mb-2"
      style={{ fontSize: '8px', letterSpacing: '0.6px', color: '#2a1848' }}
    >
      {children}
    </p>
  )
}

function Donut({ onTime, overdue, noDate }: { onTime: number; overdue: number; noDate: number }) {
  const total = onTime + overdue + noDate
  const r = 20
  const cx = 28
  const cy = 28
  const circ = 2 * Math.PI * r

  if (total === 0) {
    return (
      <svg width="56" height="56">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1228" strokeWidth="6" />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#2a1848">
          0%
        </text>
      </svg>
    )
  }

  const onTimePct = Math.round((onTime / total) * 100)
  const onTimeArc = (onTime / total) * circ
  const overdueArc = (overdue / total) * circ
  const noDateArc = (noDate / total) * circ
  const onTimeDeg = (onTime / total) * 360
  const overdueDeg = (overdue / total) * 360

  return (
    <svg width="56" height="56">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1228" strokeWidth="6" />
      {onTime > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#5b2af3" strokeWidth="6"
          strokeDasharray={`${onTimeArc} ${circ - onTimeArc}`}
          transform={`rotate(-90, ${cx}, ${cy})`} />
      )}
      {overdue > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e05050" strokeWidth="6"
          strokeDasharray={`${overdueArc} ${circ - overdueArc}`}
          transform={`rotate(${-90 + onTimeDeg}, ${cx}, ${cy})`} />
      )}
      {noDate > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#67d7a8" strokeWidth="6"
          strokeDasharray={`${noDateArc} ${circ - noDateArc}`}
          transform={`rotate(${-90 + onTimeDeg + overdueDeg}, ${cx}, ${cy})`} />
      )}
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#f1f1f1">
        {onTimePct}%
      </text>
    </svg>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  const bg = pct < 30
    ? '#c8a030'
    : pct < 50
      ? 'linear-gradient(90deg, #5b2af3, #9474f6)'
      : 'linear-gradient(90deg, #67d7a8, #5b2af3)'
  return (
    <div style={{ height: '4px', background: '#1a1228', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: bg, borderRadius: '2px', transition: 'width 0.4s ease' }} />
    </div>
  )
}

export default function ActivityPage() {
  const [data, setData] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/activity')
      .then(r => r.json())
      .then((d: ActivityData) => {
        setData(d)
        setLoading(false)
      })
  }, [])

  const maxBar = data ? Math.max(...data.weeklyActivity.map(d => d.count), 1) : 1

  return (
    <div className="flex flex-col h-screen" style={{ background: '#0e0c12' }}>
      <TopBar title="actividad" />

      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="rounded-xl animate-pulse" style={{ background: '#111018', height: i === 1 ? 96 : 60 }} />
            ))}
          </div>
        ) : data ? (
          <div className="space-y-4">

            {/* KPIs 2x2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {/* Creadas semana */}
              <div style={{ background: '#111018', border: '0.5px solid #1a1228', borderRadius: '10px', padding: '9px 10px' }}>
                <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-1px', color: '#5b2af3', lineHeight: 1.1 }}>
                  {data.kpis.tasksCreatedThisWeek}
                </div>
                <div style={{ fontSize: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#2a1848', marginTop: '3px' }}>
                  creadas · semana
                </div>
              </div>

              {/* Completadas */}
              <div style={{ background: '#111018', border: '0.5px solid #1a1228', borderRadius: '10px', padding: '9px 10px' }}>
                <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-1px', color: '#67d7a8', lineHeight: 1.1 }}>
                  {data.kpis.tasksCompleted}
                </div>
                <div style={{ fontSize: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#2a1848', marginTop: '3px' }}>
                  completadas
                </div>
                <div style={{ fontSize: '8px', color: '#67d7a8', marginTop: '2px' }}>
                  {data.kpis.completionRate}% del total
                </div>
              </div>

              {/* Proyectos activos */}
              <div style={{ background: '#111018', border: '0.5px solid #1a1228', borderRadius: '10px', padding: '9px 10px' }}>
                <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-1px', color: '#9474f6', lineHeight: 1.1 }}>
                  {data.kpis.activeProjects}
                </div>
                <div style={{ fontSize: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#2a1848', marginTop: '3px' }}>
                  proyectos activos
                </div>
              </div>

              {/* Racha */}
              <div style={{ background: '#111018', border: '0.5px solid #1a1228', borderRadius: '10px', padding: '9px 10px' }}>
                <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-1px', color: '#c8a030', lineHeight: 1.1 }}>
                  {data.kpis.streak}
                </div>
                <div style={{ fontSize: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#2a1848', marginTop: '3px' }}>
                  racha
                </div>
                <div style={{ fontSize: '8px', color: '#c8a030', marginTop: '2px' }}>
                  {data.kpis.streak > 0 ? 'días seguidos 🔥' : 'sin actividad hoy'}
                </div>
              </div>
            </div>

            {/* Weekly bar chart */}
            <div style={{ background: '#111018', border: '0.5px solid #1a1228', borderRadius: '10px', padding: '12px' }}>
              <SectionLabel>actividad · últimos 7 días</SectionLabel>
              <div className="flex gap-1.5 items-end" style={{ height: '48px' }}>
                {data.weeklyActivity.map((day, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${Math.max((day.count / maxBar) * 48, day.count > 0 ? 4 : 0)}px`,
                      background: day.isToday ? 'rgba(103,215,168,0.6)' : 'rgba(91,42,243,0.5)',
                      borderRadius: '3px 3px 0 0',
                    }}
                  />
                ))}
              </div>
              <div className="flex gap-1.5 mt-1.5">
                {data.weeklyActivity.map((day, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '7px', color: day.isToday ? '#67d7a8' : '#2a1848' }}>
                    {day.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Donut + leyenda */}
            <div style={{ background: '#111018', border: '0.5px solid #1a1228', borderRadius: '10px', padding: '12px' }}>
              <SectionLabel>a tiempo vs vencidas</SectionLabel>
              <div className="flex items-center gap-4">
                <div style={{ flexShrink: 0 }}>
                  <Donut
                    onTime={data.onTimeVsOverdue.onTime}
                    overdue={data.onTimeVsOverdue.overdue}
                    noDate={data.onTimeVsOverdue.noDate}
                  />
                </div>
                <div className="flex flex-col gap-2" style={{ flex: 1 }}>
                  {[
                    { label: 'a tiempo', value: data.onTimeVsOverdue.onTime, color: '#5b2af3' },
                    { label: 'vencidas', value: data.onTimeVsOverdue.overdue, color: '#e05050' },
                    { label: 'sin fecha', value: data.onTimeVsOverdue.noDate, color: '#67d7a8' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '8px', color: '#c8c0e0', flex: 1, textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 500 }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: '8px', color: '#2a1848', fontWeight: 700 }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Project progress */}
            {data.projectProgress.length > 0 && (
              <div style={{ background: '#111018', border: '0.5px solid #1a1228', borderRadius: '10px', padding: '12px' }}>
                <SectionLabel>progreso por proyecto</SectionLabel>
                <div className="space-y-3">
                  {data.projectProgress.map(p => (
                    <div key={p.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="user-content" style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#c8c0e0' }}>
                          {p.name}
                        </span>
                        <span style={{ fontSize: '9px', color: '#2a1848', fontWeight: 600 }}>
                          {p.pct}%
                        </span>
                      </div>
                      <ProgressBar pct={p.pct} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agent stats 3-col */}
            <div>
              <SectionLabel>acciones del agente</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                {[
                  { value: data.agentStats.tasksCreated, label: 'creadas' },
                  { value: data.agentStats.tasksMoved, label: 'movidas' },
                  { value: data.agentStats.linksSummarized, label: 'resumidas' },
                ].map(stat => (
                  <div key={stat.label} style={{ background: '#111018', border: '0.5px solid #1a1228', borderRadius: '8px', padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f1f1', lineHeight: 1.1 }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#2a1848', marginTop: '4px', fontWeight: 500 }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent log timeline */}
            {data.recentLog.length > 0 && (
              <div>
                <SectionLabel>log reciente</SectionLabel>
                <div>
                  {data.recentLog.map((entry, i) => {
                    const dotColor = DOT_COLORS[entry.action_type] ?? '#2a1848'
                    const tag = TAG_STYLES[entry.action_type]
                    const label = ACTION_LABELS[entry.action_type] ?? entry.action_type
                    const isLast = i === data.recentLog.length - 1
                    return (
                      <div key={entry.id} style={{ display: 'flex', gap: '10px' }}>
                        {/* Dot + line column */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: '2px' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                          {!isLast && (
                            <div style={{ width: 1, flex: 1, background: '#1a1228', marginTop: '3px', minHeight: '16px' }} />
                          )}
                        </div>
                        {/* Content */}
                        <div style={{ paddingBottom: isLast ? 0 : '12px', flex: 1, minWidth: 0 }}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="user-content" style={{ fontSize: '12px', color: '#c8c0e0' }}>
                              <strong style={{ fontWeight: 600 }}>{entry.entity_name || '—'}</strong>
                            </span>
                            {tag && (
                              <span style={{
                                fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px',
                                padding: '1px 5px', borderRadius: '4px',
                                background: tag.bg, color: tag.color, border: `0.5px solid ${tag.border}`,
                              }}>
                                {label}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '8px', color: '#2a1848', marginTop: '2px' }}>
                            {formatTime(entry.created_at)}
                            {entry.project_name && (
                              <span className="user-content"> · {entry.project_name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {data.recentLog.length === 0 && (
              <p className="text-center pt-6" style={{ fontSize: '12px', color: '#2a1848' }}>
                sin actividad todavía · usa el chat para empezar
              </p>
            )}

          </div>
        ) : null}
      </div>

      <BottomNav />
    </div>
  )
}
