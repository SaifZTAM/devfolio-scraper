import { NextRequest, NextResponse } from 'next/server'
import { getProjects, getHackathons, getStats, getYears } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const type = searchParams.get('type') || 'projects'

    if (type === 'hackathons') {
      const hackathons = await getHackathons()
      return NextResponse.json({ hackathons })
    }

    if (type === 'stats') {
      const stats = await getStats()
      return NextResponse.json(stats)
    }

    if (type === 'years') {
      const years = await getYears()
      return NextResponse.json({ years })
    }

    const techStack = searchParams.get('techStack')
    const yearsParam = searchParams.get('years')
    const filters = {
      search: searchParams.get('search') || '',
      hackathon: searchParams.get('hackathon') || '',
      techStack: techStack ? techStack.split(',').filter(Boolean) : [],
      years: yearsParam ? yearsParam.split(',').map(Number).filter(n => n > 2000) : [],
      winnersOnly: searchParams.get('winnersOnly') === 'true',
      sortBy: (searchParams.get('sortBy') || 'likes') as 'likes' | 'recent' | 'name',
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '24'),
    }

    // Random project from filtered set
    if (searchParams.get('random') === 'true') {
      const all = await getProjects({ ...filters, page: 1, pageSize: 99999 })
      if (all.projects.length === 0) return NextResponse.json({ project: null })
      const pick = all.projects[Math.floor(Math.random() * all.projects.length)]
      return NextResponse.json({ project: pick })
    }

    const result = await getProjects(filters)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
