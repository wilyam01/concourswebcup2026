const test = require('node:test');
const assert = require('node:assert/strict');
test('trust proxy hop count defaults safely to direct access', async () => {
  const { parseTrustProxyHops } = await import('../backend/src/runtimeConfig.js');
  assert.equal(parseTrustProxyHops(), 0);
  assert.equal(parseTrustProxyHops('1'), 1);
  assert.equal(parseTrustProxyHops('2'), 2);
});

test('trust proxy hop count rejects unsafe or invalid settings', async () => {
  const { parseTrustProxyHops } = await import('../backend/src/runtimeConfig.js');
  for (const value of ['true', '-1', '1.5', '1, 2', '9007199254740992']) {
    assert.throws(() => parseTrustProxyHops(value), /TRUST_PROXY_HOPS/);
  }
});
