(() => {
  if (!window.NovaTerraCity || !window.NovaTerraAuth) return;
  const user = window.NovaTerraAuth.getSession();
  const citizenPanel = document.querySelector('#appointments');
  const agentPanel = document.querySelector('#agentAppointments');
  if (citizenPanel) citizenPanel.hidden = user?.profile !== 'citizen';
  const english = () => document.documentElement.lang === 'en';
  const serviceLabel = (service) => (english()
    ? { water: 'Water and environment', health: 'Health and wellbeing', energy: 'Energy and housing', mobility: 'Mobility', civic: 'Civic life', solidarity: 'Support and assistance', other: 'Other service' }
    : { water: 'Eau et environnement', health: 'Santé et bien-être', energy: 'Énergie et habitat', mobility: 'Mobilité', civic: 'Vie citoyenne', solidarity: 'Aide et accompagnement', other: 'Autre service' })[service] || (english() ? 'Other service' : 'Autre service');
  const appointmentStateLabel = (status) => (english()
    ? { booked: 'Confirmed', cancelled: 'Cancelled', completed: 'Completed' }
    : { booked: 'Confirmé', cancelled: 'Annulé', completed: 'Terminé' })[status] || status;
  const formatDate = (value) => new Intl.DateTimeFormat(english() ? 'en' : 'fr', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  const localDateValue = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

  function addText(parent, tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    parent.append(element);
    return element;
  }

  async function setupCitizenAppointments() {
    if (!citizenPanel || user?.profile !== 'citizen') return;
    const form = document.querySelector('#appointmentForm');
    const feedback = document.querySelector('#appointmentFeedback');
    const list = document.querySelector('#appointmentList');
    const empty = document.querySelector('#appointmentEmpty');
    const reminderHost = document.querySelector('#appointmentReminders');
    const dateInput = document.querySelector('#appointmentDate');
    const agentSelect = document.querySelector('#appointmentAgent');
    const notificationButton = document.querySelector('#enableAppointmentNotifications');
    citizenPanel.hidden = false;
    function updateAppointmentCopy() {
      if (!window.NovaTerraApi?.enabled) return;
      document.querySelector('#appointments .appointments-note').textContent = english()
        ? 'Book a weekday slot from 8 a.m. to 4:30 p.m. A reminder appears one hour beforehand while the dashboard is open. Server bookings are shared across devices.'
        : 'Réserve un créneau en semaine de 8 h à 16 h 30. Un rappel apparaît une heure avant si le tableau de bord reste ouvert. Les réservations serveur sont partagées entre appareils.';
    }
    updateAppointmentCopy();
    const earliestDate = new Date();
    earliestDate.setDate(earliestDate.getDate() + 1);
    dateInput.min = localDateValue(earliestDate);
    const availableAgents = await window.NovaTerraAuth.getAvailableAgents();
    availableAgents.forEach((agent) => {
      const option = new Option(`${agent.name}${agent.sector ? ` · ${agent.sector}` : ''}`, agent.email);
      agentSelect.add(option);
    });
    if (!availableAgents.length) {
      const bookingButton = form.querySelector('[type="submit"]');
      bookingButton.disabled = true;
      feedback.textContent = english()
        ? 'Appointments are unavailable until a municipal agent account is configured.'
        : 'La prise de rendez-vous sera disponible lorsqu’un compte agent municipal sera configuré.';
      feedback.hidden = false;
    }
    if ('Notification' in window && Notification.permission !== 'granted') notificationButton.hidden = false;

    async function renderCitizenAppointments() {
      let items;
      try { items = await window.NovaTerraCity.getAppointments(user.email); }
      catch (_) {
        feedback.textContent = english() ? 'The appointment service is temporarily unavailable.' : 'Le service de rendez-vous est temporairement indisponible.';
        feedback.hidden = false;
        return;
      }
      if ('Notification' in window && Notification.permission === 'granted') {
        const reminderCandidates = items.filter((item) => item.status === 'booked' && !item.reminderSentAt
          && new Date(item.scheduledAt).getTime() > Date.now()
          && new Date(item.scheduledAt).getTime() - Date.now() <= 60 * 60 * 1000);
        for (const item of reminderCandidates) {
          try { await window.NovaTerraCity.markAppointmentReminder(item.id); }
          catch (_) { continue; }
          new Notification(english() ? 'Nova Terra appointment reminder' : 'Rappel de rendez-vous Nova Terra', {
            body: `${serviceLabel(item.service)} · ${formatDate(item.scheduledAt)}`,
            tag: item.id,
          });
        }
      }
      list.replaceChildren();
      items.forEach((item) => {
        const card = document.createElement('article');
        card.className = `appointment-card ${item.status}`;
        const copy = document.createElement('div');
        copy.className = 'appointment-card-copy';
        addText(copy, 'b', '', `${formatDate(item.scheduledAt)} · ${serviceLabel(item.service)}`);
        addText(copy, 'small', '', `${item.agentName} · ${item.sector} · ${appointmentStateLabel(item.status)}`);
        addText(copy, 'small', '', item.purpose);
        card.append(copy);
        if (item.status === 'booked') {
          const cancel = document.createElement('button');
          cancel.type = 'button';
          cancel.textContent = english() ? 'Cancel' : 'Annuler';
          cancel.setAttribute('aria-label', english() ? `Cancel appointment on ${formatDate(item.scheduledAt)}` : `Annuler le rendez-vous du ${formatDate(item.scheduledAt)}`);
          cancel.addEventListener('click', async () => {
            await window.NovaTerraCity.updateAppointment(item.id, 'cancelled');
            renderCitizenAppointments();
          });
          card.append(cancel);
        }
        list.append(card);
      });
      empty.hidden = items.length > 0;
      renderAppointmentReminders(items);
    }

    function renderAppointmentReminders(items) {
      const dueSoon = items.filter((item) => item.status === 'booked'
        && new Date(item.scheduledAt).getTime() > Date.now()
        && new Date(item.scheduledAt).getTime() - Date.now() <= 60 * 60 * 1000);
      reminderHost.replaceChildren();
      reminderHost.hidden = dueSoon.length === 0;
      dueSoon.forEach((item) => {
        addText(reminderHost, 'p', '', english()
          ? `Reminder: ${serviceLabel(item.service)} appointment at ${formatDate(item.scheduledAt)}.`
          : `Rappel : rendez-vous ${serviceLabel(item.service)} à ${formatDate(item.scheduledAt)}.`);
      });
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      feedback.hidden = true;
      const data = new FormData(form);
      const scheduledAt = new Date(`${data.get('date')}T${data.get('time')}`);
      try {
        const appointment = await window.NovaTerraCity.createAppointment({
          ownerEmail: user.email,
          service: data.get('service'),
          agentEmail: data.get('agentEmail'),
          scheduledAt,
          localDate: data.get('date'),
          localTime: data.get('time'),
          timezoneOffset: new Date(`${data.get('date')}T${data.get('time')}`).getTimezoneOffset(),
          purpose: data.get('purpose'),
        });
        feedback.textContent = english()
          ? `Appointment ${appointment.id} saved ${window.NovaTerraApi?.enabled ? 'to your city account' : 'in this browser'}. A reminder will appear one hour beforehand.`
          : `Rendez-vous ${appointment.id} enregistré ${window.NovaTerraApi?.enabled ? 'dans ton compte citoyen' : 'dans ce navigateur'}. Un rappel s’affichera une heure avant.`;
        feedback.hidden = false;
        form.reset();
        const nextAvailableDate = new Date();
        nextAvailableDate.setDate(nextAvailableDate.getDate() + 1);
        dateInput.min = localDateValue(nextAvailableDate);
        renderCitizenAppointments();
      } catch (error) {
        const messages = english()
          ? { invalid_slot: 'Choose a future weekday, between 8:00 a.m. and 5:00 p.m.', outside_hours: 'Appointments are available on weekdays from 8:00 a.m. to 5:00 p.m.', slot_unavailable: 'That agent already has an appointment near this time. Choose another slot.', agent_unavailable: 'That agent is no longer available. Refresh the page and choose another.', invalid_text: 'Add a short reason for the appointment.' }
          : { invalid_slot: 'Choisis un jour ouvré futur entre 8 h et 17 h.', outside_hours: 'Les rendez-vous sont proposés en semaine de 8 h à 17 h.', slot_unavailable: 'Cet agent a déjà un rendez-vous à cette heure. Choisis un autre créneau.', agent_unavailable: 'Cet agent n’est plus disponible. Actualise la page et recommence.', invalid_text: 'Indique brièvement le motif du rendez-vous.' };
        feedback.textContent = messages[error.message] || (english() ? 'The appointment could not be saved in this browser.' : 'Le rendez-vous n’a pas pu être enregistré dans ce navigateur.');
        feedback.hidden = false;
      }
    });

    notificationButton.addEventListener('click', async () => {
      if (!('Notification' in window)) return;
      try {
        const permission = await Notification.requestPermission();
        notificationButton.hidden = permission === 'granted';
      } catch (_) {
        notificationButton.hidden = true;
      }
    });
    renderCitizenAppointments();
    window.setInterval(renderCitizenAppointments, 60_000);
    window.addEventListener('terra-nova:appointments-updated', renderCitizenAppointments);
    window.addEventListener('nova:language-change', () => { updateAppointmentCopy(); renderCitizenAppointments(); });
    window.addEventListener('storage', (event) => {
      if (event.key === window.NovaTerraCity.appointmentStorageKey) renderCitizenAppointments();
    });
  }

  async function setupAgentAppointments() {
    if (!agentPanel || !user || !['agent', 'admin'].includes(user.profile)) return;
    const list = document.querySelector('#managedAppointments');
    const empty = document.querySelector('#managedAppointmentsEmpty');
    function updateAgentAppointmentCopy() {
      if (!window.NovaTerraApi?.enabled) return;
      document.querySelector('#agentAppointments .section-heading>span').textContent = english()
        ? 'Bookings shared across devices'
        : 'Réservations partagées entre appareils';
    }
    updateAgentAppointmentCopy();
    async function renderAgentAppointments() {
      let items;
      try { items = await window.NovaTerraCity.getAppointments(); }
      catch (_) {
        empty.textContent = english() ? 'The appointment service is temporarily unavailable.' : 'Le service de rendez-vous est temporairement indisponible.';
        empty.hidden = false;
        return;
      }
      list.replaceChildren();
      items.forEach((item) => {
        const card = document.createElement('article');
        card.className = `appointment-card ${item.status}`;
        const copy = document.createElement('div');
        copy.className = 'appointment-card-copy';
        addText(copy, 'b', '', `${formatDate(item.scheduledAt)} · ${serviceLabel(item.service)}`);
        addText(copy, 'small', '', `${item.ownerName} (${item.ownerEmail}) · ${item.sector} · ${appointmentStateLabel(item.status)}`);
        addText(copy, 'small', '', item.purpose);
        card.append(copy);
        if (item.status === 'booked') {
          const complete = document.createElement('button');
          complete.type = 'button';
          complete.textContent = english() ? 'Complete' : 'Terminer';
          complete.addEventListener('click', async () => {
            await window.NovaTerraCity.updateAppointment(item.id, 'completed');
            renderAgentAppointments();
          });
          const cancel = document.createElement('button');
          cancel.type = 'button';
          cancel.textContent = english() ? 'Cancel' : 'Annuler';
          cancel.addEventListener('click', async () => {
            await window.NovaTerraCity.updateAppointment(item.id, 'cancelled');
            renderAgentAppointments();
          });
          const actions = document.createElement('div');
          actions.className = 'appointment-actions';
          actions.append(complete, cancel);
          card.append(actions);
        }
        list.append(card);
      });
      empty.hidden = items.length > 0;
    }
    renderAgentAppointments();
    window.addEventListener('terra-nova:appointments-updated', renderAgentAppointments);
    window.addEventListener('nova:language-change', () => { updateAgentAppointmentCopy(); renderAgentAppointments(); });
    window.addEventListener('storage', (event) => {
      if (event.key === window.NovaTerraCity.appointmentStorageKey) renderAgentAppointments();
    });
  }

  void setupCitizenAppointments();
  void setupAgentAppointments();
})();
