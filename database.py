import sqlite3
import json
import uuid
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

DB_NAME = "choros.db"

def get_db():
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE,
            password TEXT,
            name TEXT,
            avatar TEXT,
            bio TEXT,
            gender TEXT,
            createdAt TEXT
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            userId TEXT,
            title TEXT,
            content TEXT,
            tags TEXT,
            color TEXT,
            pinned INTEGER,
            createdAt TEXT,
            updatedAt TEXT
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            userId TEXT,
            title TEXT,
            description TEXT,
            status TEXT,
            priority TEXT,
            tags TEXT,
            dueDate TEXT,
            createdAt TEXT,
            updatedAt TEXT
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS planner (
            id TEXT PRIMARY KEY,
            userId TEXT,
            title TEXT,
            description TEXT,
            startDate TEXT,
            endDate TEXT,
            milestone INTEGER,
            status TEXT,
            color TEXT,
            createdAt TEXT
        )
    ''')
    
    # Updated OTP table with purpose and expiry
    c.execute('''
        CREATE TABLE IF NOT EXISTS otps (
            email TEXT PRIMARY KEY,
            otp TEXT,
            purpose TEXT,
            expiresAt TEXT
        )
    ''')
    
    conn.commit()
    conn.close()

def dict_factory(row) -> Dict[str, Any]:
    d = dict(row)
    # Parse JSON fields if they exist
    for k in ['tags']:
        if k in d and d[k]:
            try:
                d[k] = json.loads(d[k])
            except:
                d[k] = []
    # Convert bools
    for k in ['pinned', 'milestone']:
        if k in d:
            d[k] = bool(d[k])
    return d

# --- AUTH ---
def signup(email, password, name, created_at) -> Optional[Dict]:
    conn = get_db()
    c = conn.cursor()
    user_id = str(uuid.uuid4())
    try:
        c.execute('''
            INSERT INTO users (id, email, password, name, createdAt)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, email, password, name, created_at))
        conn.commit()
        return get_user(user_id)
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

def login(email, password) -> Optional[Dict]:
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM users WHERE email = ? AND password = ?', (email, password))
    row = c.fetchone()
    conn.close()
    if row:
        d = dict(row)
        d.pop('password', None)
        return d
    return None

def get_user(user_id) -> Optional[Dict]:
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    row = c.fetchone()
    conn.close()
    if row:
        d = dict(row)
        d.pop('password', None)
        return d
    return None

def update_user(user_id, updates: Dict) -> Optional[Dict]:
    conn = get_db()
    c = conn.cursor()
    
    fields = []
    values = []
    for k, v in updates.items():
        if k != 'id' and k != 'password':
            fields.append(f"{k} = ?")
            values.append(v)
            
    if not fields: return get_user(user_id)
    
    values.append(user_id)
    query = f"UPDATE users SET {', '.join(fields)} WHERE id = ?"
    c.execute(query, values)
    conn.commit()
    conn.close()
    return get_user(user_id)

def delete_user(user_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('DELETE FROM users WHERE id = ?', (user_id,))
    c.execute('DELETE FROM notes WHERE userId = ?', (user_id,))
    c.execute('DELETE FROM tasks WHERE userId = ?', (user_id,))
    c.execute('DELETE FROM planner WHERE userId = ?', (user_id,))
    conn.commit()
    conn.close()

def user_exists(email: str) -> bool:
    """Check if user exists by email"""
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT id FROM users WHERE email = ?', (email,))
    result = c.fetchone() is not None
    conn.close()
    return result

def create_otp(email: str, otp: str, expires_at: str, purpose: str = "password_reset"):
    """Create/update OTP with expiry"""
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        REPLACE INTO otps (email, otp, purpose, expiresAt)
        VALUES (?, ?, ?, ?)
    ''', (email, otp, purpose, expires_at))
    conn.commit()
    conn.close()

def verify_otp(email: str, otp: str) -> Tuple[bool, str]:
    """Verify OTP and check expiry"""
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT otp, expiresAt FROM otps WHERE email = ?', (email,))
    row = c.fetchone()
    conn.close()
    
    if not row:
        return False, "OTP not found or expired"
    
    # Check if OTP matches
    if row['otp'] != otp:
        return False, "Invalid OTP"
    
    # Check if OTP is expired
    if datetime.fromisoformat(row['expiresAt']) < datetime.now():
        return False, "OTP has expired"
    
    return True, ""

def delete_otp(email: str):
    """Delete OTP after successful verification"""
    conn = get_db()
    c = conn.cursor()
    c.execute('DELETE FROM otps WHERE email = ?', (email,))
    conn.commit()
    conn.close()

def verify_and_change_password(email: str, otp: str, new_password: str) -> bool:
    """Verify OTP and change password (for password recovery)"""
    conn = get_db()
    c = conn.cursor()
    
    # Verify OTP first
    is_valid, _ = verify_otp(email, otp)
    if not is_valid:
        conn.close()
        return False
    
    # Update password
    c.execute('UPDATE users SET password = ? WHERE email = ?', (new_password, email))
    if c.rowcount > 0:
        c.execute('DELETE FROM otps WHERE email = ?', (email,))
        conn.commit()
        conn.close()
        return True
    
    conn.close()
    return False

# --- NOTES ---
def get_notes(user_id) -> List[Dict]:
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM notes WHERE userId = ?', (user_id,))
    rows = c.fetchall()
    conn.close()
    return [dict_factory(r) for r in rows]

def create_note(data: Dict) -> Dict:
    conn = get_db()
    c = conn.cursor()
    note_id = data.get('id', str(uuid.uuid4()))
    tags = json.dumps(data.get('tags', []))
    pinned = 1 if data.get('pinned') else 0
    
    c.execute('''
        INSERT INTO notes (id, userId, title, content, tags, color, pinned, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        note_id, data['userId'], data.get('title', ''), data.get('content', ''),
        tags, data.get('color', 'default'), pinned,
        data.get('createdAt'), data.get('updatedAt')
    ))
    conn.commit()
    
    c.execute('SELECT * FROM notes WHERE id = ?', (note_id,))
    row = c.fetchone()
    conn.close()
    return dict_factory(row)

