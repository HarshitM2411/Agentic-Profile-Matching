# Agentic Profile Matching

AI-powered candidate matching agent with a React frontend and LangGraph backend.

## Run end-to-end (local)

### 1. Backend (FastAPI + LangGraph)

```bash
# From project root
pip install -r requirements.txt

# Set GROQ_API_KEY in .env
python api_server.py
```

API runs at `http://localhost:8000`.

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

UI runs at `http://localhost:5173` and proxies `/api` to the backend.

### 3. Try a search

Open the dashboard, enter a query like:

`Find Python dev with 3+ years of experience`

The agent will parse your requirements, search resumes, rank candidates, and return real matches from `data/resumes/`.

## Architecture

| Layer | Stack |
|-------|-------|
| Frontend | React, Zustand, Vite — calls `POST /api/chat` |
| Backend | FastAPI (`api_server.py`) wrapping LangGraph (`matching_agent.py`) |
| Alt UI | `streamlit_app.py` (direct agent, no React) |

## Requirements

- Python 3.10+
- Node.js 18+
- Valid `GROQ_API_KEY` in `.env`
