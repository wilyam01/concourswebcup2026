import 'dotenv/config';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.env.DATABASE_PATH || './data/terra-nova.sqlite');
fs.mkdirSync(path.dirname(file), { recursive: true });
export const db = new Database(file);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL, sector TEXT NOT NULL DEFAULT '', avatar_data TEXT NOT NULL DEFAULT '', password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('CITOYEN','AGENT','ADMIN')),
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS citizen_requests (
    id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL, district TEXT NOT NULL, type TEXT NOT NULL, service TEXT NOT NULL,
    priority TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'todo', description TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, category TEXT NOT NULL,
    subject TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL, unread INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
    target_sector TEXT NOT NULL DEFAULT '', service TEXT NOT NULL DEFAULT '', service_status TEXT NOT NULL DEFAULT '',
    author_id TEXT REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL,
    expires_at TEXT, active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS announcement_reads (
    announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, read_at TEXT NOT NULL,
    PRIMARY KEY(announcement_id,user_id)
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id TEXT REFERENCES users(id) ON DELETE SET NULL, agent_name TEXT NOT NULL,
    sector TEXT NOT NULL DEFAULT '', service TEXT NOT NULL, purpose TEXT NOT NULL,
    scheduled_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'booked', reminder_sent_at TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS login_failures (
    email TEXT PRIMARY KEY COLLATE NOCASE, attempts INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS citizen_requests_owner ON citizen_requests(owner_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS announcements_active ON announcements(active, created_at DESC);
  CREATE INDEX IF NOT EXISTS appointments_agent_slot ON appointments(agent_id, scheduled_at, status);
`);

const userColumns = new Set(db.prepare('PRAGMA table_info(users)').all().map((column) => column.name));
if (!userColumns.has('sector')) db.exec("ALTER TABLE users ADD COLUMN sector TEXT NOT NULL DEFAULT ''");
if (!userColumns.has('enabled')) db.exec('ALTER TABLE users ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1');
if (!userColumns.has('avatar_data')) db.exec("ALTER TABLE users ADD COLUMN avatar_data TEXT NOT NULL DEFAULT ''");
