# L'or Trend Engine

Mobile-friendly trend intelligence dashboard for L'or Clinic YouTube. It ranks Japanese beauty, cosmetic medicine, and diet topics, compares them with YouTube performance signals, and creates 3-5 minute りき先生-style talking briefs.

## What is included

- FastAPI backend with LINE-ready endpoints.
- Modular collectors for YouTube, X, Google News RSS, and Google Trends.
- Japanese text normalization, dedupe, clustering, safety filtering, classification, and scoring.
- Next.js dashboard with Home, Trends, Briefs, Sources, and Settings screens.
- Dummy data fallback so the app can be previewed before API keys are configured.
- Focused tests for scoring, safety filtering, and deduplication.

## Run Backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn backend.main:app --reload --port 8000
```

Backend API:

- `GET /api/top-trends`
- `GET /api/record-this-week`
- `GET /api/video-opportunities`
- `GET /api/briefs/{id}`
- `POST /api/generate-brief`
- `POST /api/approve-topic/{id}`
- `POST /api/reject-topic/{id}`
- `GET /api/sources`
- `GET /api/settings`

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Collect Daily Trends

```bash
python -m backend.scheduler.daily_collect
```

Collectors skip missing credentials gracefully and use sample data where needed.

## Generate Weekly Report

```bash
python -m backend.scheduler.weekly_report
```

The report is written to `outputs/weekly_report.md`.

## API Keys

Copy `.env.example` to `.env` and set:

- `YOUTUBE_API_KEY`
- `YOUTUBE_CHANNEL_ID`
- `X_BEARER_TOKEN`
- `MODEL_PROVIDER`

Google News RSS works without an API key. Google Trends uses `pytrends` when available.

## Scoring

Default weights:

- Trend Momentum: 25
- Google Search Demand: 20
- Medical Relevance: 20
- YouTube Historical Fit: 20
- Conversion Potential: 10
- Safety / Brand Fit: 5

The dashboard settings page exposes these values for the next phase; backend defaults live in `backend/config.py` and `config/scoring.yml`.

## Tests

```bash
pytest backend/tests
```
