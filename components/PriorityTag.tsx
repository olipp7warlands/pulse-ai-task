import { Priority } from '@/lib/types'

const STYLES: Record<Priority, { bg: string; color: string; border: string }> = {
  high: { bg: 'rgba(91,42,243,0.2)', color: '#7a54f0', border: 'rgba(91,42,243,0.35)' },
  medium: { bg: 'rgba(103,215,168,0.1)', color: '#52c49a', border: 'rgba(103,215,168,0.3)' },
  low: { bg: 'rgba(148,116,246,0.1)', color: '#9474f6', border: 'rgba(148,116,246,0.25)' },
}

interface PriorityTagProps {
  priority: Priority
  dark?: boolean
}

export default function PriorityTag({ priority }: PriorityTagProps) {
  const s = STYLES[priority]
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 font-semibold uppercase"
      style={{
        fontSize: '10px',
        letterSpacing: '0.3px',
        background: s.bg,
        color: s.color,
        border: `0.5px solid ${s.border}`,
        borderRadius: '4px',
      }}
    >
      {priority}
    </span>
  )
}
