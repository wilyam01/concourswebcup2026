import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { allowRoles, authenticate, issueToken, newId, optionalAuth, publicUser } from './auth.js';
import { getRequests, startPolling, syncRequests } from './terraNova.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
const app = express();
const id = (prefix) => `${prefix}-${newId().slice(0, 8).toUpperCase()}`;
const services = new Set(['water', 'health', 'energy', 'mobility', 'civic', 'solidarity', 'other']);
const kinds = new Set(['general', 'news', 'flood', 'health', 'service_status']);
const states = new Set(['operational', 'maintenance', 'unavailable']);
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const isoNow = () => new Date().toISOString();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:5500').split(',').map((value) => value.trim()) }));
app.use(express.json({ limit: '512kb' }));
app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/citizen-messages', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/auth/signup', asyncRoute(async (req, res) => {
  const email = clean(req.body?.email, 254).toLowerCase();
  const password = req.body?.password;
  const name = clean(req.body?.displayName ?? req.body?.name, 80);
  const sector = clean(req.body?.sector, 120);
  if (!/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72 || name.length < 2 || !sector) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'Un nom, un secteur, une adresse e-mail valide et un mot de passe de 12 à 72 caractères sont requis.' });
  }
  const user = { id: newId(), email, display_name: name, sector, password_hash: await bcrypt.hash(password, 12), role: 'CITOYEN', enabled: 1, created_at: isoNow() };
  try { db.prepare('INSERT INTO users(id,email,display_name,sector,password_hash,role) VALUES(@id,@email,@display_name,@sector,@password_hash,@role)').run(user); }
  catch (error) { if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'EMAIL_IN_USE' }); throw error; }
  res.status(201).json({ user: publicUser(user), token: issueToken(user) });
}));

app.post('/api/auth/signin', asyncRoute(async (req, res) => {
  const email = clean(req.body?.email, 254).toLowerCase();
  const password = req.body?.password;
  const attempt = db.prepare('SELECT attempts,locked_until FROM login_failures WHERE email=?').get(email);
  if (attempt?.locked_until > Date.now()) return res.status(429).json({ error: 'TOO_MANY_ATTEMPTS' });
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user || typeof password !== 'string' || !(await bcrypt.compare(password, user.password_hash)) || !user.enabled) {
    const count = attempt?.locked_until ? 1 : (attempt?.attempts || 0) + 1;
    const lockedUntil = count >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
    db.prepare(`INSERT INTO login_failures(email,attempts,locked_until) VALUES(?,?,?)
      ON CONFLICT(email) DO UPDATE SET attempts=excluded.attempts,locked_until=excluded.locked_until`).run(email, count, lockedUntil);
    if (lockedUntil) return res.status(429).json({ error: 'TOO_MANY_ATTEMPTS' });
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }
  db.prepare('DELETE FROM login_failures WHERE email=?').run(email);
  res.json({ user: publicUser(user), token: issueToken(user) });
}));

