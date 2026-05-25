'use client'

import { useEffect, useRef, useState } from 'react'
import { Shuffle, ChevronDown, Trophy, Layers, Calendar } from 'lucide-react'

interface Props {
  totalProjects: number
  totalHackathons: number
  totalWinners: number
  onSurprise: () => void
  onExplore: () => void
}

function useCountUp(target: number, duration = 1800) {
  const [val, setVal] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (!target || started.current) return
    started.current = true
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setVal(Math.round(target * ease))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])

  return val
}

function StatChip({ icon: Icon, value, label, color }: {
  icon: React.ElementType
  value: number
  label: string
  color: string
}) {
  const count = useCountUp(value)
  return (
    <div
      className="flex items-center gap-3 px-5 py-3.5 rounded-2xl"
      style={{
        background: 'rgba(0,0,0,0.35)',
        border: `1px solid ${color}40`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}
      >
        <Icon size={15} style={{ color }} />
      </div>
      <div>
        <div className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
          {count.toLocaleString()}
        </div>
        <div className="text-[11px] font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</div>
      </div>
    </div>
  )
}

export default function HeroSection({ totalProjects, totalHackathons, totalWinners, onSurprise, onExplore }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <section
      className="relative w-full flex flex-col items-center justify-center text-center px-6 pt-20 pb-16"
      style={{ minHeight: '88vh' }}
    >
      {/* Floating year badge */}
      <div
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
          background: 'rgba(255,107,43,0.12)',
          border: '1px solid rgba(255,107,43,0.35)',
          color: '#FF6B2B',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        2024 · 2025 · 2026 · All years
      </div>

      {/* Headline */}
      <h1
        className="font-black leading-none tracking-tight mb-6"
        style={{
          fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
          color: 'var(--text-primary)',
        }}
      >
        Discover Winning<br />Hackathon Projects
      </h1>

      {/* Subheadline */}
      <p
        className="max-w-xl text-base font-medium leading-relaxed mb-10"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s',
          color: 'var(--text-secondary)',
        }}
      >
        Browse thousands of projects from Devfolio hackathons. Filter by year, tech stack, and winners. Get inspired for your next build.
      </p>

      {/* CTA buttons */}
      <div
        className="flex flex-wrap items-center justify-center gap-3 mb-16"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s',
        }}
      >
        <button
          onClick={onExplore}
          className="flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold transition-all"
          style={{
            background: 'linear-gradient(135deg, #FF6B2B, #E8245C)',
            color: '#fff',
            boxShadow: '0 4px 24px rgba(255,107,43,0.4)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(255,107,43,0.55)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(255,107,43,0.4)' }}
        >
          Start Exploring
          <ChevronDown size={15} />
        </button>

        <button
          onClick={onSurprise}
          className="flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold transition-all"
          style={{
            background: 'rgba(0,0,0,0.08)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            backdropFilter: 'blur(12px)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.14)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.08)' }}
        >
          <Shuffle size={14} />
          Surprise Me
        </button>
      </div>

      {/* Stat chips */}
      {totalProjects > 0 && (
        <div
          className="flex flex-wrap justify-center gap-3"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.8s ease 0.4s, transform 0.8s ease 0.4s',
          }}
        >
          <StatChip icon={Layers} value={totalProjects} label="Projects" color="#FF6B2B" />
          <StatChip icon={Trophy} value={totalWinners} label="Winners" color="#FFC107" />
          <StatChip icon={Calendar} value={totalHackathons} label="Hackathons" color="#E8245C" />
        </div>
      )}

      {/* Scroll indicator */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        style={{ opacity: visible ? 0.4 : 0, transition: 'opacity 1s ease 1s' }}
      >
        <span className="text-[10px] font-medium text-white/60 tracking-widest uppercase">Scroll</span>
        <ChevronDown size={14} className="text-white/40 animate-bounce" />
      </div>
    </section>
  )
}
