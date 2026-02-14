import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "expenses.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL DEFAULT 1,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL DEFAULT 'Other',
            date TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    # migrate: add category column if missing (existing databases)
    cols = [r[1] for r in conn.execute("PRAGMA table_info(expenses)").fetchall()]
    if "category" not in cols:
        conn.execute("ALTER TABLE expenses ADD COLUMN category TEXT NOT NULL DEFAULT 'Other'")
    conn.commit()
    conn.close()