app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));
app.get('/api/auth/me/avatar', authenticate, (req, res) => {
  const row = db.prepare('SELECT avatar_data FROM users WHERE id=?').get(req.user.id);
  res.json({ dataUrl: row?.avatar_data || '' });
});
app.patch('/api/auth/me/avatar', authenticate, (req, res) => {
  const dataUrl = req.body?.dataUrl;
  if (typeof dataUrl !== 'string' || (dataUrl && (!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(dataUrl) || dataUrl.length > 400000))) {
    return res.status(400).json({ error: 'INVALID_AVATAR' });
  }
  db.prepare('UPDATE users SET avatar_data=? WHERE id=?').run(dataUrl, req.user.id);
  res.json({ ok: true });
});
app.patch('/api/auth/me', authenticate, (req, res) => {
  const name = clean(req.body?.name, 80);
  const sector = clean(req.body?.sector, 120);
  if (name.length < 2 || !sector) return res.status(400).json({ error: 'INVALID_INPUT' });
  db.prepare('UPDATE users SET display_name=?,sector=? WHERE id=?').run(name, sector, req.user.id);
  const user = db.prepare('SELECT id,email,display_name,sector,role,enabled,created_at FROM users WHERE id=?').get(req.user.id);
  res.json({ user: publicUser(user) });
});
app.delete('/api/auth/me', authenticate, allowRoles('CITOYEN'), asyncRoute(async (req, res) => {
  const user = db.prepare('SELECT password_hash FROM users WHERE id=?').get(req.user.id);
  if (typeof req.body?.password !== 'string' || !(await bcrypt.compare(req.body.password, user.password_hash))) return res.status(401).json({ error: 'INVALID_PASSWORD' });
  db.transaction(() => {
    db.prepare('DELETE FROM messages WHERE lower(email)=lower(?)').run(req.user.email);
    db.prepare('DELETE FROM users WHERE id=?').run(req.user.id);
  })();
  res.status(204).end();
}));

app.get('/api/requests', authenticate, (_req, res) => res.json(getRequests()));
app.post('/api/requests/sync', authenticate, allowRoles('AGENT', 'ADMIN'), asyncRoute(async (_req, res) => {
  try { res.json({ synced: await syncRequests(), ...getRequests().sync }); }
  catch (error) { res.status(503).json({ error: 'TERRA_NOVA_UNAVAILABLE', message: error.message, ...getRequests().sync }); }
}));

function citizenRequest(row) {
  return { id: row.id, ownerEmail: row.owner_email, ownerName: row.owner_name, title: row.title, district: row.district,
    type: row.type, service: row.service, priority: row.priority, status: row.status,
    description: row.description, createdAt: row.created_at, updatedAt: row.updated_at, source: 'citizen-local' };
}
const requestColumns = `SELECT r.*,u.email AS owner_email,u.display_name AS owner_name
  FROM citizen_requests r JOIN users u ON u.id=r.owner_id`;
app.get('/api/citizen-requests', authenticate, (req, res) => {
  const rows = ['AGENT', 'ADMIN'].includes(req.user.role)
    ? db.prepare(`${requestColumns} ORDER BY r.created_at DESC`).all()
    : db.prepare(`${requestColumns} WHERE r.owner_id=? ORDER BY r.created_at DESC`).all(req.user.id);
  res.json({ requests: rows.map(citizenRequest) });
});
app.post('/api/citizen-requests', authenticate, allowRoles('CITOYEN'), (req, res) => {
  const body = req.body || {};
  const title = clean(body.title, 100), district = clean(body.district, 120), type = clean(body.type, 80), description = clean(body.description, 1000);
  const service = clean(body.service, 40), priority = ['high', 'normal', 'low'].includes(body.priority) ? body.priority : 'normal';
  if (!title || !district || !type || !description || !services.has(service)) return res.status(400).json({ error: 'INVALID_INPUT' });
  const timestamp = isoNow(), requestId = id('NT');
  db.prepare(`INSERT INTO citizen_requests(id,owner_id,title,district,type,service,priority,status,description,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,'todo',?,?,?)`).run(requestId, req.user.id, title, district, type, service, priority, description, timestamp, timestamp);
  const created = db.prepare(`${requestColumns} WHERE r.id=?`).get(requestId);
  res.status(201).json({ request: citizenRequest(created) });
});
app.patch('/api/citizen-requests/:id', authenticate, allowRoles('AGENT', 'ADMIN'), (req, res) => {
  const status = req.body?.status;
  if (!['todo', 'in_progress', 'done'].includes(status)) return res.status(400).json({ error: 'INVALID_STATUS' });
  const result = db.prepare('UPDATE citizen_requests SET status=?,updated_at=? WHERE id=?').run(status, isoNow(), req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'REQUEST_NOT_FOUND' });
  res.json({ request: citizenRequest(db.prepare(`${requestColumns} WHERE r.id=?`).get(req.params.id)) });
});

