import { NextRequest, NextResponse } from 'next/server'
import { findSimilarToText, findSimilarToProject, buildEmbeddings, getEmbeddingStats } from '@/lib/embeddings'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')
    const id = searchParams.get('id')
    const k = parseInt(searchParams.get('k') || '12')

    if (q) {
      const results = await findSimilarToText(q, k)
      return NextResponse.json({ results: results.map(r => ({ ...r.project, _score: r.score })) })
    }

    if (id) {
      const results = await findSimilarToProject(id, k)
      return NextResponse.json({ results: results.map(r => ({ ...r.project, _score: r.score })) })
    }

    // Stats
    return NextResponse.json(await getEmbeddingStats())
  } catch (err) {
    const msg = String(err)
    if (msg.includes('no_api_key')) {
      return NextResponse.json({ error: 'no_api_key', message: 'Add GEMINI_API_KEY to .env.local' }, { status: 400 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json().catch(() => ({ action: 'build' }))
    if (action === 'build') {
      // Run in background
      buildEmbeddings().catch(() => {})
      return NextResponse.json({ ok: true, message: 'Embedding generation started' })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
