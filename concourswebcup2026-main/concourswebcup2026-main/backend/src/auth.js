import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { db } from './db.js';

const roles = new Set(['CITOYEN', 'AGENT', 'ADMIN']);
export function issueToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h', issuer: 'terra-nova-api',
  });
}
export function authenticate(req, res, next) {
  const token = req.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'AUTH_REQUIRED' });
  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'terra-nova-api' });
    const user = db.prepare('SELECT id,email,display_name,role FROM users WHERE id=?').get(claims.sub);
    if (!user || !roles.has(user.role)) return res.status(401).json({ error: 'INVALID_SESSION' });
    req.user = user;
    next();
  } catch { return res.status(401).json({ error: 'INVALID_OR_EXPIRED_TOKEN' }); }
}
export const allowRoles = (...allowed) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'AUTH_REQUIRED' });
  if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'FORBIDDEN' });
  next();
};
export const publicUser = (user) => ({ id: user.id, email: user.email, displayName: user.display_name, role: user.role });
export const newId = () => randomUUID();
