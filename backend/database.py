import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "interviews.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_name TEXT NOT NULL,
            position TEXT NOT NULL,
            company TEXT,
            job_description TEXT,
            interview_plan TEXT,  -- JSON
            current_section INTEGER DEFAULT 0,
            current_question INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            completed_at TEXT,
            overall_score REAL
        );

        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,        -- 'interviewer' | 'candidate'
            content TEXT NOT NULL,
            section_index INTEGER,
            message_type TEXT,         -- 'question' | 'answer' | 'feedback' | 'system'
            score REAL,
            audio_path TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        );
    """)
    conn.commit()
    conn.close()
