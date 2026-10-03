(() => {
  const accountsKey = 'novaTerraAccounts.v1';
  const sessionKey = 'novaTerraSession.v1';
  const iterations = 310000;

  function bytesToHex(bytes) {
    return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
  }

  function hexToBytes(hex) {
    return new Uint8Array(hex.match(/.{2}/g).map((value) => Number.parseInt(value, 16)));
  }

  async function hashPassword(password, salt) {
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await globalThis.crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      key,
      256,
    );
    return bytesToHex(new Uint8Array(bits));
  }

  function readAccounts() {
    const saved = localStorage.getItem(accountsKey);
    if (!saved) return [];
    const accounts = JSON.parse(saved);
    if (!Array.isArray(accounts)) throw new Error('invalid_account_store');
    return accounts;
  }

  function setSession(account, remember = false) {
    const storage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;
    otherStorage.removeItem(sessionKey);
    storage.setItem(sessionKey, JSON.stringify({
      email: account.email,
      name: account.name,
      sector: account.sector,
      authenticatedAt: new Date().toISOString(),
    }));
  }

  async function createAccount({ name, email, sector, password }) {
    if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) return { ok: false, error: 'crypto_unavailable' };

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const accounts = readAccounts();
      if (accounts.some((account) => account.email === normalizedEmail)) {
        return { ok: false, error: 'email_exists' };
      }

      const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
      const account = {
        name: name.trim(),
        email: normalizedEmail,
        sector,
        salt: bytesToHex(salt),
        passwordHash: await hashPassword(password, salt),
        createdAt: new Date().toISOString(),
      };
      accounts.push(account);
      localStorage.setItem(accountsKey, JSON.stringify(accounts));
      setSession(account);
      return { ok: true, user: { name: account.name, email: account.email, sector: account.sector } };
    } catch (error) {
      return { ok: false, error: error.name === 'QuotaExceededError' ? 'storage_full' : 'storage_unavailable' };
    }
  }

  async function signIn({ email, password, remember = false }) {
    if (!globalThis.crypto?.subtle) return { ok: false, error: 'crypto_unavailable' };

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const account = readAccounts().find((item) => item.email === normalizedEmail);
      if (!account) return { ok: false, error: 'invalid_credentials' };

      const candidate = await hashPassword(password, hexToBytes(account.salt));
      if (candidate !== account.passwordHash) return { ok: false, error: 'invalid_credentials' };

      setSession(account, remember);
      return { ok: true, user: { name: account.name, email: account.email, sector: account.sector } };
    } catch (_) {
      return { ok: false, error: 'storage_unavailable' };
    }
  }

  function getSession() {
    try {
      const session = JSON.parse(sessionStorage.getItem(sessionKey) || localStorage.getItem(sessionKey) || 'null');
      return session && typeof session.email === 'string' ? session : null;
    } catch (_) {
      return null;
    }
  }

  function signOut() {
    try {
      sessionStorage.removeItem(sessionKey);
      localStorage.removeItem(sessionKey);
    } catch (_) {
      // The current page can still navigate back to the sign-in form.
    }
  }

  window.NovaTerraAuth = Object.freeze({ createAccount, signIn, getSession, signOut });
})();
