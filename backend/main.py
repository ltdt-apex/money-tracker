import os
from pathlib import Path
from typing import Optional

import anthropic
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse

load_dotenv()
from fastapi.middleware.cors import CORSMiddleware

from auth import get_current_user_id
from database import get_connection, init_db
from models import (
    ALL_SUBCATEGORIES,
    CATEGORIES,
    SUB_TO_CAT,
    CustomSubcategory,
    CustomSubcategoryCreate,
    Expense,
    ExpenseCreate,
    Profile,
    ProfileCreate,
    ProfileSettings,
    ProfileSummary,
    Tag,
    TagCreate,
)

PROMPTS_DIR = Path(__file__).parent / "prompts"

app = FastAPI(title="Money & Expense Tracker")

cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    import traceback
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.on_event("startup")
def startup() -> None:
    init_db()


# --- Helpers ---

def _profile_from_row(row) -> dict:
    """Convert a profile DB row to a dict, parsing the JSON disabled_subcategories column."""
    import json
    d = dict(row)
    raw = d.get("disabled_subcategories", "[]")
    d["disabled_subcategories"] = json.loads(raw) if isinstance(raw, str) else raw
    return d


# --- Profile CRUD ---

@app.get("/api/profiles", response_model=list[ProfileSummary])
def list_profiles(user_id: str = Depends(get_current_user_id)) -> list[ProfileSummary]:
    conn = get_connection()
    profiles = conn.execute(
        "SELECT * FROM profiles WHERE clerk_user_id = ? ORDER BY created_at",
        (user_id,),
    ).fetchall()
    result = []
    for p in profiles:
        pd = _profile_from_row(p)
        rows = conn.execute(
            "SELECT category, amount FROM expenses WHERE clerk_user_id = ? AND profile_id = ?",
            (user_id, pd["id"]),
        ).fetchall()
        income = sum(r["amount"] for r in rows if r["category"] == "Income")
        expenses = sum(r["amount"] for r in rows if r["category"] != "Income")
        result.append(ProfileSummary(**pd, income=income, expenses=expenses, balance=income - expenses))
    return result


