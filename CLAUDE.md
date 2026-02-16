# Money & Expense Tracking App

## Overview
Single-user expense tracking webapp with timeline dashboard. Backend API + React frontend.

## Tech Stack
- **Backend:** Python 3 + FastAPI + SQLite (`backend/`)
- **Frontend:** React 18 + TypeScript + Vite (`frontend/`)
- **UI libs:** react-select (category picker), lucide-react (icons)
- **Styling:** Plain CSS (`App.css`), no framework. Indigo (#4F46E5) primary color.

## Project Structure
```
backend/
  main.py          # FastAPI routes, CORS
  models.py        # Pydantic models, CATEGORIES dict with emoji mappings
  database.py      # SQLite init, migrations, connection helper
  requirements.txt # fastapi, uvicorn

frontend/src/
  App.tsx           # Root component, state, tab navigation
  App.css           # All styles
  api.ts            # API client, TypeScript types, buildEmojiMap helper
  components/
    ExpenseForm.tsx      # Modal form for adding expenses
    CategoryPicker.tsx   # react-select grouped dropdown
    ExpenseTimeline.tsx  # Date-grouped table view
```

## Running
```bash
# Backend (port 8000)
cd backend && .venv/bin/uvicorn main:app --reload

# Frontend (port 5173)
cd frontend && npm run dev
```

## API Endpoints
- `GET /api/expenses` — list all, sorted by date desc
- `POST /api/expenses` — create (sends subcategory, backend derives category)
- `DELETE /api/expenses/{id}` — delete
- `GET /api/categories` — category hierarchy with emojis

## Key Conventions
- `user_id` hardcoded to 1 (multi-user ready in schema)
- Emojis are display-only — DB stores plain text for category/subcategory
- Category is auto-derived server-side from subcategory via `SUB_TO_CAT` lookup
- Frontend venv: `frontend/node_modules/`, Backend venv: `backend/.venv/`
- TypeScript strict mode enabled
- CSS uses BEM-like naming (`.form-field-grow`, `.timeline-group`)

## Database Schema (`expenses` table)
| Column      | Type    | Notes                           |
|-------------|---------|----------------------------------|
| id          | INTEGER | PRIMARY KEY AUTOINCREMENT        |
| user_id     | INTEGER | DEFAULT 1                        |
| title       | TEXT    | NOT NULL                         |
| amount      | REAL    | NOT NULL                         |
| category    | TEXT    | DEFAULT 'Other'                  |
| subcategory | TEXT    | DEFAULT 'Uncategorized'          |
| date        | TEXT    | ISO 8601 (YYYY-MM-DD)            |
| created_at  | TEXT    | Auto-set datetime('now')         |

## Git
- Remote: `git@github.com:ltdt-apex/money-tracker.git` (SSH)
- Branch: `master`
