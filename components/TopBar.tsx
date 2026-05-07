import Link from 'next/link'

interface TopBarProps {
  title: string
  rightLink?: { href: string; label: string }
}

export default function TopBar({ title, rightLink }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30">
      <div
        className="flex items-center justify-between px-4 h-14"
        style={{ background: '#0a0810', borderBottom: '0.5px solid #1a1228' }}
      >
        <span
          className="text-sm font-bold tracking-wider uppercase"
          style={{ color: '#f1f1f1' }}
        >
          {title}
        </span>
        {rightLink && (
          <Link
            href={rightLink.href}
            className="text-[11px] font-medium tracking-wider uppercase px-3 py-1.5 transition-opacity hover:opacity-70"
            style={{
              color: '#c8c0e0',
              border: '0.5px solid #1e1428',
              borderRadius: '6px',
            }}
          >
            {rightLink.label}
          </Link>
        )}
      </div>
      {/* Accent line */}
      <div
        style={{
          height: '1.5px',
          background: 'linear-gradient(90deg, transparent, #5b2af3, #67d7a8, #5b2af3, transparent)',
          opacity: 0.8,
        }}
      />
    </header>
  )
}