app.get('/api/citizen-messages', authenticate, allowRoles('AGENT', 'ADMIN'), (_req, res) => {
  res.json({ messages: db.prepare('SELECT id,name,email,category,subject,message,created_at AS createdAt,unread FROM messages ORDER BY created_at DESC LIMIT 300').all().map((item) => ({ ...item, unread: Boolean(item.unread) })) });
});
app.post('/api/citizen-messages', (req, res) => {
  const name = clean(req.body?.name, 80), email = clean(req.body?.email, 254).toLowerCase();
  const category = clean(req.body?.category, 60), subject = clean(req.body?.subject, 160), message = clean(req.body?.message, 4000);
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || !category || !subject || !message) return res.status(400).json({ error: 'INVALID_INPUT' });
  const messageId = id('MSG');
  db.prepare('INSERT INTO messages(id,name,email,category,subject,message,created_at) VALUES(?,?,?,?,?,?,?)').run(messageId, name, email, category, subject, message, isoNow());
  res.status(201).json({ id: messageId, name, email, category, subject, message, createdAt: isoNow(), unread: true });
});

function announcement(row) {
  return { id: row.id, kind: row.kind, title: row.title, body: row.body, targetSector: row.target_sector,
    service: row.service, serviceStatus: row.service_status, authorEmail: row.author_email || '',
    createdAt: row.created_at, expiresAt: row.expires_at || '', active: Boolean(row.active), read: Boolean(row.read) };
}
app.get('/api/announcements', optionalAuth, (req, res) => {
  const staff = req.user && ['AGENT', 'ADMIN'].includes(req.user.role) && req.query.includeTargeted === 'true';
  const rows = db.prepare(`SELECT a.*,u.email AS author_email,
      CASE WHEN ar.user_id IS NULL THEN 0 ELSE 1 END AS read
    FROM announcements a LEFT JOIN users u ON u.id=a.author_id
    LEFT JOIN announcement_reads ar ON ar.announcement_id=a.id AND ar.user_id=?
    WHERE a.active=1 AND (a.expires_at IS NULL OR a.expires_at>?)
    AND (a.target_sector='' OR a.target_sector=? OR ?=1)
    ORDER BY a.created_at DESC LIMIT 300`).all(req.user?.id || '', isoNow(), req.user?.sector || '', staff ? 1 : 0);
  res.json({ announcements: rows.map(announcement) });
});
app.post('/api/announcements', authenticate, allowRoles('AGENT', 'ADMIN'), (req, res) => {
  const { kind } = req.body || {};
  const title = clean(req.body?.title, 120), body = clean(req.body?.body, 1200);
  const targetSector = clean(req.body?.targetSector, 120), service = clean(req.body?.service, 40);
  const serviceStatus = clean(req.body?.serviceStatus, 30), expiresAt = req.body?.expiresAt ? new Date(req.body.expiresAt) : null;
  if (!kinds.has(kind) || !title || !body) return res.status(400).json({ error: 'INVALID_TEXT' });
  if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date())) return res.status(400).json({ error: 'INVALID_EXPIRY' });
  if (kind === 'service_status' && (!services.has(service) || !states.has(serviceStatus))) return res.status(400).json({ error: 'INVALID_SERVICE_STATUS' });
  const announcementId = id('INFO'), createdAt = isoNow();
  const publish = db.transaction(() => {
    if (kind === 'service_status') db.prepare("UPDATE announcements SET active=0 WHERE kind='service_status' AND service=?").run(service);
    db.prepare(`INSERT INTO announcements(id,kind,title,body,target_sector,service,service_status,author_id,created_at,expires_at)
      VALUES(?,?,?,?,?,?,?,?,?,?)`).run(announcementId, kind, title, body, kind === 'service_status' ? '' : targetSector, kind === 'service_status' ? service : '', kind === 'service_status' ? serviceStatus : '', req.user.id, createdAt, expiresAt?.toISOString() || null);
  });
  publish();
  res.status(201).json({ announcement: { id: announcementId, kind, title, body, targetSector: kind === 'service_status' ? '' : targetSector, service: kind === 'service_status' ? service : '', serviceStatus: kind === 'service_status' ? serviceStatus : '', createdAt, expiresAt: expiresAt?.toISOString() || '', active: true } });
});
app.patch('/api/announcements/:id/close', authenticate, allowRoles('AGENT', 'ADMIN'), (req, res) => {
  const result = db.prepare('UPDATE announcements SET active=0 WHERE id=? AND active=1').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'ANNOUNCEMENT_NOT_FOUND' });
  res.status(204).end();
});
app.post('/api/announcements/read', authenticate, (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((value) => typeof value === 'string').slice(0, 300) : [];
  const insert = db.prepare('INSERT INTO announcement_reads(announcement_id,user_id,read_at) VALUES(?,?,?) ON CONFLICT(announcement_id,user_id) DO UPDATE SET read_at=excluded.read_at');
  db.transaction(() => ids.forEach((announcementId) => insert.run(announcementId, req.user.id, isoNow())))();
  res.status(204).end();
});
app.get('/api/service-statuses', optionalAuth, (req, res) => {
  const sector = req.user?.sector || '';
  const rows = db.prepare(`SELECT * FROM announcements WHERE active=1 AND kind='service_status'
    AND (expires_at IS NULL OR expires_at>?) ORDER BY created_at DESC`).all(isoNow());
  const statuses = {};
  rows.forEach((row) => { if (row.service && !statuses[row.service]) statuses[row.service] = announcement(row); });
  res.json({ statuses, sector });
});

