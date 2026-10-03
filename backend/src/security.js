import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function encryptionKey() {
  const value = process.env.TOTP_ENCRYPTION_KEY || '';
  if (!/^[a-f\d]{64}$/i.test(value)) throw new Error('TOTP_ENCRYPTION_KEY must be 64 hexadecimal characters');
  return Buffer.from(value, 'hex');
}

export function hasTotpEncryptionKey() {
  return /^[a-f\d]{64}$/i.test(process.env.TOTP_ENCRYPTION_KEY || '');
}

export function makeTotpSecret() {
  const bytes = randomBytes(20);
  let bits = 0, value = 0, result = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += base32Alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) result += base32Alphabet[(value << (5 - bits)) & 31];
  return result;
}

export function encryptTotpSecret(secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptTotpSecret(value) {
  const [ivValue, tagValue, encryptedValue] = String(value || '').split('.');
  if (!ivValue || !tagValue || !encryptedValue) throw new Error('INVALID_ENCRYPTED_TOTP_SECRET');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
}

function decodeBase32(value) {
  const normalized = String(value || '').toUpperCase().replace(/=+$/g, '').replace(/\s/g, '');
  let bits = 0, buffer = 0;
  const output = [];
  for (const character of normalized) {
    const index = base32Alphabet.indexOf(character);
    if (index < 0) throw new Error('INVALID_TOTP_SECRET');
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function totpAt(secret, counter) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 15;
  const value = ((digest[offset] & 127) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3];
  return String(value % 1_000_000).padStart(6, '0');
}

export function matchTotpCounter(secret, code, lastCounter = -1, now = Date.now()) {
  if (!/^\d{6}$/.test(String(code || ''))) return null;
  const current = Math.floor(now / 30_000);
  const candidate = Buffer.from(String(code));
  for (const counter of [current - 1, current, current + 1]) {
    if (counter <= lastCounter || counter < 0) continue;
    if (timingSafeEqual(candidate, Buffer.from(totpAt(secret, counter)))) return counter;
  }
  return null;
}

export function hashOneTimeCode(value) {
  return createHmac('sha256', process.env.JWT_SECRET).update(String(value)).digest('hex');
}

export function safeHexEqual(left, right) {
  if (!/^[a-f\d]{64}$/i.test(String(left || '')) || !/^[a-f\d]{64}$/i.test(String(right || ''))) return false;
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

export function deviceFingerprint(userId, deviceId) {
  return createHmac('sha256', process.env.JWT_SECRET).update(`device:${userId}:${deviceId}`).digest('hex');
}

export function deviceLabel(userAgent = '') {
  const browser = /Edg\//.test(userAgent) ? 'Edge'
    : /Firefox\//.test(userAgent) ? 'Firefox'
      : /Chrome\//.test(userAgent) ? 'Chrome'
        : /Safari\//.test(userAgent) && !/Chrome\//.test(userAgent) ? 'Safari' : 'Navigateur inconnu';
  const platform = /Windows/i.test(userAgent) ? 'Windows'
    : /Android/i.test(userAgent) ? 'Android'
      : /iPhone|iPad|iPod/i.test(userAgent) ? 'iOS'
        : /Mac OS/i.test(userAgent) ? 'macOS'
          : /Linux/i.test(userAgent) ? 'Linux' : 'appareil inconnu';
  return `${browser} · ${platform}`;
}

export function makeDeviceId() {
  return randomBytes(16).toString('hex');
}
