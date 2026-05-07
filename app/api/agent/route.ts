import Anthropic from '@anthropic-ai/sdk'
import sql from '@/lib/db'
import { AgentResponse } from '@/lib/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Eres un asistente de gestión de proyectos. Interpreta el mensaje del usuario y responde siempre en JSON con este formato exacto sin ningún texto adicional:
{"action":"string_o_null","params":{},"message":"string"}

Acciones disponibles:
- create_project: params: {name, color?}
- create_task: params: {project_id?, project_name?, title, priority?, due_date?}  (due_date: YYYY-MM-DD)
- update_task: params: {task_id?, task_title?, title?, priority?, due_date?, status?}  (due_date: null para eliminarla)
- move_task: params: {task_id?, task_title?, status}  (status: backlog|in_progress|review|done)
- delete_task: params: {task_id?, task_title?}
- delete_project: params: {project_id?, project_name?}
- add_link: params: {task_id?, task_title?, url, title?, type?}  (type: doc|figma|github|other)
- summarize_links: params: {task_id?, task_title?, project_id?, project_name?}
- query_tasks: params: {status?, priority?, overdue?, project_id?, project_name?}

Si no hay acción clara usa action: null. Responde en español. Sé conciso.`

async function executeAction(
  action: string,
  params: Record<string, unknown>
): Promise<{ label: string; color: 'green' | 'blue' | 'amber'; data?: unknown }> {

  if (action === 'create_project') {
    const { name, color = '#4a6e9a' } = params
    const [project] = await sql`INSERT INTO projects (name, color) VALUES (${name as string}, ${color as string}) RETURNING *`
    await sql`INSERT INTO activity_log (action, description, entity_type, entity_id) VALUES ('create_project', ${`proyecto "${name}" creado`}, 'project', ${project.id})`
    await sql`INSERT INTO agent_log (action_type, entity_name, project_name) VALUES ('project_created', ${name as string}, null)`
    return { label: 'proyecto creado', color: 'green', data: project.id }
  }

  if (action === 'create_task') {
    let projectId = params.project_id as number | undefined
    if (!projectId && params.project_name) {
      const [p] = await sql`SELECT id FROM projects WHERE name ILIKE ${`%${params.project_name}%`} LIMIT 1`
      projectId = p?.id
    }
    if (!projectId) {
      const [first] = await sql`SELECT id FROM projects ORDER BY created_at DESC LIMIT 1`
      projectId = first?.id
    }
    const { title, priority = 'medium', due_date = null } = params
    if (!projectId) throw new Error('no hay proyectos disponibles')
    const [task] = await sql`
      INSERT INTO tasks (project_id, title, status, priority, due_date)
      VALUES (${projectId as number}, ${title as string}, 'backlog', ${priority as string}, ${due_date as string | null})
      RETURNING *`
    await sql`INSERT INTO activity_log (action, description, entity_type, entity_id) VALUES ('create_task', ${`tarea "${title}" creada`}, 'task', ${task.id})`
    const [proj] = await sql`SELECT name FROM projects WHERE id = ${projectId as number}`
    await sql`INSERT INTO agent_log (action_type, entity_name, project_name) VALUES ('created', ${title as string}, ${proj?.name ?? null})`
    return { label: 'creada · backlog', color: 'green', data: task.id }
  }

  if (action === 'update_task') {
    let taskId = params.task_id as number | undefined
    if (!taskId && params.task_title) {
      const [t] = await sql`SELECT id FROM tasks WHERE title ILIKE ${`%${params.task_title}%`} LIMIT 1`
      taskId = t?.id
    }
    if (!taskId) throw new Error('tarea no encontrada')

    const setClauses: string[] = ['updated_at = NOW()']
    const vals: unknown[] = []
    let idx = 1
    if (params.title)    { setClauses.push(`title = $${idx++}`);    vals.push(params.title) }
    if (params.priority) { setClauses.push(`priority = $${idx++}`); vals.push(params.priority) }
    if ('due_date' in params) { setClauses.push(`due_date = $${idx++}`); vals.push(params.due_date) }
    if (params.status)   { setClauses.push(`status = $${idx++}`);   vals.push(params.status) }
    if (setClauses.length === 1) throw new Error('nada que actualizar')
    vals.push(taskId)
    await sql.unsafe(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $${idx}`, vals as string[])

    const [task] = await sql`SELECT title FROM tasks WHERE id = ${taskId}`
    await sql`INSERT INTO activity_log (action, description, entity_type, entity_id) VALUES ('update_task', ${`tarea "${task.title}" actualizada`}, 'task', ${taskId})`
    const [proj] = await sql`SELECT p.name FROM projects p JOIN tasks t ON t.project_id = p.id WHERE t.id = ${taskId}`
    await sql`INSERT INTO agent_log (action_type, entity_name, project_name) VALUES ('moved', ${task.title}, ${proj?.name ?? null})`
    return { label: 'tarea actualizada', color: 'blue', data: taskId }
  }

  if (action === 'move_task') {
    let taskId = params.task_id as number | undefined
    if (!taskId && params.task_title) {
      const [t] = await sql`SELECT id FROM tasks WHERE title ILIKE ${`%${params.task_title}%`} LIMIT 1`
      taskId = t?.id
    }
    if (!taskId) throw new Error('tarea no encontrada')
    const { status } = params
    const [before] = await sql`SELECT title, status FROM tasks WHERE id = ${taskId}`
    await sql`UPDATE tasks SET status = ${status as string}, updated_at = NOW() WHERE id = ${taskId}`
    await sql`INSERT INTO activity_log (action, description, entity_type, entity_id) VALUES ('move_task', ${`"${before.title}" ${before.status} → ${status}`}, 'task', ${taskId})`
    const [proj] = await sql`SELECT p.name FROM projects p JOIN tasks t ON t.project_id = p.id WHERE t.id = ${taskId}`
    const moveType = (status as string) === 'done' ? 'completed' : 'moved'
    await sql`INSERT INTO agent_log (action_type, entity_name, project_name) VALUES (${moveType}, ${before.title}, ${proj?.name ?? null})`
    return { label: `movida · ${status}`, color: 'blue', data: taskId }
  }

  if (action === 'delete_task') {
    let taskId = params.task_id as number | undefined
    if (!taskId && params.task_title) {
      const [t] = await sql`SELECT id FROM tasks WHERE title ILIKE ${`%${params.task_title}%`} LIMIT 1`
      taskId = t?.id
    }
    if (!taskId) throw new Error('tarea no encontrada')
    const [task] = await sql`SELECT title FROM tasks WHERE id = ${taskId}`
    await sql`DELETE FROM tasks WHERE id = ${taskId}`
    await sql`INSERT INTO activity_log (action, description, entity_type, entity_id) VALUES ('delete_task', ${`tarea "${task.title}" eliminada`}, 'task', ${taskId})`
    return { label: 'tarea eliminada', color: 'amber', data: taskId }
  }

  if (action === 'delete_project') {
    let projectId = params.project_id as number | undefined
    if (!projectId && params.project_name) {
      const [p] = await sql`SELECT id FROM projects WHERE name ILIKE ${`%${params.project_name}%`} LIMIT 1`
      projectId = p?.id
    }
    if (!projectId) throw new Error('proyecto no encontrado')
    const [project] = await sql`SELECT name FROM projects WHERE id = ${projectId}`
    await sql`DELETE FROM projects WHERE id = ${projectId}`
    await sql`INSERT INTO activity_log (action, description, entity_type, entity_id) VALUES ('delete_project', ${`proyecto "${project.name}" eliminado`}, 'project', ${projectId})`
    return { label: 'proyecto eliminado', color: 'amber', data: projectId }
  }

  if (action === 'add_link') {
    let taskId = params.task_id as number | undefined
    if (!taskId && params.task_title) {
      const [t] = await sql`SELECT id FROM tasks WHERE title ILIKE ${`%${params.task_title}%`} LIMIT 1`
      taskId = t?.id
    }
    if (!taskId) throw new Error('tarea no encontrada')
    const { url, title = '', type = 'other' } = params
    const [link] = await sql`INSERT INTO links (task_id, url, title, type) VALUES (${taskId}, ${url as string}, ${title as string}, ${type as string}) RETURNING *`
    await sql`INSERT INTO activity_log (action, description, entity_type, entity_id) VALUES ('add_link', 'link añadido', 'link', ${link.id})`
    return { label: 'link añadido', color: 'blue', data: link.id }
  }

  if (action === 'query_tasks') {
    const { status, priority, overdue, project_id, project_name } = params
    let projectId = project_id as number | undefined
    if (!projectId && project_name) {
      const [p] = await sql`SELECT id FROM projects WHERE name ILIKE ${`%${project_name}%`} LIMIT 1`
      projectId = p?.id
    }
    const conds: string[] = ['1=1']
    const vals: unknown[] = []
    let idx = 1
    if (projectId) { conds.push(`t.project_id = $${idx++}`); vals.push(projectId) }
    if (status)    { conds.push(`t.status = $${idx++}`);      vals.push(status) }
    if (priority)  { conds.push(`t.priority = $${idx++}`);    vals.push(priority) }
    if (overdue)   { conds.push(`t.due_date < CURRENT_DATE AND t.status != 'done'`) }
    const tasks = await sql.unsafe(`SELECT t.* FROM tasks t WHERE ${conds.join(' AND ')} ORDER BY t.created_at DESC`, vals as string[])
    return { label: `${tasks.length} tareas`, color: 'amber', data: tasks }
  }

  if (action === 'summarize_links') {
    let taskId = params.task_id as number | undefined
    let projectId = params.project_id as number | undefined
    if (!taskId && params.task_title) {
      const [t] = await sql`SELECT id FROM tasks WHERE title ILIKE ${`%${params.task_title}%`} LIMIT 1`
      taskId = t?.id
    }
    if (!projectId && params.project_name) {
      const [p] = await sql`SELECT id FROM projects WHERE name ILIKE ${`%${params.project_name}%`} LIMIT 1`
      projectId = p?.id
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let links: any[]
    let entityName = ''
    let projName: string | null = null
    if (taskId) {
      links = await sql`SELECT * FROM links WHERE task_id = ${taskId}`
      const [t] = await sql`SELECT t.title, p.name as pname FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = ${taskId}`
      entityName = t?.title ?? ''; projName = t?.pname ?? null
    } else if (projectId) {
      links = await sql`SELECT l.* FROM links l JOIN tasks t ON t.id = l.task_id WHERE t.project_id = ${projectId}`
      const [p] = await sql`SELECT name FROM projects WHERE id = ${projectId}`
      projName = p?.name ?? null; entityName = projName ?? ''
    } else {
      links = []
    }
    await sql`INSERT INTO agent_log (action_type, entity_name, project_name) VALUES ('summarized', ${entityName}, ${projName})`
    return { label: `${links.length} links`, color: 'amber', data: links }
  }

  throw new Error(`acción desconocida: ${action}`)
}

