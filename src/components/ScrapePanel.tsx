'use client'

import { useState, useEffect, useCallback } from 'react'
import { Play, RefreshCw, AlertCircle, CheckCircle2, Loader2, Settings2, ChevronDown, Sparkles, Zap } from 'lucide-react'
import type { ScrapeStatus } from '@/lib/types'

interface Props { onComplete: () => void }

const PHASE_LABELS: Record<string, string> = {
  init: 'Initializing…',
  hackathons: 'Fetching hackathons',
  'hackathon-projects': 'Scraping projects',
  'top-projects': 'Top projects feed',
  enriching: 'Enriching data',
  done: 'Complete',
  error: 'Error',
}

export default function ScrapePanel({ onComplete }: Props) {
  const [status, setStatus] = useState<ScrapeStatus | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [maxHackathons, setMaxHackathons] = useState(500)
  const [maxTopProjects, setMaxTopProjects] = useState(0)
  const [enrichProjects, setEnrichProjects] = useState(false)
  const [enrichStatus, setEnrichStatus] = useState<{ running: boolean; total: number; enriched: number; pending: number } | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/scrape')
      if (r.ok) {
        const s: ScrapeStatus = await r.json()
        setStatus(prev => {
          if (prev?.running && !s.running && s.phase === 'done') onComplete()
          return s
        })
      }
    } catch {}
  }, [onComplete])

  const fetchEnrichStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/enrich')
      if (r.ok) { const d = await r.json(); setEnrichStatus(d) }
    } catch {}
  }, [])

  useEffect(() => {
    fetchStatus()
    fetchEnrichStatus()
    const id = setInterval(() => { fetchStatus(); fetchEnrichStatus() }, 2000)
    return () => clearInterval(id)
  }, [fetchStatus, fetchEnrichStatus])

  const startEnrich = async () => {
    await fetch('/api/enrich', { method: 'POST' })
    fetchEnrichStatus()
  }

  const startScrape = async () => {
    await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxHackathons, maxTopProjects, enrichProjects }),
    })
    fetchStatus()
  }

  const progressPct = status?.total ? Math.min(100, Math.round((status.progress / status.total) * 100)) : 0

  return (
    <div className="card-flat rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3.5"
        style={{ borderBottom: '1px solid var(--border-2)', background: 'var(--surface-2)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--accent), #E8245C)',
              boxShadow: '0 2px 8px rgba(255,107,43,0.35)',
            }}
          >
            <Zap size={14} fill="white" style={{ color: 'white' }} />
          </div>
          <div>
            <div className="text-xs font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              SCRAPER
              <span className="ml-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                LIVE
              </span>
            </div>
            <div className="text-[10px] mt-0.5 font-medium" style={{ color: 'var(--accent)' }}>⚡ Instant · Zero browser needed</div>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(s => !s)}
          className="flex items-center gap-1 text-xs transition-colors px-2.5 py-1.5 rounded-lg"
          style={{
            color: showSettings ? 'var(--accent)' : 'var(--text-faint)',
            background: showSettings ? 'var(--accent-light)' : 'transparent',
            border: showSettings ? '1px solid var(--accent-border)' : '1px solid transparent',
          }}
        >
          <Settings2 size={12} />
          <ChevronDown size={11} style={{ transform: showSettings ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>

      {/* Settings */}
      {showSettings && (
        <div
          className="px-4 py-3 space-y-3"
          style={{ borderBottom: '1px solid var(--border-2)', background: 'var(--surface-2)' }}
        >
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="section-label block mb-1.5">Hackathons</label>
              <input
                type="number"
                min={1} max={2000}
                value={maxHackathons}
                onChange={e => setMaxHackathons(Number(e.target.value))}
                className="input-field text-sm"
                style={{ padding: '7px 10px' }}
              />
              <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-disabled)' }}>Set 1700+ for all years (2020–2026)</p>
            </div>
            <div>
              <label className="section-label block mb-1.5">Top projects</label>
              <input
                type="number"
                min={10} max={2000} step={50}
                value={maxTopProjects}
                onChange={e => setMaxTopProjects(Number(e.target.value))}
                className="input-field text-sm"
                style={{ padding: '7px 10px' }}
              />
            </div>
          </div>

          {/* Toggle */}
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setEnrichProjects(e => !e)}
          >
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Enrich projects (likes, tech, links)</span>
            <div
              className="w-9 h-5 rounded-full flex-shrink-0 relative transition-colors"
              style={{ background: enrichProjects ? '#2A5C34' : '#D8CAAF' }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                style={{ left: enrichProjects ? '18px' : '2px' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Status */}
      {status && status.phase && (
        <div className="px-4 py-3 space-y-2" style={{ borderBottom: '1px solid var(--border-2)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status.running && <Loader2 size={12} className="animate-spin" style={{ color: 'var(--accent)' }} />}
              {!status.running && status.phase === 'done' && <CheckCircle2 size={12} style={{ color: 'var(--accent)' }} />}
              {!status.running && status.phase === 'error' && <AlertCircle size={12} style={{ color: '#C0392B' }} />}
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {PHASE_LABELS[status.phase] || status.phase}
              </span>
            </div>
            {status.running && status.total > 0 && (
              <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{status.progress}/{status.total}</span>
            )}
          </div>

          {status.message && (
            <p className="text-[11px] truncate" style={{ color: 'var(--text-faint)' }}>{status.message}</p>
          )}

          {status.running && status.total > 0 && (
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
              <div className="h-full progress-bar" style={{ width: `${progressPct}%` }} />
            </div>
          )}

          {status.completedAt && !status.running && (
            <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
              {status.phase === 'done' ? 'Completed' : 'Failed'} at {new Date(status.completedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="px-4 py-3.5 space-y-2">
        <button
          onClick={startScrape}
          disabled={!!status?.running}
          className="w-full btn-primary"
        >
          {status?.running ? (
            <><Loader2 size={13} className="animate-spin" /> Scraping…</>
          ) : status?.phase === 'done' ? (
            <><RefreshCw size={13} /> Re-scrape</>
          ) : (
            <><Play size={13} /> Start Scraping</>
          )}
        </button>
        <p className="text-center text-[10px]" style={{ color: 'var(--text-disabled)' }}>
          ~1–5 min · up to {maxHackathons} hackathons
        </p>

        {/* Enrich button — show when projects exist but not enriched */}
        {enrichStatus && enrichStatus.total > 0 && enrichStatus.pending > 0 && !status?.running && (
          <div className="space-y-1.5 pt-1" style={{ borderTop: '1px solid var(--border-2)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                Enriched: {enrichStatus.enriched.toLocaleString()} / {enrichStatus.total.toLocaleString()}
              </span>
              {enrichStatus.running && <Loader2 size={10} className="animate-spin" style={{ color: 'var(--accent)' }} />}
            </div>
            <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.round((enrichStatus.enriched / enrichStatus.total) * 100)}%`, background: 'var(--accent)' }}
              />
            </div>
            {!enrichStatus.running && (
              <button
                onClick={startEnrich}
                className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold py-2 rounded-xl transition-all"
                style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-light)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
              >
                <Sparkles size={11} />
                Enrich Data (images, GitHub, tech)
              </button>
            )}
            {enrichStatus.running && (
              <p className="text-center text-[10px]" style={{ color: 'var(--text-faint)' }}>
                Enriching… ~{Math.ceil(enrichStatus.pending * 0.08 / 60)} min remaining
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
