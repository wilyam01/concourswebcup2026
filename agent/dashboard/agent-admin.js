(() => {
  const user = window.NovaTerraAuth?.getSession();
  if (!user || !['agent', 'admin'].includes(user.profile)) return;
  const form = document.querySelector('#announcementForm');
  const accountHost = document.querySelector('#managedAccounts');
  const announcementHost = document.querySelector('#managedAnnouncements');
  const auditCard = document.querySelector('#auditTrailCard');
  const auditNavLink = document.querySelector('#auditNavLink');
  const privacyCard = document.querySelector('#privacyRequestsCard');
  const privacyHost = document.querySelector('#privacyRequestsList');
  const privacyFeedback = document.querySelector('#privacyRequestsFeedback');
  const activityCard = document.querySelector('#activitySummaryCard');
  const activityHost = document.querySelector('#activitySummaryList');
  const activityFeedback = document.querySelector('#activitySummaryFeedback');
  const auditHost = document.querySelector('#auditLogList');
  const auditFeedback = document.querySelector('#auditFeedback');
  const auditCategory = document.querySelector('#auditCategory');
  const auditLoadMore = document.querySelector('#auditLoadMore');
  const kindSelect = document.querySelector('#announcementKind');
  const serviceFields = document.querySelector('#announcementServiceFields');
  const killSwitchCard = document.querySelector('#serviceKillSwitchCard');
  const killSwitchForm = document.querySelector('#serviceKillSwitchForm');
  const killSwitchService = document.querySelector('#serviceKillSwitchService');
  const killSwitchReason = document.querySelector('#serviceKillSwitchReason');
  const killSwitchFeedback = document.querySelector('#serviceKillSwitchFeedback');
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

  function updatePrivacyCopy() {
    const english = document.documentElement.lang === 'en';
    privacyCard.hidden = user.profile !== 'admin';
    document.querySelector('#privacyRequestsTitle').textContent = english ? 'Privacy requests' : 'Demandes de confidentialit\u00e9';
    document.querySelector('#privacyRequestsIntro').textContent = english
      ? 'Administrator-only register. Request details are excluded from the audit log.'
      : 'Registre r\u00e9serv\u00e9 aux administrateurs. Le contenu des demandes n\u2019est pas inscrit au journal d\u2019audit.';
  }

  function updateManagementCopy() {
    updatePrivacyCopy();
    const english = document.documentElement.lang === 'en';
    activityCard.hidden = user.profile !== 'admin';
    document.querySelector('#activitySummaryTitle').textContent = english ? 'Management activity overview' : 'Vue d’activité de la direction';
    document.querySelector('#activitySummaryIntro').textContent = window.NovaTerraApi?.enabled
      ? (english ? 'Citywide aggregate indicators. No personal request content is included.' : 'Indicateurs agrégés de la cité, sans contenu personnel.')
      : (english ? 'Connect the Nova Terra API to load current citywide indicators.' : 'Connecte l’API Nova Terra pour afficher les indicateurs globaux à jour.');
    if (!window.NovaTerraApi?.enabled && user.profile === 'admin') {
      activityHost.replaceChildren();
      activityFeedback.textContent = english ? 'The global overview is available in server mode.' : 'La vue globale est disponible en mode serveur.';
    }
    if (window.NovaTerraApi?.enabled) {
      document.querySelector('#city-management .section-heading>span').textContent = english ? 'Nova Terra API · synchronized' : 'API Nova Terra · synchronisée';
      document.querySelector('#announcementForm').closest('.management-card').querySelector(':scope > p:not(.kicker)').textContent = english
        ? 'Residents will see this notice in the alert centre; new announcements also appear in the public news feed.'
        : 'Les habitants verront cette information dans le centre des alertes; les annonces seront aussi publiées dans le fil d’actualités.';
      document.querySelector('#managedAccounts').closest('.management-card').querySelector(':scope > p:not(.kicker)').textContent = english
        ? 'Suspend or restore resident access. Administrators can also assign agent and administrator roles.'
        : 'Suspends ou rétablis un accès citoyen. Les administrateurs peuvent aussi attribuer les rôles agent et administrateur.';
    }
    const isAdmin = user.profile === 'admin';
    if (!isAdmin && !targetSelect.value) targetSelect.selectedIndex = 1;
    document.querySelector('#announcementForm').closest('.management-card').querySelector(':scope > p:not(.kicker)').textContent = window.NovaTerraApi?.enabled
      ? (english
        ? (isAdmin ? 'Citywide notices appear on the public home page and in residents’ alert centres. Agents can publish notices for a selected sector.' : 'Choose a sector to publish a notice. Citywide notices are reserved for administrators.')
        : (isAdmin ? 'Les informations générales apparaissent sur l’accueil public et dans le centre d’alertes des habitants. Les agents peuvent cibler un secteur.' : 'Choisis un secteur pour publier une information. Les annonces à tous les habitants sont réservées aux administrateurs.')
      )
      : (english
        ? 'Demo notices are saved in this browser only. Connect the city API to share them with residents across devices.'
        : 'Les informations de démonstration sont enregistrées dans ce navigateur uniquement. Connecte l’API municipale pour les partager entre habitants et appareils.');
    killSwitchCard.hidden = !isAdmin;
    const unavailableOption = form.querySelector('#announcementServiceFields [name="serviceStatus"] option[value="unavailable"]');
    unavailableOption.disabled = !isAdmin;
    unavailableOption.hidden = !isAdmin;
    const killSwitchCopy = english()
      ? { kicker: 'F63 · RAPID SERVICE SHUTDOWN', title: 'Stop an unavailable service', intro: window.NovaTerraApi?.enabled ? 'Administrator-only. This change is published immediately to the citizen site and recorded in the audit log.' : 'Administrator-only demonstration: this status is saved only in this browser.', service: 'Service', reason: 'Reason or instruction (optional)', button: 'Mark unavailable' }
      : { kicker: 'F63 · INTERRUPTION RAPIDE', title: 'Couper un service indisponible', intro: window.NovaTerraApi?.enabled ? 'Réservé aux administrateurs. La modification est publiée immédiatement sur le site citoyen et journalisée.' : 'Démonstration administrateur : ce statut est enregistré uniquement dans ce navigateur.', service: 'Service', reason: 'Motif ou consigne (facultatif)', button: 'Déclarer indisponible' };
    killSwitchCard.querySelector('.kicker').textContent = killSwitchCopy.kicker;
    document.querySelector('#serviceKillSwitchTitle').textContent = killSwitchCopy.title;
    document.querySelector('#serviceKillSwitchIntro').textContent = killSwitchCopy.intro;
    killSwitchForm.querySelector('label[for="serviceKillSwitchService"]').firstChild.textContent = `${killSwitchCopy.service}`;
    document.querySelector('#serviceKillSwitchReasonLabel').firstChild.textContent = `${killSwitchCopy.reason}`;
    document.querySelector('#serviceKillSwitchButton').textContent = killSwitchCopy.button;
    Object.entries(serviceLabels()).forEach(([value, label]) => {
      const option = killSwitchService.querySelector(`option[value="${value}"]`);
      if (option) option.textContent = label;
    });
  if (isAdmin && !auditCategory.querySelector('option[value="privacy"]')) auditCategory.add(new Option('Confidentialité', 'privacy'));
    if (isAdmin || user.profile === 'agent') {
      auditCard.hidden = false;
      auditNavLink.hidden = false;
      auditNavLink.textContent = isAdmin
        ? (english ? 'Security audit log' : 'Journal de sécurité')
        : (english ? 'Activity history' : 'Journal d’activité');
      auditCard.querySelector('.kicker').textContent = isAdmin
        ? (english ? 'F47 · F48 · ACTION TRACE' : 'F47 · F48 · TRACE DES ACTIONS')
        : (english ? 'F48 · ADMINISTRATION CHANGES' : 'F48 · CHANGEMENTS ADMINISTRATIFS');
      auditCard.querySelector('h3').textContent = isAdmin
        ? (english ? 'Security and audit log' : 'Journal de sécurité et d’audit')
        : (english ? 'Who changed what?' : 'Qui a modifié quoi ?');
      document.querySelector('#auditIntro').textContent = window.NovaTerraApi?.enabled
        ? (isAdmin
          ? (english ? 'Review who changed accounts, requests, announcements, service states and appointments.' : 'Consulte qui a modifié les comptes, demandes, annonces, statuts des services et rendez-vous.')
          : (english ? 'Follow operational changes and account access updates made by administrators and agents.' : 'Suis les changements opérationnels et les accès modifiés par les administrateurs et les agents.'))
        : (english ? 'Connect the Nova Terra backend to keep and review the audit trail.' : 'Connecte le backend Nova Terra pour conserver et consulter le journal.');
      const categoryLabel = auditCategory.labels[0];
      categoryLabel.firstChild.textContent = english ? 'Filter the log' : 'Filtrer le journal';
      [...auditCategory.options].forEach((option) => {
        const labels = english
          ? { '': 'All actions', auth: 'Sign-ins', account: 'Accounts and roles', access: 'Access and roles', report: 'Requests', contact: 'Citizen messages', announcement: 'Announcements', service: 'Service status', appointment: 'Appointments', privacy: 'Privacy requests', official: 'API sync' }
          : { '': 'Toutes les actions', auth: 'Connexions', account: 'Comptes et rôles', access: 'Accès et rôles', report: 'Demandes', contact: 'Messages citoyens', announcement: 'Annonces', service: 'Statuts des services', appointment: 'Rendez-vous', privacy: 'Confidentialité', official: 'Synchronisation API' };
        option.textContent = labels[option.value] || option.textContent;
        option.hidden = isAdmin ? option.value === 'access' : ['auth', 'account', 'contact', 'privacy'].includes(option.value);
      });
      document.querySelector('#refreshAudit').textContent = english ? 'Refresh' : 'Actualiser';
      auditLoadMore.textContent = english ? 'Load more' : 'Charger plus';
      auditCategory.disabled = !window.NovaTerraApi?.enabled;
      document.querySelector('#refreshAudit').disabled = !window.NovaTerraApi?.enabled;
      if (!window.NovaTerraApi?.enabled) auditFeedback.textContent = english ? 'Audit storage is available in server mode.' : 'Le journal d’audit est disponible en mode serveur.';
    }
  }

  async function renderActivitySummary() {
    if (user.profile !== 'admin' || !window.NovaTerraApi?.enabled) return;
    activityFeedback.textContent = english() ? 'Loading citywide indicators…' : 'Chargement des indicateurs globaux…';
    try {
      const result = await window.NovaTerraApi.request('/activity-summary');
      const summary = result.summary;
      if (!summary?.users || !summary?.requests) throw new Error('invalid_activity_summary');
      const values = english()
        ? [
          ['Registered accounts', summary.users.total], ['Active citizens', summary.users.citizens],
          ['Active agents', summary.users.agents], ['Reports recorded', summary.requests.total],
          ['Resolved reports', summary.requests.resolved], ['Reports in 7 days', summary.requests.submittedLast7Days],
          ['Upcoming appointments', summary.upcomingAppointments], ['Unread contact messages', summary.unreadMessages],
          ['Open privacy requests', summary.pendingPrivacyRequests], ['Active announcements', summary.activeAnnouncements],
          ['Audit events · 7 days', summary.actionsLast7Days],
        ]
        : [
          ['Comptes enregistrés', summary.users.total], ['Citoyens actifs', summary.users.citizens],
          ['Agents actifs', summary.users.agents], ['Signalements enregistrés', summary.requests.total],
          ['Signalements résolus', summary.requests.resolved], ['Signalements · 7 jours', summary.requests.submittedLast7Days],
          ['Rendez-vous à venir', summary.upcomingAppointments], ['Messages de contact non lus', summary.unreadMessages],
          ['Demandes RGPD ouvertes', summary.pendingPrivacyRequests], ['Annonces actives', summary.activeAnnouncements],
          ['Actions auditées · 7 jours', summary.actionsLast7Days],
        ];
      activityHost.replaceChildren(...values.map(([label, value]) => {
        const item = element('div', 'activity-summary-item');
        item.append(element('dt', '', label), element('dd', '', new Intl.NumberFormat(english() ? 'en' : 'fr').format(Number(value) || 0)));
        return item;
      }));
      activityFeedback.textContent = english()
        ? `Updated ${new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(summary.generatedAt))}`
        : `Mis à jour · ${new Intl.DateTimeFormat('fr', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(summary.generatedAt))}`;
    } catch (_) {
      activityFeedback.textContent = english() ? 'The global activity summary could not be loaded.' : 'La synthèse d’activité globale n’a pas pu être chargée.';
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
      if (item.kind === 'service_status' && item.serviceStatus === 'unavailable' && user.profile !== 'admin') {
        close.disabled = true;
        close.title = english() ? 'Only an administrator can restore this service.' : 'Seul un administrateur peut rétablir ce service.';
      }
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
    if (event.action === 'privacy_request.created') return english() ? 'Privacy request submitted' : 'Demande de confidentialit\u00e9 envoy\u00e9e';
    if (event.action === 'privacy_request.updated') return english() ? 'Privacy request processed' : 'Demande de confidentialit\u00e9 trait\u00e9e';
    if (event.action === 'official_requests.feed_changed') return english() ? 'Official request feed changed' : 'Flux des demandes officielles mis à jour';
    return labels[event.action] || event.summary || event.action;
  }

  function renderAuditRows() {
    const roleLabels = english()
      ? { ADMIN: 'Administrator', AGENT: 'Agent', CITOYEN: 'Citizen', ANONYMOUS: 'Visitor', SYSTEM: 'System' }
      : { ADMIN: 'Administrateur', AGENT: 'Agent', CITOYEN: 'Citoyen', ANONYMOUS: 'Visiteur', SYSTEM: 'Système' };
    const entityLabels = english()
      ? { account: 'Account', citizen_request: 'Citizen request', announcement: 'Announcement', service: 'Service', appointment: 'Appointment', request_feed: 'Official request feed' }
      : { account: 'Compte', citizen_request: 'Demande citoyenne', announcement: 'Annonce', service: 'Service', appointment: 'Rendez-vous', request_feed: 'Flux de demandes officielles' };
    auditHost.replaceChildren(...auditEvents.map((event) => {
      const row = element('article', 'audit-log-entry');
      const heading = element('div', 'audit-log-heading');
      heading.append(element('b', '', auditActionLabel(event)));
      const time = element('time', '', new Intl.DateTimeFormat(english() ? 'en' : 'fr', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.occurredAt)));
      time.dateTime = event.occurredAt;
      heading.append(time);
      const actor = element('p', 'audit-log-actor', `${event.actorEmail || (roleLabels[event.actorRole] || event.actorRole)} · ${roleLabels[event.actorRole] || event.actorRole}`);
      const entity = element('small', 'audit-log-entity', `${entityLabels[event.entityType] || event.entityType.replace(/_/g, ' ')}${event.entityId ? ` · ${event.entityId}` : ''}`);
      const metadata = event.metadata && Object.keys(event.metadata).length
        ? element('small', 'audit-log-metadata', Object.entries(event.metadata).map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`).join(' · '))
        : null;
      row.append(heading, actor, entity);
      if (metadata) row.append(metadata);
      return row;
    }));
  }

  async function renderAuditLogs(append = false) {
    if (!['admin', 'agent'].includes(user.profile) || !window.NovaTerraApi?.enabled || auditLoading) return;
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

  const privacyTypeLabels = () => english()
    ? { access: 'Access my data', copy: 'Receive a data copy', rectification: 'Correct my data', restriction: 'Limit data use', opposition: 'Object to data use' }
    : { access: 'Acc\u00e8s aux donn\u00e9es', copy: 'Copie des donn\u00e9es', rectification: 'Rectification', restriction: 'Limitation', opposition: 'Opposition' };
  const privacyStatusLabels = () => english()
    ? { received: 'Received', in_review: 'Under review', completed: 'Completed', declined: 'Declined' }
    : { received: 'Re\u00e7ue', in_review: 'En cours d\u2019examen', completed: 'Trait\u00e9e', declined: 'Refus\u00e9e' };

  async function renderPrivacyRequests() {
    if (user.profile !== 'admin') return;
    if (!window.NovaTerraApi?.enabled) {
      privacyHost.textContent = english()
        ? 'Connect the city API to receive and process privacy requests.'
        : 'Connecte l\u2019API municipale pour recevoir et traiter les demandes de confidentialit\u00e9.';
      return;
    }
    privacyFeedback.textContent = english() ? 'Loading privacy requests...' : 'Chargement des demandes de confidentialit\u00e9...';
    try {
      const result = await window.NovaTerraApi.request('/privacy-requests');
      if (!Array.isArray(result.requests)) throw new Error('invalid_privacy_request_response');
      if (!result.requests.length) {
        privacyHost.replaceChildren(element('p', 'appointment-empty', english() ? 'No privacy requests to process.' : 'Aucune demande de confidentialit\u00e9 \u00e0 traiter.'));
        privacyFeedback.textContent = '';
        return;
      }
      privacyHost.replaceChildren(...result.requests.map((request) => {
        const card = element('article', 'privacy-admin-entry');
        const heading = element('div', 'privacy-admin-heading');
        heading.append(element('b', '', `${privacyTypeLabels()[request.requestType] || request.requestType} \u00b7 ${request.id}`));
        heading.append(element('span', '', privacyStatusLabels()[request.status] || request.status));
        const person = element('small', 'privacy-admin-person', `${request.requesterName || (english() ? 'Deleted account' : 'Compte supprim\u00e9')}${request.requesterEmail ? ` \u00b7 ${request.requesterEmail}` : ''}`);
        const details = element('p', 'privacy-admin-details', request.details || (english() ? 'No additional details.' : 'Aucune pr\u00e9cision suppl\u00e9mentaire.'));
        const date = element('time', 'privacy-admin-date', new Intl.DateTimeFormat(english() ? 'en' : 'fr', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(request.createdAt)));
        date.dateTime = request.createdAt;
        const form = document.createElement('form');
        form.className = 'privacy-admin-form';
        const statusLabel = element('label', '', english() ? 'Status' : 'Statut');
        const statusSelect = document.createElement('select');
        statusSelect.setAttribute('aria-label', english() ? `Status for ${request.id}` : `Statut de ${request.id}`);
        Object.entries(privacyStatusLabels()).forEach(([value, label]) => statusSelect.add(new Option(label, value)));
        statusSelect.value = request.status;
        statusLabel.append(statusSelect);
        const responseLabel = element('label', '', english() ? 'Response to citizen' : 'R\u00e9ponse au citoyen');
        const responseInput = document.createElement('textarea');
        responseInput.maxLength = 600;
        responseInput.rows = 2;
        responseInput.value = request.responseNote || '';
        responseInput.setAttribute('aria-label', english() ? `Response to ${request.id}` : `R\u00e9ponse pour ${request.id}`);
        responseLabel.append(responseInput);
        const save = element('button', '', english() ? 'Save update' : 'Enregistrer le suivi');
        save.type = 'submit';
        form.append(statusLabel, responseLabel, save);
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          save.disabled = true;
          try {
            await window.NovaTerraApi.request(`/privacy-requests/${encodeURIComponent(request.id)}`, {
              method: 'PATCH', body: JSON.stringify({ status: statusSelect.value, responseNote: responseInput.value }),
            });
            auditCursor = null;
            auditEvents = [];
            await renderPrivacyRequests();
            privacyFeedback.textContent = english() ? 'Privacy request updated.' : 'Demande de confidentialit\u00e9 mise \u00e0 jour.';
            renderAuditLogs();
          } catch (error) {
            privacyFeedback.textContent = error.message === 'PRIVACY_RESPONSE_REQUIRED'
              ? (english() ? 'Add a response before closing a request.' : 'Ajoute une r\u00e9ponse avant de cl\u00f4turer la demande.')
              : (english() ? 'The privacy request could not be updated.' : 'La demande de confidentialit\u00e9 n\u2019a pas pu \u00eatre mise \u00e0 jour.');
            save.disabled = false;
          }
        });
        card.append(heading, person, details, date);
        if (request.responseNote) card.append(element('p', 'privacy-admin-previous-response', `${english() ? 'Current response' : 'R\u00e9ponse actuelle'}: ${request.responseNote}`));
        card.append(form);
        return card;
      }));
      privacyFeedback.textContent = '';
    } catch (_) {
      privacyFeedback.textContent = english() ? 'Privacy requests could not be loaded.' : 'Les demandes de confidentialit\u00e9 n\u2019ont pas pu \u00eatre charg\u00e9es.';
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
        ? { invalid_text: 'Add a title and message within the field limits.', invalid_expiry: 'Choose an expiration time in the future.', invalid_service_status: 'Choose a service and its status.', admin_required_for_kill_switch: 'Only an administrator can stop or restore an unavailable service.', admin_required_for_citywide_announcement: 'Only an administrator can publish an announcement to all residents. Choose a sector instead.' }
        : { invalid_text: 'Ajoute un titre et un message dans les limites indiquées.', invalid_expiry: 'Choisis une date d’expiration future.', invalid_service_status: 'Choisis un service et son statut.', admin_required_for_kill_switch: 'Seul un administrateur peut couper ou rétablir un service indisponible.', admin_required_for_citywide_announcement: 'Seul un administrateur peut publier une information à tous les habitants. Choisis un secteur.' };
      feedback.textContent = messages[error.message] || (english() ? 'The information could not be saved in this browser.' : 'L’information n’a pas pu être enregistrée dans ce navigateur.');
      feedback.hidden = false;
    }
  });
  killSwitchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (user.profile !== 'admin') return;
    const serviceName = serviceLabels()[killSwitchService.value] || killSwitchService.value;
    const english = document.documentElement.lang === 'en';
    const reason = killSwitchReason.value.trim();
    const button = document.querySelector('#serviceKillSwitchButton');
    if (!window.confirm(english
      ? `Mark ${serviceName} unavailable and publish the notice now?`
      : `Déclarer ${serviceName} indisponible et publier l’information maintenant ?`)) return;
    button.disabled = true;
    killSwitchFeedback.textContent = '';
    try {
      const item = await window.NovaTerraCity.publishAnnouncement({
        kind: 'service_status',
        service: killSwitchService.value,
        serviceStatus: 'unavailable',
        title: `${english ? 'Service unavailable' : 'Service indisponible'} · ${serviceName}`,
        body: reason || (english
          ? 'This service is temporarily unavailable. Please check the city service status before starting a request.'
          : 'Ce service est temporairement indisponible. Consulte le statut du service avant d’entamer une démarche.'),
      });
      killSwitchFeedback.textContent = english
        ? `${serviceName} marked unavailable. Notice ${item.id} published.`
        : `${serviceName} déclaré indisponible. Information ${item.id} publiée.`;
      killSwitchReason.value = '';
      await renderAnnouncements();
      renderAuditLogs();
    } catch (error) {
      killSwitchFeedback.textContent = error.message === 'admin_required_for_kill_switch'
        ? (english ? 'Only an administrator can stop or restore an unavailable service.' : 'Seul un administrateur peut couper ou rétablir un service indisponible.')
        : (english ? 'The service status could not be changed.' : 'Le statut du service n’a pas pu être modifié.');
    } finally {
      button.disabled = false;
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
    renderActivitySummary();
    renderAccounts();
    renderAnnouncements();
    renderPrivacyRequests();
    renderAuditRows();
    renderAuditLogs();
    kindSelect.dispatchEvent(new Event('change'));
  });
  window.NovaTerraEco.schedulePolling(() => {
    if (!document.hidden && window.NovaTerraApi?.enabled) {
      renderAnnouncements();
      renderAccounts();
      if (user.profile === 'admin') {
        renderPrivacyRequests();
        renderActivitySummary();
      }
      renderAuditLogs();
    }
  });
  updateManagementCopy();
  renderAnnouncements();
  renderAccounts();
  if (user.profile === 'admin') {
    renderPrivacyRequests();
    renderActivitySummary();
  }
  renderAuditLogs();
})();
