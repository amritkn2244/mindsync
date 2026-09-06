# MindSync

A private mental-wellness workspace that pairs a calm, glassmorphic interface with an AI companion. Log how you feel, reflect in your journal, reset with guided breathing, and let patterns surface on their own.

## Overview

MindSync is a full-stack wellness platform built around a single idea: showing up for yourself daily is the practice. It combines mood check-ins, journaling, and breathing exercises in a dark, distraction-free UI, with a reflective AI coach and auto-generated insights running on Google Gemini.

## Features

- **Mood check-ins** - one-tap daily mood, energy, and sleep tracking with optional trigger tagging
- **Journals** - private daily entries with Gemini sentiment analysis and a gentle cognitive reframe
- **AI coaching** - a warm, non-clinical chat companion that keeps conversation history per account
- **Insights & analytics** - AI summaries, recommendations, and trigger patterns computed from real check-in data
- **Guided breathing** - Box, 4-7-8, and Coherent sessions with focus timers
- **Secure authentication** - JWT sessions with bcrypt-hashed passwords
- **Responsive glass UI** - obsidian glassmorphic theme across 11 pages, fully mobile-aware

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3, FastAPI, SQLModel / SQLAlchemy |
| Database | PostgreSQL on Neon (via `psycopg`) |
| AI | Google Gemini API (`google-genai` SDK) |
| Auth | PyJWT + passlib (bcrypt) |
| Frontend | Vanilla ES6 JavaScript, HTML5, CSS3 |

## Project Structure

```
mindsync/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/    # Auth, users, moods, journal, coach, analytics, insights
│   │   ├── core/             # Settings, DB engine + lifecycle
│   │   ├── models/           # SQLModel entities
│   │   ├── schemas/          # Pydantic request/response contracts
│   │   └── services/         # Auth, analytics, Gemini client
│   ├── .env.example          # Environment variable template
│   └── requirements.txt
├── frontend/
│   ├── index.html, dashboard.html, mood.html, journal.html,
│   │   breathing.html, coach.html, analytics.html, insights.html,
│   │   profile.html, login.html, signup.html
│   ├── css/                  # theme.css (design system) + layout.css
│   ├── js/                   # common.js (core), auth.js, app.js (pages)
│   └── assets/
└── .gitignore
```

## API Overview

All routes are prefixed with `/api/v1` and protected (except signup/login).

| Method | Route | Description |
|---|---|---|
| POST | `/auth/signup` | Create an account |
| POST | `/auth/login` | Authenticate and return a JWT |
| GET | `/users/me` | Read the current profile |
| PUT | `/users/me` | Update the display name |
| POST | `/moods` | Save a mood check-in |
| GET | `/moods/history` | List mood check-ins |
| POST | `/journal` | Save an entry (Gemini sentiment analysis) |
| GET | `/journal/history` | List journal entries |
| POST | `/coach/chat` | Send a message to the AI coach |
| GET | `/coach/history` | Load conversation history |
| GET | `/analytics` | Aggregated mood metrics |
| GET | `/insights` | Gemini-generated insights from user stats |

## Getting Started

### Prerequisites

- Python 3.11+
- A PostgreSQL database (local or [Neon](https://neon.tech))
- A [Google Gemini API key](https://aistudio.google.com/apikey)

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env    # Windows
cp .env.example .env      # macOS / Linux
```

Edit `backend/.env` and set `DATABASE_URL` and `GEMINI_API_KEY`. Then run:

```bash
uvicorn app.main:app --port 8000 --reload
```

The API health check is available at `http://127.0.0.1:8000/health`, interactive docs at `http://127.0.0.1:8000/docs`.

### 2. Frontend

From the project root:

```bash
cd frontend
python -m http.server 5500
```

Open `http://127.0.0.1:5500`, create an account, and check in.

## Deployment

- **Backend (Render)** — root directory `backend/`; build `pip install -r requirements.txt`; start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Set `DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET`, and `CORS_ORIGINS` in the Render dashboard.
- **Frontend (Vercel)** — root directory `frontend/`, framework "Other", no build step. Point the API origin to your Render URL by setting `window.MINDSYNC_API_BASE` (or update `API_ORIGINS.production` in `frontend/js/common.js`).

## Disclaimer

MindSync is a wellness tool, not a medical product. It does not diagnose, prescribe, or replace professional care. If you're in crisis, reach out to a trusted person, a helpline, or emergency services in your country.
