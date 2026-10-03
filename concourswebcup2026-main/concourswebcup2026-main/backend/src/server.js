import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { allowRoles, authenticate, issueToken, newId, publicUser } from './auth.js';
import { getRequests, startPolling, syncRequests } from './terraNova.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:5500').split(',').map((s) => s.trim()) }));
app.use(express.json({ limit: '20kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.post('/api/auth/signup', async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body ?? {};
    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 12 || password.length > 72 || typeof displayName !== 'string' || displayName.trim().length < 2 || displayName.trim().length > 80) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Nom (2-80 caractères), e-mail valide et mot de passe de 12 à 72 caractères requis.' });
    }
    const user = { id: newId(), email: email.trim().toLowerCase(), display_name: displayName.trim(), password_hash: await bcrypt.hash(password, 12), role: 'CITOYEN' };
    db.prepare('INSERT INTO users(id,email,display_name,password_hash,role) VALUES(@id,@email,@display_name,@password_hash,@role)').run(user);
    res.status(201).json({ user: publicUser(user), token: issueToken(user) });
  } catch (error) { if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'EMAIL_IN_USE' }); next(error); }
});

app.post('/api/auth/signin', async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = typeof email === 'string' ? db.prepare('SELECT * FROM users WHERE email=?').get(email.trim().toLowerCase()) : null;
  if (!user || typeof password !== 'string' || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  res.json({ user: publicUser(user), token: issueToken(user) });
});
app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

app.get('/api/requests', authenticate, (_req, res) => res.json(getRequests()));
app.post('/api/requests/sync', authenticate, allowRoles('AGENT', 'ADMIN'), async (_req, res) => {
  try { res.json({ synced: await syncRequests(), ...getRequests().sync }); }
  catch (error) { res.status(503).json({ error: 'TERRA_NOVA_UNAVAILABLE', message: error.message, ...getRequests().sync }); }
});
app.get('/api/agent/requests', authenticate, allowRoles('AGENT', 'ADMIN'), (_req, res) => res.json(getRequests()));
app.get('/api/admin/users', authenticate, allowRoles('ADMIN'), (_req, res) => {
  res.json(db.prepare('SELECT id,email,display_name AS displayName,role,created_at AS createdAt FROM users ORDER BY created_at DESC').all());
});
app.patch('/api/admin/users/:id/role', authenticate, allowRoles('ADMIN'), (req, res) => {
  const { role } = req.body ?? {};
  if (!['CITOYEN', 'AGENT', 'ADMIN'].includes(role)) return res.status(400).json({ error: 'INVALID_ROLE' });
  const result = db.prepare('UPDATE users SET role=? WHERE id=?').run(role, req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'USER_NOT_FOUND' });
  res.json({ id: req.params.id, role });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
});
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => { console.log(`Terra Nova API listening on http://localhost:${port}`); startPolling(); });
