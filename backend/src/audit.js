import { db } from './db.js';
import { logEvent } from './logger.js';

const blockedMetadataKey = /password|token|secret|credential|avatar|message|description|purpose|body/i;

function safeMetadata(value, depth = 0) {
  if (depth > 3) return null;
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return value.slice(0, 180);
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => safeMetadata(item, depth + 1));
  if (typeof value !== 'object') return null;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !blockedMetadataKey.test(key))
    .slice(0, 30)
    .map(([key, item]) => [key.slice(0, 60), safeMetadata(item, depth + 1)]));
}

export function recordAudit(req, event) {
  const actor = event.actor || req?.user || null;
  const result = db.prepare(`INSERT INTO audit_events
    (occurred_at,actor_user_id,actor_email,actor_role,action,entity_type,entity_id,summary,metadata_json)
    VALUES(?,?,?,?,?,?,?,?,?)`).run(
    new Date().toISOString(), actor?.id || null, String(actor?.email || event.actorEmail || '').slice(0, 254),
    actor?.role || event.actorRole || 'ANONYMOUS', String(event.action).slice(0, 100),
    String(event.entityType).slice(0, 80), String(event.entityId || '').slice(0, 160),
    String(event.summary).slice(0, 180), JSON.stringify(safeMetadata(event.metadata || {})),
  );
  logEvent('info', 'audit.change_recorded', { auditId: Number(result.lastInsertRowid), action: event.action, entityType: event.entityType });
  return Number(result.lastInsertRowid);
}

export function recordSystemAudit(event) {
  return recordAudit(null, { ...event, actorRole: 'SYSTEM' });
}
