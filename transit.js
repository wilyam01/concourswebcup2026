(() => {
  const note = document.querySelector('#mobilityDemoNote');
  if (!note || !window.NovaTerraApi?.enabled) return;

  const rows = [
    { line: '#mobilityBlue', code: 'A' },
    { line: '#mobilityGreen', code: 'B' },
    { line: '#mobilityGold', code: 'C' },
  ];
  let routes = [];
  let loadFailed = false;
  const english = () => document.documentElement.lang === 'en';

  function render() {
    if (loadFailed) {
      note.textContent = english()
        ? 'Transit schedules could not be loaded. The illustrative timetable remains visible.'
        : 'Les horaires de transport n’ont pas pu être chargés. Les horaires illustratifs restent affichés.';
      return;
    }
    if (!routes.length) return;
    const prefix = english() ? 'Service' : 'Service';
    rows.forEach(({ line, code }) => {
      const route = routes.find((item) => item.lineCode === code);
      if (!route) return;
      const lineName = english() ? route.lineNameEn : route.lineName;
      const origin = english() ? route.originEn : route.origin;
      const destination = english() ? route.destinationEn : route.destination;
      const accessibility = english() ? route.accessibilityEn : route.accessibility;
      document.querySelector(`${line}Label`).textContent = lineName.toLocaleUpperCase(english() ? 'en' : 'fr');
      document.querySelector(`${line}Route`).textContent = `${origin} ↔ ${destination}`;
      document.querySelector(`${line}Hours`).textContent = `${prefix} · ${route.startTime}–${route.endTime}`;
      document.querySelector(`${line}Frequency`).textContent = english() ? `Every ${route.frequencyMinutes} min` : `Toutes les ${route.frequencyMinutes} min`;
      document.querySelector(`${line}Access`).textContent = accessibility;
    });
    note.textContent = english()
      ? 'Schedules loaded from the Nova Terra API. Current entries are demonstration data; live updates need an official transit feed.'
      : 'Horaires chargés depuis l’API Nova Terra. Les fiches actuelles sont des données de démonstration; les mises à jour en temps réel nécessitent un flux officiel.';
  }

  async function loadSchedules() {
    try {
      const result = await window.NovaTerraApi.request('/transit/schedules');
      if (!Array.isArray(result.routes) || !result.routes.length) throw new Error('invalid_schedule_response');
      routes = result.routes.filter((route) => route && /^[A-Z]$/.test(route.lineCode)
        && typeof route.startTime === 'string' && typeof route.endTime === 'string'
        && Number.isFinite(Number(route.frequencyMinutes)));
      if (!routes.length) throw new Error('invalid_schedule_response');
      loadFailed = false;
      render();
    } catch (_) {
      loadFailed = true;
      render();
    }
  }

  window.addEventListener('nova:language-change', render);
  void loadSchedules();
})();
