'use client'

import { Trophy, FolderGit2, Heart, Boxes } from 'lucide-react'

interface Props {
  totalProjects: number
  totalWinners: number
  totalHackathons: number
  totalLikes: number
}

function Stat({ icon: Icon, value, label, iconColor, iconBg }: {
  icon: React.ElementType
  value: number
  label: string
  iconColor: string
  iconBg: string
}) {
  return (
    <div
      className="flex items-center gap-3.5 flex-1 min-w-[130px] px-5 py-4 rounded-2xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
        <Icon size={16} style={{ color: iconColor }} />
      </div>
      <div>
        <div className="text-xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {value.toLocaleString()}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-faint)', fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  )
}

export default function StatsBar({ totalProjects, totalWinners, totalHackathons, totalLikes }: Props) {
  if (totalProjects === 0) return null
  return (
    <div className="flex flex-wrap gap-3">
      <Stat icon={FolderGit2} value={totalProjects} label="Projects" iconColor="var(--accent)" iconBg="var(--accent-light)" />
      <Stat icon={Trophy} value={totalWinners} label="Winners" iconColor="#E8A020" iconBg="rgba(232,160,32,0.12)" />
      <Stat icon={Boxes} value={totalHackathons} label="Hackathons" iconColor="#8B5CF6" iconBg="rgba(139,92,246,0.12)" />
      <Stat icon={Heart} value={totalLikes} label="Total Likes" iconColor="#E84080" iconBg="rgba(232,64,128,0.12)" />
    </div>
  )
}
