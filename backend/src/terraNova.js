import { db } from './db.js';

let lastSync = null;
let lastError = null;

function safeText(value, fallback, maxLength) {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback;
  const text = String(value).trim();
  return text ? text.slice(0, maxLength) : fallback;
}

function normalizeRequest(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid request record');
  const status = String(item.status || 'todo').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s-]+/g, '_');
  const priority = String(item.priority || 'normal').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const statuses = { todo: 'todo', to_do: 'todo', pending: 'todo', open: 'todo', new: 'todo', created: 'todo', a_traiter: 'todo', in_progress: 'in_progress', progress: 'in_progress', processing: 'in_progress', en_cours: 'in_progress', done: 'done', resolved: 'done', completed: 'done', closed: 'done', termine: 'done', terminee: 'done' };
  const priorities = { normal: 'normal', medium: 'normal', moderate: 'normal', moyenne: 'normal', normale: 'normal', urgent: 'high', critical: 'high', high: 'high', haute: 'high', elevee: 'high', low: 'low', minor: 'low', basse: 'low', faible: 'low' };
  const requestId = item.id ?? item.reference ?? item.request_id;
  if (requestId === undefined || requestId === null || !statuses[status] || !priorities[priority]) throw new Error('Unsupported request record');
  return {
    id: String(requestId).trim().slice(0, 100),
    title: safeText(item.title || item.subject || item.name, 'Demande citoyenne', 240),
    district: safeText(item.district || item.location || item.zone, 'Secteur non précisé', 120),
    type: safeText(item.type || item.category, 'Demande', 80), priority: priorities[priority], status: statuses[status],
    updatedAt: safeText(item.updatedAt || item.updated_at || item.createdAt || item.created_at, 'Date non précisée', 80),
    description: safeText(item.description || item.message, 'Aucune description fournie.', 2000),
  };
}

export async function syncRequests() {
  const endpoint = process.env.TERRA_NOVA_API_URL;
  if (!endpoint) throw new Error('TERRA_NOVA_API_URL is not configured');
  const url = new URL('requests', endpoint.endsWith('/') ? endpoint : `${endpoint}/`);
  const headers = { accept: 'application/json' };
  if (process.env.TERRA_NOVA_API_KEY) headers.authorization = `Bearer ${process.env.TERRA_NOVA_API_KEY}`;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Terra Nova returned HTTP ${response.status}`);
  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : payload.requests || payload.data || payload.items;
  if (!Array.isArray(rows)) throw new Error('Unexpected Terra Nova response');
  const normalized = rows.flatMap((item) => { try { return [normalizeRequest(item)]; } catch (_) { return []; } });
  if (rows.length && !normalized.length) throw new Error('Terra Nova returned no supported request records');
  const update = db.prepare(`INSERT INTO requests(id,payload,updated_at) VALUES(?,?,datetime('now'))
    ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at`);
  const save = db.transaction((items) => {
    for (const item of items) update.run(item.id, JSON.stringify(item));
  });
  save(normalized);
  lastSync = new Date().toISOString();
  lastError = null;
  return normalized.length;
}

export function getRequests() {
  const items = db.prepare('SELECT payload FROM requests ORDER BY updated_at DESC').all().map(({ payload }) => JSON.parse(payload));
  return { items, sync: { lastSync, degraded: Boolean(lastError), message: lastError, cached: items.length > 0 } };
}

export function startPolling() {
  if (!process.env.TERRA_NOVA_API_URL) return;
  const interval = Math.max(10000, Number(process.env.TERRA_NOVA_POLL_MS) || 30000);
  const poll = async () => {
    try { await syncRequests(); }
    catch (error) { lastError = error.message; console.error('[Terra Nova sync]', error.message); }
  };
  void poll();
  const timer = setInterval(poll, interval);
  timer.unref();
}
