(() => {
  const user = window.NovaTerraAuth?.getSession();
  if (!user || !['agent', 'admin'].includes(user.profile)) return;
  const form = document.querySelector('#announcementForm');
  const accountHost = document.querySelector('#managedAccounts');
  const announcementHost = document.querySelector('#managedAnnouncements');
  const kindSelect = document.querySelector('#announcementKind');
  const serviceFields = document.querySelector('#announcementServiceFields');
  const targetSelect = form.elements.targetSector;
  const bodyInput = form.elements.body;
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
    if (!window.NovaTerraApi?.enabled) return;
    const english = document.documentElement.lang === 'en';
    document.querySelector('#city-management .section-heading>span').textContent = english ? 'Nova Terra API · synchronized' : 'API Nova Terra · synchronisée';
    document.querySelector('#city-management .management-card:nth-child(1)>p:not(.kicker)').textContent = english
      ? 'Residents will see this notice in the alert centre; new announcements also appear in the public news feed.'
      : 'Les habitants verront cette information dans le centre des alertes; les annonces seront aussi publiées dans le fil d’actualités.';
    document.querySelector('#city-management .management-card:nth-child(2)>p:not(.kicker)').textContent = english
      ? 'Suspend or restore resident access. Administrators can also assign agent and administrator roles.'
      : 'Suspends ou rétablis un accès citoyen. Les administrateurs peuvent aussi attribuer les rôles agent et administrateur.';
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
      });
      row.append(copy);
      if (roleSelect) row.append(roleSelect);
      row.append(control);
      accountHost.append(row);
    });
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
    } catch (error) {
      const messages = english()
        ? { invalid_text: 'Add a title and message within the field limits.', invalid_expiry: 'Choose an expiration time in the future.', invalid_service_status: 'Choose a service and its status.' }
        : { invalid_text: 'Ajoute un titre et un message dans les limites indiquées.', invalid_expiry: 'Choisis une date d’expiration future.', invalid_service_status: 'Choisis un service et son statut.' };
      feedback.textContent = messages[error.message] || (english() ? 'The information could not be saved in this browser.' : 'L’information n’a pas pu être enregistrée dans ce navigateur.');
      feedback.hidden = false;
    }
  });

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
    kindSelect.dispatchEvent(new Event('change'));
  });
  window.setInterval(() => {
    if (!document.hidden && window.NovaTerraApi?.enabled) {
      renderAnnouncements();
      renderAccounts();
    }
  }, 60_000);
  updateManagementCopy();
  renderAnnouncements();
  renderAccounts();
})();