async function buildContext(): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  const projects = await sql<{ id: number; name: string }[]>`SELECT id, name FROM projects ORDER BY created_at DESC`
  const tasks = await sql<{ id: number; project_id: number; title: string; status: string; priority: string; due_date: string | null }[]>`
    SELECT id, project_id, title, status, priority, due_date::text as due_date
    FROM tasks WHERE status != 'done' ORDER BY created_at DESC LIMIT 30`
  const lines = [
    `fecha hoy: ${today}`,
    `proyectos: ${projects.map(p => `[${p.id}] ${p.name}`).join(', ')}`,
    'tareas activas (últimas 30):',
    ...tasks.map(t => `  [${t.id}] "${t.title}" | ${t.status} | ${t.priority}${t.due_date ? ` | vence ${t.due_date}` : ''} | proyecto ${t.project_id}`)
  ]
  return lines.join('\n')
}

type HistoryMessage = { role: 'user' | 'assistant'; content: string }

export async function POST(req: Request) {
  const { message, history = [] } = await req.json() as { message: string; history?: HistoryMessage[] }

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: 'message required' }), { status: 400 })
  }

  const context = await buildContext()
  const fullMessage = `contexto actual:\n${context}\n\nmensaje del usuario: ${message}`
  const claudeMessages: HistoryMessage[] = [...history.slice(-10), { role: 'user', content: fullMessage }]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      try {
        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: SYSTEM_PROMPT,
          messages: claudeMessages,
        })
        const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''
        let parsed: AgentResponse
        try {
          const m = raw.match(/\{[\s\S]*\}/)
          parsed = JSON.parse(m ? m[0] : raw)
        } catch {
          parsed = { action: null, params: {}, message: raw }
        }
        if (parsed.action) {
          try {
            const result = await executeAction(parsed.action, parsed.params)
            send({ type: 'action', action: parsed.action, label: result.label, color: result.color })
          } catch (err) {
            send({ type: 'action_error', message: err instanceof Error ? err.message : String(err) })
          }
        }
        for (const char of parsed.message) {
          send({ type: 'chunk', text: char })
          await new Promise(r => setTimeout(r, 8))
        }
        send({ type: 'done' })
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
