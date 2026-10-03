(() => {
  const storageKey = 'novaTerraLowBandwidth.v1';
  const root = document.documentElement;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const isSlowConnection = () => Boolean(connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType));
  const isLowPowerDevice = () => (
    (Number.isFinite(navigator.deviceMemory) && navigator.deviceMemory <= 4)
    || (Number.isFinite(navigator.hardwareConcurrency) && navigator.hardwareConcurrency <= 4)
  );
  let preference = 'auto';

  try {
    const saved = localStorage.getItem(storageKey);
    if (['auto', 'on', 'off'].includes(saved)) preference = saved;
  } catch (_) {
    // Automatic detection remains available when browser storage is disabled.
  }

  function apply() {
    const lowBandwidth = preference === 'on' || (preference === 'auto' && isSlowConnection());
    root.dataset.lowBandwidth = lowBandwidth ? 'on' : 'off';
    root.dataset.lowResource = isLowPowerDevice() ? 'on' : 'off';
    window.dispatchEvent(new CustomEvent('nova:eco-mode-change', {
      detail: { preference, lowBandwidth },
    }));
    return lowBandwidth;
  }

  function setPreference(value) {
    if (!['auto', 'on', 'off'].includes(value)) throw new Error('invalid_low_bandwidth_preference');
    preference = value;
    try {
      localStorage.setItem(storageKey, value);
    } catch (_) {
      // The selected mode still applies to this page.
    }
    apply();
  }

  function optimizeMedia(container) {
    const media = [];
    if (container.matches?.('img, iframe, video')) media.push(container);
    media.push(...container.querySelectorAll('img, iframe, video'));
    media.forEach((element) => {
      const critical = element.hasAttribute('data-critical');
      if (element.tagName === 'IMG' && !element.hasAttribute('loading')) element.loading = critical ? 'eager' : 'lazy';
      if (element.tagName === 'IMG' && !element.hasAttribute('decoding')) element.decoding = 'async';
      if (element.tagName === 'IMG' && !element.hasAttribute('fetchpriority')) element.fetchPriority = critical ? 'high' : 'low';
      if (element.tagName === 'IFRAME' && !element.hasAttribute('loading')) element.loading = critical ? 'eager' : 'lazy';
      if (element.tagName === 'VIDEO' && !element.hasAttribute('preload') && !element.hasAttribute('autoplay')) element.preload = 'none';
    });
  }

  function measureTransfer() {
    const origin = location.origin;
    const navigationEntries = performance.getEntriesByType('navigation');
    const resourceEntries = performance.getEntriesByType('resource');
    const sameOriginEntries = [...navigationEntries, ...resourceEntries]
      .filter((entry) => {
        try { return new URL(entry.name, origin).origin === origin; }
        catch (_) { return false; }
      });
    const measuredEntries = sameOriginEntries.filter((entry) => Number(entry.transferSize) > 0);
    const bytes = measuredEntries.reduce((total, entry) => total + Number(entry.transferSize), 0);
    const externalResources = resourceEntries.filter((entry) => {
      try { return new URL(entry.name, origin).origin !== origin; }
      catch (_) { return false; }
    }).length;
    return {
      bytes,
      measuredCount: measuredEntries.length,
      sameOriginCount: sameOriginEntries.length,
      externalResources,
      mediaCount: document.querySelectorAll('img, video').length,
    };
  }

  function schedulePolling(callback, interval = 60_000) {
    if (typeof callback !== 'function' || !Number.isFinite(interval) || interval < 1_000) {
      throw new Error('invalid_polling_schedule');
    }
    let timer = null;
    const reschedule = () => {
      if (timer !== null) window.clearInterval(timer);
      const delay = root.dataset.lowBandwidth === 'on' ? Math.max(interval, 300_000) : interval;
      timer = window.setInterval(() => {
        if (!document.hidden) void callback();
      }, delay);
    };
    window.addEventListener('nova:eco-mode-change', reschedule);
    reschedule();
    return () => {
      if (timer !== null) window.clearInterval(timer);
      window.removeEventListener('nova:eco-mode-change', reschedule);
    };
  }

  apply();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => optimizeMedia(document), { once: true });
  } else {
    optimizeMedia(document);
  }
  connection?.addEventListener?.('change', () => {
    if (preference === 'auto') apply();
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey) return;
    preference = ['auto', 'on', 'off'].includes(event.newValue) ? event.newValue : 'auto';
    apply();
  });
  window.NovaTerraEco = {
    measureTransfer,
    getPreference: () => preference,
    isLowBandwidth: () => root.dataset.lowBandwidth === 'on',
    setPreference,
    optimizeMedia,
    schedulePolling,
  };
})();
