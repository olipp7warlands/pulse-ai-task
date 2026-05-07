'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('theme') || 'dark'
    setDark(stored === 'dark')
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
  }

  return (
    <button
      onClick={toggle}
      className="w-7 h-7 flex items-center justify-center rounded transition-opacity hover:opacity-70"
      style={{ color: 'var(--text-muted)' }}
      aria-label="toggle theme"
    >
      {dark ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1" />
          <line x1="8" y1="1" x2="8" y2="2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <line x1="8" y1="13.5" x2="8" y2="15" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <line x1="1" y1="8" x2="2.5" y2="8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <line x1="13.5" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <line x1="2.93" y1="2.93" x2="4.05" y2="4.05" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <line x1="11.95" y1="11.95" x2="13.07" y2="13.07" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <line x1="2.93" y1="13.07" x2="4.05" y2="11.95" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <line x1="11.95" y1="4.05" x2="13.07" y2="2.93" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M13.5 10.5A6 6 0 015.5 2.5a6 6 0 108 8z"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  )
}
