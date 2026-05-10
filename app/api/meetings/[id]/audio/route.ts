export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

import { NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import { createReadStream } from 'fs'
import path from 'path'
import os from 'os'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import sql from '@/lib/db'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const meetingId = parseInt(params.id)
  if (isNaN(meetingId)) return Response.json({ error: 'invalid_id' }, { status: 400 })

  try {
    const formData = await req.formData()
    const file = formData.get('audio') as File | null
    if (!file) return Response.json({ error: 'no_audio_file' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = (file as File & { name?: string }).name || 'audio.m4a'
    const sizeMB = buffer.length / 1024 / 1024
    console.log('[audio] received', filename, 'size=', sizeMB.toFixed(2), 'MB')

    if (sizeMB > 25) {
      return Response.json({ error: 'file_too_large', maxMB: 25 }, { status: 400 })
    }

    // Save to temp file for Whisper (needs a real file stream)
    const tmpPath = path.join(os.tmpdir(), `pulse-${Date.now()}-${filename}`)
    await fs.writeFile(tmpPath, buffer)

    // Optional: upload to Supabase Storage
    const supabase = getSupabase()
    let audioUrl: string | null = null
    if (supabase) {
      const storageKey = `meeting-${meetingId}-${Date.now()}-${filename}`
      const { error: uploadError } = await supabase.storage
        .from('meetings-audio')
        .upload(storageKey, buffer, { contentType: file.type || 'audio/m4a', upsert: true })
      if (uploadError) {
        console.warn('[audio] supabase upload warning:', uploadError.message)
      } else {
        audioUrl = storageKey
      }
    }

    // STEP 1 — Transcribe with Whisper
    console.log('[whisper] starting transcription...')
    const whisperResult = await openai.audio.transcriptions.create({
      file: createReadStream(tmpPath),
      model: 'whisper-1',
      language: 'es',
    })
    const transcript = whisperResult.text
    console.log('[whisper] transcript length:', transcript.length)

    // Cleanup temp file
    await fs.unlink(tmpPath).catch(() => {})

    // STEP 2 — Analyze with Claude
    console.log('[claude] analyzing transcript...')
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Analiza esta transcripción de reunión y devuelve JSON exacto sin texto adicional con este formato:\n\n{ "summary": "resumen 2-3 frases máximo 60 palabras", "suggested_tasks": [{ "title": "tarea concreta accionable", "priority": "high|medium|low" }] }\n\nMáximo 5 tareas sugeridas. Responde solo el JSON, nada más.\n\nTranscripción:\n${transcript}`,
        }],
      }),
    })

    const claudeData = await claudeRes.json() as {
      error?: { message: string }
      content?: { type: string; text: string }[]
    }

    if (claudeData.error) {
      console.error('[claude error]', claudeData.error)
      return Response.json({ error: 'analysis_failed', detail: claudeData.error.message }, { status: 500 })
    }

    const rawText = claudeData.content?.[0]?.text ?? ''
    let analysis: { summary: string; suggested_tasks: { title: string; priority: string }[] }
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim()
      analysis = JSON.parse(cleaned)
    } catch {
      console.error('[claude parse error]', rawText.substring(0, 500))
      return Response.json({ error: 'parse_failed', raw: rawText }, { status: 500 })
    }

    // STEP 3 — Save to DB
    await sql`
      UPDATE meetings
      SET transcript = ${transcript}, summary = ${analysis.summary}, audio_url = ${audioUrl}
      WHERE id = ${meetingId}
    `

    // Replace suggested tasks
    await sql`DELETE FROM suggested_tasks WHERE meeting_id = ${meetingId}`
    const tasks = Array.isArray(analysis.suggested_tasks) ? analysis.suggested_tasks : []
    for (const t of tasks) {
      await sql`
        INSERT INTO suggested_tasks (meeting_id, title, priority)
        VALUES (${meetingId}, ${t.title}, ${t.priority || 'medium'})
      `
    }

    console.log('[audio] complete, tasks suggested:', tasks.length)
    return Response.json({
      success: true,
      transcript,
      summary: analysis.summary,
      suggested_tasks: tasks,
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[audio] fatal error:', msg)
    return Response.json({ error: 'internal_error', message: msg }, { status: 500 })
  }
}
