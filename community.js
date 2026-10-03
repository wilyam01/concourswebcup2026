(() => {
  if (!window.NovaTerraCity || document.body.classList.contains('agent-page')) return;
  const user = window.NovaTerraAuth?.getSession();
  const english = () => document.documentElement.lang === 'en';
  const sector = user?.sector || '';
  const readKey = `terra-nova.announcement-reads.v1:${user?.email || 'visitor'}`;
  const host = document.createElement('section');
  host.className = 'community-alert-host';
  host.id = 'communityAlertHost';
  host.setAttribute('aria-label', 'Informations prioritaires');

  function insertHost() {
    host.setAttribute('aria-label', english() ? 'City notices' : 'Informations prioritaires');
    const publicHeader = document.querySelector('.public-header');
    const dashboardHeading = document.querySelector('.welcome-row');
    const contactIntro = document.querySelector('.contact-page .intro');
    if (publicHeader) publicHeader.insertAdjacentElement('afterend', host);
    else if (dashboardHeading) dashboardHeading.insertAdjacentElement('afterend', host);
    else if (contactIntro) contactIntro.insertAdjacentElement('afterend', host);
  }

  const dialog = document.createElement('dialog');
  dialog.className = 'community-dialog';
  dialog.id = 'communityInbox';
  dialog.setAttribute('aria-labelledby', 'communityInboxTitle');
  dialog.innerHTML = `<div class="community-dialog-heading"><div><h2 id="communityInboxTitle">Centre des alertes</h2><p id="communityInboxNote">Annonces, consignes urgentes et état des services.</p></div><button class="community-dialog-close" type="button" aria-label="Fermer">×</button></div><div class="community-notice-list" id="communityNoticeList" aria-live="polite"></div>`;
  document.body.append(dialog);
  const list = dialog.querySelector('#communityNoticeList');
  const trigger = document.querySelector('.notification') || document.createElement('button');
  const isExistingTrigger = trigger.isConnected;
  if (!isExistingTrigger) {
    trigger.className = 'community-inbox-trigger';
    trigger.type = 'button';
    trigger.innerHTML = '<span aria-hidden="true">♧</span><span class="community-inbox-label">Alertes</span>';
    document.body.append(trigger);
  }
  trigger.type = 'button';
  trigger.setAttribute('aria-label', english() ? 'Open announcements and alerts' : 'Ouvrir les annonces et alertes');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', dialog.id);
  trigger.setAttribute('aria-expanded', 'false');
  const count = document.createElement('span');
  count.className = 'community-inbox-count';
  count.setAttribute('aria-live', 'polite');
  count.hidden = true;
  trigger.append(count);
  const close = dialog.querySelector('.community-dialog-close');

  function readIds() {
    try {
      const ids = JSON.parse(localStorage.getItem(readKey) || '[]');
      return Array.isArray(ids) ? ids : [];
    } catch (_) { return []; }
  }

  function localized(kind) {
    const labels = english()
      ? { general: 'PRIORITY MESSAGE', news: 'CITY ANNOUNCEMENT', flood: 'FLOOD WARNING', health: 'HEALTH ALERT', service_status: 'SERVICE STATUS', request_status: 'REQUEST UPDATE', new_device: 'NEW DEVICE SIGN-IN' }
      : { general: 'MESSAGE PRIORITAIRE', news: 'ANNONCE MUNICIPALE', flood: 'ALERTE INONDATION', health: 'ALERTE SANITAIRE', service_status: 'ÉTAT DU SERVICE', request_status: 'MISE À JOUR DE DEMANDE', new_device: 'NOUVEL APPAREIL' };
    return labels[kind] || labels.general;
  }

  function localizedSector(value) {
    if (!english()) return value;
    return ({
      'District Boréal · Secteur 01': 'Boreal District · Sector 01',
      'Centre civique · Secteur 04': 'Civic Centre · Sector 04',
      'Serres du Sud · Secteur 07': 'Southern Greenhouses · Sector 07',
    })[value] || value;
  }

  function serviceStatusLabel(item) {
    if (item.kind !== 'service_status') return '';
    const service = (english()
      ? { water: 'Water and environment', health: 'Health and wellbeing', energy: 'Energy and housing', mobility: 'Mobility', civic: 'Civic life', solidarity: 'Support and assistance', other: 'Other service' }
      : { water: 'Eau et environnement', health: 'Santé et bien-être', energy: 'Énergie et habitat', mobility: 'Mobilité', civic: 'Vie citoyenne', solidarity: 'Aide et accompagnement', other: 'Autre service' })[item.service] || item.service;
    const state = item.serviceStatus === 'maintenance'
      ? (english() ? 'Maintenance' : 'En maintenance')
      : item.serviceStatus === 'unavailable'
        ? (english() ? 'Unavailable' : 'Indisponible')
        : (english() ? 'Operational' : 'Disponible');
    return `${service} · ${state}`;
  }

  async function announcementItems() {
    return window.NovaTerraCity.getAnnouncements({ sector });
  }

  async function markAnnouncementRead(item) {
    if (window.NovaTerraApi?.enabled && user) {
      await window.NovaTerraApi.request('/announcements/read', {
        method: 'POST', body: JSON.stringify({ ids: [item.id] }),
      });
      return;
    }
    try { localStorage.setItem(readKey, JSON.stringify([...new Set([...readIds(), item.id])].slice(-200))); } catch (_) { /* Keep the current view usable when storage is unavailable. */ }
  }

  function relatedDestination(item) {
    const emergency = item.kind === 'flood' || item.kind === 'health';
    const service = item.kind === 'service_status';
    if (!emergency && !service) return null;
    const section = emergency ? 'urgences' : 'services';
    const isContact = Boolean(document.querySelector('.contact-page'));
    const isDashboard = document.body.classList.contains('dashboard-page');
    const href = isContact ? `../index.html#${section}` : isDashboard ? `index.html#${section}` : `#${section}`;
    return {
      href,
      label: english()
        ? (emergency ? 'Find nearby emergency services' : 'View municipal services')
        : (emergency ? 'Voir les services d’urgence à proximité' : 'Voir les services municipaux'),
    };
  }

  function requestStatusName(status) {
    const names = english()
      ? { todo: 'Received', in_progress: 'In progress', done: 'Resolved' }
      : { todo: 'Reçue', in_progress: 'En cours', done: 'Résolue' };
    return names[status] || status;
  }

  async function citizenNotificationItems() {
    if (!user || user.profile !== 'citizen' || !window.NovaTerraApi?.enabled) return [];
    const result = await window.NovaTerraApi.request('/notifications');
    return (Array.isArray(result.notifications) ? result.notifications : []).map((item) => ({
      id: item.id,
      kind: 'request_status',
      title: english() ? `Request ${item.requestId} has changed` : `La demande ${item.requestId} a changé d’état`,
      body: `${requestStatusName(item.fromStatus)} → ${requestStatusName(item.toStatus)}`,
      createdAt: item.createdAt,
      read: item.read,
    }));
  }

  async function newDeviceNotificationItems() {
    if (!user || user.profile !== 'citizen' || !window.NovaTerraApi?.enabled) return [];
    const result = await window.NovaTerraApi.request('/security-notifications');
    return (Array.isArray(result.notifications) ? result.notifications : []).map((item) => ({
      id: item.id,
      kind: 'new_device',
      title: english() ? 'Your account was opened on a new device' : 'Ton compte a été ouvert sur un nouvel appareil',
      body: `${item.deviceLabel} · ${english() ? 'If this was not you, change your password.' : 'Si ce n’était pas toi, change ton mot de passe.'}`,
      createdAt: item.createdAt,
      read: item.read,
    }));
  }

  function serviceStatusNotice() {
    let notice = document.querySelector('#serviceStatusUpdated');
    if (!notice) {
      notice = document.createElement('p');
      notice.id = 'serviceStatusUpdated';
      notice.className = 'service-status-updated';
      notice.setAttribute('role', 'status');
      notice.setAttribute('aria-live', 'polite');
      document.querySelector('.service-tools')?.insertAdjacentElement('afterend', notice);
    }
    return notice;
  }

  function renderServiceStatesUnavailable() {
    document.querySelectorAll('.service-card[data-service-id]').forEach((card) => {
      let badge = card.querySelector('.service-live-state');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'service-live-state';
        card.querySelector('.service-info')?.insertAdjacentElement('afterend', badge);
      }
      badge.classList.remove('unavailable', 'operational');
      badge.classList.add('unknown');
      badge.textContent = english() ? 'Status check failed' : 'Vérification indisponible';
      badge.removeAttribute('title');
    });
    serviceStatusNotice().textContent = english()
      ? 'Live service status could not be checked. Contact the city before starting an urgent request.'
      : 'Impossible de vérifier les services en direct. Contacte la mairie avant une démarche urgente.';
  }

  async function renderServiceStates() {
    try {
      const statuses = await window.NovaTerraCity.getServiceStatuses();
      document.querySelectorAll('.service-card[data-service-id]').forEach((card) => {
        let badge = card.querySelector('.service-live-state');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'service-live-state';
          card.querySelector('.service-info')?.insertAdjacentElement('afterend', badge);
        }
        const status = statuses[card.dataset.serviceId];
        badge.classList.remove('unknown', 'unavailable', 'operational');
        if (!status) {
          badge.classList.add('unknown');
          badge.textContent = english() ? 'Status not reported' : 'Statut non communiqué';
          badge.removeAttribute('title');
          return;
        }
        if (!['operational', 'maintenance', 'unavailable'].includes(status.serviceStatus)) {
          badge.classList.add('unknown');
          badge.textContent = english() ? 'Status not recognized' : 'Statut non reconnu';
          badge.removeAttribute('title');
          return;
        }
        badge.classList.toggle('unavailable', status.serviceStatus === 'unavailable');
        badge.classList.toggle('operational', status.serviceStatus === 'operational');
        const stateLabel = status.serviceStatus === 'unavailable'
          ? (english() ? 'Unavailable' : 'Indisponible')
          : status.serviceStatus === 'maintenance'
            ? (english() ? 'Maintenance' : 'Maintenance')
            : (english() ? 'Available' : 'Disponible');
        badge.textContent = `${status.serviceStatus === 'unavailable' ? '●' : status.serviceStatus === 'maintenance' ? '◷' : '✓'} ${stateLabel}`;
        badge.title = status.title || stateLabel;
      });
      const checkedAt = new Intl.DateTimeFormat(english() ? 'en' : 'fr', { timeStyle: 'short' }).format(new Date());
      serviceStatusNotice().textContent = window.NovaTerraApi?.enabled
        ? (english() ? `Service status checked at ${checkedAt}.` : `Statuts des services vérifiés à ${checkedAt}.`)
        : (english() ? `Demo statuses checked at ${checkedAt}; live city status is not connected.` : `États de démonstration consultés à ${checkedAt} ; le statut municipal en direct n’est pas connecté.`);
    } catch (_) {
      renderServiceStatesUnavailable();
    }
  }

  function updateUnread(items) {
    const seen = new Set(readIds());
    const unreadCount = items.filter((item) => item.read === true ? false : !seen.has(item.id)).length;
    count.textContent = unreadCount;
    count.hidden = unreadCount === 0;
    trigger.setAttribute('aria-label', english()
      ? `Open announcements and alerts${unreadCount ? `, ${unreadCount} unread` : ''}`
      : `Ouvrir les annonces et alertes${unreadCount ? `, ${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : ''}`);
  }

  function makeNotice(item) {
    const article = document.createElement('article');
    article.className = `community-notice ${item.kind}`;
    const type = document.createElement('small');
    type.textContent = localized(item.kind);
    const title = document.createElement('h3');
    title.textContent = item.title;
    const body = document.createElement('p');
    body.textContent = item.body;
    const time = document.createElement('time');
    time.dateTime = item.createdAt;
    time.textContent = new Intl.DateTimeFormat(english() ? 'en' : 'fr', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt));
    article.append(type, title, body);
    const status = serviceStatusLabel(item);
    if (status) {
      const service = document.createElement('small');
      service.textContent = status;
      article.append(service);
    }
    if (item.targetSector) {
      const area = document.createElement('small');
      area.textContent = `${english() ? 'Area' : 'Secteur'} · ${localizedSector(item.targetSector)}`;
      article.append(area);
    }
    article.append(time);
    const destination = relatedDestination(item);
    if (destination) {
      const action = document.createElement('a');
      action.className = 'community-notice-action';
      action.href = destination.href;
      action.textContent = destination.label;
      article.append(action);
    }
    return article;
  }

  async function renderInbox() {
    const [announcements, notifications, deviceNotifications] = await Promise.all([announcementItems(), citizenNotificationItems(), newDeviceNotificationItems()]);
    const items = [...announcements, ...notifications, ...deviceNotifications].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
    list.replaceChildren(...items.map(makeNotice));
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'community-empty';
      empty.textContent = english() ? 'There are no new notices or request updates.' : 'Aucune nouvelle annonce ni mise à jour de demande.';
      list.append(empty);
    }
    updateUnread(items);
  }

  async function renderBanners() {
    const seen = new Set(readIds());
    const items = (await announcementItems()).filter((item) => item.kind === 'general' || item.kind === 'flood' || item.kind === 'health' || (item.kind === 'service_status' && item.serviceStatus !== 'operational'))
      .filter((item) => item.read !== true && !seen.has(item.id));
    const banners = items.slice(0, 3).map((item) => {
      const banner = document.createElement('article');
      banner.className = `community-alert ${item.kind}`;
      const mark = document.createElement('span');
      mark.className = 'community-alert-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = item.kind === 'flood' ? '!' : item.kind === 'health' ? '+' : item.kind === 'service_status' ? '◷' : 'i';
      const copy = document.createElement('div');
      copy.className = 'community-alert-copy';
      const title = document.createElement('b');
      title.textContent = item.title;
      const body = document.createElement('p');
      body.textContent = item.body;
      const meta = document.createElement('small');
      meta.className = 'community-alert-meta';
      meta.textContent = `${localized(item.kind)}${item.targetSector ? ` · ${localizedSector(item.targetSector)}` : ''}`;
      copy.append(title, body, meta);
      const destination = relatedDestination(item);
      if (destination) {
        const action = document.createElement('a');
        action.className = 'community-alert-link';
        action.href = destination.href;
        action.textContent = destination.label;
        copy.append(action);
      }
      const open = document.createElement('button');
      open.className = 'community-alert-close';
      open.type = 'button';
      open.setAttribute('aria-label', english() ? 'Open alert centre' : 'Ouvrir le centre des alertes');
      open.textContent = '↗';
      open.addEventListener('click', () => dialog.showModal());
      const actions = document.createElement('div');
      actions.className = 'community-alert-actions';
      const acknowledge = document.createElement('button');
      acknowledge.className = 'community-alert-acknowledge';
      acknowledge.type = 'button';
      acknowledge.textContent = english() ? 'I’ve read this' : 'J’ai pris connaissance';
      acknowledge.addEventListener('click', async () => {
        acknowledge.disabled = true;
        try {
          await markAnnouncementRead(item);
          await Promise.all([renderBanners(), renderInbox()]);
        } catch (_) {
          acknowledge.disabled = false;
          acknowledge.textContent = english() ? 'Could not confirm' : 'Confirmation impossible';
        }
      });
      actions.append(open, acknowledge);
      banner.append(mark, copy, actions);
      return banner;
    });
    if (new URLSearchParams(location.search).get('account') === 'deleted') {
      const notice = document.createElement('p');
      notice.className = 'community-alert';
      notice.setAttribute('role', 'status');
      const remoteDeletion = new URLSearchParams(location.search).get('source') === 'server';
      notice.textContent = english()
        ? (remoteDeletion ? 'Your citizen account and associated city records were deleted.' : 'Your citizen account and local records were deleted.')
        : (remoteDeletion ? 'Ton compte citoyen et les données municipales associées ont été supprimés.' : 'Ton compte citoyen et les données locales associées ont été supprimés.');
      banners.unshift(notice);
    }
    host.replaceChildren(...banners);
  }

  async function refresh() {
    host.setAttribute('aria-label', english() ? 'City notices' : 'Informations prioritaires');
    try {
      await Promise.all([renderBanners(), renderServiceStates(), renderInbox(), renderPublicNews()]);
    } catch (_) {
      // The locally saved city view remains available if the configured API is offline.
    }
  }

  async function renderPublicNews() {
    const newsList = document.querySelector('#news-list');
    if (!newsList) return;
    const items = (await announcementItems()).filter((item) => item.kind === 'news').slice(0, 5);
    newsList.querySelectorAll('[data-community-news]').forEach((element) => element.remove());
    items.forEach((item) => {
      const article = document.createElement('article');
      article.className = 'news-item dynamic-news-item';
      article.dataset.communityNews = item.id;
      const top = document.createElement('div');
      top.className = 'news-item-top';
      const tag = document.createElement('span');
      tag.className = 'news-tag tag-community';
      tag.textContent = english() ? 'CITY ANNOUNCEMENT' : 'ANNONCE MUNICIPALE';
      const time = document.createElement('time');
      time.dateTime = item.createdAt;
      time.textContent = new Intl.DateTimeFormat(english() ? 'en' : 'fr', { dateStyle: 'medium' }).format(new Date(item.createdAt));
      top.append(tag, time);
      const title = document.createElement('h3');
      title.textContent = item.title;
      const body = document.createElement('p');
      body.textContent = item.body;
      article.append(top, title, body);
      newsList.prepend(article);
    });
  }

  insertHost();
  trigger.addEventListener('click', async () => {
    dialog.showModal();
    trigger.setAttribute('aria-expanded', 'true');
    await renderInbox();
    const [items, notifications, deviceNotifications] = await Promise.all([announcementItems(), citizenNotificationItems(), newDeviceNotificationItems()]);
    if (window.NovaTerraApi?.enabled && user) {
      try { await window.NovaTerraApi.request('/announcements/read', { method: 'POST', body: JSON.stringify({ ids: items.map((item) => item.id) }) }); } catch (_) { /* The inbox remains readable when receipts cannot sync. */ }
      if (user.profile === 'citizen' && notifications.length) {
        try { await window.NovaTerraApi.request('/notifications/read', { method: 'POST', body: JSON.stringify({ ids: notifications.map((item) => item.id) }) }); } catch (_) { /* Status updates remain visible if read receipts cannot sync. */ }
      }
      if (user.profile === 'citizen' && deviceNotifications.length) {
        try { await window.NovaTerraApi.request('/security-notifications/read', { method: 'POST', body: JSON.stringify({ ids: deviceNotifications.map((item) => item.id) }) }); } catch (_) { /* Security notices remain visible if read receipts cannot sync. */ }
      }
    } else {
      try { localStorage.setItem(readKey, JSON.stringify([...new Set([...readIds(), ...items.map((item) => item.id)])].slice(-200))); } catch (_) { /* Reading notices does not depend on persistence. */ }
    }
    await renderInbox();
    await renderBanners();
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  });
  window.addEventListener('terra-nova:announcements-updated', refresh);
  window.addEventListener('storage', (event) => {
    if (event.key === window.NovaTerraCity.announcementStorageKey) refresh();
  });
  window.addEventListener('nova:language-change', refresh);
  window.NovaTerraEco.schedulePolling(refresh);
  refresh();
})();
