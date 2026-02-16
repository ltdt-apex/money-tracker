import os
from pathlib import Path

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException

load_dotenv()
from fastapi.middleware.cors import CORSMiddleware

from database import get_connection, init_db
from models import ALL_SUBCATEGORIES, CATEGORIES, SUB_TO_CAT, Expense, ExpenseCreate, Tag, TagCreate

PROMPTS_DIR = Path(__file__).parent / "prompts"

app = FastAPI(title="Money & Expense Tracker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()


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


@app.get("/api/expenses", response_model=list[Expense])
def list_expenses() -> list[Expense]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM expenses WHERE user_id = 1 ORDER BY date DESC, id DESC"
    ).fetchall()
    expenses = [_row_to_expense(conn, r) for r in rows]
    conn.close()
    return expenses


@app.get("/api/categories")
def list_categories() -> dict[str, dict]:
    return CATEGORIES


@app.post("/api/expenses", response_model=Expense, status_code=201)
def create_expense(data: ExpenseCreate) -> Expense:
    if data.subcategory not in ALL_SUBCATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid subcategory")
    category = SUB_TO_CAT[data.subcategory]
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO expenses (user_id, title, amount, category, subcategory, date) VALUES (1, ?, ?, ?, ?, ?)",
        (data.title, data.amount, category, data.subcategory, data.date),
    )
    _sync_expense_tags(conn, cursor.lastrowid, data.tag_ids)
    conn.commit()
    row = conn.execute(
        "SELECT * FROM expenses WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    expense = _row_to_expense(conn, row)
    conn.close()
    return expense


@app.put("/api/expenses/{expense_id}", response_model=Expense)
def update_expense(expense_id: int, data: ExpenseCreate) -> Expense:
    if data.subcategory not in ALL_SUBCATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid subcategory")
    category = SUB_TO_CAT[data.subcategory]
    conn = get_connection()
    result = conn.execute(
        "UPDATE expenses SET title = ?, amount = ?, category = ?, subcategory = ?, date = ? WHERE id = ? AND user_id = 1",
        (data.title, data.amount, category, data.subcategory, data.date, expense_id),
    )
    if result.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Expense not found")
    _sync_expense_tags(conn, expense_id, data.tag_ids)
    conn.commit()
    row = conn.execute("SELECT * FROM expenses WHERE id = ?", (expense_id,)).fetchone()
    expense = _row_to_expense(conn, row)
    conn.close()
    return expense


@app.get("/api/suggestions")
def get_suggestions() -> dict:
    from datetime import date

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    today = date.today()
    month_start = today.replace(day=1).isoformat()
    month_end = today.isoformat()

    conn = get_connection()
    rows = conn.execute(
        "SELECT category, subcategory, amount FROM expenses WHERE user_id = 1 AND date >= ? AND date <= ?",
        (month_start, month_end),
    ).fetchall()
    conn.close()

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
def delete_expense(expense_id: int) -> None:
    conn = get_connection()
    result = conn.execute(
        "DELETE FROM expenses WHERE id = ? AND user_id = 1", (expense_id,)
    )
    conn.commit()
    if result.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Expense not found")
    conn.close()


# --- Tag CRUD ---

@app.get("/api/tags", response_model=list[Tag])
def list_tags() -> list[Tag]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, user_id, name, color FROM tags WHERE user_id = 1 ORDER BY name"
    ).fetchall()
    conn.close()
    return [Tag(**dict(r)) for r in rows]


@app.post("/api/tags", response_model=Tag, status_code=201)
def create_tag(data: TagCreate) -> Tag:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO tags (user_id, name, color) VALUES (1, ?, ?)",
            (data.name.strip(), data.color),
        )
        conn.commit()
    except Exception:
        conn.close()
        raise HTTPException(status_code=409, detail="Tag name already exists")
    row = conn.execute(
        "SELECT id, user_id, name, color FROM tags WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    conn.close()
    return Tag(**dict(row))


@app.put("/api/tags/{tag_id}", response_model=Tag)
def update_tag(tag_id: int, data: TagCreate) -> Tag:
    conn = get_connection()
    result = conn.execute(
        "UPDATE tags SET name = ?, color = ? WHERE id = ? AND user_id = 1",
        (data.name.strip(), data.color, tag_id),
    )
    conn.commit()
    if result.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Tag not found")
    row = conn.execute(
        "SELECT id, user_id, name, color FROM tags WHERE id = ?", (tag_id,)
    ).fetchone()
    conn.close()
    return Tag(**dict(row))


@app.delete("/api/tags/{tag_id}", status_code=204)
def delete_tag(tag_id: int) -> None:
    conn = get_connection()
    result = conn.execute(
        "DELETE FROM tags WHERE id = ? AND user_id = 1", (tag_id,)
    )
    conn.commit()
    if result.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Tag not found")
    conn.close()
