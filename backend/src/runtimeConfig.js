export function parseTrustProxyHops(value = '0') {
  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer');
  }
  const hops = Number(normalized);
  if (!Number.isSafeInteger(hops)) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer');
  }
  return hops;
}
