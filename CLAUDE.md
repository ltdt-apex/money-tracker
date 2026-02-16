# Cashboard

## Overview
Multi-user expense tracking webapp with multi-profile support, sidebar navigation, and timeline dashboard. Backend API + React frontend. Authenticated via Clerk SSO.

## Tech Stack
- **Backend:** Python 3 + FastAPI + SQLite (`backend/`)
- **Frontend:** React 18 + TypeScript + Vite (`frontend/`)
- **Auth:** Clerk (JWT via JWKS)
- **UI libs:** react-select (category picker), lucide-react (icons)
- **Styling:** Plain CSS (`App.css`), no framework. Indigo (#4F46E5) primary color.

## Project Structure
```
backend/
  main.py          # FastAPI routes (profiles, expenses, tags, suggestions)
  models.py        # Pydantic models, CATEGORIES dict with emoji mappings
  database.py      # SQLite init, migrations, connection helper
  auth.py          # Clerk JWT verification via JWKS
  prompts/         # LLM prompt templates
  requirements.txt # fastapi, uvicorn, anthropic

frontend/
  public/
    money.png        # App icon (favicon + sidebar brand)
  src/
    App.tsx           # Root component, profile/expense state, layout
    App.css           # All styles (sidebar, home, profile, timeline, stats)
    api.ts            # API client, TypeScript types, profile-scoped requests
    components/
      Sidebar.tsx        # Fixed left nav: Home, profile list, new profile
      HomeView.tsx       # Profile cards with summaries, create/delete profiles
      ProfileForm.tsx    # Modal: name input + emoji picker grid
      ExpenseForm.tsx    # Modal form for adding/editing expenses
      CategoryPicker.tsx # react-select grouped dropdown
      ExpenseTimeline.tsx # Date-grouped table view
      ExpenseStats.tsx   # Charts, breakdowns, spend calendar
      Suggestions.tsx    # LLM-powered financial suggestions (profile-scoped)
```

## Running
```bash
# Backend (port 8000)
cd backend && .venv/bin/uvicorn main:app --reload

# Frontend (port 5173)
cd frontend && npm run dev
```

## API Endpoints

### Profiles
- `GET /api/profiles` — list profiles with income/expenses/balance summaries
- `POST /api/profiles` — create profile (name, emoji)
- `PUT /api/profiles/{id}` — update profile
- `DELETE /api/profiles/{id}` — delete profile (orphans expenses/tags)
- `POST /api/profiles/migrate-legacy` — create default "Personal" profile, assign orphaned data

### Expenses
- `GET /api/expenses?profile_id=N` — list expenses, optionally scoped to profile
- `POST /api/expenses?profile_id=N` — create (sends subcategory, backend derives category)
- `PUT /api/expenses/{id}` — update
- `DELETE /api/expenses/{id}` — delete

### Tags
- `GET /api/tags?profile_id=N` — list tags, optionally scoped
- `POST /api/tags?profile_id=N` — create
- `PUT /api/tags/{id}` — update
- `DELETE /api/tags/{id}` — delete

### Other
- `GET /api/categories` — category hierarchy with emojis
- `GET /api/suggestions?profile_id=N` — LLM-powered financial suggestions

## Key Conventions
- Multi-user auth via Clerk; all queries filter by `clerk_user_id`
- Multi-profile: expenses and tags scoped by `profile_id` column
- On first login, auto-migrates legacy data into a default "Personal" profile
- Emojis are display-only — DB stores plain text for category/subcategory
- Category is auto-derived server-side from subcategory via `SUB_TO_CAT` lookup
- Frontend venv: `frontend/node_modules/`, Backend venv: `backend/.venv/`
- TypeScript strict mode enabled
- CSS uses BEM-like naming (`.sidebar-item`, `.home-card`, `.timeline-group`)

## Database Schema

### `profiles` table
| Column        | Type    | Notes                              |
|---------------|---------|-------------------------------------|
| id            | INTEGER | PRIMARY KEY AUTOINCREMENT           |
| clerk_user_id | TEXT    | NOT NULL                            |
| name          | TEXT    | NOT NULL                            |
| emoji         | TEXT    | NOT NULL DEFAULT '💰'              |
| created_at    | TEXT    | Auto-set datetime('now')            |
| | | UNIQUE(clerk_user_id, name)          |

### `expenses` table
| Column        | Type    | Notes                              |
|---------------|---------|-------------------------------------|
| id            | INTEGER | PRIMARY KEY AUTOINCREMENT           |
| user_id       | INTEGER | DEFAULT 1 (legacy)                  |
| clerk_user_id | TEXT    |                                     |
| profile_id    | INTEGER | FK → profiles(id)                   |
| title         | TEXT    | NOT NULL                            |
| amount        | REAL    | NOT NULL                            |
| category      | TEXT    | DEFAULT 'Other'                     |
| subcategory   | TEXT    | DEFAULT 'Uncategorized'             |
| date          | TEXT    | ISO 8601 (YYYY-MM-DD)               |
| created_at    | TEXT    | Auto-set datetime('now')            |

### `tags` table
| Column        | Type    | Notes                              |
|---------------|---------|-------------------------------------|
| id            | INTEGER | PRIMARY KEY AUTOINCREMENT           |
| clerk_user_id | TEXT    |                                     |
| profile_id    | INTEGER | FK → profiles(id)                   |
| name          | TEXT    | NOT NULL                            |
| color         | TEXT    | DEFAULT '#4F46E5'                   |
| created_at    | TEXT    | Auto-set datetime('now')            |
| | | UNIQUE(clerk_user_id, name)          |

### `expense_tags` table
| Column     | Type    | Notes                               |
|------------|---------|--------------------------------------|
| expense_id | INTEGER | FK → expenses(id) ON DELETE CASCADE  |
| tag_id     | INTEGER | FK → tags(id) ON DELETE CASCADE      |
| | | PRIMARY KEY (expense_id, tag_id)      |

## Git
- Remote: `git@github.com:ltdt-apex/money-tracker.git` (SSH)
- Branch: `master`
