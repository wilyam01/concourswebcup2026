import 'dotenv/config';
import express from 'express';
import { randomUUID } from 'node:crypto';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { allowRoles, authenticate, issueToken, newId, optionalAuth, publicUser } from './auth.js';
import { getRequests, startPolling, syncRequests } from './terraNova.js';
import { recordAudit } from './audit.js';
import { logEvent } from './logger.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
const app = express();
const id = (prefix) => `${prefix}-${newId().slice(0, 8).toUpperCase()}`;
const services = new Set(['water', 'health', 'energy', 'mobility', 'civic', 'solidarity', 'other']);
const kinds = new Set(['general', 'news', 'flood', 'health', 'service_status']);
const states = new Set(['operational', 'maintenance', 'unavailable']);
const privacyRequestTypes = new Set(['access', 'copy', 'rectification', 'restriction', 'opposition']);
const privacyRequestStates = new Set(['received', 'in_review', 'completed', 'declined']);
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const isoNow = () => new Date().toISOString();
const requestSupportLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false });

app.disable('x-powered-by');
app.use(helmet());
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => logEvent('info', 'http.request.completed', {
    requestId: req.requestId, method: req.method, path: req.path, status: res.statusCode,
    durationMs: Math.round(Number(process.hrtime.bigint() - startedAt) / 1e6),
  }));
  next();
});
app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:5500').split(',').map((value) => value.trim()) }));
app.use(express.json({ limit: '512kb' }));
app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/citizen-messages', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }));
const privacySubmissionLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false });

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
  recordAudit(req, { actor: { id: user.id, email: user.email, role: user.role }, action: 'account.signup', entityType: 'account', entityId: user.id, summary: 'Citizen account created', metadata: { role: user.role } });
  res.status(201).json({ user: publicUser(user), token: issueToken(user) });
}));

