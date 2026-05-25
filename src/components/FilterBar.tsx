'use client'

import { Search, Trophy, X, SlidersHorizontal, ChevronDown, Calendar } from 'lucide-react'
import type { Hackathon, ProjectFilters } from '@/lib/types'
import { useState } from 'react'

interface Props {
  filters: ProjectFilters
  hackathons: Hackathon[]
  topTechs: { name: string; count: number }[]
  availableYears: number[]
  onChange: (f: Partial<ProjectFilters>) => void
  totalResults: number
}

export default function FilterBar({ filters, hackathons, topTechs, availableYears, onChange, totalResults }: Props) {
  const hasFilters = filters.search || filters.hackathon || filters.techStack.length > 0 || filters.winnersOnly || filters.years.length > 0
  const [showAllTech, setShowAllTech] = useState(false)
  const visibleTechs = showAllTech ? topTechs : topTechs.slice(0, 12)

  return (
    <div className="space-y-3">
      {/* Search + Sort + Winners */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
          <input
            type="text"
            placeholder="Search projects, teams, technologies..."
            value={filters.search}
            onChange={e => onChange({ search: e.target.value, page: 1 })}
            className="input-field"
            style={{ paddingLeft: '2.25rem', paddingRight: filters.search ? '2rem' : '14px' }}
          />
          {filters.search && (
            <button
              onClick={() => onChange({ search: '', page: 1 })}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-faint)' }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="relative flex-shrink-0">
          <select
            value={filters.sortBy}
            onChange={e => onChange({ sortBy: e.target.value as ProjectFilters['sortBy'], page: 1 })}
            className="input-field pr-8 cursor-pointer appearance-none"
            style={{ width: 'auto', paddingRight: '32px' }}
          >
            <option value="likes">Most Liked</option>
            <option value="recent">Most Recent</option>
            <option value="name">A – Z</option>
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
        </div>

        {/* Winners */}
        <button
          onClick={() => onChange({ winnersOnly: !filters.winnersOnly, page: 1 })}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${filters.winnersOnly ? 'badge-amber' : 'btn-ghost'}`}
          style={filters.winnersOnly ? {
            background: '#FEF9EE',
            border: '1px solid #E8C84A',
            color: '#92620A',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            padding: '10px 16px',
          } : {}}
        >
          <Trophy size={13} />
          Winners only
        </button>
      </div>

      {/* Hackathon pills */}
      {hackathons.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => onChange({ hackathon: '', page: 1 })}
            className={`pill flex-shrink-0 ${!filters.hackathon ? 'pill-active' : ''}`}
          >
            All hackathons
          </button>
          {hackathons.slice(0, 10).map(h => (
            <button
              key={h.slug}
              onClick={() => onChange({ hackathon: filters.hackathon === h.slug ? '' : h.slug, page: 1 })}
              className={`pill flex-shrink-0 ${filters.hackathon === h.slug ? 'pill-active' : ''}`}
            >
              {h.name.length > 20 ? h.name.slice(0, 18) + '…' : h.name}
            </button>
          ))}
        </div>
      )}

      {/* Year filter — multi-select */}
      {availableYears.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 mr-1 flex-shrink-0">
            <Calendar size={11} style={{ color: 'var(--text-faint)' }} />
            <span className="section-label">Year</span>
          </div>
          {availableYears.map(year => {
            const active = filters.years.includes(year)
            return (
              <button
                key={year}
                onClick={() => {
                  const next = active
                    ? filters.years.filter(y => y !== year)
                    : [...filters.years, year]
                  onChange({ years: next, page: 1 })
                }}
                className="text-xs font-semibold px-3 py-1 rounded-lg transition-all"
                style={active ? {
                  background: 'var(--accent)',
                  color: '#fff',
                  border: '1px solid var(--accent)',
                } : {
                  background: 'var(--chip-bg)',
                  color: 'var(--chip-text)',
                  border: '1px solid var(--chip-border)',
                }}
              >
                {year}
              </button>
            )
          })}
          {filters.years.length > 0 && (
            <button
              onClick={() => onChange({ years: [], page: 1 })}
              className="text-[11px] font-medium flex items-center gap-0.5 transition-colors"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)' }}
            >
              <X size={10} /> Clear
            </button>
          )}
        </div>
      )}

      {/* Tech filter */}
      {topTechs.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 mr-1 flex-shrink-0">
            <SlidersHorizontal size={11} style={{ color: 'var(--text-faint)' }} />
            <span className="section-label">Tech</span>
          </div>
          {visibleTechs.map(({ name }) => {
            const active = filters.techStack.includes(name)
            return (
              <button
                key={name}
                onClick={() => {
                  const next = active ? filters.techStack.filter(t => t !== name) : [...filters.techStack, name]
                  onChange({ techStack: next, page: 1 })
                }}
                className={`tech-chip cursor-pointer ${active ? 'tech-chip-active' : ''}`}
              >
                {name}
              </button>
            )
          })}
          {topTechs.length > 12 && (
            <button
              onClick={() => setShowAllTech(s => !s)}
              className="text-[11px] font-medium transition-colors"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)' }}
            >
              {showAllTech ? 'Show less' : `+${topTechs.length - 12} more`}
            </button>
          )}
        </div>
      )}

      {/* Summary row */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {totalResults.toLocaleString()}
          </span>
          <span className="text-sm" style={{ color: 'var(--text-faint)' }}>projects</span>
          {filters.techStack.length > 0 && (
            <span className="badge badge-bark" style={{ fontSize: '10px' }}>
              {filters.techStack.length} tech
            </span>
          )}
          {filters.years.length > 0 && (
            <span className="badge badge-bark" style={{ fontSize: '10px' }}>
              {filters.years.sort((a,b) => a-b).join(', ')}
            </span>
          )}
        </div>
        {hasFilters && (
          <button
            onClick={() => onChange({ search: '', hackathon: '', techStack: [], years: [], winnersOnly: false, page: 1 })}
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: 'var(--text-faint)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)' }}
          >
            <X size={11} /> Clear all filters
          </button>
        )}
      </div>
    </div>
  )
}
