export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import sql from '@/lib/db'
import { type z } from 'zod'
import { AudioAnalysisSchema } from '@/lib/schemas'

// Formats Claude input_audio accepts natively
const CLAUDE_AUDIO_FORMATS = new Set(['mp3', 'wav', 'ogg', 'flac', 'webm'])

// Map extension → Claude format string
const EXT_TO_FORMAT: Record<string, string> = {
  mp3: 'mp3', wav: 'wav', ogg: 'ogg', flac: 'flac', webm: 'webm',
}

async function convertToMp3(inputPath: string): Promise<string> {
  // Dynamic import to avoid module issues during build
  const ffmpeg = (await import('fluent-ffmpeg')).default
  const ffmpegPath = (await import('ffmpeg-static')).default
  if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)

  const outputPath = path.join(os.tmpdir(), `pulse-audio-${Date.now()}.mp3`)
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .audioBitrate('64k')
      .on('end', () => resolve(outputPath))
      .on('error', (err: Error) => reject(err))
      .save(outputPath)
  })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const formData = await req.formData()
  const file = formData.get('audio') as File | null
  if (!file) return NextResponse.json({ error: 'no audio file' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const sizeMB = buffer.length / (1024 * 1024)
  if (sizeMB > 25) {
    return NextResponse.json({ error: `archivo demasiado grande (${sizeMB.toFixed(1)} MB, máx 25 MB)` }, { status: 400 })
  }

  // Determine file extension from name or MIME type
  const originalName = (file as File & { name?: string }).name ?? 'audio.m4a'
  const rawExt = originalName.split('.').pop()?.toLowerCase() ?? 'm4a'

  let audioBase64: string
  let audioFormat: string

  if (CLAUDE_AUDIO_FORMATS.has(rawExt)) {
    // Already in a format Claude accepts
    audioBase64 = buffer.toString('base64')
    audioFormat = EXT_TO_FORMAT[rawExt] ?? rawExt
  } else {
    // Convert m4a/mp4/aac → mp3 via ffmpeg
    const tmpInput = path.join(os.tmpdir(), `pulse-in-${Date.now()}.${rawExt}`)
    let tmpOutput: string | null = null
    try {
      await fs.writeFile(tmpInput, buffer)
      tmpOutput = await convertToMp3(tmpInput)
      audioBase64 = (await fs.readFile(tmpOutput)).toString('base64')
      audioFormat = 'mp3'
    } finally {
      await fs.unlink(tmpInput).catch(() => {})
      if (tmpOutput) await fs.unlink(tmpOutput).catch(() => {})
    }
  }

  // Call Claude with input_audio block (NOT document)
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'input_audio',
            input_audio: { data: audioBase64, format: audioFormat },
          },
          {
            type: 'text',
            text: 'Analiza esta reunión y devuelve JSON exacto sin texto adicional con: { "transcript": "transcripción completa en español", "summary": "resumen 2-3 frases máximo 60 palabras", "suggested_tasks": [{ "title": "tarea concreta y accionable", "priority": "high|medium|low", "project_hint": "nombre del proyecto si se menciona" }] }. Máximo 5 tareas sugeridas.',
          },
        ],
      }],
    }),
  })

  if (!claudeRes.ok) {
    const err = await claudeRes.text()
    console.error('[audio] Claude error:', err)
    return NextResponse.json({ error: 'análisis de audio fallido', details: err }, { status: 500 })
  }

  const claudeData = await claudeRes.json() as { content: { type: string; text: string }[] }
  const rawText = claudeData.content?.[0]?.text ?? ''

  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  let audioData: z.infer<typeof AudioAnalysisSchema>
  try {
    const rawJson = JSON.parse(jsonMatch ? jsonMatch[0] : rawText)
    const result = AudioAnalysisSchema.safeParse(rawJson)
    if (!result.success) {
      console.error('[audio] Schema validation failed:', result.error.flatten())
      return NextResponse.json(
        { error: 'respuesta de IA con formato inválido', details: result.error.flatten() },
        { status: 502 }
      )
    }
    audioData = result.data
  } catch {
    return NextResponse.json({ error: 'respuesta de IA no es JSON válido', raw: rawText }, { status: 502 })
  }

  // Save transcript + summary
  await sql`UPDATE meetings SET transcript = ${audioData.transcript}, summary = ${audioData.summary} WHERE id = ${params.id}`

  // Replace suggested tasks
  await sql`DELETE FROM suggested_tasks WHERE meeting_id = ${params.id}`
  for (const task of audioData.suggested_tasks) {
    let projectId: number | null = null
    if (task.project_hint) {
      const [proj] = await sql`SELECT id FROM projects WHERE name ILIKE ${`%${task.project_hint}%`} LIMIT 1`
      projectId = proj?.id ?? null
    }
    await sql`
      INSERT INTO suggested_tasks (meeting_id, title, priority, project_id)
      VALUES (${params.id}, ${task.title}, ${task.priority}, ${projectId})
    `
  }

  // Upload original audio to Supabase Storage (optional)
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl && supabaseKey) {
    const fileName = `meeting-${params.id}-${Date.now()}.${rawExt}`
    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/meetings-audio/${fileName}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': file.type || 'audio/m4a' },
      body: buffer,
    })
    if (uploadRes.ok) {
      const audioUrl = `${supabaseUrl}/storage/v1/object/public/meetings-audio/${fileName}`
      await sql`UPDATE meetings SET audio_url = ${audioUrl} WHERE id = ${params.id}`
    }
  }

  const [meeting] = await sql`SELECT * FROM meetings WHERE id = ${params.id}`
  const suggestedTasks = await sql`SELECT * FROM suggested_tasks WHERE meeting_id = ${params.id}`
  return NextResponse.json({ ...meeting, suggestedTasks })
}
