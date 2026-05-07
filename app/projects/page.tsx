'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import ProjectChip from '@/components/ProjectChip'
import TaskCard from '@/components/TaskCard'
import { Project, Task, Status } from '@/lib/types'

const STATUS_LABELS: Record<Status, string> = {
  backlog: 'backlog',
  in_progress: 'en progreso',
  review: 'revisión',
  done: 'hecho',
}

const STATUSES: Status[] = ['backlog', 'in_progress', 'review', 'done']

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('theme') || 'dark'
    setDark(stored === 'dark')
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then((data: Project[]) => {
        setProjects(data)
        if (data.length > 0) setSelectedId(data[0].id)
        setLoadingProjects(false)
      })
  }, [])

  const loadTasks = useCallback((projectId: number) => {
    setLoadingTasks(true)
    fetch(`/api/tasks?project_id=${projectId}`)
      .then(r => r.json())
      .then((data: Task[]) => {
        setTasks(data)
        setLoadingTasks(false)
      })
  }, [])

  useEffect(() => {
    if (selectedId !== null) loadTasks(selectedId)
  }, [selectedId, loadTasks])

  function handleSelect(id: number) {
    setSelectedId(id)
  }

  const selectedProject = projects.find(p => p.id === selectedId)

  const tasksByStatus = STATUSES.reduce<Record<Status, Task[]>>((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s)
    return acc
  }, { backlog: [], in_progress: [], review: [], done: [] })

  return (
    <div className="flex flex-col h-screen" style={{ background: '#0e0c12' }}>
      <TopBar title="proyectos" rightLink={{ href: '/', label: 'chat' }} />

      {/* Project chips carousel */}
      {!loadingProjects && (
        <div
          className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar flex-shrink-0"
          style={{ borderBottom: '0.5px solid #1a1228', background: '#0e0c12' }}
        >
          {projects.map(p => (
            <ProjectChip
              key={p.id}
              project={p}
              selected={p.id === selectedId}
              onClick={() => handleSelect(p.id)}
            />
          ))}
          {projects.length === 0 && (
            <span className="text-xs" style={{ color: '#2a1848' }}>
              sin proyectos · usa el chat para crear uno
            </span>
          )}
        </div>
      )}

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {loadingTasks ? (
          <div className="space-y-2 pt-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-16 rounded-xl animate-pulse"
                style={{ background: '#111018' }}
              />
            ))}
          </div>
        ) : selectedProject ? (
          <div className="pt-2">
            {STATUSES.map(status => {
              const group = tasksByStatus[status]
              if (group.length === 0) return null
              return (
                <div key={status} className="mb-5">
                  <div
                    className="flex items-center justify-between py-2 mb-2"
                    style={{ borderBottom: '0.5px solid #1a1228' }}
                  >
                    <span
                      className="font-semibold uppercase"
                      style={{ fontSize: '7px', letterSpacing: '1px', color: '#3a2860' }}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                    <span
                      className="font-semibold"
                      style={{ fontSize: '7px', letterSpacing: '1px', color: '#3a2860' }}
                    >
                      {group.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.map(task => (
                      <TaskCard key={task.id} task={task} dark={dark} />
                    ))}
                  </div>
                </div>
              )
            })}

            {tasks.length === 0 && (
              <p
                className="text-sm text-center pt-12"
                style={{ color: '#2a1848' }}
              >
                sin tareas · dile al agente que cree una
              </p>
            )}
          </div>
        ) : null}
      </div>

      <BottomNav />
    </div>
  )
}
