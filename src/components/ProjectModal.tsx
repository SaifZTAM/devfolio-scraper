'use client'

import { useEffect, useState } from 'react'
import type { Project } from '@/lib/types'
import {
  X, Github, ExternalLink, Trophy, Users, Heart,
  Lightbulb, Wrench, Zap, Link2, Calendar, Tag, Sparkles,
} from 'lucide-react'

interface Props {
  project: Project | null
  onClose: () => void
  onFindSimilar?: (project: Project) => void
}

function parseDescription(raw: string): { title: string; body: string }[] {
  if (!raw) return []
  // Format: "Title: body\n\nTitle2: body2"
  const sections: { title: string; body: string }[] = []
  const blocks = raw.split(/\n\n+/)
  for (const block of blocks) {
    const colonIdx = block.indexOf(':')
    if (colonIdx > 0 && colonIdx < 60) {
      sections.push({
        title: block.slice(0, colonIdx).trim(),
        body: block.slice(colonIdx + 1).trim(),
      })
    } else if (block.trim()) {
      sections.push({ title: '', body: block.trim() })
    }
  }
  return sections.filter(s => s.body)
}

const SECTION_ICONS: Record<string, typeof Lightbulb> = {
  'the problem it solves': Lightbulb,
  'problem': Lightbulb,
  'challenges': Wrench,
  'challenges we ran into': Wrench,
  'what i built': Zap,
  'what we built': Zap,
  'tech stack': Tag,
  'technologies': Tag,
  'links': Link2,
  'future': Zap,
}

function sectionIcon(title: string) {
  const key = title.toLowerCase()
  for (const [k, Icon] of Object.entries(SECTION_ICONS)) {
    if (key.includes(k)) return Icon
  }
  return null
}

export default function ProjectModal({ project, onClose, onFindSimilar }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!project) { setVisible(false); return }
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    // Trigger entrance animation
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [project, onClose])

  if (!project) return null

  const sections = parseDescription(project.description)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: visible ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        transition: 'background 0.3s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06) inset',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: 'var(--chip-bg)', color: 'var(--text-faint)', border: '1px solid var(--border)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)' }}
        >
          <X size={14} />
        </button>

        {/* Cover image */}
        {project.imageUrl && !project.imageUrl.includes('avatar@2x') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.imageUrl}
            alt={project.name}
            className="w-full h-40 object-cover flex-shrink-0"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-24 flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--accent-light)' }}>
            <span className="text-4xl font-black" style={{ color: 'var(--accent-border)' }}>
              {project.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">

            {/* Title + meta */}
            <div className="space-y-2">
              <div className="flex items-start gap-2 flex-wrap">
                {project.isWinner && (
                  <span className="badge badge-amber flex items-center gap-1 flex-shrink-0">
                    <Trophy size={9} /> {project.prizeTrack || 'Winner'}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {project.name}
              </h2>
              {project.tagline && (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {project.tagline}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-faint)' }}>
                {project.hackathonName && (
                  <span className="flex items-center gap-1">
                    <Calendar size={11} /> {project.hackathonName}
                  </span>
                )}
                {project.year > 0 && (
                  <span className="flex items-center gap-1">
                    <Tag size={11} /> {project.year}
                  </span>
                )}
                {project.likes > 0 && (
                  <span className="flex items-center gap-1">
                    <Heart size={11} fill="#D07070" style={{ color: '#D07070' }} /> {project.likes.toLocaleString()} likes
                  </span>
                )}
                {project.teamMembers.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Users size={11} /> {project.teamMembers.join(', ')}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-opacity"
                  style={{ background: 'var(--chip-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.8' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
                >
                  <Github size={13} /> View on GitHub
                </a>
              )}
              {(project.demoUrl || project.websiteUrl) && (
                <a
                  href={project.demoUrl || project.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-opacity"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.8' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
                >
                  <ExternalLink size={13} /> Live Demo
                </a>
              )}
              {onFindSimilar && (
                <button
                  onClick={() => { onFindSimilar(project); onClose() }}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-opacity"
                  style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.8' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                >
                  <Sparkles size={13} /> Find Similar
                </button>
              )}
              <a
                href={project.devfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                style={{ background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)' }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement
                  el.style.background = 'var(--accent)'; el.style.color = '#fff'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement
                  el.style.background = 'transparent'; el.style.color = 'var(--accent)'
                }}
              >
                <Link2 size={13} /> Devfolio ↗
              </a>
            </div>

            {/* Tech stack */}
            {project.techStack.length > 0 && (
              <div className="space-y-2">
                <div className="section-label flex items-center gap-1.5">
                  <Tag size={11} /> Tech Stack
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {project.techStack.map(t => (
                    <span
                      key={t}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                      style={{ background: 'var(--chip-bg)', color: 'var(--chip-text)', border: '1px solid var(--chip-border)' }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description sections — ideas to apply */}
            {sections.length > 0 && (
              <div className="space-y-3">
                <div className="section-label flex items-center gap-1.5">
                  <Lightbulb size={11} /> Project Details & Ideas to Apply
                </div>
                {sections.map((sec, i) => {
                  const Icon = sec.title ? sectionIcon(sec.title) : null
                  return (
                    <div
                      key={i}
                      className="rounded-xl p-3.5 space-y-1.5"
                      style={{ background: 'var(--chip-bg)', border: '1px solid var(--chip-border)' }}
                    >
                      {sec.title && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                          {Icon && <Icon size={11} />}
                          {sec.title}
                        </div>
                      )}
                      <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                        {sec.body}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            {!project.description && (
              <p className="text-xs italic" style={{ color: 'var(--text-faint)' }}>
                No description available. View on Devfolio for full details.
              </p>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
