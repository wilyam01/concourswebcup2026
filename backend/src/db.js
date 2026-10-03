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
  CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, occurred_at TEXT NOT NULL,
    actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    actor_email TEXT NOT NULL DEFAULT '', actor_role TEXT NOT NULL DEFAULT 'SYSTEM',
    action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL, metadata_json TEXT NOT NULL DEFAULT '{}'
  );
  CREATE TABLE IF NOT EXISTS privacy_requests (
    id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK(request_type IN ('access','copy','rectification','restriction','opposition')),
    details TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'received'
      CHECK(status IN ('received','in_review','completed','declined')),
    response_note TEXT NOT NULL DEFAULT '', processed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS citizen_notifications (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_id TEXT NOT NULL REFERENCES citizen_requests(id) ON DELETE CASCADE,
    from_status TEXT NOT NULL, to_status TEXT NOT NULL,
    created_at TEXT NOT NULL, read_at TEXT
  );
  CREATE TABLE IF NOT EXISTS citizen_request_supports (
    request_id TEXT NOT NULL REFERENCES citizen_requests(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY(request_id,user_id)
  );
  CREATE TABLE IF NOT EXISTS transit_schedules (
    id TEXT PRIMARY KEY, line_code TEXT NOT NULL, line_name TEXT NOT NULL, line_name_en TEXT NOT NULL,
    origin TEXT NOT NULL, origin_en TEXT NOT NULL, destination TEXT NOT NULL, destination_en TEXT NOT NULL,
    start_time TEXT NOT NULL, end_time TEXT NOT NULL, frequency_minutes INTEGER NOT NULL,
    accessibility TEXT NOT NULL, accessibility_en TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'demo', updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS citizen_requests_owner ON citizen_requests(owner_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS announcements_active ON announcements(active, created_at DESC);
  CREATE INDEX IF NOT EXISTS appointments_agent_slot ON appointments(agent_id, scheduled_at, status);
  CREATE INDEX IF NOT EXISTS audit_events_recent ON audit_events(id DESC);
  CREATE INDEX IF NOT EXISTS audit_events_action ON audit_events(action, id DESC);
  CREATE INDEX IF NOT EXISTS privacy_requests_owner ON privacy_requests(owner_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS privacy_requests_status ON privacy_requests(status, created_at DESC);
  CREATE INDEX IF NOT EXISTS citizen_notifications_user ON citizen_notifications(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS citizen_request_supports_user ON citizen_request_supports(user_id, created_at DESC);
`);

const userColumns = new Set(db.prepare('PRAGMA table_info(users)').all().map((column) => column.name));
if (!userColumns.has('sector')) db.exec("ALTER TABLE users ADD COLUMN sector TEXT NOT NULL DEFAULT ''");
if (!userColumns.has('enabled')) db.exec('ALTER TABLE users ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1');
if (!userColumns.has('avatar_data')) db.exec("ALTER TABLE users ADD COLUMN avatar_data TEXT NOT NULL DEFAULT ''");

const scheduleDefaults = [
  ['line-a', 'A', 'Ligne bleue', 'Blue line', 'District Boréal', 'Boreal District', 'Centre civique', 'Civic Centre', '06:00', '22:00', 12, 'Navette accessible · arrêt principal : place des Étoiles', 'Accessible shuttle · main stop: Place des Étoiles'],
  ['line-b', 'B', 'Ligne verte', 'Green line', 'Serres du Sud', 'Southern Greenhouses', 'Centre civique', 'Civic Centre', '06:00', '20:00', 20, 'Arrêt des serres · correspondance avec la ligne A', 'Greenhouse stop · connects with line A'],
  ['line-c', 'C', 'Ligne dorée', 'Gold line', 'Centre de santé', 'Health Centre', 'District Boréal', 'Boreal District', '06:00', '23:00', 15, 'Ligne à plancher bas · dessert le pôle médical', 'Low-floor service · serves the medical hub'],
];
const insertSchedule = db.prepare(`INSERT OR IGNORE INTO transit_schedules
  (id,line_code,line_name,line_name_en,origin,origin_en,destination,destination_en,start_time,end_time,frequency_minutes,accessibility,accessibility_en,source,updated_at)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,'demo',?)`);
const seedSchedules = db.transaction(() => scheduleDefaults.forEach((row) => insertSchedule.run(...row, new Date().toISOString())));
seedSchedules();
