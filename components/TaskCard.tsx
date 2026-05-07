'use client'

import { Task } from '@/lib/types'
import PriorityTag from './PriorityTag'
import DateTag from './DateTag'

interface TaskCardProps {
  task: Task
  dark?: boolean
}

export default function TaskCard({ task, dark }: TaskCardProps) {
  const done = task.status === 'done'
  const inProgress = task.status === 'in_progress'

  return (
    <div
      className="px-3 py-2.5"
      style={{
        borderRadius: '10px',
        background: inProgress ? '#0e1614' : '#111018',
        border: `0.5px solid ${inProgress ? 'rgba(103,215,168,0.25)' : '#1a1228'}`,
        opacity: done ? 0.35 : 1,
      }}
    >
      <p
        className="text-sm mb-2 user-content leading-snug font-normal"
        style={{
          color: '#c8c0e0',
          textDecoration: done ? 'line-through' : 'none',
        }}
      >
        {task.title}
      </p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <PriorityTag priority={task.priority} dark={dark} />
        {task.due_date && <DateTag dueDate={task.due_date} dark={dark} />}
        {!!task.link_count && task.link_count > 0 && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 font-semibold uppercase"
            style={{
              fontSize: '10px',
              letterSpacing: '0.3px',
              color: '#9474f6',
              background: 'rgba(148,116,246,0.1)',
              border: '0.5px solid rgba(148,116,246,0.25)',
              borderRadius: '4px',
            }}
          >
            ⬡ {task.link_count}
          </span>
        )}
      </div>
    </div>
  )
}
