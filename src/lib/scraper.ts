/**
 * Devfolio REST API scraper — no Playwright needed.
 * API base: https://api.devfolio.co/api
 */
import { upsertHackathon, upsertProjectsBatch, logScrape, clearData, flushToDisk } from './db'
import type { Hackathon, Project, ScrapeStatus } from './types'

const API = 'https://api.devfolio.co/api'
const HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
}

// ── In-memory status ──────────────────────────────────────────────────────────

let _status: ScrapeStatus = { running: false, phase: '', progress: 0, total: 0, message: '', startedAt: null, completedAt: null, error: null }

export function getScrapeStatus(): ScrapeStatus { return _status }

let _stopRequested = false
export function setStopRequested(v: boolean) { _stopRequested = v }

function setStatus(update: Partial<ScrapeStatus>) {
  _status = { ..._status, ...update }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiFetch<T>(endpoint: string): Promise<T | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000) // 20s timeout
    const res = await fetch(`${API}${endpoint}`, { headers: HEADERS, signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.json() as T
  } catch {
    return null
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ── API response types ────────────────────────────────────────────────────────

interface ApiHackathon {
  uuid: string
  name: string
  slug: string
  tagline: string
  desc: string
  cover_img: string
  starts_at: string
  ends_at: string
  status: string
  private: boolean
  discover: boolean
  city: string | null
  country: string | null
  hackathon_setting?: { subdomain?: string }
}

interface ApiHackathonsResponse {
  result: ApiHackathon[]
  count: number
  pages: number
}

interface ApiProjectSummary {
  uuid: string
  name: string
  slug: string
  tagline: string
  team: { name: string | null; uuid?: string | null }
  builders: Array<{ uuid: string; username: string; first_name: string; last_name: string; profile_image: string | null }>
}

interface ApiProjectsResponse {
  result: ApiProjectSummary[]
  count: number
  pages: number
}

interface ApiProjectDetail {
  project: {
    uuid: string
    name: string
    slug: string
    tagline: string
    cover_img: string
    likes: number
    views: number
    links: string
    source_code_url: string | null
    platforms: string[]
    published_at: string
    hashtags: Array<{ uuid: string; name: string }>
    prizes: Array<{ uuid: string; name: string }>
    prize_tracks: Array<{ uuid: string; name: string }>
    pictures: string
    description: Array<{ title: string; content: string }>
  }
}

interface ApiWinner {
  project: { uuid: string; slug: string; name: string }
  prize: { uuid: string; name: string }
}

interface ApiWinnersResponse {
  result: ApiWinner[]
}

// ── Scrape functions ──────────────────────────────────────────────────────────

async function fetchHackathons(maxHackathons: number): Promise<Hackathon[]> {
  setStatus({ phase: 'hackathons', message: 'Fetching all hackathon pages...' })
  logScrape('hackathons', 'Fetching hackathon list (all pages, newest first)')

  // Collect ALL public hackathons from every page first, then sort newest → oldest
  const allHackathons: Hackathon[] = []
  let page = 1
  const perPage = 100
  const nowIso = new Date().toISOString()
  const nowMs = Date.now()

  while (true) {
    setStatus({ message: `Fetching hackathons page ${page}…` })
    const data = await apiFetch<ApiHackathonsResponse>(`/hackathons?count=${perPage}&page=${page}`)
    if (!data?.result?.length) break

    for (const h of data.result) {
      if (h.private || h.status !== 'publish') continue
      allHackathons.push({
        id: h.uuid,
        name: h.name,
        slug: h.slug,
        description: h.desc || h.tagline || '',
        startDate: h.starts_at || '',
        endDate: h.ends_at || '',
        organizerName: '',
        projectCount: 0,
        winnerCount: 0,
        imageUrl: h.cover_img || '',
        scrapedAt: nowIso,
      })
    }

    if (page >= data.pages) break
    page++
    await sleep(200)
  }

  // Only include hackathons that have already ended
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

  const completedHackathons = allHackathons.filter(h => {
    const start = h.startDate ? new Date(h.startDate).getTime() : 0
    if (h.endDate) {
      return new Date(h.endDate).getTime() <= nowMs
    }
    return start > 0 && start <= nowMs - THIRTY_DAYS
  })

  // Sort newest first (by startDate desc)
  completedHackathons.sort((a, b) => {
    const da = a.startDate ? new Date(a.startDate).getTime() : 0
    const db = b.startDate ? new Date(b.startDate).getTime() : 0
    return db - da
  })

  const hackathons = completedHackathons.slice(0, maxHackathons)
  logScrape('hackathons', `${allHackathons.length} total → ${completedHackathons.length} started/completed → using newest ${hackathons.length}`)
  return hackathons
}

async function fetchWinners(hackathonSlug: string): Promise<Map<string, string>> {
  // Returns map of project_slug → prize_name
  const winnerMap = new Map<string, string>()
  const data = await apiFetch<ApiWinnersResponse>(`/hackathons/${hackathonSlug}/winners`)
  if (data?.result) {
    for (const w of data.result) {
      if (w.project?.slug) {
        winnerMap.set(w.project.slug, w.prize?.name || 'Winner')
      }
    }
  }
  return winnerMap
}

async function fetchHackathonProjects(hackathon: Hackathon): Promise<Project[]> {
  setStatus({ message: `${hackathon.name} — fetching projects...` })

  // Fetch winners first
  const winnerMap = await fetchWinners(hackathon.slug)

  const projects: Project[] = []
  let page = 1
  const perPage = 100
  const now = new Date().toISOString()
  const hackathonYear = hackathon.startDate ? new Date(hackathon.startDate).getFullYear() : new Date().getFullYear()

  while (true) {
    const data = await apiFetch<ApiProjectsResponse>(`/hackathons/${hackathon.slug}/projects?count=${perPage}&page=${page}`)
    if (!data?.result?.length) break

    for (const p of data.result) {
      const teamMembers = p.builders?.map(b => `${b.first_name} ${b.last_name}`.trim()).filter(Boolean) || []
      const isWinner = winnerMap.has(p.slug)
      const prizeTrack = winnerMap.get(p.slug) || ''

      projects.push({
        id: p.uuid || p.slug,
        name: p.name || p.slug,
        slug: p.slug,
        tagline: p.tagline || '',
        description: '',
        hackathonId: hackathon.id,
        hackathonName: hackathon.name,
        hackathonSlug: hackathon.slug,
        isWinner,
        prizeTrack,
        likes: 0, // enriched later
        techStack: [], // enriched later
        githubUrl: '',
        demoUrl: '',
        websiteUrl: '',
        devfolioUrl: `https://devfolio.co/projects/${p.slug}`,
        imageUrl: '',
        teamMembers,
        year: hackathonYear,
        scrapedAt: now,
      })
    }

    if (page >= data.pages) break
    page++
    await sleep(150)
  }

  logScrape('projects', `  ${hackathon.slug}: ${projects.length} projects, ${winnerMap.size} winners`)
  return projects
}

async function enrichProject(project: Project): Promise<Project> {
  const data = await apiFetch<ApiProjectDetail>(`/projects/${project.slug}`)
  if (!data?.project) return project

  const p = data.project
  const techStack = p.hashtags?.map(h => h.name).filter(Boolean) || []
  const linksRaw = p.links ? p.links.split(',').map(l => l.trim()).filter(Boolean) : []

  const githubUrl = linksRaw.find(l => l.includes('github.com')) || p.source_code_url || ''
  const demoUrl = linksRaw.find(l =>
    !l.includes('github.com') && !l.includes('youtube.com') &&
    !l.includes('twitter.com') && !l.includes('linkedin.com') &&
    !l.includes('devpost.com')
  ) || ''
  const websiteUrl = demoUrl

  const imageUrl = p.cover_img || (p.pictures ? `https://assets.devfolio.co/${p.pictures.split(',')[0].trim()}` : '')

  // Winner detection via prizes array
  const prizes = p.prizes || []
  const prizeNames = prizes.map((pr: { name: string }) => pr.name).filter(Boolean)
  const isWinner = project.isWinner || prizes.length > 0
  const prizeTrack = project.prizeTrack || prizeNames.join(', ') || ''

  // Description from structured blocks
  const description = Array.isArray(p.description)
    ? p.description.map(b => `${b.title}: ${b.content}`).join('\n\n').slice(0, 2000)
    : ''

  return {
    ...project,
    description,
    likes: p.likes || 0,
    techStack,
    githubUrl,
    demoUrl,
    websiteUrl,
    imageUrl,
    isWinner,
    prizeTrack,
  }
}

async function fetchTopProjects(maxCount = 200): Promise<Project[]> {
  setStatus({ phase: 'top-projects', message: 'Fetching top projects from global feed...' })
  logScrape('top-projects', 'Fetching global projects feed')

  // Use the global projects endpoint sorted by likes
  const projects: Project[] = []
  let page = 1
  const perPage = 100
  const now = new Date().toISOString()

  while (projects.length < maxCount) {
    const data = await apiFetch<ApiProjectsResponse>(`/projects?count=${perPage}&page=${page}&sort=likes`)
    if (!data?.result?.length) break

    for (const p of data.result) {
      const teamMembers = p.builders?.map(b => `${b.first_name} ${b.last_name}`.trim()).filter(Boolean) || []
      projects.push({
        id: p.uuid || p.slug,
        name: p.name || p.slug,
        slug: p.slug,
        tagline: p.tagline || '',
        description: '',
        hackathonId: '',
        hackathonName: '',
        hackathonSlug: '',
        isWinner: false,
        prizeTrack: '',
        likes: 0,
        techStack: [],
        githubUrl: '',
        demoUrl: '',
        websiteUrl: '',
        devfolioUrl: `https://devfolio.co/projects/${p.slug}`,
        imageUrl: '',
        teamMembers,
        year: 0, // unknown for global top-projects; resolved by db at query time via hackathon slug
        scrapedAt: now,
      })
    }

    if (page >= (data.pages || 1)) break
    page++
    await sleep(200)
  }

  logScrape('top-projects', `Fetched ${projects.length} global projects`)
  return projects
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function runScraper(options: {
  maxHackathons?: number
  maxTopProjects?: number
  enrichProjects?: boolean
}) {
  if (getScrapeStatus().running) throw new Error('Scraper already running')

  // Always reset stop flag when starting a new scrape
  _stopRequested = false

  const {
    maxHackathons = 50,
    maxTopProjects = 200,
    enrichProjects = true, // defaults to true now — API makes it fast
  } = options

  setStatus({
    running: true, phase: 'init', progress: 0, total: 0,
    message: 'Clearing old data...', startedAt: new Date().toISOString(),
    completedAt: null, error: null,
  })
  await clearData()

  try {
    // Phase 1: Hackathons
    const hackathons = await fetchHackathons(maxHackathons)
    setStatus({ total: hackathons.length, message: `${hackathons.length} hackathons found` })
    for (const h of hackathons) upsertHackathon(h)

    // Phase 2: Per-hackathon projects
    setStatus({ phase: 'hackathon-projects' })
    const allProjects = new Map<string, Project>()

    for (let i = 0; i < hackathons.length; i++) {
      if (_stopRequested) {
        setStatus({ running: false, phase: 'stopped', message: 'Stopped by user.', completedAt: new Date().toISOString() })
        _stopRequested = false
        return
      }
      const h = hackathons[i]
      setStatus({ progress: i + 1, total: hackathons.length, message: `[${i + 1}/${hackathons.length}] ${h.name}` })
      const projects = await fetchHackathonProjects(h)
      for (const p of projects) allProjects.set(p.id, p)
      h.projectCount = projects.length
      h.winnerCount = projects.filter(p => p.isWinner).length
      upsertHackathon(h)
      upsertProjectsBatch(projects)
      flushToDisk() // sync write after each hackathon — prevents data loss on stop
      await sleep(300)
    }

    // Phase 3: Top global projects
    setStatus({ phase: 'top-projects', progress: 0, total: 1 })
    const topProjects = await fetchTopProjects(maxTopProjects)
    const newTop = topProjects.filter(p => !allProjects.has(p.id))
    for (const p of newTop) allProjects.set(p.id, p)
    upsertProjectsBatch(newTop)

    // Phase 4: Enrich top 2000 projects (cap prevents event-loop freeze on huge datasets)
    if (enrichProjects) {
      const toEnrich = Array.from(allProjects.values()).slice(0, 2000)
      setStatus({ phase: 'enriching', progress: 0, total: toEnrich.length, message: 'Enriching project details...' })
      const enriched: Project[] = []

      for (let i = 0; i < toEnrich.length; i++) {
        if (_stopRequested) {
          if (enriched.length > 0) upsertProjectsBatch(enriched)
          flushToDisk()
          setStatus({ running: false, phase: 'stopped', message: 'Stopped by user.', completedAt: new Date().toISOString() })
          _stopRequested = false
          return
        }
        setStatus({ progress: i + 1, message: `Enriching ${toEnrich[i].name}...` })
        const e = await enrichProject(toEnrich[i])
        enriched.push(e)

        // Accumulate in memory; flush every 200 projects (not 20)
        if (enriched.length % 200 === 0) {
          upsertProjectsBatch(enriched.splice(0, 200))
        }
        await sleep(80)
      }
      if (enriched.length > 0) upsertProjectsBatch(enriched)
    }

    flushToDisk()
    setStatus({
      running: false, phase: 'done',
      progress: allProjects.size, total: allProjects.size,
      message: `Done! ${allProjects.size} projects from ${hackathons.length} hackathons.`,
      completedAt: new Date().toISOString(),
    })
    logScrape('done', `Completed. ${allProjects.size} projects, ${hackathons.length} hackathons.`)
  } catch (err) {
    const msg = String(err)
    setStatus({ running: false, phase: 'error', error: msg, message: `Error: ${msg}`, completedAt: new Date().toISOString() })
    logScrape('error', msg)
    throw err
  }
}
