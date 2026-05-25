export interface Project {
  id: string
  name: string
  slug: string
  tagline: string
  description: string
  hackathonId: string
  hackathonName: string
  hackathonSlug: string
  isWinner: boolean
  prizeTrack: string
  likes: number
  techStack: string[]
  githubUrl: string
  demoUrl: string
  websiteUrl: string
  devfolioUrl: string
  imageUrl: string
  teamMembers: string[]
  year: number        // derived from hackathon startDate
  scrapedAt: string
}

export interface Hackathon {
  id: string
  name: string
  slug: string
  description: string
  startDate: string
  endDate: string
  organizerName: string
  projectCount: number
  winnerCount: number
  imageUrl: string
  scrapedAt: string
}

export interface ScrapeStatus {
  running: boolean
  phase: string
  progress: number
  total: number
  message: string
  startedAt: string | null
  completedAt: string | null
  error: string | null
}

export interface ProjectFilters {
  search: string
  hackathon: string
  techStack: string[]
  years: number[]
  winnersOnly: boolean
  sortBy: 'likes' | 'recent' | 'name'
  page: number
  pageSize: number
}
