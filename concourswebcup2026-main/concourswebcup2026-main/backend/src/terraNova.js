import { db } from './db.js';

const endpoint = process.env.TERRA_NOVA_API_URL;
let timer;
let lastSync = null;
let lastError = null;

export async function syncRequests() {
  if (!endpoint) throw new Error('TERRA_NOVA_API_URL is not configured');
  const url = new URL('requests', endpoint.endsWith('/') ? endpoint : `${endpoint}/`);
  const headers = { accept: 'application/json' };
  if (process.env.TERRA_NOVA_API_KEY) headers.authorization = `Bearer ${process.env.TERRA_NOVA_API_KEY}`;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Terra Nova returned HTTP ${response.status}`);
  const body = await response.json();
  const rows = Array.isArray(body) ? body : body.requests;
  if (!Array.isArray(rows)) throw new Error('Unexpected Terra Nova response: expected an array or { requests: [] }');
  const update = db.prepare(`INSERT INTO requests(id,payload,updated_at) VALUES(?,?,datetime('now'))
    ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at`);
  const transaction = db.transaction((items) => {
    for (const item of items) {
      const id = String(item.id ?? item.requestId ?? '');
      if (!id) continue;
      update.run(id, JSON.stringify(item));
    }
  });
  transaction(rows);
  lastSync = new Date().toISOString();
  lastError = null;
  return rows.length;
}

export function startPolling() {
  const interval = Math.max(10000, Number(process.env.TERRA_NOVA_POLL_MS) || 30000);
  const poll = async () => {
    try { await syncRequests(); }
    catch (error) { lastError = error.message; console.error('[Terra Nova sync]', error.message); }
  };
  void poll();
  timer = setInterval(poll, interval);
  timer.unref();
}

export function getRequests() {
  const items = db.prepare('SELECT payload FROM requests ORDER BY updated_at DESC').all().map(({ payload }) => JSON.parse(payload));
  return { items, sync: { lastSync, degraded: Boolean(lastError), message: lastError, cached: items.length > 0 } };
}
