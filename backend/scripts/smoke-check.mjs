import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const backendRoot = fileURLToPath(new URL('../', import.meta.url));
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'nova-terra-backend-'));
const databasePath = path.join(tempRoot, 'smoke.sqlite');
const portProbe = net.createServer();
await new Promise((resolve, reject) => portProbe.listen(0, '127.0.0.1', resolve).once('error', reject));
const { port } = portProbe.address();
await new Promise((resolve, reject) => portProbe.close((error) => error ? reject(error) : resolve()));

const child = spawn(process.execPath, [path.join(backendRoot, 'src/server.js')], {
  cwd: backendRoot,
  env: {
    ...process.env,
    PORT: String(port),
    DATABASE_PATH: databasePath,
    JWT_SECRET: 'backend-smoke-check-secret-at-least-32-characters-long',
    TRUST_PROXY_HOPS: '0',
    CORS_ORIGIN: `http://127.0.0.1:${port}`,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout.setEncoding('utf8').on('data', (chunk) => { output += chunk; });
child.stderr.setEncoding('utf8').on('data', (chunk) => { output += chunk; });

const baseUrl = `http://127.0.0.1:${port}`;
try {
  let healthResponse;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Backend exited early:\n${output}`);
    try {
      healthResponse = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(1000) });
      break;
    } catch {
      await delay(250);
    }
  }
  assert.ok(healthResponse, `Backend did not become ready:\n${output}`);
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await healthResponse.json(), { status: 'ok' });

  const signupResponse = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      displayName: 'Smoke Citizen', email: 'smoke@example.test', password: 'smoke-password-1234', sector: 'North', profile: 'admin',
    }),
  });
  const signup = await signupResponse.json();
  assert.equal(signupResponse.status, 201, JSON.stringify(signup));
  assert.equal(signup.user.profile, 'citizen', 'Public signup must never grant staff roles');
  assert.ok(signup.token);

  const sessionResponse = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { authorization: `Bearer ${signup.token}` },
  });
  assert.equal(sessionResponse.status, 200);
  assert.equal((await sessionResponse.json()).user.email, 'smoke@example.test');

  const protectedResponse = await fetch(`${baseUrl}/api/citizen-ideas`);
  assert.equal(protectedResponse.status, 401, 'Protected endpoints must reject anonymous requests');
  console.log('Backend smoke check passed: health, citizen signup, role restriction, and authenticated session.');
} finally {
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit'), delay(3000)]);
  await fs.rm(tempRoot, { recursive: true, force: true });
}
