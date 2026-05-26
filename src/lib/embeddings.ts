/**
 * Embeddings layer — Gemini text-embedding-004 (free tier)
 * Falls back to OpenAI if OPENAI_API_KEY set and GEMINI_API_KEY not set
 * Stores vectors in data/embeddings.json
 */
import fs from 'fs'
import path from 'path'
import { getProjectsMap, ensureDbLoaded } from './db'
import type { Project } from './types'

const EMBEDDINGS_FILE = path.join(process.cwd(), 'data', 'embeddings.json')

// ── In-memory cache ───────────────────────────────────────────────────────────

let _cache: Map<string, number[]> | null = null

function loadCache(): Map<string, number[]> {
  if (_cache) return _cache
  try {
    if (fs.existsSync(EMBEDDINGS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(EMBEDDINGS_FILE, 'utf-8')) as Record<string, number[]>
      _cache = new Map(Object.entries(raw))
    } else {
      _cache = new Map()
    }
  } catch {
    _cache = new Map()
  }
  return _cache
}

function saveCache() {
  try {
    const dir = path.dirname(EMBEDDINGS_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const obj: Record<string, number[]> = {}
    for (const [k, v] of Array.from(loadCache())) obj[k] = v
    fs.writeFileSync(EMBEDDINGS_FILE, JSON.stringify(obj), 'utf-8')
  } catch {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function projectToText(p: Project): string {
  return [
    p.name,
    p.tagline,
    p.description?.slice(0, 500) || '',
    p.techStack.join(' '),
    p.hackathonName,
  ].filter(Boolean).join(' | ')
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10)
}

// ── Embed — Gemini primary, OpenAI fallback ───────────────────────────────────

async function embed(text: string): Promise<number[] | null> {
  const geminiKey = process.env.GEMINI_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (!geminiKey && !openaiKey) throw new Error('no_api_key')

  // Gemini: text-embedding-004 (free, 768-dim)
  if (geminiKey) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: text.slice(0, 2048) }] },
        }),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Gemini embed failed: ${err}`)
    }
    const data = await res.json() as { embedding: { values: number[] } }
    return data.embedding.values
  }

  // OpenAI fallback: text-embedding-3-small (1536-dim)
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI embed failed: ${err}`)
  }
  const data = await res.json() as { data: { embedding: number[] }[] }
  return data.data[0].embedding
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getEmbeddingStats() {
  await ensureDbLoaded()
  const cache = loadCache()
  const projects = getProjectsMap()
  return {
    embedded: cache.size,
    total: projects.size,
    ready: cache.size > 0,
  }
}

export async function buildEmbeddings(onProgress?: (done: number, total: number) => void): Promise<void> {
  const hasKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY
  if (!hasKey) throw new Error('no_api_key')

  await ensureDbLoaded()
  const projects = Array.from(getProjectsMap().values())
  const cache = loadCache()

  // Only embed projects not yet in cache
  const toEmbed = projects.filter(p => !cache.has(p.id))
  let done = cache.size

  for (let i = 0; i < toEmbed.length; i++) {
    const p = toEmbed[i]
    try {
      const vec = await embed(projectToText(p))
      if (vec) cache.set(p.id, vec)
      done++
    } catch {
      // Skip failed projects
    }

    onProgress?.(done, projects.length)

    // Persist every 50
    if (i % 50 === 49) saveCache()

    // Rate limit: Gemini 1500 RPM free / OpenAI 3000 RPM
    await new Promise(r => setTimeout(r, 40))
  }

  saveCache()
}

export async function findSimilarToText(query: string, k = 12): Promise<Array<{ project: Project; score: number }>> {
  const queryVec = await embed(query)
  if (!queryVec) return []

  await ensureDbLoaded()
  const cache = loadCache()
  const projects = getProjectsMap()

  const scored: Array<{ project: Project; score: number }> = []
  for (const [id, vec] of Array.from(cache)) {
    const project = projects.get(id)
    if (!project) continue
    scored.push({ project, score: cosineSim(queryVec, vec) })
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, k)
}

export async function findSimilarToProject(projectId: string, k = 12): Promise<Array<{ project: Project; score: number }>> {
  await ensureDbLoaded()
  const cache = loadCache()
  const queryVec = cache.get(projectId)

  if (!queryVec) {
    // Not embedded yet — embed on the fly
    const projects = getProjectsMap()
    const p = projects.get(projectId)
    if (!p) return []
    const vec = await embed(projectToText(p))
    if (!vec) return []
    cache.set(projectId, vec)
    saveCache()
    return findSimilarToProject(projectId, k)
  }

  const projects = getProjectsMap()
  const scored: Array<{ project: Project; score: number }> = []

  for (const [id, vec] of Array.from(cache)) {
    if (id === projectId) continue
    const project = projects.get(id)
    if (!project) continue
    scored.push({ project, score: cosineSim(queryVec, vec) })
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, k)
}