app.get('/api/appointments/agents', authenticate, (req, res) => {
  const agents = db.prepare("SELECT id,email,display_name AS name,sector FROM users WHERE role='AGENT' AND enabled=1 ORDER BY display_name").all();
  res.json({ agents });
});
function appointment(row) {
  return { id: row.id, ownerEmail: row.owner_email, ownerName: row.owner_name, sector: row.sector,
    service: row.service, agentEmail: row.agent_email || '', agentName: row.agent_name, purpose: row.purpose,
    scheduledAt: row.scheduled_at, createdAt: row.created_at, reminderSentAt: row.reminder_sent_at || '',
    updatedAt: row.updated_at, status: row.status };
}
const appointmentColumns = `SELECT a.*,o.email AS owner_email,o.display_name AS owner_name,
  ag.email AS agent_email FROM appointments a JOIN users o ON o.id=a.owner_id LEFT JOIN users ag ON ag.id=a.agent_id`;
app.get('/api/appointments', authenticate, (req, res) => {
  const rows = req.user.role === 'ADMIN'
    ? db.prepare(`${appointmentColumns} ORDER BY a.scheduled_at`).all()
    : req.user.role === 'AGENT'
      ? db.prepare(`${appointmentColumns} WHERE a.agent_id=? ORDER BY a.scheduled_at`).all(req.user.id)
      : db.prepare(`${appointmentColumns} WHERE a.owner_id=? ORDER BY a.scheduled_at`).all(req.user.id);
  res.json({ appointments: rows.map(appointment) });
});
app.post('/api/appointments', authenticate, allowRoles('CITOYEN'), (req, res) => {
  const service = clean(req.body?.service, 40), purpose = clean(req.body?.purpose, 500);
  const scheduled = new Date(req.body?.scheduledAt);
  const requestedAgent = clean(req.body?.agentEmail, 254).toLowerCase();
  const localDate = /^\d{4}-\d{2}-\d{2}$/.test(req.body?.localDate || '') ? req.body.localDate : '';
  const localTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(req.body?.localTime || '') ? req.body.localTime : '';
  if (!services.has(service) || purpose.length < 2 || Number.isNaN(scheduled.getTime()) || scheduled.getTime() < Date.now() + 120000 || scheduled.getTime() > Date.now() + 365 * 86400000) return res.status(400).json({ error: 'INVALID_SLOT' });
  const timezoneOffset = Number(req.body?.timezoneOffset);
  if (!localDate || !localTime || !Number.isFinite(timezoneOffset) || Math.abs(timezoneOffset) > 840) return res.status(400).json({ error: 'INVALID_SLOT' });
  const localDateUtc = new Date(`${localDate}T12:00:00Z`);
  if (localDateUtc.toISOString().slice(0, 10) !== localDate) return res.status(400).json({ error: 'INVALID_SLOT' });
  const day = localDateUtc.getUTCDay();
  const hour = Number(localTime.slice(0, 2)), minute = Number(localTime.slice(3));
  const expectedUtc = Date.parse(`${localDate}T${localTime}:00Z`) + timezoneOffset * 60000;
  if (Math.abs(expectedUtc - scheduled.getTime()) > 60000) return res.status(400).json({ error: 'INVALID_SLOT' });
  if (day === 0 || day === 6 || hour < 8 || hour >= 17 || (hour === 16 && minute > 30) || (minute !== 0 && minute !== 30)) return res.status(400).json({ error: 'OUTSIDE_HOURS' });
  const requestedId = requestedAgent ? db.prepare("SELECT id,email,display_name,sector FROM users WHERE lower(email)=? AND role='AGENT' AND enabled=1").get(requestedAgent) : null;
  if (requestedAgent && !requestedId) return res.status(409).json({ error: 'AGENT_UNAVAILABLE' });
  const agents = db.prepare("SELECT id,email,display_name,sector FROM users WHERE role='AGENT' AND enabled=1 ORDER BY display_name").all();
  const candidateAgents = requestedId ? [requestedId] : agents;
  let chosen = null;
  for (const agent of candidateAgents) {
    const collision = db.prepare(`SELECT 1 FROM appointments WHERE agent_id=? AND status='booked'
      AND abs(julianday(scheduled_at)-julianday(?))*1440 < 30`).get(agent.id, scheduled.toISOString());
    if (!collision) { chosen = agent; break; }
  }
  if (!chosen) return res.status(409).json({ error: agents.length ? 'SLOT_UNAVAILABLE' : 'AGENT_UNAVAILABLE' });
  const appointmentId = id('RDV'), timestamp = isoNow();
  const create = db.transaction(() => {
    const collision = db.prepare(`SELECT 1 FROM appointments WHERE agent_id=? AND status='booked'
      AND abs(julianday(scheduled_at)-julianday(?))*1440 < 30`).get(chosen.id, scheduled.toISOString());
    if (collision) throw new Error('SLOT_UNAVAILABLE');
    db.prepare(`INSERT INTO appointments(id,owner_id,agent_id,agent_name,sector,service,purpose,scheduled_at,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?)`).run(appointmentId, req.user.id, chosen.id, chosen.display_name, req.user.sector, service, purpose, scheduled.toISOString(), timestamp, timestamp);
  });
  try { create(); } catch (error) { if (error.message === 'SLOT_UNAVAILABLE') return res.status(409).json({ error: error.message }); throw error; }
  res.status(201).json({ appointment: appointment(db.prepare(`${appointmentColumns} WHERE a.id=?`).get(appointmentId)) });
});
app.patch('/api/appointments/:id', authenticate, (req, res) => {
  const nextStatus = req.body?.status;
  if (!['cancelled', 'completed'].includes(nextStatus)) return res.status(400).json({ error: 'INVALID_STATUS' });
  const current = db.prepare(`${appointmentColumns} WHERE a.id=?`).get(req.params.id);
  if (!current) return res.status(404).json({ error: 'APPOINTMENT_NOT_FOUND' });
  const staff = ['AGENT', 'ADMIN'].includes(req.user.role);
  if (req.user.role === 'AGENT' && current.agent_id !== req.user.id) return res.status(403).json({ error: 'FORBIDDEN' });
  if (!staff && (current.owner_id !== req.user.id || nextStatus !== 'cancelled' || current.status !== 'booked')) return res.status(403).json({ error: 'FORBIDDEN' });
  db.prepare('UPDATE appointments SET status=?,updated_at=? WHERE id=?').run(nextStatus, isoNow(), req.params.id);
  res.json({ appointment: appointment(db.prepare(`${appointmentColumns} WHERE a.id=?`).get(req.params.id)) });
});
app.post('/api/appointments/:id/reminder', authenticate, allowRoles('CITOYEN'), (req, res) => {
  const result = db.prepare("UPDATE appointments SET reminder_sent_at=?,updated_at=? WHERE id=? AND owner_id=? AND status='booked'").run(isoNow(), isoNow(), req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: 'APPOINTMENT_NOT_FOUND' });
  res.status(204).end();
});

