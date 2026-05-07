'use client'

import { Project } from '@/lib/types'

interface ProjectChipProps {
  project: Project
  selected: boolean
  onClick: () => void
}

export default function ProjectChip({ project, selected, onClick }: ProjectChipProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap flex-shrink-0 transition-all"
      style={{
        background: selected ? '#160e2a' : '#121018',
        border: selected ? '1px solid #5b2af3' : '0.5px solid #1e1428',
        color: selected ? '#ded8fa' : '#2a1848',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: selected ? '#9474f6' : '#2a1848' }}
      />
      <span
        className="user-content font-semibold uppercase"
        style={{ fontSize: '11px', letterSpacing: '0.3px' }}
      >
        {project.name}
      </span>
      <span
        className="text-[10px]"
        style={{ color: selected ? '#9474f6' : '#2a1848' }}
      >
        {project.task_count ?? 0}
      </span>
      {!!project.overdue_count && project.overdue_count > 0 && (
        <span
          className="text-[10px] px-1 rounded font-semibold"
          style={{
            background: 'rgba(220,60,60,0.12)',
            color: '#e05050',
            border: '0.5px solid rgba(220,60,60,0.25)',
          }}
        >
          {project.overdue_count}!
        </span>
      )}
    </button>
  )
}
