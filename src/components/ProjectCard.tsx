'use client'

import type { Project } from '@/lib/types'
import { Heart, Github, ExternalLink, Trophy, Users } from 'lucide-react'

interface Props { project: Project }


export default function ProjectCard({ project }: Props) {
  return (
    <div className={`relative flex flex-col rounded-2xl overflow-hidden card ${project.isWinner ? 'winner-card' : ''}`}>
      {/* Winner top bar */}
      {project.isWinner && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent z-10" />
      )}

      {/* Cover */}
      <div className="relative w-full h-36 overflow-hidden flex-shrink-0" style={{ background: 'var(--chip-bg)' }}>
        {project.imageUrl && !project.imageUrl.includes('avatar@2x') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.imageUrl}
            alt={project.name}
            className="w-full h-full object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--accent-light)' }}>
            <div className="text-3xl font-black" style={{ color: 'var(--accent-border)' }}>
              {project.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        {/* Fade at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t to-transparent" style={{ backgroundImage: 'linear-gradient(to top, var(--surface), transparent)' }} />

        {/* Winner badge */}
        {project.isWinner && (
          <div className="absolute top-2.5 left-2.5 badge badge-amber flex items-center gap-1 shadow-sm">
            <Trophy size={9} />
            {project.prizeTrack ? project.prizeTrack.slice(0, 20) : 'Winner'}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Title */}
        <a
          href={project.devfolioUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="font-semibold text-sm leading-snug line-clamp-1 transition-colors"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)' }}
        >
          {project.name}
        </a>

        {/* Tagline */}
        {project.tagline && (
          <p className="text-xs line-clamp-2" style={{ color: 'var(--text-faint)', lineHeight: '1.5' }}>
            {project.tagline}
          </p>
        )}

        {/* Hackathon */}
        {project.hackathonName && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
            <span className="text-[11px] font-medium truncate" style={{ color: 'var(--accent)' }}>
              {project.hackathonName}
            </span>
          </div>
        )}

        {/* Tech */}
        {project.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {project.techStack.slice(0, 4).map(tech => (
              <span key={tech} className="tech-chip">{tech}</span>
            ))}
            {project.techStack.length > 4 && (
              <span className="tech-chip">+{project.techStack.length - 4}</span>
            )}
          </div>
        )}

        {/* Team */}
        {project.teamMembers.length > 0 && (
          <div className="flex items-center gap-1.5 mt-auto">
            <Users size={10} style={{ color: 'var(--text-faint)' }} />
            <span className="text-[11px] truncate" style={{ color: 'var(--text-faint)' }}>
              {project.teamMembers.slice(0, 2).join(', ')}
              {project.teamMembers.length > 2 && ` +${project.teamMembers.length - 2}`}
            </span>
          </div>
        )}

        {/* Footer */}
        <div
          className="flex flex-col gap-2 pt-2.5 mt-auto"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-1.5">
            <Heart
              size={12}
              style={{ color: project.likes > 0 ? '#D07070' : '#D8CAAF' }}
              fill={project.likes > 0 ? '#D07070' : 'none'}
            />
            <span className="text-xs" style={{ color: project.likes > 0 ? '#7A5050' : '#D8CAAF' }}>
              {project.likes > 0 ? project.likes.toLocaleString() : '—'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
                style={{
                  background: 'var(--chip-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.85' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
              >
                <Github size={11} />
                GitHub
              </a>
            )}
            {(project.demoUrl || project.websiteUrl) && (
              <a
                href={project.demoUrl || project.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
                style={{
                  background: 'var(--accent)',
                  color: '#FFFFFF',
                  border: '1px solid var(--accent)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.85' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
              >
                <ExternalLink size={11} />
                Live Demo
              </a>
            )}
            <a
              href={project.devfolioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
              style={{
                background: 'transparent',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement
                el.style.background = 'var(--accent)'
                el.style.color = '#fff'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement
                el.style.background = 'transparent'
                el.style.color = 'var(--accent)'
              }}
            >
              Devfolio ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
