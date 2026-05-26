# Devfolio Scraper

A Next.js web app that scrapes hackathon projects from Devfolio, stores them locally, and lets you browse, filter, and semantically search them using AI embeddings.

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4)

---

## Live Demo

🔗 **[https://devfolio-scraper.onrender.com](https://devfolio-scraper.onrender.com)**

> ⚠️ **Hosted on Render free tier** — if the site hasn't been visited in a while, it may take **30–90 seconds to wake up** on first load. Just wait for it to load, it will come back up.

---

## Features

- **Scrape** — fetches projects and hackathon metadata from the Devfolio REST API (no browser automation needed)
- **Browse** — paginated project grid with cover images, tech stack tags, likes, and winner badges
- **Filter** — by hackathon, tech stack, year, winners only, sort by likes/recent/name
- **Semantic search** — AI-powered similarity search using Gemini `text-embedding-004` (falls back to OpenAI)
- **Enrich** — fetches additional metadata per project on demand
- **Local storage** — JSON file-based store (`data/`), no database required
- **Dark/light theme** — animated nature background with theme toggle

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS, Framer Motion |
| 3D / Shaders | Three.js, React Three Fiber |
| Scraping | Devfolio REST API (`api.devfolio.co`) |
| Embeddings | Google Gemini `text-embedding-004` / OpenAI |
| Storage | JSON files (no DB) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Gemini API key (free) **or** OpenAI API key (for semantic search)

### Install

```bash
git clone https://github.com/SaifZTAM/devfolio-scraper.git
cd devfolio-scraper
npm install
```

### Configure

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# At least one required for semantic search
GEMINI_API_KEY=your-gemini-key-here
OPENAI_API_KEY=your-openai-key-here   # optional fallback
```

Get a free Gemini key at [aistudio.google.com](https://aistudio.google.com).

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage

1. Click **Scrape** in the panel to fetch hackathons and their projects from Devfolio
2. Browse the project grid — filter by tech, year, hackathon, or winners
3. Click any project card to see full details
4. Use **Semantic Search** to find projects by concept (requires API key)
5. Hit **Surprise Me** for a random project

Scraped data is saved to `data/projects.json` and `data/hackathons.json` — persists between runs.

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/scrape` | POST | Start/stop scrape job |
| `/api/projects` | GET | Query projects with filters |
| `/api/similar` | POST | Semantic similarity search |
| `/api/enrich` | POST | Enrich a project with extra metadata |
| `/api/debug` | GET | Scrape status and stats |

---

## Project Structure

```
src/
├── app/
│   ├── api/          # API routes
│   ├── layout.tsx
│   └── page.tsx      # Main UI
├── components/       # React components
└── lib/
    ├── scraper.ts    # Devfolio API scraper
    ├── db.ts         # JSON file store
    ├── embeddings.ts # AI embeddings layer
    └── types.ts      # TypeScript types
data/                 # Scraped data (gitignored)
```

---

## Notes

- `data/` is gitignored — scraped data stays local only
- Scraper uses Devfolio's public REST API, no Playwright/browser required
- Embedding vectors cached in `data/embeddings.json` to avoid redundant API calls
- No database — everything runs file-based, zero infra needed

---

## License

MIT
