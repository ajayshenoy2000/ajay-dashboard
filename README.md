# Ajay Dashboard

Personal dashboard hub deployed at **[ajay.my](https://ajay.my)**. A mobile-first launcher
for a growing set of self-contained "sub-apps" — work schedule, calendar, and the
**Trend Engine** trend-intelligence tool — with more on the way.

## Architecture

A monorepo with two independently deployed halves:

| Part | Stack | Deploys to |
|------|-------|------------|
| `frontend/` | Next.js 14 (App Router), React 18, TypeScript, Tailwind, lucide-react, Poppins | **Vercel** → ajay.my |
| `backend/`  | FastAPI (Python 3.11), SQLite / Supabase, scheduled collectors | **Fly.io** (`lor-idea-engine`, region `nrt`/Tokyo) via Docker |

The frontend talks to the backend over HTTP (`NEXT_PUBLIC_API_BASE_URL`), and degrades
gracefully to bundled sample data when the backend is unreachable (see `lib/api.ts`).

## Sub-app pattern

The dashboard is built so each tool is a self-contained sub-app. Adding one touches a
predictable set of places — use **Trend Engine** as the reference implementation.

### Frontend

Routes live under `frontend/app/`, organized by **route group** (one per sub-app):

```
app/
├── layout.tsx                 # root layout — fonts, <BottomNav/>
├── globals.css                # theme tokens (ink/coral/sage/gold/mist)
├── (dashboard)/               # the launcher hub
│   ├── layout.tsx
│   ├── page.tsx               # home: greeting, schedule, "Your Apps" grid, reminders
│   ├── schedule/
│   └── calendar-app/
└── (trend-engine)/            # the reference sub-app
    ├── layout.tsx             # each group gets its own layout
    ├── trends/                # /trends, /trends/history, /trends/[id]
    ├── briefs/                # /briefs, /briefs/[id]
    ├── sources/
    └── settings/
```

To add a sub-app on the frontend:

1. **Create a route group** `app/(your-app)/` with its own `layout.tsx` + pages.
2. **Add a nav context** in `components/BottomNav.tsx` — define its left/right tab sets
   and extend the context detection so the bottom bar switches to them inside the app.
3. **Surface it** as a card in the "Your Apps" grid on the home page
   (`app/(dashboard)/page.tsx`) — there is an `Add App` placeholder slot to replace.
4. **Wire data** — add types to `lib/types.ts` and fetchers to `lib/api.ts`
   (all backend calls go through `API_BASE`, with a sample-data fallback).

### Backend

The backend follows a clean pipeline, mirrored in its module layout:

```
backend/
├── main.py                # FastAPI app; include_router() for each sub-app
├── config.py              # Settings dataclass, env vars, default keywords/weights
├── api/                   # routes.py (prefix /api), service.py, reminders.py
├── collectors/            # data ingestion (x, youtube, google_news, google_trends)
├── processors/            # clean → classify → cluster → score → safety filter
├── llm/                   # providers, analysis, brief_generator
├── db/                    # database.py, models.py, supabase_client.py
└── scheduler/             # daily_collect.py, weekly_report.py
```

To add a sub-app on the backend: add `collectors/`/`processors`/`llm` modules as needed,
expose a router (or extend `api/routes.py`), and `include_router(...)` it in `main.py`.
New secrets go in the `Settings` dataclass in `config.py` and in `.env` / `.env.example`.

## Local development

**Backend** (from repo root):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in API keys; MODEL_PROVIDER=mock works offline
cd .. && uvicorn backend.main:app --reload --port 8000
```

**Frontend** (separate terminal):

```bash
cd frontend
npm install
npm run dev                   # http://localhost:3000
```

Set `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000` in `frontend/.env.local` to point the
UI at your local backend; without it, the UI falls back to sample data.

## Deployment

- **Frontend → Vercel.** Pushes to `main` deploy automatically. Set
  `NEXT_PUBLIC_API_BASE_URL` to the Fly.io backend URL in the Vercel project env.
- **Backend → Fly.io.** `fly deploy` builds `backend/Dockerfile` from the repo root
  (`fly.toml` sets the build context). Secrets via `fly secrets set ...`.

## Theme

Design tokens are CSS variables in `frontend/app/globals.css` and `tailwind.config.ts`:
off-white surfaces, `ink` (near-black text), `coral` (accent), plus `sage`, `gold`, `mist`.
Mobile-first, Poppins type, soft shadows, rounded-2xl cards.

---

*Note: "Trend Engine" is internally titled the L'or Clinic Trend Intelligence API — it scores
Japanese beauty trends and generates video briefs. The dashboard wraps it as one sub-app.*
