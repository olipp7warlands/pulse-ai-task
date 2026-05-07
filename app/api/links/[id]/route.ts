export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await sql`DELETE FROM links WHERE id = ${params.id}`
  return NextResponse.json({ ok: true })
}
