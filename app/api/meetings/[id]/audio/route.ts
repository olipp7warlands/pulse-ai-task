export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { type z } from 'zod'
import { AudioAnalysisSchema } from '@/lib/schemas'

const FORMAT_MAP: Record<string, string> = {
  m4a: 'mp4', mp4: 'mp4', mp3: 'mp3',
  wav: 'wav', ogg: 'ogg', flac: 'flac', webm: 'webm',
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

  const originalName = (file as File & { name?: string }).name ?? 'audio.m4a'
  const ext = originalName.split('.').pop()?.toLowerCase() ?? 'm4a'
  const audioFormat = FORMAT_MAP[ext] ?? 'mp4'
  const audioBase64 = buffer.toString('base64')

  console.log(`[audio] file=${originalName} ext=${ext} format=${audioFormat} size=${sizeMB.toFixed(2)}MB`)

  // Call Claude with input_audio block
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
            text: 'Analiza esta reunión y devuelve JSON exacto sin texto adicional: { "transcript": "transcripción completa en español", "summary": "resumen 2-3 frases máximo 60 palabras", "suggested_tasks": [{ "title": "tarea concreta accionable", "priority": "high|medium|low", "project_hint": "nombre del proyecto si se menciona" }] }. Máximo 5 tareas.',
          },
        ],
      }],
    }),
  })

  const claudeData = await claudeRes.json() as Record<string, unknown>
  console.log('[Claude audio response]', JSON.stringify(claudeData).substring(0, 500))

  if (!claudeRes.ok || (claudeData as { error?: { message: string } }).error) {
    const errMsg = (claudeData as { error?: { message: string } }).error?.message ?? claudeRes.statusText
    return NextResponse.json({ error: 'análisis de audio fallido', details: errMsg }, { status: 500 })
  }

  const content = (claudeData as { content?: { type: string; text: string }[] }).content
  const rawText = content?.[0]?.text ?? ''

  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  let audioDataParsed: z.infer<typeof AudioAnalysisSchema>
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
    audioDataParsed = result.data
  } catch {
    return NextResponse.json({ error: 'respuesta de IA no es JSON válido', raw: rawText }, { status: 502 })
  }

  // Save transcript + summary
  await sql`UPDATE meetings SET transcript = ${audioDataParsed.transcript}, summary = ${audioDataParsed.summary} WHERE id = ${params.id}`

  // Replace suggested tasks
  await sql`DELETE FROM suggested_tasks WHERE meeting_id = ${params.id}`
  for (const task of audioDataParsed.suggested_tasks) {
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

  // Upload to Supabase Storage (optional)
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl && supabaseKey) {
    const fileName = `meeting-${params.id}-${Date.now()}.${ext}`
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
