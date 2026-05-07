type DateTagVariant = 'overdue' | 'upcoming' | 'ok'

const STYLES: Record<DateTagVariant, { bg: string; color: string; border: string }> = {
  overdue: { bg: 'rgba(220,60,60,0.12)', color: '#e05050', border: 'rgba(220,60,60,0.25)' },
  upcoming: { bg: 'rgba(220,170,50,0.1)', color: '#c8a030', border: 'rgba(220,170,50,0.25)' },
  ok: { bg: 'rgba(103,215,168,0.08)', color: '#52c49a', border: 'rgba(103,215,168,0.2)' },
}

function getVariant(dueDate: string): DateTagVariant {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const diff = Math.floor((due.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return 'overdue'
  if (diff <= 3) return 'upcoming'
  return 'ok'
}

function formatDate(dueDate: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const diff = Math.floor((due.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'mañana'
  if (diff === -1) return 'ayer'
  if (diff < 0) return `vence ${Math.abs(diff)}d`
  return `${diff}d`
}

interface DateTagProps {
  dueDate: string
  dark?: boolean
}

export default function DateTag({ dueDate }: DateTagProps) {
  const variant = getVariant(dueDate)
  const s = STYLES[variant]
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
      {formatDate(dueDate)}
    </span>
  )
}