app.get('/api/accounts', authenticate, allowRoles('AGENT', 'ADMIN'), (req, res) => {
  const rows = req.user.role === 'ADMIN'
    ? db.prepare('SELECT id,email,display_name AS name,sector,role,enabled,created_at AS createdAt FROM users ORDER BY created_at DESC').all()
    : db.prepare("SELECT id,email,display_name AS name,sector,role,enabled,created_at AS createdAt FROM users WHERE role='CITOYEN' ORDER BY created_at DESC").all();
  res.json({ accounts: rows.map((user) => ({ ...user, profile: ({ CITOYEN: 'citizen', AGENT: 'agent', ADMIN: 'admin' })[user.role], enabled: Boolean(user.enabled) })) });
});
app.patch('/api/accounts/:id/access', authenticate, allowRoles('AGENT', 'ADMIN'), (req, res) => {
  if (typeof req.body?.enabled !== 'boolean') return res.status(400).json({ error: 'INVALID_INPUT' });
  if (req.params.id === req.user.id) return res.status(409).json({ error: 'CANNOT_CHANGE_SELF' });
  const target = db.prepare('SELECT id,role FROM users WHERE id=? OR lower(email)=lower(?)').get(req.params.id, req.params.id);
  if (!target) return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND' });
  if (req.user.role !== 'ADMIN' && target.role !== 'CITOYEN') return res.status(403).json({ error: 'FORBIDDEN' });
  const updateAccess = db.transaction(() => {
    db.prepare('UPDATE users SET enabled=? WHERE id=?').run(req.body.enabled ? 1 : 0, target.id);
    if (!req.body.enabled && target.role === 'AGENT') {
      db.prepare("UPDATE appointments SET status='cancelled',updated_at=? WHERE agent_id=? AND status='booked'").run(isoNow(), target.id);
    }
  });
  updateAccess();
  res.json({ id: target.id, enabled: req.body.enabled });
});
app.patch('/api/accounts/:id/role', authenticate, allowRoles('ADMIN'), (req, res) => {
  const role = ({ citizen: 'CITOYEN', agent: 'AGENT', admin: 'ADMIN' })[req.body?.profile];
  if (!role) return res.status(400).json({ error: 'INVALID_ROLE' });
  if (req.params.id === req.user.id) return res.status(409).json({ error: 'CANNOT_CHANGE_SELF' });
  const target = db.prepare('SELECT id FROM users WHERE id=? OR lower(email)=lower(?)').get(req.params.id, req.params.id);
  if (!target) return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND' });
  db.prepare('UPDATE users SET role=? WHERE id=?').run(role, target.id);
  res.json({ id: target.id, profile: req.body.profile });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
});
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => { console.log(`Nova Terra API listening on http://localhost:${port}`); startPolling(); });
