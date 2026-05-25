/**
 * JSON file-based store — no native deps, works on any OS.
 * In-memory Map as primary store; async disk writes (never blocks event loop).
 */
import fs from 'fs'
import path from 'path'
import type { Project, Hackathon } from './types'

const DATA_DIR = path.join(process.cwd(), 'data')
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json')
const HACKATHONS_FILE = path.join(DATA_DIR, 'hackathons.json')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

// ─── In-memory caches with TTL ───────────────────────────────────────────────
// TTL-based: re-reads disk every 2s so hot-reload never serves stale data.
// During scrape, writes go to both the write-cache AND disk (debounced).

let _projects: Map<string, Project> | null = null
let _projectsLoadedAt = 0
let _hackathons: Map<string, Hackathon> | null = null
let _hackathonsLoadedAt = 0
const CACHE_TTL_MS = 2000 // re-read disk if cache older than 2s

let _projectsDirty = false
let _hackathonsDirty = false
let _writeTimer: ReturnType<typeof setTimeout> | null = null

export function getProjectsMap(): Map<string, Project> {
  const now = Date.now()
  if (_projects && now - _projectsLoadedAt < CACHE_TTL_MS) return _projects
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      const arr = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8')) as Project[]
      _projects = new Map(arr.map(p => [p.id, p]))
    } else {
      _projects = new Map()
    }
  } catch {
    if (!_projects) _projects = new Map()
  }
  _projectsLoadedAt = now
  return _projects
}

function getHackathonsMap(): Map<string, Hackathon> {
  const now = Date.now()
  if (_hackathons && now - _hackathonsLoadedAt < CACHE_TTL_MS) return _hackathons
  try {
    if (fs.existsSync(HACKATHONS_FILE)) {
      const arr = JSON.parse(fs.readFileSync(HACKATHONS_FILE, 'utf-8')) as Hackathon[]
      _hackathons = new Map(arr.map(h => [h.id, h]))
    } else {
      _hackathons = new Map()
    }
  } catch {
    if (!_hackathons) _hackathons = new Map()
  }
  _hackathonsLoadedAt = now
  return _hackathons
}

// Debounced async flush — writes to disk without blocking event loop
function scheduleDiskFlush() {
  if (_writeTimer) return
  _writeTimer = setTimeout(async () => { // eslint-disable-line @typescript-eslint/no-misused-promises
    _writeTimer = null
    ensureDir()
    if (_projectsDirty && _projects) {
      _projectsDirty = false
      const json = JSON.stringify(Array.from(_projects.values()), null, 2)
      await fs.promises.writeFile(PROJECTS_FILE, json, 'utf-8').catch(() => {})
    }
    if (_hackathonsDirty && _hackathons) {
      _hackathonsDirty = false
      const json = JSON.stringify(Array.from(_hackathons.values()), null, 2)
      await fs.promises.writeFile(HACKATHONS_FILE, json, 'utf-8').catch(() => {})
    }
  }, 100)
}

// Immediate synchronous flush (used at end of scrape / clear)
function flushSync() {
  ensureDir()
  if (_projects) fs.writeFileSync(PROJECTS_FILE, JSON.stringify(Array.from(_projects.values()), null, 2), 'utf-8')
  if (_hackathons) fs.writeFileSync(HACKATHONS_FILE, JSON.stringify(Array.from(_hackathons.values()), null, 2), 'utf-8')
  _projectsDirty = false
  _hackathonsDirty = false
}

// ─── Hackathons ───────────────────────────────────────────────────────────────

export function initDb() {
  ensureDir()
}

export function clearData() {
  ensureDir()
  // Backup existing data before wiping (prevents accidental loss)
  try {
    if (fs.existsSync(PROJECTS_FILE) && fs.statSync(PROJECTS_FILE).size > 10) {
      fs.copyFileSync(PROJECTS_FILE, PROJECTS_FILE + '.bak')
    }
    if (fs.existsSync(HACKATHONS_FILE) && fs.statSync(HACKATHONS_FILE).size > 10) {
      fs.copyFileSync(HACKATHONS_FILE, HACKATHONS_FILE + '.bak')
    }
  } catch {}
  _projects = new Map()
  _hackathons = new Map()
  _projectsDirty = false
  _hackathonsDirty = false
  fs.writeFileSync(PROJECTS_FILE, '[]', 'utf-8')
  fs.writeFileSync(HACKATHONS_FILE, '[]', 'utf-8')
}

export function upsertHackathon(h: Hackathon) {
  const map = getHackathonsMap()
  map.set(h.id, h)
  _hackathonsDirty = true
  scheduleDiskFlush()
}

export function getHackathons(): Hackathon[] {
  return Array.from(getHackathonsMap().values())
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export function upsertProjectsBatch(projects: Project[]) {
  const map = getProjectsMap()
  for (const p of projects) map.set(p.id, p)
  _projectsDirty = true
  scheduleDiskFlush()
}

export function flushToDisk() {
  flushSync()
}

// ─── Query ────────────────────────────────────────────────────────────────────

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
  for (const h of Array.from(getHackathonsMap().values())) {
    const yr = h.startDate ? new Date(h.startDate).getFullYear() : 0
    if (yr > 2000) {
      if (h.slug) map.set(h.slug, yr)
      if (h.id) map.set(h.id, yr)
    }
  }
  return map
}

export function getYears(): number[] {
  const hackathonMap = buildHackathonYearMap()
  const years = new Set<number>()
  for (const p of Array.from(getProjectsMap().values())) {
    const yr = resolveProjectYear(p, hackathonMap)
    if (yr > 2000) years.add(yr)
  }
  return Array.from(years).sort((a, b) => b - a)
}

export function getProjects(filters: {
  search?: string
  hackathon?: string
  techStack?: string[]
  years?: number[]
  winnersOnly?: boolean
  sortBy?: string
  page?: number
  pageSize?: number
}) {
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
  let list = Array.from(getProjectsMap().values())

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

export function getStats() {
  const projects = Array.from(getProjectsMap().values())

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
  try {
    ensureDir()
    const logFile = path.join(DATA_DIR, 'scrape.log')
    const line = `[${new Date().toISOString()}] [${phase}] ${message}\n`
    fs.appendFileSync(logFile, line, 'utf-8')
  } catch {}
}
