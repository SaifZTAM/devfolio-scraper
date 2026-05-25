'use client'

import { useState, useRef } from 'react'
import { Sparkles, Search, X, Loader2, AlertCircle, Key } from 'lucide-react'
import type { Project } from '@/lib/types'

interface Props {
  onResults: (projects: Project[] | null) => void
  onSelectProject: (p: Project) => void
}

export default function SemanticSearch({ onResults, onSelectProject }: Props) {
  const [active, setActive] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noApiKey, setNoApiKey] = useState(false)
  const [embeddingStats, setEmbeddingStats] = useState<{ embedded: number; total: number; ready: boolean } | null>(null)
  const [buildingEmbeddings, setBuildingEmbeddings] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const checkStats = async () => {
    const r = await fetch('/api/similar')
    if (r.ok) {
      const d = await r.json()
      if (d.error === 'no_api_key') { setNoApiKey(true); return }
      setEmbeddingStats(d)
    }
  }

  const handleActivate = async () => {
    setActive(true)
    await checkStats()
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleDeactivate = () => {
    setActive(false)
    setQuery('')
    setError(null)
    onResults(null)
  }

  const handleSearch = async (q: string) => {
    if (!q.trim()) { onResults(null); return }
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/similar?q=${encodeURIComponent(q)}&k=24`)
      const data = await r.json()
      if (data.error === 'no_api_key') { setNoApiKey(true); setLoading(false); return }
      if (!r.ok) throw new Error(data.error || 'Search failed')
      onResults(data.results || [])
    } catch (e) {
      setError(String(e))
    }
    setLoading(false)
  }

  const handleBuildEmbeddings = async () => {
    setBuildingEmbeddings(true)
    await fetch('/api/similar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'build' }) })
    setBuildingEmbeddings(false)
    await checkStats()
  }

  if (!active) {
    return (
      <button
        onClick={handleActivate}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
        style={{
          background: 'var(--accent)',
          color: '#fff',
          border: '1px solid #2A5C34',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
      >
        <Sparkles size={12} />
        AI Search
      </button>
    )
  }

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ background: 'var(--surface)', border: '2px solid var(--accent)', boxShadow: '0 0 0 4px var(--accent-light)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={13} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>AI Similarity Search</span>
          {embeddingStats && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
              {embeddingStats.embedded.toLocaleString()} indexed
            </span>
          )}
        </div>
        <button onClick={handleDeactivate} style={{ color: 'var(--text-faint)' }}>
          <X size={14} />
        </button>
      </div>

      {/* No API key warning */}
      {noApiKey && (
        <div
          className="rounded-xl p-3 flex items-start gap-2"
          style={{ background: '#FEF3C7', border: '1px solid #F59E0B' }}
        >
          <Key size={13} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
          <div className="space-y-1">
            <p className="text-xs font-semibold" style={{ color: '#92400E' }}>OpenAI API key required</p>
            <p className="text-[11px] leading-relaxed" style={{ color: '#92400E' }}>
              Create <code className="bg-amber-100 px-1 rounded">.env.local</code> in project root and add:
            </p>
            <code className="block text-[11px] bg-amber-100 px-2 py-1 rounded" style={{ color: '#92400E' }}>
              OPENAI_API_KEY=sk-...
            </code>
            <p className="text-[11px]" style={{ color: '#92400E' }}>Then restart the dev server.</p>
          </div>
        </div>
      )}

      {/* Not yet indexed */}
      {embeddingStats && !embeddingStats.ready && !noApiKey && (
        <div
          className="rounded-xl p-3 flex items-start gap-2"
          style={{ background: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}
        >
          <AlertCircle size={13} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
          <div className="space-y-2 flex-1">
            <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
              Projects not indexed yet
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              Generate embeddings once to enable AI search. Takes ~{Math.ceil(embeddingStats.total / 60)} min for {embeddingStats.total.toLocaleString()} projects.
            </p>
            <button
              onClick={handleBuildEmbeddings}
              disabled={buildingEmbeddings}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {buildingEmbeddings ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {buildingEmbeddings ? 'Generating...' : 'Generate Embeddings'}
            </button>
          </div>
        </div>
      )}

      {/* Search input */}
      {(!noApiKey) && (
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder='e.g. "DeFi lending protocol with React" or "ML image classifier"'
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(query) }}
            className="input-field w-full text-xs"
            style={{ paddingLeft: '2.25rem', paddingRight: loading ? '2rem' : '12px' }}
          />
          {loading && (
            <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--accent)' }} />
          )}
        </div>
      )}

      {error && (
        <p className="text-[11px]" style={{ color: '#D04040' }}>{error}</p>
      )}

      {/* Search button */}
      {!noApiKey && (
        <button
          onClick={() => handleSearch(query)}
          disabled={loading || !query.trim()}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl transition-all disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {loading ? 'Searching...' : 'Find Similar Projects'}
        </button>
      )}

      <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
        Uses OpenAI embeddings. Finds semantically similar projects beyond keyword matching.
      </p>
    </div>
  )
}
