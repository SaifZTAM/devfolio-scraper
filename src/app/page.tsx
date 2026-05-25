'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import ProjectCard from '@/components/ProjectCard'
import FilterBar from '@/components/FilterBar'
import ScrapePanel from '@/components/ScrapePanel'
import StatsBar from '@/components/StatsBar'
import NatureBackground from '@/components/NatureBackground'
import ThemeToggle from '@/components/ThemeToggle'
import ProjectModal from '@/components/ProjectModal'
import SemanticSearch from '@/components/SemanticSearch'
import HeroSection from '@/components/HeroSection'
import type { Project, Hackathon, ProjectFilters } from '@/lib/types'
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle, Leaf } from 'lucide-react'

const DEFAULT_FILTERS: ProjectFilters = {
  search: '',
  hackathon: '',
  techStack: [],
  years: [],
  winnersOnly: false,
  sortBy: 'likes',
  page: 1,
  pageSize: 24,
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="h-36 skeleton" />
      <div className="p-4 space-y-2.5">
        <div className="h-3.5 w-2/3 skeleton" />
        <div className="h-2.5 w-full skeleton" />
        <div className="h-2.5 w-4/5 skeleton" />
        <div className="flex gap-1.5 mt-2">
          {[1, 2, 3].map(i => <div key={i} className="h-4 w-14 skeleton" />)}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_FILTERS)
  const [projects, setProjects] = useState<Project[]>([])
  const [total, setTotal] = useState(0)
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [topTechs, setTopTechs] = useState<{ name: string; count: number }[]>([])
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [stats, setStats] = useState({ totalProjects: 0, totalWinners: 0, totalHackathons: 0, totalLikes: 0 })
  const [loading, setLoading] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [surpriseLoading, setSurpriseLoading] = useState(false)
  const [semanticResults, setSemanticResults] = useState<Project[] | null>(null)
  const [isScraping, setIsScraping] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const filtersRef = useRef<ProjectFilters>(DEFAULT_FILTERS)

  const fetchProjects = useCallback(async (f: ProjectFilters) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search: f.search,
        hackathon: f.hackathon,
        techStack: f.techStack.join(','),
        years: f.years.join(','),
        winnersOnly: String(f.winnersOnly),
        sortBy: f.sortBy,
        page: String(f.page),
        pageSize: String(f.pageSize),
      })
      const r = await fetch(`/api/projects?${params}`)
      if (r.ok) {
        const data = await r.json()
        setProjects(data.projects || [])
        setTotal(data.total || 0)
      }
    } catch {}
    setLoading(false)
  }, [])

  const fetchMeta = useCallback(async () => {
    try {
      const [hackR, statsR, yearsR] = await Promise.all([
        fetch('/api/projects?type=hackathons'),
        fetch('/api/projects?type=stats'),
        fetch('/api/projects?type=years'),
      ])
      if (hackR.ok) { const d = await hackR.json(); setHackathons(d.hackathons || []) }
      if (statsR.ok) {
        const d = await statsR.json()
        setStats({ totalProjects: d.totalProjects || 0, totalWinners: d.totalWinners || 0, totalHackathons: d.totalHackathons || 0, totalLikes: d.totalLikes || 0 })
        setTopTechs(d.topTechs || [])
      }
      if (yearsR.ok) { const d = await yearsR.json(); setAvailableYears(d.years || []) }
    } catch {}
  }, [])

  useEffect(() => { fetchMeta(); fetchProjects(DEFAULT_FILTERS) }, [fetchMeta, fetchProjects])

  // Keep filtersRef in sync so scrape-poll uses latest filters
  useEffect(() => { filtersRef.current = filters }, [filters])

  // Real-time polling during active scrape
  useEffect(() => {
    let wasRunning = false
    const id = setInterval(async () => {
      try {
        const r = await fetch('/api/scrape')
        if (!r.ok) return
        const s = await r.json()
        if (s.running) {
          wasRunning = true
          setIsScraping(true)
          // Silently refresh cards without showing loading spinner
          const params = new URLSearchParams({
            search: filtersRef.current.search,
            hackathon: filtersRef.current.hackathon,
            techStack: filtersRef.current.techStack.join(','),
            years: filtersRef.current.years.join(','),
            winnersOnly: String(filtersRef.current.winnersOnly),
            sortBy: filtersRef.current.sortBy,
            page: String(filtersRef.current.page),
            pageSize: String(filtersRef.current.pageSize),
          })
          const pr = await fetch(`/api/projects?${params}`)
          if (pr.ok) {
            const data = await pr.json()
            setProjects(data.projects || [])
            setTotal(data.total || 0)
          }
          const sr = await fetch('/api/projects?type=stats')
          if (sr.ok) {
            const d = await sr.json()
            setStats({ totalProjects: d.totalProjects || 0, totalWinners: d.totalWinners || 0, totalHackathons: d.totalHackathons || 0, totalLikes: d.totalLikes || 0 })
          }
        } else if (wasRunning) {
          wasRunning = false
          setIsScraping(false)
          fetchProjects(filtersRef.current)
          fetchMeta()
        } else {
          setIsScraping(false)
        }
      } catch {}
    }, 3000)
    return () => clearInterval(id)
  }, [fetchProjects, fetchMeta])

  const handleFilterChange = (partial: Partial<ProjectFilters>) => {
    const next = { ...filters, ...partial }
    setFilters(next)
    fetchProjects(next)
    if (!partial.page || partial.page === 1) {
      setTimeout(() => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }

  const handleSurprise = async () => {
    setSurpriseLoading(true)
    try {
      const params = new URLSearchParams({
        search: filters.search,
        hackathon: filters.hackathon,
        techStack: filters.techStack.join(','),
        years: filters.years.join(','),
        winnersOnly: String(filters.winnersOnly),
        sortBy: filters.sortBy,
        random: 'true',
      })
      const r = await fetch(`/api/projects?${params}`)
      if (r.ok) {
        const data = await r.json()
        if (data.project) setSelectedProject(data.project)
      }
    } catch {}
    setSurpriseLoading(false)
  }

  const totalPages = Math.ceil(total / filters.pageSize)
  const isEmpty = stats.totalProjects === 0

  return (
    <NatureBackground>

      {/* ── Header — floating pill navbar ── */}
      <header className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-3xl">
        <div
          className="flex items-center justify-between px-4 py-2.5 rounded-full"
          style={{
            background: 'rgba(10,5,2,0.55)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,107,43,0.22)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset',
          }}
        >
          {/* Brand text */}
          <div className="flex-shrink-0">
            <span className="text-base font-bold italic tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Devfolio Scraper
            </span>
          </div>

          {/* Center — live badge */}
          {stats.totalProjects > 0 && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: 'rgba(255,107,43,0.12)', color: '#FF6B2B', border: '1px solid rgba(255,107,43,0.2)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {stats.totalProjects.toLocaleString()} projects
            </div>
          )}

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {!isEmpty && (
              <button
                onClick={handleSurprise}
                disabled={surpriseLoading}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all disabled:opacity-60"
                style={{ background: 'rgba(255,107,43,0.18)', color: '#FF8A55', border: '1px solid rgba(255,107,43,0.25)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,107,43,0.30)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,107,43,0.18)' }}
              >
                <Shuffle size={11} className={surpriseLoading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Surprise</span>
              </button>
            )}
            <button
              onClick={() => { fetchMeta(); fetchProjects(filters) }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)' }}
              title="Refresh"
            >
              <RotateCcw size={12} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      {/* Push content below fixed header */}
      <div className="h-20" />

      {/* ── Hero ── */}
      <div style={{ filter: selectedProject ? 'blur(3px)' : 'none', transition: 'filter 0.3s ease', pointerEvents: selectedProject ? 'none' : 'auto' }}>
      <HeroSection
        totalProjects={stats.totalProjects}
        totalHackathons={stats.totalHackathons}
        totalWinners={stats.totalWinners}
        onSurprise={handleSurprise}
        onExplore={() => gridRef.current?.scrollIntoView({ behavior: 'smooth' })}
      />
      </div>

      {/* ── Body ── */}
      <div
        className="max-w-[1360px] mx-auto px-6 py-6"
        style={{
          filter: selectedProject ? 'blur(3px)' : 'none',
          transition: 'filter 0.3s ease',
          pointerEvents: selectedProject ? 'none' : 'auto',
        }}
      >
        <div className="flex gap-6">

          {/* ── Sidebar ── */}
          <aside className="w-64 flex-shrink-0 space-y-4 self-start sticky top-20">
            <ScrapePanel onComplete={() => { fetchMeta(); fetchProjects(filters) }} />
            {!isEmpty && (
              <SemanticSearch
                onResults={results => setSemanticResults(results)}
                onSelectProject={setSelectedProject}
              />
            )}

            {/* Onboarding when empty */}
            {isEmpty && (
              <div
                className="rounded-2xl p-4 space-y-3"
                style={{ background: '#EEF5EF', border: '1px solid #A8D0AC' }}
              >
                <div className="text-xs font-semibold" style={{ color: '#2A5C34' }}>Getting started</div>
                <p className="text-xs leading-relaxed" style={{ color: '#4A5E4A' }}>
                  Click <strong>Start Scraping</strong> to pull all projects, winners, and tech stacks from Devfolio hackathons.
                </p>
                {['50 hackathons', 'Winner detection', 'Tech stacks', 'Likes & GitHub links'].map(f => (
                  <div key={f} className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--accent)' }}>
                    <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
                    {f}
                  </div>
                ))}
              </div>
            )}

            {/* Dataset breakdown */}
            {!isEmpty && (
              <div className="card-flat rounded-2xl p-4 space-y-2.5">
                <div className="section-label mb-3">Dataset</div>
                {[
                  { label: 'Projects', value: stats.totalProjects, color: 'var(--accent)' },
                  { label: 'Winners', value: stats.totalWinners, color: '#D4A017' },
                  { label: 'Hackathons', value: stats.totalHackathons, color: '#8B6FD4' },
                  { label: 'Total likes', value: stats.totalLikes, color: '#D46F8B' },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{s.label}</span>
                    <span className="text-xs font-semibold" style={{ color: s.color }}>
                      {s.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* ── Main ── */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Stats bar */}
            {!isEmpty && <StatsBar {...stats} />}

            {/* Filters */}
            <div
              className="card-flat rounded-2xl p-4"
              ref={gridRef}
            >
              <FilterBar
                filters={filters}
                hackathons={hackathons}
                topTechs={topTechs}
                availableYears={availableYears}
                onChange={handleFilterChange}
                totalResults={total}
              />
            </div>

            {/* Semantic results banner */}
            {semanticResults && (
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                  ✦ {semanticResults.length} AI matches
                </span>
                <button
                  onClick={() => setSemanticResults(null)}
                  className="text-[11px] ml-auto"
                  style={{ color: 'var(--text-faint)' }}
                >
                  Clear → show all
                </button>
              </div>
            )}

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : (semanticResults !== null && semanticResults.length === 0) ? (
              <div className="card-flat flex flex-col items-center justify-center py-24 rounded-2xl text-center">
                <p className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>No similar projects found</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>Try a different query or generate more embeddings</p>
              </div>
            ) : semanticResults !== null ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {semanticResults.map(p => (
                  <div key={p.id} onClick={() => setSelectedProject(p)} className="cursor-pointer">
                    <ProjectCard project={p} />
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div
                className="card-flat flex flex-col items-center justify-center py-24 rounded-2xl text-center"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}
                >
                  <Leaf size={24} style={{ color: 'var(--accent)' }} />
                </div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>No projects found</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
                  {isEmpty ? 'Run the scraper to load projects' : 'Try adjusting your filters'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {projects.map(p => (
                  <div key={p.id} onClick={() => setSelectedProject(p)} className="cursor-pointer">
                    <ProjectCard project={p} />
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => handleFilterChange({ page: filters.page - 1 })}
                  disabled={filters.page <= 1}
                  className="btn-ghost flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={15} /> Prev
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                    let page: number
                    if (totalPages <= 7) page = i + 1
                    else if (filters.page <= 4) page = i < 6 ? i + 1 : totalPages
                    else if (filters.page >= totalPages - 3) page = i === 0 ? 1 : totalPages - 6 + i
                    else { const mid = [1, filters.page - 1, filters.page, filters.page + 1, totalPages]; page = mid[Math.min(i, 4)] }
                    const active = page === filters.page
                    return (
                      <button
                        key={i}
                        onClick={() => handleFilterChange({ page })}
                        className="w-8 h-8 text-xs rounded-lg transition-all font-medium"
                        style={active ? {
                          background: '#2A5C34',
                          color: '#FFFFFF',
                          fontWeight: 600,
                        } : {
                          color: '#B8A88A',
                          background: 'transparent',
                        }}
                      >
                        {page}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => handleFilterChange({ page: filters.page + 1 })}
                  disabled={filters.page >= totalPages}
                  className="btn-ghost flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <ProjectModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        onFindSimilar={async (p) => {
          setSelectedProject(null)
          const r = await fetch(`/api/similar?id=${p.id}&k=24`)
          if (r.ok) { const d = await r.json(); setSemanticResults(d.results || []) }
        }}
      />
    </NatureBackground>
  )
}
