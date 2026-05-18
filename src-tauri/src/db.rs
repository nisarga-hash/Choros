    use rusqlite::{Connection, Result};

    pub fn connect() -> Result<Connection> {
        Connection::open("choros.db")
    }

    pub fn init_db() {
        let conn = connect().expect("DB failed");

        conn.execute_batch("
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            bio TEXT DEFAULT '',
            member_since TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS notes(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tasks(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            status TEXT DEFAULT 'todo',
            locked INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS planner(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            status TEXT DEFAULT 'planned'
        );

        CREATE TABLE IF NOT EXISTS settings(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE,
            font_size TEXT DEFAULT 'medium',
            daily_quotes INTEGER DEFAULT 1
        );
        ").unwrap();
    }