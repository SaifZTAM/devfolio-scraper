import { NextResponse } from 'next/server'
import { getProjectsMap, upsertProjectsBatch, flushToDisk, logScrape, ensureDbLoaded } from '@/lib/db'
import { getScrapeStatus } from '@/lib/scraper'

let _enrichRunning = false

async function apiFetch<T>(endpoint: string): Promise<T | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(`https://api.devfolio.co/api${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.json() as T
  } catch { return null }
}

interface ApiProjectDetail {
  project: {
    uuid: string; name: string; slug: string; tagline: string;
    cover_img: string; likes: number; links: string;
    source_code_url: string | null; hashtags: Array<{ name: string }>;
    prizes: Array<{ name: string }>; pictures: string;
    description: Array<{ title: string; content: string }>;
  }
}

async function enrichOne(slug: string) {
  const data = await apiFetch<ApiProjectDetail>(`/projects/${slug}`)
  if (!data?.project) return null
  const p = data.project
  const linksRaw = p.links ? p.links.split(',').map((l: string) => l.trim()).filter(Boolean) : []
  const githubUrl = linksRaw.find((l: string) => l.includes('github.com')) || p.source_code_url || ''
  const demoUrl = linksRaw.find((l: string) =>
    !l.includes('github.com') && !l.includes('youtube.com') &&
    !l.includes('twitter.com') && !l.includes('linkedin.com')
  ) || ''
  const imageUrl = p.cover_img || (p.pictures ? `https://assets.devfolio.co/${p.pictures.split(',')[0].trim()}` : '')
  const techStack = p.hashtags?.map((h: { name: string }) => h.name).filter(Boolean) || []
  const prizes = p.prizes || []
  // Only mark as winner from prizes if prizes exist — never downgrade an existing winner
  // (winner status was already set from hackathon winners API during scrape)
  const isWinnerFromApi = prizes.length > 0
  const prizeTrack = prizes.map((pr: { name: string }) => pr.name).filter(Boolean).join(', ')
  const description = Array.isArray(p.description)
    ? p.description.map((b: { title: string; content: string }) => `${b.title}: ${b.content}`).join('\n\n').slice(0, 2000)
    : ''
  return { githubUrl, demoUrl, websiteUrl: demoUrl, imageUrl, techStack, isWinnerFromApi, prizeTrack, description, likes: p.likes || 0 }
}

export async function POST() {
  if (_enrichRunning || getScrapeStatus().running) {
    return NextResponse.json({ ok: false, error: 'Already running' }, { status: 409 })
  }
  _enrichRunning = true

  // Run in background — parallel batches for speed
  ;(async () => {
    try {
      await ensureDbLoaded()
      const projects = Array.from(getProjectsMap().values())
      const toEnrich = projects.filter(p => !p.githubUrl && !p.imageUrl && !p.description)
      logScrape('enrich', `Enriching ${toEnrich.length} projects (parallel x8)`)

      const CONCURRENCY = 8   // 8 parallel — safe limit for Devfolio rate limiting
      const BATCH_SAVE = 100  // write to disk every 100 enriched
      const saveBatch: typeof projects = []

      // Process in chunks of CONCURRENCY
      for (let i = 0; i < toEnrich.length; i += CONCURRENCY) {
        const chunk = toEnrich.slice(i, i + CONCURRENCY)
        const results = await Promise.all(
          chunk.map(async p => {
            const enriched = await enrichOne(p.slug)
            if (!enriched) return null
            const { isWinnerFromApi, ...rest } = enriched
            const isWinner = p.isWinner || isWinnerFromApi
            const prizeTrack = rest.prizeTrack || p.prizeTrack
            return { ...p, ...rest, isWinner, prizeTrack }
          })
        )
        for (const r of results) { if (r) saveBatch.push(r) }
        if (saveBatch.length >= BATCH_SAVE) {
          upsertProjectsBatch(saveBatch.splice(0, BATCH_SAVE))
        }
        // Tiny pause to avoid OS socket exhaustion
        await new Promise(r => setTimeout(r, 10))
      }
      if (saveBatch.length > 0) upsertProjectsBatch(saveBatch)
      flushToDisk()
      logScrape('enrich', `Done enriching`)
    } catch (e) {
      logScrape('enrich-error', String(e))
    }
    _enrichRunning = false
  })()

  return NextResponse.json({ ok: true, message: 'Enrichment started for all unenriched projects' })
}

export async function GET() {
  await ensureDbLoaded()
  const projects = Array.from(getProjectsMap().values())
  const total = projects.length
  const enriched = projects.filter(p => p.imageUrl || p.githubUrl || p.description).length
  return NextResponse.json({ total, enriched, running: _enrichRunning, pending: total - enriched })
}
