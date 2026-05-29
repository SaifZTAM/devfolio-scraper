/**
 * Supabase-backed store — projects and hackathons persisted in PostgreSQL.
 * In-memory Maps as primary write buffer; async Supabase upserts for persistence.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Project, Hackathon } from './types'

let _supabase: SupabaseClient | null = null
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _supabase
}

// ─── In-memory caches ─────────────────────────────────────────────────────────
let _projects: Map<string, Project> = new Map()
let _hackathons: Map<string, Hackathon> = new Map()
let _loaded = false
let _loadPromise: Promise<void> | null = null
let _projectsDirty = false
let _hackathonsDirty = false
let _writeTimer: ReturnType<typeof setTimeout> | null = null

async function loadFromDb() {
  const [{ data: projects }, { data: hackathons }] = await Promise.all([
    getSupabase().from('projects').select('id, data'),
    getSupabase().from('hackathons').select('id, data'),
  ])
  _projects = new Map((projects || []).map((r: { id: string; data: Project }) => [r.id, r.data]))
  _hackathons = new Map((hackathons || []).map((r: { id: string; data: Hackathon }) => [r.id, r.data]))
  _loaded = true
}

export async function ensureDbLoaded() {
  if (_loaded) return
  if (!_loadPromise) _loadPromise = loadFromDb().finally(() => { _loadPromise = null })
  await _loadPromise
}

export function initDb() {
  // Kick off background load — non-blocking
  if (!_loaded && !_loadPromise) {
    _loadPromise = loadFromDb().finally(() => { _loadPromise = null })
  }
}

// ─── Supabase flush ───────────────────────────────────────────────────────────

function scheduleDiskFlush() {
  if (_writeTimer) return
  _writeTimer = setTimeout(() => {
    _writeTimer = null
    void flushAsync()
  }, 100)
}

async function flushAsync() {
  if (_projectsDirty && _projects.size > 0) {
    _projectsDirty = false
    const rows = Array.from(_projects.entries()).map(([id, data]) => ({ id, data }))
    for (let i = 0; i < rows.length; i += 500) {
      await getSupabase().from('projects').upsert(rows.slice(i, i + 500))
    }
  }
  if (_hackathonsDirty && _hackathons.size > 0) {
    _hackathonsDirty = false
    const rows = Array.from(_hackathons.entries()).map(([id, data]) => ({ id, data }))
    await getSupabase().from('hackathons').upsert(rows)
  }
}

// ─── Public write API ─────────────────────────────────────────────────────────

export async function clearData() {
  _projects = new Map()
  _hackathons = new Map()
  _loaded = true
  _projectsDirty = false
  _hackathonsDirty = false
  await Promise.all([
    getSupabase().from('projects').delete().neq('id', ''),
    getSupabase().from('hackathons').delete().neq('id', ''),
  ])
}

export function upsertHackathon(h: Hackathon) {
  _hackathons.set(h.id, h)
  _hackathonsDirty = true
  scheduleDiskFlush()
}

export function getProjectsMap(): Map<string, Project> {
  return _projects
}

export function upsertProjectsBatch(projects: Project[]) {
  for (const p of projects) _projects.set(p.id, p)
  _projectsDirty = true
  scheduleDiskFlush()
}

export function flushToDisk() {
  void flushAsync()
}

// ─── Hackathons ───────────────────────────────────────────────────────────────

export async function getHackathons(): Promise<Hackathon[]> {
  await ensureDbLoaded()
  return Array.from(_hackathons.values())
}

// ─── Query helpers ────────────────────────────────────────────────────────────

function resolveProjectYear(p: Project, hackathonMap: Map<string, number>): number {
  if (p.year && p.year > 2000) return p.year
  const yr = hackathonMap.get(p.hackathonSlug) || hackathonMap.get(p.hackathonId)
  if (yr) return yr
  const m = (p.hackathonSlug || p.hackathonName || '').match(/20(\d{2})/)
  if (m) return 2000 + parseInt(m[1])
  if (p.scrapedAt) return new Date(p.scrapedAt).getFullYear()
  return 0
}

function buildHackathonYearMap(): Map<string, number> {
  const map = new Map<string, number>()
  for (const h of Array.from(_hackathons.values())) {
    const yr = h.startDate ? new Date(h.startDate).getFullYear() : 0
    if (yr > 2000) {
      if (h.slug) map.set(h.slug, yr)
      if (h.id) map.set(h.id, yr)
    }
  }
  return map
}

export async function getYears(): Promise<number[]> {
  await ensureDbLoaded()
  const hackathonMap = buildHackathonYearMap()
  const years = new Set<number>()
  for (const p of Array.from(_projects.values())) {
    const yr = resolveProjectYear(p, hackathonMap)
    if (yr > 2000) years.add(yr)
  }
  return Array.from(years).sort((a, b) => b - a)
}

export async function getProjects(filters: {
  search?: string
  hackathon?: string
  techStack?: string[]
  years?: number[]
  winnersOnly?: boolean
  sortBy?: string
  page?: number
  pageSize?: number
}) {
  await ensureDbLoaded()

  const {
    search = '',
    hackathon = '',
    techStack = [],
    years = [],
    winnersOnly = false,
    sortBy = 'likes',
    page = 1,
    pageSize = 24,
  } = filters

  const hackathonMap = buildHackathonYearMap()
  let list = Array.from(_projects.values())

  if (search) {
    const q = search.toLowerCase()
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.tagline.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    )
  }
  if (hackathon) {
    list = list.filter(p => p.hackathonSlug === hackathon)
  }
  if (winnersOnly) {
    list = list.filter(p => p.isWinner)
  }
  if (techStack.length > 0) {
    list = list.filter(p =>
      techStack.some(t => p.techStack.some(pt => pt.toLowerCase().includes(t.toLowerCase())))
    )
  }
  if (years.length > 0) {
    list = list.filter(p => {
      const yr = resolveProjectYear(p, hackathonMap)
      return years.includes(yr)
    })
  }

  if (sortBy === 'likes') list.sort((a, b) => b.likes - a.likes)
  else if (sortBy === 'recent') list.sort((a, b) => b.scrapedAt.localeCompare(a.scrapedAt))
  else if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name))

  const total = list.length
  const offset = (page - 1) * pageSize
  const projects = list.slice(offset, offset + pageSize)

  return { total, projects }
}

export async function getStats() {
  await ensureDbLoaded()
  const projects = Array.from(_projects.values())

  const totalProjects = projects.length
  const totalWinners = projects.filter(p => p.isWinner).length
  const hackathonIds = new Set(projects.map(p => p.hackathonId).filter(Boolean))
  const totalHackathons = hackathonIds.size
  const totalLikes = projects.reduce((sum, p) => sum + (p.likes || 0), 0)

  const techCount: Record<string, number> = {}
  for (const p of projects) {
    for (const t of p.techStack || []) {
      if (t) techCount[t] = (techCount[t] || 0) + 1
    }
  }
  const topTechs = Object.entries(techCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, count]) => ({ name, count }))

  return { totalProjects, totalWinners, totalHackathons, totalLikes, topTechs }
}

export function logScrape(phase: string, message: string) {
  console.log(`[${new Date().toISOString()}] [${phase}] ${message}`)
}
