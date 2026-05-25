import { NextRequest, NextResponse } from 'next/server'
import { chromium } from 'playwright'

export async function GET(req: NextRequest) {
  const url = new URL(req.url).searchParams.get('url') || 'https://codestorm-week1-2026.devfolio.co/projects'

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  })

  // Intercept ALL JSON API responses (not devfolio page routes, actual API calls)
  const apiResponses: { url: string; body: unknown }[] = []
  page.on('response', async (res) => {
    const resUrl = res.url()
    const ct = res.headers()['content-type'] || ''
    if (ct.includes('json') && !resUrl.includes('/_next/') && !resUrl.includes('/__nextjs')) {
      try {
        const body = await res.json()
        apiResponses.push({ url: resUrl, body })
      } catch {}
    }
  })

  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 })
    await page.waitForTimeout(3000)
    // Scroll to trigger lazy-loaded project cards
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(1500)
    }
    await page.waitForTimeout(2000)

    const info = await page.evaluate(() => {
      // All hrefs on the page
      const hrefs = Array.from(document.querySelectorAll('a[href]'))
        .map(a => (a as HTMLAnchorElement).href)
        .filter(h => h && !h.startsWith('javascript'))
        .slice(0, 50)

      // All unique class name fragments
      const classFragments = new Set<string>()
      document.querySelectorAll('[class]').forEach(el => {
        (el.getAttribute('class') || '').split(/\s+/).forEach(cls => {
          // Extract the semantic part before the hash (CSS Modules)
          const parts = cls.split('_')
          if (parts.length >= 2) classFragments.add(parts.slice(0, -1).join('_'))
          else classFragments.add(cls)
        })
      })

      // data-testid values
      const testIds = Array.from(document.querySelectorAll('[data-testid]'))
        .map(el => el.getAttribute('data-testid'))
        .filter(Boolean)
        .slice(0, 30)

      // Page title + h1-h3 texts
      const headings = Array.from(document.querySelectorAll('h1,h2,h3'))
        .map(h => h.textContent?.trim())
        .filter(Boolean)
        .slice(0, 10)

      // First 2000 chars of body text (whitespace compressed)
      const bodyText = document.body.innerText?.replace(/\s+/g, ' ').slice(0, 2000)

      // Any JSON-LD or __NEXT_DATA__
      const nextData = (document.getElementById('__NEXT_DATA__') as HTMLScriptElement)?.text?.slice(0, 3000)

      return {
        title: document.title,
        url: location.href,
        hrefs,
        classFragments: Array.from(classFragments).sort().slice(0, 100),
        testIds,
        headings,
        bodyText,
        nextData,
      }
    })

    await browser.close()
    return NextResponse.json({ ...info, apiResponses: apiResponses.slice(0, 5) }, { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    await browser.close()
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
