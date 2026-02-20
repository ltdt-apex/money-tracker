import os
import sqlite3
import threading
from pathlib import Path

DB_PATH = Path(os.environ.get("DB_PATH", Path(__file__).parent / "expenses.db"))

_connection: sqlite3.Connection | None = None
_lock = threading.Lock()


def get_connection() -> sqlite3.Connection:
    global _connection
    with _lock:
        if _connection is None:
            _connection = sqlite3.connect(str(DB_PATH), timeout=30, check_same_thread=False)
            _connection.row_factory = sqlite3.Row
            _connection.execute("PRAGMA journal_mode=WAL")
            _connection.execute("PRAGMA busy_timeout=10000")
            _connection.execute("PRAGMA foreign_keys=ON")
        return _connection


def init_db() -> None:
    conn = get_connection()

    # Profiles table (must be created before expenses/tags that reference it)
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

    conn.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL DEFAULT 1,
            clerk_user_id TEXT,
            profile_id INTEGER REFERENCES profiles(id),
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL DEFAULT 'Other',
            subcategory TEXT NOT NULL DEFAULT '❓ Uncategorized',
            date TEXT NOT NULL,
            note TEXT NOT NULL DEFAULT '',
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
            clerk_user_id TEXT,
            profile_id INTEGER REFERENCES profiles(id),
            UNIQUE(clerk_user_id, name)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS expense_tags (
            expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
            tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY (expense_id, tag_id)
        )
    """)

    # --- Migrations for existing databases ---
    cols = [r[1] for r in conn.execute("PRAGMA table_info(expenses)").fetchall()]
    if "category" not in cols:
        conn.execute("ALTER TABLE expenses ADD COLUMN category TEXT NOT NULL DEFAULT 'Other'")
    if "subcategory" not in cols:
        conn.execute("ALTER TABLE expenses ADD COLUMN subcategory TEXT NOT NULL DEFAULT '❓ Uncategorized'")
    if "clerk_user_id" not in cols:
        conn.execute("ALTER TABLE expenses ADD COLUMN clerk_user_id TEXT")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_expenses_clerk_user ON expenses(clerk_user_id)")
    if "profile_id" not in cols:
        conn.execute("ALTER TABLE expenses ADD COLUMN profile_id INTEGER REFERENCES profiles(id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_expenses_profile ON expenses(profile_id)")
    if "note" not in cols:
        conn.execute("ALTER TABLE expenses ADD COLUMN note TEXT NOT NULL DEFAULT ''")

    tag_cols = [r[1] for r in conn.execute("PRAGMA table_info(tags)").fetchall()]
    if "clerk_user_id" not in tag_cols:
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
    if "profile_id" not in tag_cols:
        conn.execute("ALTER TABLE tags ADD COLUMN profile_id INTEGER REFERENCES profiles(id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tags_profile ON tags(profile_id)")

    # Migration: add disabled_subcategories to profiles
    profile_cols = [r[1] for r in conn.execute("PRAGMA table_info(profiles)").fetchall()]
    if "disabled_subcategories" not in profile_cols:
        conn.execute("ALTER TABLE profiles ADD COLUMN disabled_subcategories TEXT NOT NULL DEFAULT '[]'")

    # Custom subcategories table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS custom_subcategories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clerk_user_id TEXT NOT NULL,
            profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            category TEXT NOT NULL,
            subcategory TEXT NOT NULL,
            emoji TEXT NOT NULL DEFAULT '📌',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(profile_id, subcategory)
        )
    """)

    conn.commit()
