# MetaScraper — Beauty Clinic Meta Ad Recon

Weekly competitive-intelligence tool that tracks Japanese beauty-clinic
Meta (Facebook/Instagram) ads, organised by niche, with week-over-week change
detection and longevity scoring. It surfaces creative links for manual review —
it does **not** fabricate metrics.

## Why it's built this way (the hard constraint)

There is **no official API** for Japanese commercial Meta ads. The Ad Library
API only serves political/social ads globally and *all* commercial ads in the
EU/UK. JP cosmetic-clinic ads are commercial + non-EU → the API returns nothing.
The data is only visible in the **web Ad Library UI** in a logged-in browser.

So extraction is **assisted, not automated**: a human pastes a generated command
into **Claude-in-Chrome**, which reads the public pages in the user's own browser
at a weekly cadence. No headless scraping, no bot evasion, no unattended crawls
(Meta ToS). The only backward-looking signal Meta gives is each ad's *"started
running on"* date — we capture it and turn it into an age/longevity metric.
**Longevity (days a creative survives) is the sole performance proxy.** A
"killed" ad is derived by diffing against our own prior captures.

## The weekly loop

```
Console (configure)
   │  Generate hunt command  ──────────────►  paste into Claude-in-Chrome
   │                                                │
   │                                  extracts active ads from the JP Ad Library
   │                                                │
   │                          POST capture JSON  ──►  /api/metascraper/capture
   │                                                │  (token-guarded)
   │                                                ▼
   │                              diff & longevity engine (server-side)
   │                                                │
   │                          ┌─────────────────────┴───────────────────┐
   │                          ▼                                          ▼
   │                  Supabase (store)                          Google Sheet (mirror)
   │                          │
   ▼                          ▼
Dashboard  ◄──────────  new / running / killed + longevity
```

One paste, zero manual import (the command tells Claude to POST the result). If
the POST ever fails, Claude also prints the JSON → **Console → Manual import**.

The app DB (Supabase/SQLite) is the **primary** store — the Google Sheet is only
a secondary mirror, so the app holds 100% of the data even with no Sheet set up.

## Three views (sub-nav)

- **Console** (`/metascraper`) — configure the hunt, generate the command, manual import.
- **Dashboard** (`/metascraper/dashboard`) — filterable ad table sorted by longevity,
  per-niche summary cards, diff-since-last. **Click any row** for a detail drawer
  showing every captured field + inline hook/notes editing.
- **History** (`/metascraper/captures`) — every weekly hunt the app has recorded
  (date, counts, new/killed tallies, hunted scope) — the accumulating time-series.

## Architecture

| Layer | Location |
|---|---|
| Route group (Console + Dashboard) | `frontend/app/(metascraper)/` |
| Types / API client / command generator | `frontend/lib/metascraper/` |
| Components | `frontend/components/metascraper/` |
| Models, diff engine, store, routes, sheets | `backend/metascraper/` |
| API (mounted in `backend/main.py`) | `/api/metascraper/*` |

JSON is **snake_case throughout** (`library_id`, `niche_id`, …) to match the
extraction schema Claude-in-Chrome emits verbatim — see `command.ts`.

### Diff & longevity engine

`backend/metascraper/diff.py` — pure, unit-tested
(`backend/tests/test_metascraper_diff.py`). Matches on `library_id`:

- **new** → not in store; `first_seen = last_seen = captured_date`.
- **running** → in both; bumps `weeks_observed`, refreshes copy, recomputes `days_active`.
- **killed** → in store but absent from a run that *did* query its niche.
  Bounded by `hunted_scope` so a partial hunt never false-kills untouched niches.
- `days_active > 56` (8 weeks) ⇒ **proven**.
- Manual fields (`hook_category`, `notes`) are preserved across every merge.

## Setup

### 1. Persistence (prod only)

Local dev uses SQLite automatically. For the deployed backend, run
`backend/metascraper/migration.sql` once in the Supabase SQL editor (reuses the
existing service-role connection — no new infra).

### 2. Ingest token (recommended for prod)

```
fly secrets set METASCRAPER_INGEST_TOKEN=<random-string>
```

Enter the same value in **Console → ingest token** so it's embedded in the hunt
command. Unset = the endpoint is open (fine for local dev).

### 3. Google Sheet mirror (optional)

Uses an Apps Script Web App — no service account, no Google SDK.

1. Open your sheet → **Extensions → Apps Script**.
2. Paste `backend/metascraper/sheet_appscript.gs`.
3. **Project Settings → Script properties** → add `SHEET_SECRET` = a random string.
4. **Deploy → New deployment → Web app**: *Execute as: Me*, *Who has access: Anyone*. Copy the `/exec` URL.
5. Set backend env:
   ```
   fly secrets set METASCRAPER_SHEET_WEBHOOK_URL=<exec-url> METASCRAPER_SHEET_SECRET=<same-secret>
   ```

Unset = sheet sync is skipped silently; Supabase stays the source of truth.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/metascraper/config` | Config + group labels + hook categories |
| PUT | `/api/metascraper/config` | Save config |
| POST | `/api/metascraper/config/reset` | Reset to seed taxonomy |
| POST | `/api/metascraper/capture` | **Ingest** (token-guarded) — runs diff, persists, mirrors |
| GET | `/api/metascraper/ads` | Processed ad records (sorted by longevity) |
| GET | `/api/metascraper/summary` | Totals + per-niche cards |
| GET | `/api/metascraper/diff-since-last` | New + killed since the previous capture |
| PATCH | `/api/metascraper/ads/{library_id}` | Inline edit `hook_category` / `notes` |
| GET | `/api/metascraper/health` | Token/sheet/store status |

## What is intentionally impossible

For JP commercial ads there is **no** spend, impressions, reach, CTR,
demographics, targeting, or historical archive. Those fields don't exist and are
never fabricated — if a value can't be captured it is stored `null`.

## Not built yet (phase 2)

- **EU-API tracker** for the user's SaaS competitors (Frame.io, Loom…) — those
  EU commercial ads *are* in the official Graph API and can run fully automated.
  Reuses the same `AdRecord` shape, diff engine, and dashboard. Build on request.