app.post('/api/auth/signin', asyncRoute(async (req, res) => {
  const email = clean(req.body?.email, 254).toLowerCase();
  const password = req.body?.password;
  const attempt = db.prepare('SELECT attempts,locked_until FROM login_failures WHERE email=?').get(email);
  if (attempt?.locked_until > Date.now()) {
    logEvent('warn', 'auth.signin.blocked', { requestId: req.requestId, reason: 'active_lockout' });
    return res.status(429).json({ error: 'TOO_MANY_ATTEMPTS' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user || typeof password !== 'string' || !(await bcrypt.compare(password, user.password_hash)) || !user.enabled) {
    const count = attempt?.locked_until ? 1 : (attempt?.attempts || 0) + 1;
    const lockedUntil = count >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
    db.prepare(`INSERT INTO login_failures(email,attempts,locked_until) VALUES(?,?,?)
      ON CONFLICT(email) DO UPDATE SET attempts=excluded.attempts,locked_until=excluded.locked_until`).run(email, count, lockedUntil);
    logEvent(lockedUntil ? 'warn' : 'info', lockedUntil ? 'auth.signin.lockout_started' : 'auth.signin.failed', { requestId: req.requestId, failedAttempts: count });
    if (lockedUntil) {
      const maskedEmail = email.includes('@') ? `${email.slice(0, 1)}***@${email.split('@').at(-1)}` : 'unknown';
      recordAudit(req, { actorEmail: maskedEmail, actorRole: 'ANONYMOUS', action: 'auth.signin.lockout_started', entityType: 'login_lockout', summary: 'Suspicious sign-in attempts triggered a temporary lockout', metadata: { failedAttempts: count, durationMinutes: 15 } });
      return res.status(429).json({ error: 'TOO_MANY_ATTEMPTS' });
    }
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }
  db.prepare('DELETE FROM login_failures WHERE email=?').run(email);
  recordAudit(req, { actor: user, action: 'auth.signin.succeeded', entityType: 'account', entityId: user.id, summary: 'Account signed in', metadata: { role: user.role } });
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
  const previous = db.prepare('SELECT avatar_data FROM users WHERE id=?').get(req.user.id)?.avatar_data || '';
  db.prepare('UPDATE users SET avatar_data=? WHERE id=?').run(dataUrl, req.user.id);
  if (previous !== dataUrl) recordAudit(req, { action: 'account.avatar_changed', entityType: 'account', entityId: req.user.id, summary: 'Profile photo changed', metadata: { field: 'avatar' } });
  res.json({ ok: true });
});
app.patch('/api/auth/me', authenticate, (req, res) => {
  const name = clean(req.body?.name, 80);
  const sector = clean(req.body?.sector, 120);
  if (name.length < 2 || !sector) return res.status(400).json({ error: 'INVALID_INPUT' });
  const changedFields = [];
  if (name !== req.user.display_name) changedFields.push('display_name');
  if (sector !== req.user.sector) changedFields.push('sector');
  db.prepare('UPDATE users SET display_name=?,sector=? WHERE id=?').run(name, sector, req.user.id);
  if (changedFields.length) recordAudit(req, { action: 'account.profile_updated', entityType: 'account', entityId: req.user.id, summary: 'Account profile updated', metadata: { changedFields } });
  const user = db.prepare('SELECT id,email,display_name,sector,role,enabled,created_at FROM users WHERE id=?').get(req.user.id);
  res.json({ user: publicUser(user) });
});
app.delete('/api/auth/me', authenticate, allowRoles('CITOYEN'), asyncRoute(async (req, res) => {
  const user = db.prepare('SELECT password_hash FROM users WHERE id=?').get(req.user.id);
  if (typeof req.body?.password !== 'string' || !(await bcrypt.compare(req.body.password, user.password_hash))) return res.status(401).json({ error: 'INVALID_PASSWORD' });
  db.transaction(() => {
    recordAudit(req, { action: 'account.self_deleted', entityType: 'account', entityId: req.user.id, summary: 'Citizen account deleted by its owner', metadata: { role: req.user.role } });
    db.prepare('DELETE FROM messages WHERE lower(email)=lower(?)').run(req.user.email);
    db.prepare('DELETE FROM users WHERE id=?').run(req.user.id);
  })();
  res.status(204).end();
}));

app.get('/api/requests', authenticate, (_req, res) => res.json(getRequests()));
app.post('/api/requests/sync', authenticate, allowRoles('AGENT', 'ADMIN'), asyncRoute(async (req, res) => {
  try {
    const synced = await syncRequests();
    recordAudit(req, { action: 'official_requests.sync_completed', entityType: 'request_feed', entityId: 'webcup', summary: 'Official request feed synchronized', metadata: { records: synced } });
    res.json({ synced, ...getRequests().sync });
  }
  catch (error) {
    logEvent('warn', 'terra_nova.sync.failed', { requestId: req.requestId, errorType: error?.name || 'Error' });
    res.status(503).json({ error: 'TERRA_NOVA_UNAVAILABLE', message: 'The official request feed is unavailable.', ...getRequests().sync });
  }
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
app.get('/api/citizen-requests/community', authenticate, allowRoles('CITOYEN'), (req, res) => {
  const rows = db.prepare(`SELECT r.id,r.title,r.district,r.type,r.service,r.priority,r.status,r.created_at,
      (SELECT COUNT(*) FROM citizen_request_supports s WHERE s.request_id=r.id) AS support_count,
      EXISTS(SELECT 1 FROM citizen_request_supports s WHERE s.request_id=r.id AND s.user_id=?) AS supported_by_me,
      CASE WHEN r.owner_id=? THEN 1 ELSE 0 END AS is_mine
    FROM citizen_requests r WHERE r.status IN ('todo','in_progress')
    ORDER BY support_count DESC,r.created_at DESC LIMIT 100`).all(req.user.id, req.user.id);
  res.json({ requests: rows.map((row) => ({
    id: row.id, title: row.title, district: row.district, type: row.type, service: row.service,
    priority: row.priority, status: row.status, createdAt: row.created_at,
    supportCount: row.support_count, supportedByMe: Boolean(row.supported_by_me), isMine: Boolean(row.is_mine),
  })) });
});
app.put('/api/citizen-requests/:id/support', authenticate, allowRoles('CITOYEN'), requestSupportLimit, (req, res) => {
  const target = db.prepare('SELECT owner_id,status FROM citizen_requests WHERE id=?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'REQUEST_NOT_FOUND' });
  if (target.owner_id === req.user.id) return res.status(409).json({ error: 'CANNOT_SUPPORT_OWN_REQUEST' });
  if (target.status === 'done') return res.status(409).json({ error: 'REQUEST_CLOSED' });
  const timestamp = isoNow();
  const support = db.transaction(() => {
    const result = db.prepare('INSERT OR IGNORE INTO citizen_request_supports(request_id,user_id,created_at) VALUES(?,?,?)').run(req.params.id, req.user.id, timestamp);
    if (result.changes) recordAudit(req, { action: 'citizen_request.supported', entityType: 'citizen_request', entityId: req.params.id, summary: 'Citizen supported a community request' });
    return db.prepare('SELECT COUNT(*) AS count FROM citizen_request_supports WHERE request_id=?').get(req.params.id).count;
  });
  res.json({ requestId: req.params.id, supported: true, supportCount: support() });
});
app.delete('/api/citizen-requests/:id/support', authenticate, allowRoles('CITOYEN'), requestSupportLimit, (req, res) => {
  const target = db.prepare('SELECT id,owner_id FROM citizen_requests WHERE id=?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'REQUEST_NOT_FOUND' });
  if (target.owner_id === req.user.id) return res.status(409).json({ error: 'CANNOT_SUPPORT_OWN_REQUEST' });
  const withdraw = db.transaction(() => {
    const result = db.prepare('DELETE FROM citizen_request_supports WHERE request_id=? AND user_id=?').run(req.params.id, req.user.id);
    if (result.changes) recordAudit(req, { action: 'citizen_request.support_withdrawn', entityType: 'citizen_request', entityId: req.params.id, summary: 'Citizen withdrew community request support' });
    return db.prepare('SELECT COUNT(*) AS count FROM citizen_request_supports WHERE request_id=?').get(req.params.id).count;
  });
  res.json({ requestId: req.params.id, supported: false, supportCount: withdraw() });
});
app.post('/api/citizen-requests', authenticate, allowRoles('CITOYEN'), (req, res) => {
  const body = req.body || {};
  const title = clean(body.title, 100), district = clean(body.district, 120), type = clean(body.type, 80), description = clean(body.description, 1000);
  const service = clean(body.service, 40), priority = ['high', 'normal', 'low'].includes(body.priority) ? body.priority : 'normal';
  if (!title || !district || !type || !description || !services.has(service)) return res.status(400).json({ error: 'INVALID_INPUT' });
  const timestamp = isoNow(), requestId = id('NT');
  db.prepare(`INSERT INTO citizen_requests(id,owner_id,title,district,type,service,priority,status,description,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,'todo',?,?,?)`).run(requestId, req.user.id, title, district, type, service, priority, description, timestamp, timestamp);
  recordAudit(req, { action: 'citizen_request.created', entityType: 'citizen_request', entityId: requestId, summary: 'Citizen report submitted', metadata: { service, priority, status: 'todo' } });
  const created = db.prepare(`${requestColumns} WHERE r.id=?`).get(requestId);
  res.status(201).json({ request: citizenRequest(created) });
});
app.patch('/api/citizen-requests/:id', authenticate, allowRoles('AGENT', 'ADMIN'), (req, res) => {
  const status = req.body?.status;
  if (!['todo', 'in_progress', 'done'].includes(status)) return res.status(400).json({ error: 'INVALID_STATUS' });
  const current = db.prepare('SELECT status FROM citizen_requests WHERE id=?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'REQUEST_NOT_FOUND' });
  db.transaction(() => {
    db.prepare('UPDATE citizen_requests SET status=?,updated_at=? WHERE id=?').run(status, isoNow(), req.params.id);
    if (current.status !== status) {
      const owner = db.prepare('SELECT owner_id FROM citizen_requests WHERE id=?').get(req.params.id);
      db.prepare(`INSERT INTO citizen_notifications(id,user_id,request_id,from_status,to_status,created_at)
        VALUES(?,?,?,?,?,?)`).run(id('NTF'), owner.owner_id, req.params.id, current.status, status, isoNow());
      recordAudit(req, { action: 'citizen_request.status_changed', entityType: 'citizen_request', entityId: req.params.id, summary: 'Citizen report status changed', metadata: { from: current.status, to: status } });
    }
  })();
  res.json({ request: citizenRequest(db.prepare(`${requestColumns} WHERE r.id=?`).get(req.params.id)) });
});
app.get('/api/notifications', authenticate, allowRoles('CITOYEN'), (req, res) => {
  const notifications = db.prepare(`SELECT n.id,n.request_id AS requestId,n.from_status AS fromStatus,
      n.to_status AS toStatus,n.created_at AS createdAt,n.read_at AS readAt
    FROM citizen_notifications n WHERE n.user_id=? ORDER BY n.created_at DESC LIMIT 100`).all(req.user.id);
  res.json({ notifications: notifications.map((item) => ({ ...item, read: Boolean(item.readAt) })) });
});
app.post('/api/notifications/read', authenticate, allowRoles('CITOYEN'), (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? [...new Set(req.body.ids.filter((value) => typeof value === 'string').slice(0, 100))] : [];
  const markRead = db.prepare('UPDATE citizen_notifications SET read_at=? WHERE id=? AND user_id=? AND read_at IS NULL');
  const timestamp = isoNow();
  db.transaction(() => ids.forEach((notificationId) => markRead.run(timestamp, notificationId, req.user.id)))();
  res.status(204).end();
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
  recordAudit(req, { actorEmail: email, actorRole: 'ANONYMOUS', action: 'contact_message.received', entityType: 'contact_message', entityId: messageId, summary: 'Citizen contact message received', metadata: { category } });
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
    if (kind === 'service_status') {
      const previous = db.prepare("SELECT service_status FROM announcements WHERE kind='service_status' AND service=? AND active=1 ORDER BY created_at DESC LIMIT 1").get(service);
      db.prepare("UPDATE announcements SET active=0 WHERE kind='service_status' AND service=?").run(service);
      recordAudit(req, { action: 'service.status_changed', entityType: 'service', entityId: service, summary: 'Municipal service status changed', metadata: { from: previous?.service_status || 'unknown', to: serviceStatus } });
    } else {
      recordAudit(req, { action: 'announcement.published', entityType: 'announcement', entityId: announcementId, summary: 'City information published', metadata: { kind, targetSector: targetSector || 'all' } });
    }
    db.prepare(`INSERT INTO announcements(id,kind,title,body,target_sector,service,service_status,author_id,created_at,expires_at)
      VALUES(?,?,?,?,?,?,?,?,?,?)`).run(announcementId, kind, title, body, kind === 'service_status' ? '' : targetSector, kind === 'service_status' ? service : '', kind === 'service_status' ? serviceStatus : '', req.user.id, createdAt, expiresAt?.toISOString() || null);
  });
  publish();
  res.status(201).json({ announcement: { id: announcementId, kind, title, body, targetSector: kind === 'service_status' ? '' : targetSector, service: kind === 'service_status' ? service : '', serviceStatus: kind === 'service_status' ? serviceStatus : '', createdAt, expiresAt: expiresAt?.toISOString() || '', active: true } });
});
app.patch('/api/announcements/:id/close', authenticate, allowRoles('AGENT', 'ADMIN'), (req, res) => {
  const current = db.prepare('SELECT id,kind,service,service_status FROM announcements WHERE id=? AND active=1').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'ANNOUNCEMENT_NOT_FOUND' });
  db.transaction(() => {
    db.prepare('UPDATE announcements SET active=0 WHERE id=? AND active=1').run(req.params.id);
    recordAudit(req, { action: current.kind === 'service_status' ? 'service.status_closed' : 'announcement.closed', entityType: current.kind === 'service_status' ? 'service' : 'announcement', entityId: current.kind === 'service_status' ? current.service : current.id, summary: current.kind === 'service_status' ? 'Municipal service status cleared' : 'City information closed', metadata: { kind: current.kind, previousStatus: current.service_status } });
  })();
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

app.get('/api/service-popularity', (_req, res) => {
  const services = db.prepare(`SELECT service,COUNT(*) AS count FROM citizen_requests
    GROUP BY service ORDER BY count DESC,service ASC LIMIT 3`).all();
  res.json({ services });
});

app.get('/api/activity-summary', authenticate, allowRoles('ADMIN'), (_req, res) => {
  const users = db.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN role='CITOYEN' AND enabled=1 THEN 1 ELSE 0 END) AS citizens,
      SUM(CASE WHEN role='AGENT' AND enabled=1 THEN 1 ELSE 0 END) AS agents,
      SUM(CASE WHEN enabled=0 THEN 1 ELSE 0 END) AS suspended
    FROM users`).get();
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const requestSummary = db.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) AS resolved,
      SUM(CASE WHEN created_at>=? THEN 1 ELSE 0 END) AS submittedLast7Days
    FROM citizen_requests`).get(since);
  const summary = {
    users: Object.fromEntries(Object.entries(users).map(([key, value]) => [key, value || 0])),
    requests: Object.fromEntries(Object.entries(requestSummary).map(([key, value]) => [key, value || 0])),
    upcomingAppointments: db.prepare("SELECT COUNT(*) AS count FROM appointments WHERE status='booked' AND scheduled_at>=?").get(isoNow()).count,
    unreadMessages: db.prepare('SELECT COUNT(*) AS count FROM messages WHERE unread=1').get().count,
    pendingPrivacyRequests: db.prepare("SELECT COUNT(*) AS count FROM privacy_requests WHERE status IN ('received','in_review')").get().count,
    activeAnnouncements: db.prepare('SELECT COUNT(*) AS count FROM announcements WHERE active=1 AND (expires_at IS NULL OR expires_at>?)').get(isoNow()).count,
    actionsLast7Days: db.prepare('SELECT COUNT(*) AS count FROM audit_events WHERE occurred_at>=?').get(since).count,
    generatedAt: isoNow(),
  };
  res.json({ summary });
});

app.get('/api/transit/schedules', (_req, res) => {
  const routes = db.prepare(`SELECT id,line_code AS lineCode,line_name AS lineName,line_name_en AS lineNameEn,
    origin,origin_en AS originEn,destination,destination_en AS destinationEn,start_time AS startTime,
    end_time AS endTime,frequency_minutes AS frequencyMinutes,accessibility,accessibility_en AS accessibilityEn,
    source,updated_at AS updatedAt FROM transit_schedules ORDER BY line_code`).all();
  res.json({ routes, source: routes.length > 0 && routes.every((route) => route.source === 'official') ? 'official' : 'demo', updatedAt: routes.reduce((latest, route) => route.updatedAt > latest ? route.updatedAt : latest, '') });
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
    recordAudit(req, { action: 'appointment.booked', entityType: 'appointment', entityId: appointmentId, summary: 'Municipal appointment booked', metadata: { service, scheduledAt: scheduled.toISOString(), agentId: chosen.id } });
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
  db.transaction(() => {
    db.prepare('UPDATE appointments SET status=?,updated_at=? WHERE id=?').run(nextStatus, isoNow(), req.params.id);
    if (current.status !== nextStatus) recordAudit(req, { action: `appointment.${nextStatus}`, entityType: 'appointment', entityId: req.params.id, summary: nextStatus === 'cancelled' ? 'Municipal appointment cancelled' : 'Municipal appointment completed', metadata: { from: current.status, to: nextStatus } });
  })();
  res.json({ appointment: appointment(db.prepare(`${appointmentColumns} WHERE a.id=?`).get(req.params.id)) });
});
app.post('/api/appointments/:id/reminder', authenticate, allowRoles('CITOYEN'), (req, res) => {
  const reminderAt = isoNow();
  const result = db.prepare("UPDATE appointments SET reminder_sent_at=?,updated_at=? WHERE id=? AND owner_id=? AND status='booked'").run(reminderAt, reminderAt, req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: 'APPOINTMENT_NOT_FOUND' });
  recordAudit(req, { action: 'appointment.reminder_marked', entityType: 'appointment', entityId: req.params.id, summary: 'Appointment reminder recorded' });
  res.status(204).end();
});

function privacyRequest(row, includeRequester = false) {
  return {
    id: row.id, requestType: row.request_type, details: row.details, status: row.status,
    responseNote: row.response_note, createdAt: row.created_at, updatedAt: row.updated_at,
    ...(includeRequester ? { requesterName: row.requester_name || 'Compte supprimé', requesterEmail: row.requester_email || '' } : {}),
  };
}
const privacyRequestColumns = `SELECT p.*,u.display_name AS requester_name,u.email AS requester_email
  FROM privacy_requests p LEFT JOIN users u ON u.id=p.owner_id`;
app.get('/api/privacy-requests', authenticate, (req, res) => {
  if (!['CITOYEN', 'ADMIN'].includes(req.user.role)) return res.status(403).json({ error: 'FORBIDDEN' });
  const rows = req.user.role === 'ADMIN'
    ? db.prepare(`${privacyRequestColumns} ORDER BY p.created_at DESC LIMIT 200`).all()
    : db.prepare(`${privacyRequestColumns} WHERE p.owner_id=? ORDER BY p.created_at DESC LIMIT 50`).all(req.user.id);
  res.json({ requests: rows.map((row) => privacyRequest(row, req.user.role === 'ADMIN')) });
});
app.post('/api/privacy-requests', authenticate, allowRoles('CITOYEN'), privacySubmissionLimit, (req, res) => {
  const requestType = req.body?.requestType;
  const details = clean(req.body?.details, 1200);
  if (!privacyRequestTypes.has(requestType) || details.length < 8) return res.status(400).json({ error: 'INVALID_PRIVACY_REQUEST' });
  const requestId = id('PRV'), timestamp = isoNow();
  const create = db.transaction(() => {
    db.prepare(`INSERT INTO privacy_requests(id,owner_id,request_type,details,created_at,updated_at)
      VALUES(?,?,?,?,?,?)`).run(requestId, req.user.id, requestType, details, timestamp, timestamp);
    recordAudit(req, { action: 'privacy_request.created', entityType: 'privacy_request', entityId: requestId, summary: 'Citizen privacy request submitted', metadata: { requestType } });
  });
  create();
  const row = db.prepare(`${privacyRequestColumns} WHERE p.id=?`).get(requestId);
  res.status(201).json({ request: privacyRequest(row) });
});
app.patch('/api/privacy-requests/:id', authenticate, allowRoles('ADMIN'), (req, res) => {
  const status = req.body?.status;
  const responseNote = clean(req.body?.responseNote, 600);
  if (!privacyRequestStates.has(status)) return res.status(400).json({ error: 'INVALID_PRIVACY_STATUS' });
  if (['completed', 'declined'].includes(status) && responseNote.length < 3) return res.status(400).json({ error: 'PRIVACY_RESPONSE_REQUIRED' });
  const current = db.prepare('SELECT status,response_note FROM privacy_requests WHERE id=?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'PRIVACY_REQUEST_NOT_FOUND' });
  if (current.status === status && current.response_note === responseNote) {
    return res.json({ request: privacyRequest(db.prepare(`${privacyRequestColumns} WHERE p.id=?`).get(req.params.id)) });
  }
  const timestamp = isoNow();
  db.transaction(() => {
    db.prepare('UPDATE privacy_requests SET status=?,response_note=?,processed_by=?,updated_at=? WHERE id=?')
      .run(status, responseNote, req.user.id, timestamp, req.params.id);
    recordAudit(req, {
      action: 'privacy_request.updated', entityType: 'privacy_request', entityId: req.params.id,
      summary: 'Privacy request status or response updated',
      metadata: { from: current.status, to: status, responseUpdated: current.response_note !== responseNote },
    });
  })();
  res.json({ request: privacyRequest(db.prepare(`${privacyRequestColumns} WHERE p.id=?`).get(req.params.id)) });
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
  const target = db.prepare('SELECT id,role,enabled FROM users WHERE id=? OR lower(email)=lower(?)').get(req.params.id, req.params.id);
  if (!target) return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND' });
  if (req.user.role !== 'ADMIN' && target.role !== 'CITOYEN') return res.status(403).json({ error: 'FORBIDDEN' });
  const updateAccess = db.transaction(() => {
    db.prepare('UPDATE users SET enabled=? WHERE id=?').run(req.body.enabled ? 1 : 0, target.id);
    if (Boolean(target.enabled) !== req.body.enabled) recordAudit(req, { action: 'account.access_changed', entityType: 'account', entityId: target.id, summary: 'Account access changed', metadata: { from: Boolean(target.enabled), to: req.body.enabled } });
    if (!req.body.enabled && target.role === 'AGENT') {
      const cancelled = db.prepare("UPDATE appointments SET status='cancelled',updated_at=? WHERE agent_id=? AND status='booked'").run(isoNow(), target.id);
      if (cancelled.changes) recordAudit(req, { action: 'appointment.agent_bookings_cancelled', entityType: 'account', entityId: target.id, summary: 'Agent appointments cancelled after access suspension', metadata: { appointments: cancelled.changes } });
    }
  });
  updateAccess();
  res.json({ id: target.id, enabled: req.body.enabled });
});
app.patch('/api/accounts/:id/role', authenticate, allowRoles('ADMIN'), (req, res) => {
  const role = ({ citizen: 'CITOYEN', agent: 'AGENT', admin: 'ADMIN' })[req.body?.profile];
  if (!role) return res.status(400).json({ error: 'INVALID_ROLE' });
  if (req.params.id === req.user.id) return res.status(409).json({ error: 'CANNOT_CHANGE_SELF' });
  const target = db.prepare('SELECT id,role FROM users WHERE id=? OR lower(email)=lower(?)').get(req.params.id, req.params.id);
  if (!target) return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND' });
  db.transaction(() => {
    db.prepare('UPDATE users SET role=? WHERE id=?').run(role, target.id);
    if (target.role !== role) recordAudit(req, { action: 'account.role_changed', entityType: 'account', entityId: target.id, summary: 'Account role changed by administrator', metadata: { from: target.role, to: role } });
  })();
  res.json({ id: target.id, profile: req.body.profile });
});

app.get('/api/audit-logs', authenticate, allowRoles('ADMIN', 'AGENT'), (req, res) => {
  const isAdmin = req.user.role === 'ADMIN';
  const adminCategories = {
    auth: ['auth.%'], account: ['account.%'], report: ['citizen_request.%'], contact: ['contact_message.%'],
    announcement: ['announcement.%'], service: ['service.%'], appointment: ['appointment.%'], privacy: ['privacy_request.%'], official: ['official_requests.%'],
  };
  const agentCategories = {
    access: ['account.access_changed', 'account.role_changed'], report: ['citizen_request.%'],
    announcement: ['announcement.%'], service: ['service.%'], appointment: ['appointment.%'], official: ['official_requests.%'],
  };
  const categories = isAdmin ? adminCategories : agentCategories;
  const conditions = [];
  const parameters = [];
  const category = clean(req.query?.category, 30);
  if (category && !categories[category]) return res.status(isAdmin ? 400 : 403).json({ error: isAdmin ? 'INVALID_CATEGORY' : 'FORBIDDEN' });
  const addActionFilter = (patterns) => {
    conditions.push(`(${patterns.map((pattern) => pattern.includes('%') ? 'action LIKE ?' : 'action = ?').join(' OR ')})`);
    parameters.push(...patterns);
  };
  if (category) addActionFilter(categories[category]);
  else if (!isAdmin) addActionFilter(Object.values(agentCategories).flat());
  const actor = clean(req.query?.actor, 254).toLowerCase();
  if (actor) { conditions.push('lower(actor_email)=?'); parameters.push(actor); }
  const before = Number(req.query?.before);
  if (Number.isSafeInteger(before) && before > 0) { conditions.push('id<?'); parameters.push(before); }
  const parsedLimit = Number(req.query?.limit);
  const limit = Number.isSafeInteger(parsedLimit) ? Math.max(1, Math.min(100, parsedLimit)) : 50;
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT id,occurred_at AS occurredAt,actor_email AS actorEmail,actor_role AS actorRole,
    action,entity_type AS entityType,entity_id AS entityId,summary,metadata_json AS metadataJson
    FROM audit_events ${where} ORDER BY id DESC LIMIT ?`).all(...parameters, limit + 1);
  const hasMore = rows.length > limit;
  const events = rows.slice(0, limit).map(({ metadataJson, ...event }) => {
    let metadata = {};
    try { metadata = JSON.parse(metadataJson); } catch (_) { /* Keep an empty safe metadata object. */ }
    return { ...event, metadata };
  });
  res.json({ events, nextBefore: hasMore ? events.at(-1)?.id || null : null });
});

app.use((error, req, res, _next) => {
  logEvent('error', 'http.request.failed', { requestId: req.requestId, errorType: error?.name || 'Error' });
  res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
});
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => { logEvent('info', 'server.started', { port }); startPolling(); });