def update_note(note_id, data: Dict) -> Optional[Dict]:
    conn = get_db()
    c = conn.cursor()
    
    fields = []
    values = []
    for k, v in data.items():
        if k == 'tags':
            fields.append("tags = ?")
            values.append(json.dumps(v))
        elif k in ['pinned']:
            fields.append(f"{k} = ?")
            values.append(1 if v else 0)
        elif k not in ['id', 'userId', 'createdAt']:
            fields.append(f"{k} = ?")
            values.append(v)
            
    if fields:
        values.append(note_id)
        query = f"UPDATE notes SET {', '.join(fields)} WHERE id = ?"
        c.execute(query, values)
        conn.commit()
        
    c.execute('SELECT * FROM notes WHERE id = ?', (note_id,))
    row = c.fetchone()
    conn.close()
    return dict_factory(row) if row else None

def delete_note(note_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('DELETE FROM notes WHERE id = ?', (note_id,))
    conn.commit()
    conn.close()

# --- TASKS ---
def get_tasks(user_id) -> List[Dict]:
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM tasks WHERE userId = ?', (user_id,))
    rows = c.fetchall()
    conn.close()
    return [dict_factory(r) for r in rows]

def create_task(data: Dict) -> Dict:
    conn = get_db()
    c = conn.cursor()
    task_id = data.get('id', str(uuid.uuid4()))
    tags = json.dumps(data.get('tags', []))
    
    c.execute('''
        INSERT INTO tasks (id, userId, title, description, status, priority, tags, dueDate, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        task_id, data['userId'], data.get('title', ''), data.get('description', ''),
        data.get('status', 'todo'), data.get('priority', 'medium'), tags,
        data.get('dueDate'), data.get('createdAt'), data.get('updatedAt')
    ))
    conn.commit()
    
    c.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    row = c.fetchone()
    conn.close()
    return dict_factory(row)

def update_task(task_id, data: Dict) -> Optional[Dict]:
    conn = get_db()
    c = conn.cursor()
    fields = []
    values = []
    for k, v in data.items():
        if k == 'tags':
            fields.append("tags = ?")
            values.append(json.dumps(v))
        elif k not in ['id', 'userId', 'createdAt']:
            fields.append(f"{k} = ?")
            values.append(v)
            
    if fields:
        values.append(task_id)
        query = f"UPDATE tasks SET {', '.join(fields)} WHERE id = ?"
        c.execute(query, values)
        conn.commit()
        
    c.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    row = c.fetchone()
    conn.close()
    return dict_factory(row) if row else None

def delete_task(task_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
    conn.commit()
    conn.close()

# --- PLANNER ---
def get_planner(user_id) -> List[Dict]:
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM planner WHERE userId = ?', (user_id,))
    rows = c.fetchall()
    conn.close()
    return [dict_factory(r) for r in rows]

def create_planner(data: Dict) -> Dict:
    conn = get_db()
    c = conn.cursor()
    item_id = data.get('id', str(uuid.uuid4()))
    milestone = 1 if data.get('milestone') else 0
    
    c.execute('''
        INSERT INTO planner (id, userId, title, description, startDate, endDate, milestone, status, color, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        item_id, data['userId'], data.get('title', ''), data.get('description', ''),
        data.get('startDate', ''), data.get('endDate'), milestone,
        data.get('status', 'planned'), data.get('color', 'primary'),
        data.get('createdAt')
    ))
    conn.commit()
    
    c.execute('SELECT * FROM planner WHERE id = ?', (item_id,))
    row = c.fetchone()
    conn.close()
    return dict_factory(row)

def update_planner(item_id, data: Dict) -> Optional[Dict]:
    conn = get_db()
    c = conn.cursor()
    fields = []
    values = []
    for k, v in data.items():
        if k == 'milestone':
            fields.append("milestone = ?")
            values.append(1 if v else 0)
        elif k not in ['id', 'userId', 'createdAt']:
            fields.append(f"{k} = ?")
            values.append(v)
            
    if fields:
        values.append(item_id)
        query = f"UPDATE planner SET {', '.join(fields)} WHERE id = ?"
        c.execute(query, values)
        conn.commit()
        
    c.execute('SELECT * FROM planner WHERE id = ?', (item_id,))
    row = c.fetchone()
    conn.close()
    return dict_factory(row) if row else None

def delete_planner(item_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('DELETE FROM planner WHERE id = ?', (item_id,))
    conn.commit()
    conn.close()

# Initialize DB on load
init_db()
