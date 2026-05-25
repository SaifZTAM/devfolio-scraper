import { NextRequest, NextResponse } from 'next/server'
import { initDb } from '@/lib/db'
import { runScraper, getScrapeStatus } from '@/lib/scraper'

export async function POST(req: NextRequest) {
  try {
    initDb()
    const body = await req.json().catch(() => ({}))
    const { maxHackathons = 50, maxTopProjects = 200, enrichProjects = true } = body

    if (getScrapeStatus().running) {
      return NextResponse.json({ ok: false, error: 'Scraper already running' }, { status: 409 })
    }

    // Run in background — don't await
    runScraper({ maxHackathons, maxTopProjects, enrichProjects }).catch(() => {})

    return NextResponse.json({ ok: true, message: 'Scraper started' })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json(getScrapeStatus())
}

export async function DELETE() {
  const { setStopRequested } = await import('@/lib/scraper')
  setStopRequested(true)
  return NextResponse.json({ ok: true, message: 'Stop requested' })
}