@app.post("/api/profiles", response_model=Profile, status_code=201)
def create_profile(data: ProfileCreate, user_id: str = Depends(get_current_user_id)) -> Profile:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO profiles (clerk_user_id, name, emoji) VALUES (?, ?, ?)",
            (user_id, data.name.strip(), data.emoji),
        )
        conn.commit()
    except Exception:
            raise HTTPException(status_code=409, detail="Profile name already exists")
    row = conn.execute("SELECT * FROM profiles WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return Profile(**_profile_from_row(row))


@app.put("/api/profiles/{profile_id}", response_model=Profile)
def update_profile(profile_id: int, data: ProfileCreate, user_id: str = Depends(get_current_user_id)) -> Profile:
    conn = get_connection()
    result = conn.execute(
        "UPDATE profiles SET name = ?, emoji = ? WHERE id = ? AND clerk_user_id = ?",
        (data.name.strip(), data.emoji, profile_id, user_id),
    )
    conn.commit()
    if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Profile not found")
    row = conn.execute("SELECT * FROM profiles WHERE id = ?", (profile_id,)).fetchone()
    return Profile(**_profile_from_row(row))


@app.delete("/api/profiles/{profile_id}", status_code=204)
def delete_profile(profile_id: int, user_id: str = Depends(get_current_user_id)) -> None:
    conn = get_connection()
    # Clear profile_id from associated expenses and tags (don't delete them)
    conn.execute(
        "UPDATE expenses SET profile_id = NULL WHERE profile_id = ? AND clerk_user_id = ?",
        (profile_id, user_id),
    )
    conn.execute(
        "UPDATE tags SET profile_id = NULL WHERE profile_id = ? AND clerk_user_id = ?",
        (profile_id, user_id),
    )
    result = conn.execute(
        "DELETE FROM profiles WHERE id = ? AND clerk_user_id = ?", (profile_id, user_id)
    )
    conn.commit()
    if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Profile not found")


@app.put("/api/profiles/{profile_id}/settings", response_model=Profile)
def update_profile_settings(
    profile_id: int, data: ProfileSettings, user_id: str = Depends(get_current_user_id)
) -> Profile:
    import json
    conn = get_connection()
    # Build valid set: built-in + custom for this profile
    custom_rows = conn.execute(
        "SELECT subcategory FROM custom_subcategories WHERE clerk_user_id = ? AND profile_id = ?",
        (user_id, profile_id),
    ).fetchall()
    valid = ALL_SUBCATEGORIES | {r["subcategory"] for r in custom_rows}
    invalid = set(data.disabled_subcategories) - valid
    if invalid:
            raise HTTPException(status_code=400, detail=f"Invalid subcategories: {', '.join(invalid)}")
    result = conn.execute(
        "UPDATE profiles SET disabled_subcategories = ? WHERE id = ? AND clerk_user_id = ?",
        (json.dumps(data.disabled_subcategories), profile_id, user_id),
    )
    conn.commit()
    if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Profile not found")
    row = conn.execute("SELECT * FROM profiles WHERE id = ?", (profile_id,)).fetchone()
    return Profile(**_profile_from_row(row))


@app.post("/api/profiles/migrate-legacy", response_model=Profile)
def migrate_legacy(user_id: str = Depends(get_current_user_id)) -> Profile:
    conn = get_connection()
    # Create default "Personal" profile
    existing = conn.execute(
        "SELECT * FROM profiles WHERE clerk_user_id = ? AND name = 'Personal'",
        (user_id,),
    ).fetchone()
    if existing:
        profile = Profile(**_profile_from_row(existing))
    else:
        cursor = conn.execute(
            "INSERT INTO profiles (clerk_user_id, name, emoji) VALUES (?, 'Personal', '💰')",
            (user_id,),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM profiles WHERE id = ?", (cursor.lastrowid,)).fetchone()
        profile = Profile(**_profile_from_row(row))

    # Assign orphaned expenses and tags to this profile
    conn.execute(
        "UPDATE expenses SET profile_id = ? WHERE clerk_user_id = ? AND profile_id IS NULL",
        (profile.id, user_id),
    )
    conn.execute(
        "UPDATE tags SET profile_id = ? WHERE clerk_user_id = ? AND profile_id IS NULL",
        (profile.id, user_id),
    )
    conn.commit()
    return profile


# --- Helpers ---

def _get_tags_for_expense(conn, expense_id: int) -> list[Tag]:
    rows = conn.execute(
        "SELECT t.id, t.user_id, t.name, t.color FROM tags t "
        "JOIN expense_tags et ON et.tag_id = t.id "
        "WHERE et.expense_id = ?",
        (expense_id,),
    ).fetchall()
    return [Tag(**dict(r)) for r in rows]


def _sync_expense_tags(conn, expense_id: int, tag_ids: list[int]) -> None:
    conn.execute("DELETE FROM expense_tags WHERE expense_id = ?", (expense_id,))
    for tag_id in tag_ids:
        conn.execute(
            "INSERT INTO expense_tags (expense_id, tag_id) VALUES (?, ?)",
            (expense_id, tag_id),
        )


def _row_to_expense(conn, row) -> Expense:
    d = dict(row)
    tags = _get_tags_for_expense(conn, d["id"])
    return Expense(**d, tags=tags)


# --- Expense CRUD ---

@app.get("/api/expenses", response_model=list[Expense])
def list_expenses(
    profile_id: Optional[int] = Query(None),
    user_id: str = Depends(get_current_user_id),
) -> list[Expense]:
    conn = get_connection()
    if profile_id is not None:
        rows = conn.execute(
            "SELECT * FROM expenses WHERE clerk_user_id = ? AND profile_id = ? ORDER BY date DESC, id DESC",
            (user_id, profile_id),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM expenses WHERE clerk_user_id = ? ORDER BY date DESC, id DESC",
            (user_id,),
        ).fetchall()
    expenses = [_row_to_expense(conn, r) for r in rows]
    return expenses


@app.get("/api/categories")
def list_categories(
    profile_id: Optional[int] = Query(None),
    user_id: str = Depends(get_current_user_id),
) -> dict[str, dict]:
    import copy
    result = copy.deepcopy(CATEGORIES)
    if profile_id is not None:
        conn = get_connection()
        rows = conn.execute(
            "SELECT category, subcategory, emoji FROM custom_subcategories WHERE clerk_user_id = ? AND profile_id = ?",
            (user_id, profile_id),
        ).fetchall()
        for r in rows:
            cat = r["category"]
            if cat not in result:
                result[cat] = {"emoji": r["emoji"], "subcategories": {}}
            result[cat]["subcategories"][r["subcategory"]] = r["emoji"]
    return result


def _resolve_category(conn, user_id: str, profile_id: Optional[int], subcategory: str) -> str:
    """Resolve subcategory to its parent category, checking built-in then custom."""
    if subcategory in SUB_TO_CAT:
        return SUB_TO_CAT[subcategory]
    if profile_id is not None:
        row = conn.execute(
            "SELECT category FROM custom_subcategories WHERE clerk_user_id = ? AND profile_id = ? AND subcategory = ?",
            (user_id, profile_id, subcategory),
        ).fetchone()
        if row:
            return row["category"]
    raise HTTPException(status_code=400, detail="Invalid subcategory")


@app.post("/api/expenses", response_model=Expense, status_code=201)
def create_expense(
    data: ExpenseCreate,
    profile_id: Optional[int] = Query(None),
    user_id: str = Depends(get_current_user_id),
) -> Expense:
    conn = get_connection()
    category = _resolve_category(conn, user_id, profile_id, data.subcategory)
    cursor = conn.execute(
        "INSERT INTO expenses (clerk_user_id, title, amount, category, subcategory, date, note, profile_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (user_id, data.title, data.amount, category, data.subcategory, data.date, data.note, profile_id),
    )
    _sync_expense_tags(conn, cursor.lastrowid, data.tag_ids)
    conn.commit()
    row = conn.execute(
        "SELECT * FROM expenses WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    expense = _row_to_expense(conn, row)
    return expense


@app.put("/api/expenses/{expense_id}", response_model=Expense)
def update_expense(expense_id: int, data: ExpenseCreate, user_id: str = Depends(get_current_user_id)) -> Expense:
    conn = get_connection()
    # Look up the expense's profile_id for custom subcategory resolution
    existing = conn.execute("SELECT profile_id FROM expenses WHERE id = ? AND clerk_user_id = ?", (expense_id, user_id)).fetchone()
    expense_profile_id = existing["profile_id"] if existing else None
    category = _resolve_category(conn, user_id, expense_profile_id, data.subcategory)
    result = conn.execute(
        "UPDATE expenses SET title = ?, amount = ?, category = ?, subcategory = ?, date = ?, note = ? WHERE id = ? AND clerk_user_id = ?",
        (data.title, data.amount, category, data.subcategory, data.date, data.note, expense_id, user_id),
    )
    if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Expense not found")
    _sync_expense_tags(conn, expense_id, data.tag_ids)
    conn.commit()
    row = conn.execute("SELECT * FROM expenses WHERE id = ?", (expense_id,)).fetchone()
    expense = _row_to_expense(conn, row)
    return expense


@app.get("/api/suggestions")
def get_suggestions(
    profile_id: Optional[int] = Query(None),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    from datetime import date

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    today = date.today()
    month_start = today.replace(day=1).isoformat()
    month_end = today.isoformat()

    conn = get_connection()
    if profile_id is not None:
        rows = conn.execute(
            "SELECT category, subcategory, amount FROM expenses WHERE clerk_user_id = ? AND profile_id = ? AND date >= ? AND date <= ?",
            (user_id, profile_id, month_start, month_end),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT category, subcategory, amount FROM expenses WHERE clerk_user_id = ? AND date >= ? AND date <= ?",
            (user_id, month_start, month_end),
        ).fetchall()

    total_income = 0.0
    total_expenses = 0.0
    cat_totals: dict[str, float] = {}
    income_totals: dict[str, float] = {}

    for r in rows:
        category, subcategory, amount = r["category"], r["subcategory"], r["amount"]
        if category == "Income":
            total_income += amount
            income_totals[subcategory] = income_totals.get(subcategory, 0) + amount
        else:
            total_expenses += amount
            cat_totals[category] = cat_totals.get(category, 0) + amount

    balance = total_income - total_expenses
    date_range = today.strftime("%B %Y")

    cat_lines = []
    for cat, amt in sorted(cat_totals.items(), key=lambda x: -x[1]):
        pct = (amt / total_expenses * 100) if total_expenses else 0
        cat_lines.append(f"- {cat}: ${amt:.2f} ({pct:.0f}%)")
    category_breakdown = "\n".join(cat_lines) if cat_lines else "No expenses recorded."

    inc_lines = []
    for sub, amt in sorted(income_totals.items(), key=lambda x: -x[1]):
        inc_lines.append(f"- {sub}: ${amt:.2f}")
    income_breakdown = "\n".join(inc_lines) if inc_lines else "No income recorded."

    template = (PROMPTS_DIR / "suggestions.txt").read_text()
    prompt = template.format(
        total_income=total_income,
        total_expenses=total_expenses,
        balance=balance,
        category_breakdown=category_breakdown,
        income_breakdown=income_breakdown,
        date_range=date_range,
    )

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    suggestion_text = message.content[0].text

    return {"suggestion": suggestion_text}


@app.delete("/api/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: int, user_id: str = Depends(get_current_user_id)) -> None:
    conn = get_connection()
    result = conn.execute(
        "DELETE FROM expenses WHERE id = ? AND clerk_user_id = ?", (expense_id, user_id)
    )
    conn.commit()
    if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Expense not found")


# --- Custom Subcategory CRUD ---

@app.get("/api/custom-subcategories", response_model=list[CustomSubcategory])
def list_custom_subcategories(
    profile_id: int = Query(...),
    user_id: str = Depends(get_current_user_id),
) -> list[CustomSubcategory]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM custom_subcategories WHERE clerk_user_id = ? AND profile_id = ? ORDER BY category, subcategory",
        (user_id, profile_id),
    ).fetchall()
    return [CustomSubcategory(**dict(r)) for r in rows]


@app.post("/api/custom-subcategories", response_model=CustomSubcategory, status_code=201)
def create_custom_subcategory(
    data: CustomSubcategoryCreate,
    profile_id: int = Query(...),
    user_id: str = Depends(get_current_user_id),
) -> CustomSubcategory:
    if data.subcategory.strip() in ALL_SUBCATEGORIES:
        raise HTTPException(status_code=409, detail="Subcategory name conflicts with a built-in subcategory")
    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO custom_subcategories (clerk_user_id, profile_id, category, subcategory, emoji) VALUES (?, ?, ?, ?, ?)",
            (user_id, profile_id, data.category.strip(), data.subcategory.strip(), data.emoji),
        )
        conn.commit()
    except Exception:
            raise HTTPException(status_code=409, detail="Subcategory name already exists for this profile")
    row = conn.execute("SELECT * FROM custom_subcategories WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return CustomSubcategory(**dict(row))


@app.delete("/api/custom-subcategories/{sub_id}", status_code=204)
def delete_custom_subcategory(sub_id: int, user_id: str = Depends(get_current_user_id)) -> None:
    conn = get_connection()
    result = conn.execute(
        "DELETE FROM custom_subcategories WHERE id = ? AND clerk_user_id = ?", (sub_id, user_id)
    )
    conn.commit()
    if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Custom subcategory not found")


# --- Tag CRUD ---

@app.get("/api/tags", response_model=list[Tag])
def list_tags(
    profile_id: Optional[int] = Query(None),
    user_id: str = Depends(get_current_user_id),
) -> list[Tag]:
    conn = get_connection()
    if profile_id is not None:
        rows = conn.execute(
            "SELECT id, user_id, name, color FROM tags WHERE clerk_user_id = ? AND profile_id = ? ORDER BY name",
            (user_id, profile_id),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT id, user_id, name, color FROM tags WHERE clerk_user_id = ? ORDER BY name",
            (user_id,),
        ).fetchall()
    return [Tag(**dict(r)) for r in rows]


@app.post("/api/tags", response_model=Tag, status_code=201)
def create_tag(
    data: TagCreate,
    profile_id: Optional[int] = Query(None),
    user_id: str = Depends(get_current_user_id),
) -> Tag:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO tags (clerk_user_id, name, color, profile_id) VALUES (?, ?, ?, ?)",
            (user_id, data.name.strip(), data.color, profile_id),
        )
        conn.commit()
    except Exception:
            raise HTTPException(status_code=409, detail="Tag name already exists")
    row = conn.execute(
        "SELECT id, user_id, name, color FROM tags WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return Tag(**dict(row))


@app.put("/api/tags/{tag_id}", response_model=Tag)
def update_tag(tag_id: int, data: TagCreate, user_id: str = Depends(get_current_user_id)) -> Tag:
    conn = get_connection()
    result = conn.execute(
        "UPDATE tags SET name = ?, color = ? WHERE id = ? AND clerk_user_id = ?",
        (data.name.strip(), data.color, tag_id, user_id),
    )
    conn.commit()
    if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tag not found")
    row = conn.execute(
        "SELECT id, user_id, name, color FROM tags WHERE id = ?", (tag_id,)
    ).fetchone()
    return Tag(**dict(row))


@app.delete("/api/tags/{tag_id}", status_code=204)
def delete_tag(tag_id: int, user_id: str = Depends(get_current_user_id)) -> None:
    conn = get_connection()
    result = conn.execute(
        "DELETE FROM tags WHERE id = ? AND clerk_user_id = ?", (tag_id, user_id)
    )
    conn.commit()
    if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tag not found")
