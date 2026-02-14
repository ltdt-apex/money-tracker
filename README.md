# Money Tracker

A personal expense tracking webapp with a timeline-based dashboard.

## Stack

- **Backend:** Python, FastAPI, SQLite
- **Frontend:** React, TypeScript, Vite

## Getting Started

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

API runs at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`.
