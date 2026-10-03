(() => {
  const user = window.NovaTerraAuth?.getSession();
  if (!user || !['agent', 'admin'].includes(user.profile)) return;
  const form = document.querySelector('#announcementForm');
  const accountHost = document.querySelector('#managedAccounts');
  const announcementHost = document.querySelector('#managedAnnouncements');
  const auditCard = document.querySelector('#auditTrailCard');
  const auditHost = document.querySelector('#auditLogList');
  const auditFeedback = document.querySelector('#auditFeedback');
  const auditCategory = document.querySelector('#auditCategory');
  const auditLoadMore = document.querySelector('#auditLoadMore');
  const kindSelect = document.querySelector('#announcementKind');
  const serviceFields = document.querySelector('#announcementServiceFields');
  const targetSelect = form.elements.targetSector;
  const bodyInput = form.elements.body;
  let auditCursor = null;
  let auditEvents = [];
  let auditLoading = false;
  const english = () => document.documentElement.lang === 'en';
  const serviceLabels = () => english()
    ? { water: 'Water and environment', health: 'Health and wellbeing', energy: 'Energy and housing', mobility: 'Mobility', civic: 'Civic life', solidarity: 'Support and assistance', other: 'Other service' }
    : { water: 'Eau et environnement', health: 'Santé et bien-être', energy: 'Énergie et habitat', mobility: 'Mobilité', civic: 'Vie citoyenne', solidarity: 'Aide et accompagnement', other: 'Autre service' };
  const kindLabels = () => english()
    ? { general: 'Priority message', news: 'Announcement', flood: 'Flood warning', health: 'Health alert', service_status: 'Service status' }
    : { general: 'Message prioritaire', news: 'Annonce', flood: 'Alerte crue', health: 'Alerte sanitaire', service_status: 'Statut de service' };

  function localizedSector(value) {
    if (!english()) return value;
    return ({
      'District Boréal · Secteur 01': 'Boreal District · Sector 01',
      'Centre civique · Secteur 04': 'Civic Centre · Sector 04',
      'Serres du Sud · Secteur 07': 'Southern Greenhouses · Sector 07',
    })[value] || value;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function updateManagementCopy() {
    const english = document.documentElement.lang === 'en';
    if (window.NovaTerraApi?.enabled) {
      document.querySelector('#city-management .section-heading>span').textContent = english ? 'Nova Terra API · synchronized' : 'API Nova Terra · synchronisée';
      document.querySelector('#city-management .management-card:nth-child(1)>p:not(.kicker)').textContent = english
        ? 'Residents will see this notice in the alert centre; new announcements also appear in the public news feed.'
        : 'Les habitants verront cette information dans le centre des alertes; les annonces seront aussi publiées dans le fil d’actualités.';
      document.querySelector('#city-management .management-card:nth-child(2)>p:not(.kicker)').textContent = english
        ? 'Suspend or restore resident access. Administrators can also assign agent and administrator roles.'
        : 'Suspends ou rétablis un accès citoyen. Les administrateurs peuvent aussi attribuer les rôles agent et administrateur.';
    }
    if (user.profile === 'admin') {
      auditCard.hidden = false;
      auditCard.querySelector('.kicker').textContent = english ? 'F47 · F48 · ACTION TRACE' : 'F47 · F48 · TRACE DES ACTIONS';
      auditCard.querySelector('h3').textContent = english ? 'Security and audit log' : 'Journal de sécurité et d’audit';
      document.querySelector('#auditIntro').textContent = window.NovaTerraApi?.enabled
        ? (english ? 'Review who changed accounts, requests, announcements, service states and appointments.' : 'Consulte qui a modifié les comptes, demandes, annonces, statuts des services et rendez-vous.')
        : (english ? 'Connect the Nova Terra backend to keep and review a secure audit trail.' : 'Connecte le backend Nova Terra pour conserver et consulter le journal sécurisé.');
      const categoryLabel = auditCategory.labels[0];
      categoryLabel.firstChild.textContent = english ? 'Filter the log' : 'Filtrer le journal';
      [...auditCategory.options].forEach((option) => {
        const labels = english
          ? { '': 'All actions', auth: 'Sign-ins', account: 'Accounts and roles', report: 'Requests', contact: 'Citizen messages', announcement: 'Announcements', service: 'Service status', appointment: 'Appointments', official: 'API sync' }
          : { '': 'Toutes les actions', auth: 'Connexions', account: 'Comptes et rôles', report: 'Demandes', contact: 'Messages citoyens', announcement: 'Annonces', service: 'Statuts des services', appointment: 'Rendez-vous', official: 'Synchronisation API' };
        option.textContent = labels[option.value];
      });
      document.querySelector('#refreshAudit').textContent = english ? 'Refresh' : 'Actualiser';
      auditLoadMore.textContent = english ? 'Load more' : 'Charger plus';
      auditCategory.disabled = !window.NovaTerraApi?.enabled;
      document.querySelector('#refreshAudit').disabled = !window.NovaTerraApi?.enabled;
      if (!window.NovaTerraApi?.enabled) auditFeedback.textContent = english ? 'Audit storage is available in server mode.' : 'Le journal d’audit est disponible en mode serveur.';
    }
  }

  async function renderAnnouncements() {
    let items;
    try { items = (await window.NovaTerraCity.getAnnouncements({ includeTargeted: true })).slice(0, 8); }
    catch (_) {
      announcementHost.replaceChildren(element('p', 'appointment-empty', english() ? 'Announcements could not be loaded.' : 'Les annonces n’ont pas pu être chargées.'));
      return;
    }
    announcementHost.replaceChildren();
    items.forEach((item) => {
      const row = element('article', 'management-row');
      const copy = element('div', 'management-row-copy');
      const type = kindLabels()[item.kind] || item.kind;
      const area = item.targetSector ? ` · ${localizedSector(item.targetSector)}` : '';
      const serviceState = item.serviceStatus === 'maintenance' ? (english() ? 'Maintenance' : 'En maintenance')
        : item.serviceStatus === 'unavailable' ? (english() ? 'Unavailable' : 'Indisponible')
          : (english() ? 'Available' : 'Disponible');
      const status = item.kind === 'service_status' ? ` · ${serviceLabels()[item.service] || item.service}: ${serviceState}` : '';
      copy.append(element('b', '', item.title), element('small', '', `${type}${area}${status} · ${new Intl.DateTimeFormat(english() ? 'en' : 'fr', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.createdAt))}`));
      const close = element('button', '', english() ? 'Close' : 'Retirer');
      close.type = 'button';
      close.addEventListener('click', async () => {
        try {
          await window.NovaTerraCity.closeAnnouncement(item.id);
          renderAnnouncements();
          renderAuditLogs();
        } catch (_) {
          document.querySelector('#announcementFeedback').textContent = english() ? 'The announcement could not be closed.' : 'L’annonce n’a pas pu être clôturée.';
        }
      });
      row.append(copy, close);
      announcementHost.append(row);
    });
  }

  async function renderAccounts() {
    const result = await window.NovaTerraAuth.getAccountsForStaff();
    accountHost.replaceChildren();
    const feedback = document.querySelector('#accountsFeedback');
    feedback.textContent = result.ok ? '' : (english() ? 'Accounts could not be loaded.' : 'Les comptes n’ont pas pu être chargés.');
    if (!result.ok) return;
    const accounts = user.profile === 'admin' ? result.accounts : result.accounts.filter((account) => account.profile === 'citizen');
    if (!accounts.length) {
      accountHost.append(element('p', 'appointment-empty', english() ? 'No citizen accounts in this browser yet.' : 'Aucun compte citoyen dans ce navigateur pour le moment.'));
      return;
    }
    accounts.forEach((account) => {
      const row = element('article', 'management-row');
      const copy = element('div', 'management-row-copy');
      const state = account.enabled ? (english() ? 'Access enabled' : 'Accès actif') : (english() ? 'Access suspended' : 'Accès suspendu');
      copy.append(element('b', '', account.name), element('small', '', `${account.email} · ${account.sector || (english() ? 'No district' : 'Secteur non renseigné')} · ${state}`));
      let roleSelect = null;
      if (user.profile === 'admin' && window.NovaTerraApi?.enabled) {
        roleSelect = document.createElement('select');
        roleSelect.className = 'account-role-select';
        roleSelect.setAttribute('aria-label', english() ? `Role for ${account.name}` : `Rôle de ${account.name}`);
        [['citizen', 'Citoyen(ne)', 'Citizen'], ['agent', 'Agent', 'Agent'], ['admin', 'Administrateur', 'Administrator']].forEach(([value, fr, en]) => {
          roleSelect.add(new Option(english() ? en : fr, value));
        });
        roleSelect.value = account.profile;
        roleSelect.disabled = account.email.toLowerCase() === user.email.toLowerCase();
        roleSelect.addEventListener('change', async () => {
          roleSelect.disabled = true;
          const updated = await window.NovaTerraAuth.setAccountRole(account.email, roleSelect.value);
          const message = updated.ok
            ? (english() ? `Role updated for ${account.name}; they must sign in again.` : `Rôle modifié pour ${account.name} ; une nouvelle connexion est nécessaire.`)
            : (english() ? 'The role could not be changed.' : 'Le rôle n’a pas pu être modifié.');
          await renderAccounts();
          feedback.textContent = message;
          renderAuditLogs();
        });
      }
      const control = element('button', '', account.enabled ? (english() ? 'Suspend access' : 'Suspendre') : (english() ? 'Restore access' : 'Rétablir'));
      control.type = 'button';
      control.disabled = account.email.toLowerCase() === user.email.toLowerCase();
      control.setAttribute('aria-label', `${account.enabled ? (english() ? 'Suspend access for' : 'Suspendre l’accès de') : (english() ? 'Restore access for' : 'Rétablir l’accès de')} ${account.name}`);
      control.addEventListener('click', async () => {
        control.disabled = true;
        const updated = await window.NovaTerraAuth.setAccountAccess(account.email, !account.enabled);
        if (!updated.ok) {
          feedback.textContent = english() ? 'This account access cannot be changed by your role.' : 'Ton rôle ne permet pas de modifier cet accès.';
          control.disabled = false;
          return;
        }
        await renderAccounts();
        feedback.textContent = english() ? `Access updated for ${account.name}.` : `Accès mis à jour pour ${account.name}.`;
        renderAuditLogs();
      });
      row.append(copy);
      if (roleSelect) row.append(roleSelect);
      row.append(control);
      accountHost.append(row);
    });
  }

  function auditActionLabel(event) {
    const labels = english()
      ? {
        'account.signup': 'Citizen account created', 'auth.signin.succeeded': 'Account signed in', 'auth.signin.lockout_started': 'Sign-in lockout started',
        'account.avatar_changed': 'Profile photo changed', 'account.profile_updated': 'Account profile updated', 'account.self_deleted': 'Citizen account deleted',
        'account.access_changed': 'Account access changed', 'account.role_changed': 'Account role changed', 'citizen_request.created': 'Citizen report submitted',
        'citizen_request.status_changed': 'Citizen report status changed', 'contact_message.received': 'Contact message received',
        'announcement.published': 'City information published', 'announcement.closed': 'City information closed',
        'service.status_changed': 'Service status changed', 'service.status_closed': 'Service status cleared',
        'appointment.booked': 'Appointment booked', 'appointment.cancelled': 'Appointment cancelled',
        'appointment.completed': 'Appointment completed', 'appointment.reminder_marked': 'Appointment reminder recorded',
        'appointment.agent_bookings_cancelled': 'Agent appointments cancelled', 'official_requests.sync_completed': 'Official requests synchronized',
      }
      : {
        'account.signup': 'Compte citoyen créé', 'auth.signin.succeeded': 'Connexion réussie', 'auth.signin.lockout_started': 'Blocage temporaire de connexion déclenché',
        'account.avatar_changed': 'Photo de profil modifiée', 'account.profile_updated': 'Profil modifié', 'account.self_deleted': 'Compte citoyen supprimé',
        'account.access_changed': 'Accès au compte modifié', 'account.role_changed': 'Rôle du compte modifié', 'citizen_request.created': 'Signalement citoyen envoyé',
        'citizen_request.status_changed': 'Statut du signalement modifié', 'contact_message.received': 'Message citoyen reçu',
        'announcement.published': 'Information municipale publiée', 'announcement.closed': 'Information municipale clôturée',
        'service.status_changed': 'Statut de service modifié', 'service.status_closed': 'Statut de service retiré',
        'appointment.booked': 'Rendez-vous réservé', 'appointment.cancelled': 'Rendez-vous annulé',
        'appointment.completed': 'Rendez-vous terminé', 'appointment.reminder_marked': 'Rappel de rendez-vous noté',
        'appointment.agent_bookings_cancelled': 'Rendez-vous de l’agent annulés', 'official_requests.sync_completed': 'Demandes officielles synchronisées',
      };
    if (event.action === 'official_requests.feed_changed') return english() ? 'Official request feed changed' : 'Flux des demandes officielles mis à jour';
    return labels[event.action] || event.summary || event.action;
  }

  function renderAuditRows() {
    const roleLabels = english()
      ? { ADMIN: 'Administrator', AGENT: 'Agent', CITOYEN: 'Citizen', ANONYMOUS: 'Visitor', SYSTEM: 'System' }
      : { ADMIN: 'Administrateur', AGENT: 'Agent', CITOYEN: 'Citoyen', ANONYMOUS: 'Visiteur', SYSTEM: 'Système' };
    auditHost.replaceChildren(...auditEvents.map((event) => {
      const row = element('article', 'audit-log-entry');
      const heading = element('div', 'audit-log-heading');
      heading.append(element('b', '', auditActionLabel(event)));
      const time = element('time', '', new Intl.DateTimeFormat(english() ? 'en' : 'fr', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.occurredAt)));
      time.dateTime = event.occurredAt;
      heading.append(time);
      const actor = element('p', 'audit-log-actor', `${event.actorEmail || (roleLabels[event.actorRole] || event.actorRole)} · ${roleLabels[event.actorRole] || event.actorRole}`);
      const entity = element('small', 'audit-log-entity', `${event.action} · ${event.entityType}${event.entityId ? ` · ${event.entityId}` : ''}`);
      const metadata = event.metadata && Object.keys(event.metadata).length
        ? element('small', 'audit-log-metadata', Object.entries(event.metadata).map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`).join(' · '))
        : null;
      row.append(heading, actor, entity);
      if (metadata) row.append(metadata);
      return row;
    }));
  }

  async function renderAuditLogs(append = false) {
    if (user.profile !== 'admin' || !window.NovaTerraApi?.enabled || auditLoading) return;
    if (append && !auditCursor) return;
    auditLoading = true;
    auditFeedback.textContent = english() ? 'Loading audit history…' : 'Chargement du journal…';
    const query = new URLSearchParams({ limit: '50' });
    if (auditCategory.value) query.set('category', auditCategory.value);
    if (append && auditCursor) query.set('before', String(auditCursor));
    try {
      const result = await window.NovaTerraApi.request(`/audit-logs?${query.toString()}`);
      if (!Array.isArray(result.events)) throw new Error('invalid_audit_response');
      auditEvents = append ? [...auditEvents, ...result.events] : result.events;
      auditCursor = result.nextBefore || null;
      renderAuditRows();
      auditLoadMore.hidden = !auditCursor;
      auditFeedback.textContent = result.events.length
        ? (english() ? `${auditEvents.length} events shown.` : `${auditEvents.length} événements affichés.`)
        : (english() ? 'No matching audit events.' : 'Aucun événement correspondant.');
    } catch (_) {
      auditFeedback.textContent = english() ? 'Audit history could not be loaded.' : 'Le journal d’audit n’a pas pu être chargé.';
    } finally {
      auditLoading = false;
    }
  }

  kindSelect.addEventListener('change', () => {
    const serviceStatus = kindSelect.value === 'service_status';
    serviceFields.hidden = !serviceStatus;
    targetSelect.disabled = serviceStatus;
    const instructions = {
      fr: {
        flood: 'Précise les secteurs inondés, les itinéraires à éviter et les consignes officielles vérifiées.',
        health: 'Précise la zone concernée et les consignes sanitaires officielles vérifiées.',
        other: 'Précise la zone concernée, les consignes ou l’impact sur le service.',
      },
      en: {
        flood: 'Add affected areas, routes to avoid and verified official safety instructions.',
        health: 'Add the affected area and verified official health guidance.',
        other: 'Add the affected area, instructions or service impact.',
      },
    };
    const language = english() ? 'en' : 'fr';
    bodyInput.placeholder = instructions[language][kindSelect.value] || instructions[language].other;
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedback = document.querySelector('#announcementFeedback');
    feedback.hidden = true;
    const data = new FormData(form);
    try {
      const item = await window.NovaTerraCity.publishAnnouncement({
        kind: data.get('kind'),
        title: data.get('title'),
        body: data.get('body'),
        targetSector: data.get('targetSector'),
        service: data.get('service'),
        serviceStatus: data.get('serviceStatus'),
        expiresAt: data.get('expiresAt'),
      });
      feedback.textContent = english()
        ? `Information ${item.id} is shared with the city.`
        : `L’information ${item.id} est partagée avec les habitants.`;
      feedback.hidden = false;
      const selectedKind = data.get('kind');
      form.reset();
      kindSelect.value = selectedKind;
      serviceFields.hidden = selectedKind !== 'service_status';
      targetSelect.disabled = selectedKind === 'service_status';
      renderAnnouncements();
      renderAuditLogs();
    } catch (error) {
      const messages = english()
        ? { invalid_text: 'Add a title and message within the field limits.', invalid_expiry: 'Choose an expiration time in the future.', invalid_service_status: 'Choose a service and its status.' }
        : { invalid_text: 'Ajoute un titre et un message dans les limites indiquées.', invalid_expiry: 'Choisis une date d’expiration future.', invalid_service_status: 'Choisis un service et son statut.' };
      feedback.textContent = messages[error.message] || (english() ? 'The information could not be saved in this browser.' : 'L’information n’a pas pu être enregistrée dans ce navigateur.');
      feedback.hidden = false;
    }
  });

  document.querySelector('#refreshAudit').addEventListener('click', () => {
    auditCursor = null;
    auditEvents = [];
    renderAuditLogs();
  });
  auditCategory.addEventListener('change', () => {
    auditCursor = null;
    auditEvents = [];
    renderAuditRows();
    renderAuditLogs();
  });
  auditLoadMore.addEventListener('click', () => renderAuditLogs(true));

  window.addEventListener('terra-nova:announcements-updated', renderAnnouncements);
  window.addEventListener('terra-nova:accounts-updated', renderAccounts);
  window.addEventListener('storage', (event) => {
    if (event.key === window.NovaTerraCity.announcementStorageKey) renderAnnouncements();
    if (event.key === 'novaTerraAccounts.v1') renderAccounts();
  });
  window.addEventListener('nova:language-change', () => {
    updateManagementCopy();
    renderAccounts();
    renderAnnouncements();
    renderAuditRows();
    renderAuditLogs();
    kindSelect.dispatchEvent(new Event('change'));
  });
  window.setInterval(() => {
    if (!document.hidden && window.NovaTerraApi?.enabled) {
      renderAnnouncements();
      renderAccounts();
      renderAuditLogs();
    }
  }, 60_000);
  updateManagementCopy();
  renderAnnouncements();
  renderAccounts();
  renderAuditLogs();
})();
