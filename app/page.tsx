'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import { ChatMessage } from '@/lib/types'

type ActionColor = 'green' | 'blue' | 'amber'

const ACTION_COLORS: Record<ActionColor, React.CSSProperties> = {
  green: { background: 'rgba(103,215,168,0.08)', color: '#52c49a', border: '0.5px solid rgba(103,215,168,0.2)' },
  blue: { background: 'rgba(148,116,246,0.1)', color: '#9474f6', border: '0.5px solid rgba(148,116,246,0.25)' },
  amber: { background: 'rgba(91,42,243,0.2)', color: '#7a54f0', border: '0.5px solid rgba(91,42,243,0.35)' },
}

const ACTION_COLORS_DARK: Record<ActionColor, React.CSSProperties> = {
  green: { background: 'rgba(103,215,168,0.08)', color: '#52c49a', border: '0.5px solid rgba(103,215,168,0.2)' },
  blue: { background: 'rgba(148,116,246,0.1)', color: '#9474f6', border: '0.5px solid rgba(148,116,246,0.25)' },
  amber: { background: 'rgba(91,42,243,0.2)', color: '#7a54f0', border: '0.5px solid rgba(91,42,243,0.35)' },
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'agent',
      content: 'hola. puedo crear proyectos, tareas, mover estados, editar, eliminar, añadir links y consultar lo que necesites.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [dark, setDark] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const messagesRef = useRef<ChatMessage[]>(messages)

  useEffect(() => { messagesRef.current = messages }, [messages])

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const history = messagesRef.current
      .slice(1)
      .filter(m => m.content.trim())
      .slice(-10)
      .map(m => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      }))

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const agentId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, { id: agentId, role: 'agent', content: '' }])

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      })

      if (!res.ok || !res.body) throw new Error('error del servidor')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue
          try {
            const evt = JSON.parse(raw) as { type: string; text?: string; label?: string; color?: ActionColor; message?: string }
            if (evt.type === 'action') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === agentId
                    ? { ...m, actionTag: evt.label, actionColor: evt.color }
                    : m
                )
              )
            } else if (evt.type === 'chunk' && evt.text) {
              setMessages(prev =>
                prev.map(m =>
                  m.id === agentId ? { ...m, content: m.content + evt.text } : m
                )
              )
            } else if (evt.type === 'done') {
              setLoading(false)
            } else if (evt.type === 'error') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === agentId ? { ...m, content: `error: ${evt.message}` } : m
                )
              )
              setLoading(false)
            }
          } catch {
            // ignore malformed lines
          }
        }
      }
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === agentId ? { ...m, content: 'error de conexión. intenta de nuevo.' } : m
        )
      )
    } finally {
      setLoading(false)
    }
  }, [loading])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRec) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SpeechRec()
    recognition.lang = 'es-ES'
    recognition.continuous = false
    recognition.interimResults = true

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transcript = Array.from(e.results as any[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript)
        .join('')
      setInput(transcript)
      if (e.results[0].isFinal) {
        setListening(false)
        sendMessage(transcript)
      }
    }

    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="chat" rightLink={{ href: '/projects', label: 'proyectos' }} />

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 pb-32 space-y-4"
        style={{ background: '#0e0c12' }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {msg.role === 'agent' && msg.actionTag && (
              <span
                className="mb-1 font-semibold uppercase"
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.3px',
                  paddingInline: '6px',
                  paddingBlock: '2px',
                  borderRadius: '4px',
                  ...(dark
                    ? ACTION_COLORS_DARK[(msg.actionColor as ActionColor) || 'green']
                    : ACTION_COLORS[(msg.actionColor as ActionColor) || 'green']),
                }}
              >
                {msg.actionTag}
              </span>
            )}
            <div
              className="max-w-[85%] px-3 py-2 text-sm leading-relaxed"
              style={
                msg.role === 'user'
                  ? {
                      background: 'linear-gradient(135deg, #5b2af3, #9474f6)',
                      color: '#f1f1f1',
                      borderRadius: '12px',
                      borderBottomRightRadius: '3px',
                    }
                  : {
                      background: '#111018',
                      border: '0.5px solid #1e1428',
                      color: '#c8c0e0',
                      borderRadius: '12px',
                      borderBottomLeftRadius: '3px',
                    }
              }
            >
              {msg.role === 'user' ? (
                <span className="user-content whitespace-pre-wrap">{msg.content}</span>
              ) : (
                <span className="whitespace-pre-wrap">
                  {msg.content}
                  {loading && msg.id === messages[messages.length - 1].id && msg.content === '' && (
                    <span className="inline-flex gap-0.5 ml-1 items-center">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="w-1 h-1 rounded-full animate-bounce inline-block"
                          style={{
                            background: '#67d7a8',
                            animationDelay: `${i * 150}ms`,
                          }}
                        />
                      ))}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div
        className="fixed bottom-14 left-1/2 -translate-x-1/2 w-full max-w-mobile px-3 pb-3"
        style={{ background: '#0e0c12' }}
      >
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{ border: '0.5px solid #1e1428', background: '#111018' }}
        >
          <textarea
            ref={inputRef}
            className="flex-1 bg-transparent text-sm resize-none outline-none leading-relaxed min-h-[20px] max-h-24 user-content"
            style={{ color: '#f1f1f1' }}
            placeholder="escribe o habla..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          {/* Mic button */}
          <button
            onClick={toggleMic}
            className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 transition-all"
            style={{
              border: listening ? '1px solid rgba(103,215,168,0.6)' : '0.5px solid rgba(103,215,168,0.3)',
              color: '#67d7a8',
              background: listening ? 'rgba(103,215,168,0.1)' : 'rgba(103,215,168,0.05)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="4" y="1" width="6" height="8" rx="3" stroke="currentColor" strokeWidth="1"
                fill={listening ? 'currentColor' : 'none'} fillOpacity={listening ? 0.3 : 0} />
              <path d="M2 7a5 5 0 0010 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              <line x1="7" y1="12" x2="7" y2="14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </button>
          {/* Send button */}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 transition-all"
            style={{
              background: input.trim() && !loading
                ? 'linear-gradient(135deg, #5b2af3, #9474f6)'
                : '#1a1228',
              color: input.trim() && !loading ? '#f1f1f1' : '#2a1848',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 11V3M3 7l4-4 4 4" stroke="currentColor" strokeWidth="1.2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
