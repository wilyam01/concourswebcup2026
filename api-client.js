(() => {
  const config = window.TERRA_NOVA_CONFIG || {};
  const baseUrl = String(config.apiBaseUrl || '').replace(/\/$/, '');
  const headersWithToken = (headers = {}) => {
    const token = window.NovaTerraAuth?.getToken?.();
    return { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers };
  };

  async function request(path, options = {}) {
    if (!baseUrl) throw new Error('api_not_configured');
    const headers = headersWithToken(options.headers || {});
    if (options.body !== undefined && !Object.keys(headers).some((key) => key.toLowerCase() === 'content-type')) {
      headers['Content-Type'] = 'application/json';
    }
    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, { ...options, headers, credentials: 'omit' });
    } catch (_) {
      throw new Error('api_unavailable');
    }
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(payload?.error || `http_${response.status}`);
      error.status = response.status;
      error.payload = payload;
      if (response.status === 401 && window.NovaTerraAuth?.getToken?.()) {
        window.NovaTerraAuth.signOut();
        window.dispatchEvent(new CustomEvent('nova:session-revoked'));
      }
      throw error;
    }
    return payload;
  }

  window.NovaTerraApi = Object.freeze({ enabled: Boolean(baseUrl), baseUrl, request });
})();
