'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  {
    href: '/',
    label: 'chat',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M2 4a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6l-4 3V4z"
          stroke="currentColor"
          strokeWidth={active ? 1.5 : 1}
          fill={active ? 'currentColor' : 'none'}
          fillOpacity={active ? 0.15 : 0}
        />
      </svg>
    ),
  },
  {
    href: '/projects',
    label: 'proyectos',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="1.5"
          stroke="currentColor" strokeWidth={active ? 1.5 : 1}
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <rect x="11" y="2" width="7" height="7" rx="1.5"
          stroke="currentColor" strokeWidth={active ? 1.5 : 1}
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <rect x="2" y="11" width="7" height="7" rx="1.5"
          stroke="currentColor" strokeWidth={active ? 1.5 : 1}
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <rect x="11" y="11" width="7" height="7" rx="1.5"
          stroke="currentColor" strokeWidth={active ? 1.5 : 1}
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      </svg>
    ),
  },
  {
    href: '/activity',
    label: 'actividad',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <polyline
          points="1,10 5,4 9,14 13,7 17,10 19,10"
          stroke="currentColor"
          strokeWidth={active ? 1.5 : 1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile z-40 flex"
      style={{ background: '#0a0810', borderTop: '0.5px solid #1a1228' }}
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-opacity"
            style={{ color: active ? '#9474f6' : '#2a1848' }}
          >
            {tab.icon(active)}
            <span
              className="font-medium uppercase"
              style={{ fontSize: '7px', letterSpacing: '0.6px' }}
            >
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
