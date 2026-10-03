(() => {
  const accountsKey = 'novaTerraAccounts.v1';
  const sessionKey = 'novaTerraSession.v1';
  const failedLoginKey = 'novaTerraFailedLogins.v1';
  const iterations = 310000;
  const maxLoginFailures = 5;
  const loginLockDurationMs = 15 * 60 * 1000;
  const apiEnabled = () => Boolean(window.NovaTerraApi?.enabled);

  function remoteError(error) {
    return ({
      EMAIL_IN_USE: 'email_exists', INVALID_CREDENTIALS: 'invalid_credentials',
      TOO_MANY_ATTEMPTS: 'locked_out', INVALID_INPUT: 'invalid_input',
      INVALID_PASSWORD: 'invalid_credentials',
      AUTH_REQUIRED: 'not_authenticated', FORBIDDEN: 'forbidden',
      INVALID_SESSION: 'not_authenticated', INVALID_OR_EXPIRED_TOKEN: 'not_authenticated',
      ACCOUNT_NOT_FOUND: 'account_not_found', CANNOT_CHANGE_SELF: 'cannot_change_self',
      INVALID_ROLE: 'invalid_role',
    })[error?.message] || (error?.message === 'api_unavailable' ? 'api_unavailable' : 'api_error');
  }

  function fromRemoteUser(user) {
    const roles = { CITOYEN: 'citizen', AGENT: 'agent', ADMIN: 'admin' };
    return {
      email: user.email,
      name: user.name || user.displayName,
      sector: user.sector || '',
      profile: user.profile || roles[user.role] || 'citizen',
      enabled: user.enabled !== false,
    };
  }

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

  function readFailedLogins() {
    try {
      const state = JSON.parse(localStorage.getItem(failedLoginKey) || '{}');
      return state && typeof state === 'object' && !Array.isArray(state) ? state : {};
    } catch (_) {
      return {};
    }
  }

  function recordFailedLogin(email) {
    const state = readFailedLogins();
    const previous = state[email] || { count: 0, lockedUntil: 0 };
    const count = previous.lockedUntil > Date.now() ? previous.count : previous.lockedUntil ? 1 : previous.count + 1;
    const lockedUntil = count >= maxLoginFailures ? Date.now() + loginLockDurationMs : 0;
    state[email] = { count, lockedUntil };
    Object.keys(state).slice(0, Math.max(0, Object.keys(state).length - 200)).forEach((key) => { if (key !== email) delete state[key]; });
    localStorage.setItem(failedLoginKey, JSON.stringify(state));
    return { count, lockedUntil };
  }

  function clearFailedLogins(email) {
    const state = readFailedLogins();
    delete state[email];
    localStorage.setItem(failedLoginKey, JSON.stringify(state));
  }

  function setSession(account, remember = false, profile = account.profile || 'citizen', token = '') {
    const storage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;
    otherStorage.removeItem(sessionKey);
    storage.setItem(sessionKey, JSON.stringify({
      email: account.email,
      name: account.name,
      sector: account.sector,
      profile,
      ...(token ? { token } : {}),
      authenticatedAt: new Date().toISOString(),
    }));
  }

  async function createAccount({ name, email, sector, password, profile = 'citizen' }) {
    if (!['citizen', 'agent', 'admin'].includes(profile)) return { ok: false, error: 'invalid_profile' };
    if (apiEnabled()) {
      if (profile !== 'citizen') return { ok: false, error: 'role_assignment_requires_admin' };
      if (password.length < 12) return { ok: false, error: 'weak_password' };
      try {
        const result = await window.NovaTerraApi.request('/auth/signup', {
          method: 'POST', body: JSON.stringify({ displayName: name, email, sector, password }),
        });
        const account = fromRemoteUser(result.user);
        setSession(account, false, account.profile, result.token);
        return { ok: true, user: account };
      } catch (error) { return { ok: false, error: remoteError(error) }; }
    }
    if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) return { ok: false, error: 'crypto_unavailable' };

    try {
      const normalizedName = name.trim();
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedSector = sector.trim();
      if (!normalizedName) return { ok: false, error: 'invalid_name' };
      if (!normalizedEmail) return { ok: false, error: 'invalid_email' };
      if (!normalizedSector) return { ok: false, error: 'invalid_sector' };
      if (password.length < 8) return { ok: false, error: 'weak_password' };

      const accounts = readAccounts();
      if (accounts.some((account) => account.email === normalizedEmail)) {
        return { ok: false, error: 'email_exists' };
      }

      const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
      const account = {
        name: normalizedName,
        email: normalizedEmail,
        sector: normalizedSector,
        profile,
        enabled: true,
        salt: bytesToHex(salt),
        passwordHash: await hashPassword(password, salt),
        createdAt: new Date().toISOString(),
      };
      accounts.push(account);
      localStorage.setItem(accountsKey, JSON.stringify(accounts));
      setSession(account, false, profile);
      return { ok: true, user: { name: account.name, email: account.email, sector: account.sector, profile } };
    } catch (error) {
      return { ok: false, error: apiEnabled() ? remoteError(error) : error.name === 'QuotaExceededError' ? 'storage_full' : 'storage_unavailable' };
    }
  }

  async function signIn({ email, password, remember = false, profile = 'citizen' }) {
    if (apiEnabled()) {
      if (!['citizen', 'agent', 'admin'].includes(profile)) return { ok: false, error: 'invalid_profile' };
      try {
        const result = await window.NovaTerraApi.request('/auth/signin', {
          method: 'POST', body: JSON.stringify({ email, password }),
        });
        const account = fromRemoteUser(result.user);
        if (account.profile !== profile) return { ok: false, error: 'profile_mismatch' };
        setSession(account, remember, account.profile, result.token);
        return { ok: true, user: account };
      } catch (error) { return { ok: false, error: remoteError(error) }; }
    }
    if (!globalThis.crypto?.subtle) return { ok: false, error: 'crypto_unavailable' };
    if (!['citizen', 'agent', 'admin'].includes(profile)) return { ok: false, error: 'invalid_profile' };

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const attemptState = readFailedLogins()[normalizedEmail];
      if (attemptState?.lockedUntil > Date.now()) {
        return { ok: false, error: 'locked_out', retryAfterMs: attemptState.lockedUntil - Date.now() };
      }
      const account = readAccounts().find((item) => item.email === normalizedEmail);
      if (!account) {
        recordFailedLogin(normalizedEmail);
        return { ok: false, error: 'invalid_credentials' };
      }

      const candidate = await hashPassword(password, hexToBytes(account.salt));
      if (candidate !== account.passwordHash) {
        const attempt = recordFailedLogin(normalizedEmail);
        return attempt.lockedUntil > Date.now()
          ? { ok: false, error: 'locked_out', retryAfterMs: attempt.lockedUntil - Date.now() }
          : { ok: false, error: 'invalid_credentials', attemptsRemaining: maxLoginFailures - attempt.count };
      }

      clearFailedLogins(normalizedEmail);
      if (account.enabled === false) return { ok: false, error: 'account_disabled' };
      if ((account.profile || 'citizen') !== profile) return { ok: false, error: 'profile_mismatch' };

      setSession(account, remember, account.profile || 'citizen');
      return { ok: true, user: { name: account.name, email: account.email, sector: account.sector, profile: account.profile || 'citizen' } };
    } catch (_) {
      return { ok: false, error: 'storage_unavailable' };
    }
  }

  function getSession() {
    try {
      const session = JSON.parse(sessionStorage.getItem(sessionKey) || localStorage.getItem(sessionKey) || 'null');
      if (!session || typeof session.email !== 'string') return null;
      if (apiEnabled()) {
        if (!session.token || !['citizen', 'agent', 'admin'].includes(session.profile)) return null;
        return session;
      }
      const account = readAccounts().find((item) => item.email === session.email.toLowerCase());
      if (!account || account.enabled === false || (account.profile || 'citizen') !== session.profile) {
        sessionStorage.removeItem(sessionKey);
        localStorage.removeItem(sessionKey);
        return null;
      }
      if (!['citizen', 'agent', 'admin'].includes(session.profile)) return null;
      return session;
    } catch (_) {
      return null;
    }
  }

  async function updateProfile({ name, sector }) {
    try {
      const session = getSession();
      if (!session) return { ok: false, error: 'not_authenticated' };

      const normalizedName = String(name ?? '').trim();
      const normalizedSector = String(sector ?? '').trim();
      if (!normalizedName || normalizedName.length > 60) return { ok: false, error: 'invalid_name' };
      if (!normalizedSector || normalizedSector.length > 60) return { ok: false, error: 'invalid_sector' };

      if (apiEnabled()) {
        const result = await window.NovaTerraApi.request('/auth/me', {
          method: 'PATCH', body: JSON.stringify({ name: normalizedName, sector: normalizedSector }),
        });
        const updatedSession = { ...session, ...fromRemoteUser(result.user) };
        const activeStorage = sessionStorage.getItem(sessionKey) ? sessionStorage : localStorage;
        activeStorage.setItem(sessionKey, JSON.stringify(updatedSession));
        return { ok: true, user: fromRemoteUser(result.user) };
      }

      const accounts = readAccounts();
      const accountIndex = accounts.findIndex((account) => account.email === session.email);
      if (accountIndex < 0) return { ok: false, error: 'account_not_found' };

      accounts[accountIndex] = { ...accounts[accountIndex], name: normalizedName, sector: normalizedSector };
      localStorage.setItem(accountsKey, JSON.stringify(accounts));

      const updatedSession = { ...session, name: normalizedName, sector: normalizedSector };
      const activeStorage = sessionStorage.getItem(sessionKey) ? sessionStorage : localStorage;
      activeStorage.setItem(sessionKey, JSON.stringify(updatedSession));
      return {
        ok: true,
        user: { name: normalizedName, email: session.email, sector: normalizedSector },
      };
    } catch (error) {
      return { ok: false, error: apiEnabled() ? remoteError(error) : error.name === 'QuotaExceededError' ? 'storage_full' : 'storage_unavailable' };
    }
  }

  async function getProfilePhoto() {
    if (!apiEnabled()) return '';
    const result = await window.NovaTerraApi.request('/auth/me/avatar');
    return typeof result.dataUrl === 'string' ? result.dataUrl : '';
  }

  async function saveProfilePhoto(dataUrl) {
    if (!apiEnabled()) return { ok: false, error: 'api_not_configured' };
    try {
      await window.NovaTerraApi.request('/auth/me/avatar', { method: 'PATCH', body: JSON.stringify({ dataUrl }) });
      return { ok: true };
    } catch (error) { return { ok: false, error: remoteError(error) }; }
  }

  function signOut() {
    try {
      sessionStorage.removeItem(sessionKey);
      localStorage.removeItem(sessionKey);
    } catch (_) {
      // The current page can still navigate back to the sign-in form.
    }
  }

  function getToken() {
    try {
      const raw = sessionStorage.getItem(sessionKey) || localStorage.getItem(sessionKey);
      return raw ? JSON.parse(raw)?.token || '' : '';
    } catch (_) { return ''; }
  }

  async function getAvailableAgents() {
    if (apiEnabled()) {
      try {
        const result = await window.NovaTerraApi.request('/appointments/agents');
        return Array.isArray(result.agents) ? result.agents : [];
      } catch (_) { return []; }
    }
    try {
      return readAccounts()
        .filter((account) => account.profile === 'agent' && account.enabled !== false)
        .map(({ name, email, sector }) => ({ name, email, sector }));
    } catch (_) {
      return [];
    }
  }

  async function getAccountsForStaff() {
    const session = getSession();
    if (!session || !['agent', 'admin'].includes(session.profile)) return { ok: false, error: 'forbidden' };
    if (apiEnabled()) {
      try {
        const result = await window.NovaTerraApi.request('/accounts');
        return { ok: true, accounts: result.accounts || [] };
      } catch (error) { return { ok: false, error: remoteError(error) }; }
    }
    try {
      const accounts = readAccounts().map((account) => ({
        name: account.name,
        email: account.email,
        sector: account.sector,
        profile: account.profile || 'citizen',
        enabled: account.enabled !== false,
        createdAt: account.createdAt || '',
      }));
      return { ok: true, accounts };
    } catch (_) {
      return { ok: false, error: 'storage_unavailable' };
    }
  }

  async function setAccountAccess(email, enabled) {
    const session = getSession();
    if (!session || !['agent', 'admin'].includes(session.profile)) return { ok: false, error: 'forbidden' };
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || normalizedEmail === session.email.toLowerCase()) return { ok: false, error: 'cannot_change_self' };
    if (apiEnabled()) {
      try {
        await window.NovaTerraApi.request(`/accounts/${encodeURIComponent(normalizedEmail)}/access`, {
          method: 'PATCH', body: JSON.stringify({ enabled: Boolean(enabled) }),
        });
        return { ok: true, account: { email: normalizedEmail, enabled: Boolean(enabled) } };
      } catch (error) { return { ok: false, error: remoteError(error) }; }
    }
    try {
      const accounts = readAccounts();
      const index = accounts.findIndex((account) => account.email === normalizedEmail);
      if (index < 0) return { ok: false, error: 'account_not_found' };
      if (session.profile !== 'admin' && accounts[index].profile !== 'citizen') return { ok: false, error: 'forbidden' };
      accounts[index] = { ...accounts[index], enabled: Boolean(enabled), accessUpdatedAt: new Date().toISOString() };
      localStorage.setItem(accountsKey, JSON.stringify(accounts));
      window.dispatchEvent(new CustomEvent('terra-nova:accounts-updated'));
      return { ok: true, account: { name: accounts[index].name, email: accounts[index].email, profile: accounts[index].profile, enabled: accounts[index].enabled } };
    } catch (error) {
      return { ok: false, error: error.name === 'QuotaExceededError' ? 'storage_full' : 'storage_unavailable' };
    }
  }

  async function setAccountRole(email, profile) {
    const session = getSession();
    if (!apiEnabled() || !session || session.profile !== 'admin') return { ok: false, error: 'forbidden' };
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || normalizedEmail === session.email.toLowerCase()) return { ok: false, error: 'cannot_change_self' };
    if (!['citizen', 'agent', 'admin'].includes(profile)) return { ok: false, error: 'invalid_role' };
    try {
      await window.NovaTerraApi.request(`/accounts/${encodeURIComponent(normalizedEmail)}/role`, {
        method: 'PATCH', body: JSON.stringify({ profile }),
      });
      return { ok: true };
    } catch (error) { return { ok: false, error: remoteError(error) }; }
  }

  async function deleteCitizenAccount(password) {
    const session = getSession();
    if (!session || session.profile !== 'citizen') return { ok: false, error: 'citizen_account_required' };
    if (apiEnabled()) {
      try {
        await window.NovaTerraApi.request('/auth/me', { method: 'DELETE', body: JSON.stringify({ password }) });
        signOut();
        return { ok: true };
      } catch (error) { return { ok: false, error: remoteError(error) }; }
    }
    try {
      const accounts = readAccounts();
      const account = accounts.find((item) => item.email === session.email.toLowerCase());
      if (!account) return { ok: false, error: 'account_not_found' };
      const candidate = await hashPassword(password, hexToBytes(account.salt));
      if (candidate !== account.passwordHash) return { ok: false, error: 'invalid_credentials' };
      localStorage.setItem(accountsKey, JSON.stringify(accounts.filter((item) => item.email !== account.email)));
      const removeOwned = (key, ownerField = 'ownerEmail') => {
        try {
          const saved = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(saved)) localStorage.setItem(key, JSON.stringify(saved.filter((item) => item?.[ownerField]?.toLowerCase() !== account.email)));
        } catch (_) { /* Account removal must still finish if an optional local archive is damaged. */ }
      };
      removeOwned('terra-nova.citizen-requests.v1');
      removeOwned('terra-nova.appointments.v1');
      try {
        const messages = JSON.parse(localStorage.getItem('terra-nova.citizen-messages') || '[]');
        if (Array.isArray(messages)) localStorage.setItem('terra-nova.citizen-messages', JSON.stringify(messages.filter((item) => item?.email?.toLowerCase() !== account.email)));
      } catch (_) { /* The account and session are still removed if the message archive is invalid. */ }
      localStorage.removeItem(`novaTerraProfilePhoto.v1:${encodeURIComponent(account.email)}`);
      localStorage.removeItem(`terra-nova.announcement-reads.v1:${account.email}`);
      signOut();
      window.dispatchEvent(new CustomEvent('terra-nova:account-deleted', { detail: { email: account.email } }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.name === 'QuotaExceededError' ? 'storage_full' : 'storage_unavailable' };
    }
  }

  window.NovaTerraAuth = Object.freeze({ createAccount, signIn, getSession, updateProfile, getProfilePhoto, saveProfilePhoto, signOut, getToken, getAvailableAgents, getAccountsForStaff, setAccountAccess, setAccountRole, deleteCitizenAccount });

  window.addEventListener('storage', (event) => {
    if (event.key !== accountsKey) return;
    const savedSession = sessionStorage.getItem(sessionKey) || localStorage.getItem(sessionKey);
    if (!savedSession) return;
    try {
      const session = JSON.parse(savedSession);
      const account = readAccounts().find((item) => item.email === session.email?.toLowerCase());
      if (!account || account.enabled === false || (account.profile || 'citizen') !== session.profile) {
        signOut();
        window.dispatchEvent(new CustomEvent('nova:session-revoked'));
      }
    } catch (_) {
      signOut();
      window.dispatchEvent(new CustomEvent('nova:session-revoked'));
    }
  });
})();
