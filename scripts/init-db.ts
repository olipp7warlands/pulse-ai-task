import 'dotenv/config'
import sql from '../lib/db'

async function main() {
  console.log('Creating tables...')

  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#4a6e9a',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'backlog' CHECK(status IN ('backlog','in_progress','review','done')),
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
      due_date DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS links (
      id SERIAL PRIMARY KEY,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'other' CHECK(type IN ('doc','figma','github','other'))
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS activity_log (
      id SERIAL PRIMARY KEY,
      action TEXT NOT NULL,
      description TEXT,
      entity_type TEXT,
      entity_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS agent_log (
      id SERIAL PRIMARY KEY,
      action_type TEXT NOT NULL,
      entity_name TEXT NOT NULL DEFAULT '',
      project_name TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS meetings (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      date DATE NOT NULL,
      start_time TIME,
      end_time TIME,
      notes TEXT,
      audio_url TEXT,
      transcript TEXT,
      summary TEXT,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS meeting_attendees (
      id SERIAL PRIMARY KEY,
      meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      initials TEXT
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS suggested_tasks (
      id SERIAL PRIMARY KEY,
      meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',
      project_id INTEGER REFERENCES projects(id),
      approved BOOLEAN DEFAULT false,
      created_task_id INTEGER REFERENCES tasks(id)
    )
  `

  console.log('Tables created. Checking for seed data...')

  const { count } = (await sql`SELECT COUNT(*) as count FROM projects`)[0] as { count: string }
  if (Number(count) === 0) {
    console.log('Seeding initial data...')
    const today = new Date()
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    const addDays = (n: number) => new Date(today.getTime() + n * 86400000)

    const [p1] = await sql`INSERT INTO projects (name, color) VALUES ('diseño web', '#4a6e9a') RETURNING id`
    const [p2] = await sql`INSERT INTO projects (name, color) VALUES ('app móvil', '#5a8a4a') RETURNING id`

    await sql`INSERT INTO tasks (project_id, title, status, priority, due_date) VALUES
      (${p1.id}, 'diseñar página principal', 'in_progress', 'high', ${fmt(addDays(1))}),
      (${p1.id}, 'revisar paleta de colores', 'review', 'medium', ${fmt(today)}),
      (${p1.id}, 'exportar assets', 'backlog', 'low', null),
      (${p2.id}, 'configurar navegación', 'done', 'high', ${fmt(addDays(-2))}),
      (${p2.id}, 'implementar autenticación', 'in_progress', 'high', ${fmt(addDays(-1))}),
      (${p2.id}, 'pruebas de usuario', 'backlog', 'medium', ${fmt(addDays(5))})`

    await sql`INSERT INTO activity_log (action, description, entity_type) VALUES ('seed', 'datos iniciales cargados', 'system')`
    console.log('Seed data inserted.')
  }

  console.log('Done.')
  await sql.end()
}

main().catch(e => { console.error(e); process.exit(1) })
