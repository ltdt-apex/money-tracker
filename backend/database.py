import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "expenses.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), timeout=10, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA foreign_keys=ON")
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
            subcategory TEXT NOT NULL DEFAULT '❓ Uncategorized',
            date TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL DEFAULT 1,
            name TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#4F46E5',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(user_id, name)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS expense_tags (
            expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
            tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY (expense_id, tag_id)
        )
    """)
    # migrate: add columns if missing (existing databases)
    cols = [r[1] for r in conn.execute("PRAGMA table_info(expenses)").fetchall()]
    if "category" not in cols:
        conn.execute("ALTER TABLE expenses ADD COLUMN category TEXT NOT NULL DEFAULT 'Other'")
    if "subcategory" not in cols:
        conn.execute("ALTER TABLE expenses ADD COLUMN subcategory TEXT NOT NULL DEFAULT '❓ Uncategorized'")

    # Multi-user migration: add clerk_user_id column
    if "clerk_user_id" not in cols:
        conn.execute("ALTER TABLE expenses ADD COLUMN clerk_user_id TEXT")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_expenses_clerk_user ON expenses(clerk_user_id)")

    tag_cols = [r[1] for r in conn.execute("PRAGMA table_info(tags)").fetchall()]
    if "clerk_user_id" not in tag_cols:
        # Recreate tags table with UNIQUE on (clerk_user_id, name) instead of (user_id, name)
        conn.execute("ALTER TABLE tags RENAME TO tags_old")
        conn.execute("""
            CREATE TABLE tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL DEFAULT 1,
                name TEXT NOT NULL,
                color TEXT NOT NULL DEFAULT '#4F46E5',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                clerk_user_id TEXT,
                UNIQUE(clerk_user_id, name)
            )
        """)
        conn.execute("""
            INSERT INTO tags (id, user_id, name, color, created_at)
            SELECT id, user_id, name, color, created_at FROM tags_old
        """)
        conn.execute("DROP TABLE tags_old")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tags_clerk_user ON tags(clerk_user_id)")

    # Profiles table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clerk_user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            emoji TEXT NOT NULL DEFAULT '💰',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(clerk_user_id, name)
        )
    """)

    # Migration: add profile_id to expenses
    if "profile_id" not in cols:
        conn.execute("ALTER TABLE expenses ADD COLUMN profile_id INTEGER REFERENCES profiles(id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_expenses_profile ON expenses(profile_id)")

    # Migration: add profile_id to tags
    if "profile_id" not in tag_cols:
        conn.execute("ALTER TABLE tags ADD COLUMN profile_id INTEGER REFERENCES profiles(id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tags_profile ON tags(profile_id)")

    conn.commit()
    conn.close()
