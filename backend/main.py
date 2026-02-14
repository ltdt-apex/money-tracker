from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database import get_connection, init_db
from models import ALL_SUBCATEGORIES, CATEGORIES, SUB_TO_CAT, Expense, ExpenseCreate

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


@app.get("/api/expenses", response_model=list[Expense])
def list_expenses() -> list[Expense]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM expenses WHERE user_id = 1 ORDER BY date DESC, id DESC"
    ).fetchall()
    conn.close()
    return [Expense(**dict(r)) for r in rows]


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
    conn.commit()
    row = conn.execute(
        "SELECT * FROM expenses WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    conn.close()
    return Expense(**dict(row))


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
