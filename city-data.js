(() => {
  const announcementKey = 'terra-nova.community-announcements.v1';
  const appointmentKey = 'terra-nova.appointments.v1';
  const serviceIds = new Set(['water', 'health', 'energy', 'mobility', 'civic', 'solidarity', 'other']);
  const announcementKinds = new Set(['general', 'news', 'flood', 'health', 'service_status']);
  const serviceStates = new Set(['operational', 'maintenance', 'unavailable']);
  const appointmentStates = new Set(['booked', 'cancelled', 'completed']);
  const apiEnabled = () => Boolean(window.NovaTerraApi?.enabled);

  function safeText(value, maxLength) {
    const text = String(value ?? '').trim();
    if (!text || text.length > maxLength) throw new Error('invalid_text');
    return text;
  }

  function id(prefix) {
    return `${prefix}-${globalThis.crypto?.randomUUID?.().slice(0, 8).toUpperCase() || Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  }

  function readList(key) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch (_) {
      return [];
    }
  }

  function writeList(key, entries, eventName) {
    localStorage.setItem(key, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(eventName));
  }

  function requireStaff() {
    const session = window.NovaTerraAuth?.getSession();
    if (!session || !['agent', 'admin'].includes(session.profile)) throw new Error('forbidden');
    return session;
  }

  function normalizeAnnouncement(item) {
    if (!item || !announcementKinds.has(item.kind) || !item.id) return null;
    const expiry = item.expiresAt ? new Date(item.expiresAt) : null;
    return {
      id: String(item.id),
      kind: item.kind,
      title: String(item.title || '').slice(0, 120),
      body: String(item.body || '').slice(0, 1200),
      targetSector: String(item.targetSector || ''),
      service: serviceIds.has(item.service) ? item.service : '',
      serviceStatus: serviceStates.has(item.serviceStatus) ? item.serviceStatus : '',
      createdAt: Number.isNaN(new Date(item.createdAt).getTime()) ? new Date().toISOString() : new Date(item.createdAt).toISOString(),
      expiresAt: expiry && !Number.isNaN(expiry.getTime()) ? expiry.toISOString() : '',
      authorEmail: String(item.authorEmail || ''),
      active: item.active !== false,
    };
  }

  async function getAnnouncements({ sector = '', includeTargeted = false } = {}) {
    if (apiEnabled()) {
      const query = includeTargeted ? '?includeTargeted=true' : '';
      const result = await window.NovaTerraApi.request(`/announcements${query}`);
      return Array.isArray(result.announcements) ? result.announcements : [];
    }
    const normalizedSector = String(sector).trim().toLocaleLowerCase('fr');
    return readList(announcementKey)
      .map(normalizeAnnouncement)
      .filter((item) => item && item.active && item.title && item.body)
      .filter((item) => !item.expiresAt || new Date(item.expiresAt).getTime() > Date.now())
      .filter((item) => !item.targetSector || includeTargeted || (normalizedSector && item.targetSector.toLocaleLowerCase('fr') === normalizedSector))
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  }

  async function publishAnnouncement(input = {}) {
    const staff = requireStaff();
    if (!announcementKinds.has(input.kind)) throw new Error('invalid_kind');
    const title = safeText(input.title, 120);
    const body = safeText(input.body, 1200);
    const targetSector = String(input.targetSector || '').trim().slice(0, 120);
    if (input.kind !== 'service_status' && !targetSector && staff.profile !== 'admin') {
      throw new Error('admin_required_for_citywide_announcement');
    }
    if (apiEnabled()) {
      try {
        const result = await window.NovaTerraApi.request('/announcements', {
          method: 'POST', body: JSON.stringify({ ...input, title, body, targetSector }),
        });
        return result.announcement;
      } catch (error) {
        const messages = { INVALID_TEXT: 'invalid_text', INVALID_EXPIRY: 'invalid_expiry', INVALID_SERVICE_STATUS: 'invalid_service_status', ADMIN_REQUIRED_FOR_KILL_SWITCH: 'admin_required_for_kill_switch', ADMIN_REQUIRED_FOR_CITYWIDE_ANNOUNCEMENT: 'admin_required_for_citywide_announcement', FORBIDDEN: 'forbidden' };
        throw new Error(messages[error.message] || error.message);
      }
    }
    const item = {
      id: id('INFO'), kind: input.kind, title, body, targetSector,
      service: '', serviceStatus: '', authorEmail: staff.email,
      createdAt: new Date().toISOString(), expiresAt: '', active: true,
    };
    if (input.kind === 'service_status') {
      if (!serviceIds.has(input.service) || !serviceStates.has(input.serviceStatus)) throw new Error('invalid_service_status');
      if (input.serviceStatus === 'unavailable' && staff.profile !== 'admin') throw new Error('admin_required_for_kill_switch');
      item.service = input.service;
      item.serviceStatus = input.serviceStatus;
      item.targetSector = '';
    }
    if (input.expiresAt) {
      const expiresAt = new Date(input.expiresAt);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) throw new Error('invalid_expiry');
      item.expiresAt = expiresAt.toISOString();
    }
    const announcements = readList(announcementKey);
    if (item.kind === 'service_status') {
      const current = announcements.find((entry) => entry.kind === 'service_status'
        && entry.service === item.service && entry.active
        && (!entry.expiresAt || new Date(entry.expiresAt).getTime() > Date.now()));
      if (current?.serviceStatus === 'unavailable' && item.serviceStatus !== 'unavailable' && staff.profile !== 'admin') {
        throw new Error('admin_required_for_kill_switch');
      }
      announcements.forEach((entry) => {
        if (entry.kind === 'service_status' && entry.service === item.service) entry.active = false;
      });
    }
    announcements.unshift(item);
    writeList(announcementKey, announcements, 'terra-nova:announcements-updated');
    return item;
  }

  async function closeAnnouncement(announcementId) {
    const staff = requireStaff();
    if (apiEnabled()) {
      try {
        await window.NovaTerraApi.request(`/announcements/${encodeURIComponent(announcementId)}/close`, { method: 'PATCH' });
      } catch (error) {
        if (error.message === 'ADMIN_REQUIRED_FOR_KILL_SWITCH') throw new Error('admin_required_for_kill_switch');
        throw error;
      }
      return { id: announcementId, active: false };
    }
    const announcements = readList(announcementKey);
    const entry = announcements.find((item) => item.id === announcementId);
    if (!entry) throw new Error('announcement_not_found');
    if (entry.kind === 'service_status' && entry.serviceStatus === 'unavailable' && staff.profile !== 'admin') {
      throw new Error('admin_required_for_kill_switch');
    }
    entry.active = false;
    writeList(announcementKey, announcements, 'terra-nova:announcements-updated');
    return entry;
  }

  async function getServiceStatuses() {
    if (apiEnabled()) {
      const result = await window.NovaTerraApi.request('/service-statuses');
      return result.statuses || {};
    }
    const statuses = {};
    (await getAnnouncements()).forEach((item) => {
      if (item.kind === 'service_status' && item.service && !statuses[item.service]) statuses[item.service] = item;
    });
    return statuses;
  }

  function normalizeAppointment(item) {
    if (!item || typeof item.ownerEmail !== 'string' || !item.ownerEmail.includes('@')) return null;
    const scheduled = new Date(item.scheduledAt);
    if (Number.isNaN(scheduled.getTime()) || !appointmentStates.has(item.status || 'booked')) return null;
    return {
      id: String(item.id || ''),
      ownerEmail: item.ownerEmail.toLowerCase(),
      ownerName: String(item.ownerName || 'Habitant').slice(0, 80),
      sector: String(item.sector || '').slice(0, 120),
      service: serviceIds.has(item.service) ? item.service : 'other',
      agentEmail: String(item.agentEmail || ''),
      agentName: String(item.agentName || 'Premier agent disponible').slice(0, 80),
      purpose: String(item.purpose || '').slice(0, 500),
      staffNote: String(item.staffNote || '').slice(0, 1000),
      scheduledAt: scheduled.toISOString(),
      createdAt: String(item.createdAt || scheduled.toISOString()),
      reminderSentAt: String(item.reminderSentAt || ''),
      status: item.status || 'booked',
      updatedAt: String(item.updatedAt || item.createdAt || scheduled.toISOString()),
    };
  }

  async function getAppointments(ownerEmail = null) {
    if (apiEnabled()) {
      const result = await window.NovaTerraApi.request('/appointments');
      return Array.isArray(result.appointments) ? result.appointments : [];
    }
    const normalizedEmail = ownerEmail === null ? null : String(ownerEmail).trim().toLowerCase();
    return readList(appointmentKey)
      .map(normalizeAppointment)
      .filter((item) => item && item.id)
      .filter((item) => normalizedEmail === null || item.ownerEmail === normalizedEmail)
      .sort((left, right) => new Date(left.scheduledAt) - new Date(right.scheduledAt));
  }

  async function createAppointment(input = {}) {
    const session = window.NovaTerraAuth?.getSession();
    if (!session || session.profile !== 'citizen' || session.email.toLowerCase() !== String(input.ownerEmail || '').toLowerCase()) throw new Error('forbidden');
    if (!serviceIds.has(input.service)) throw new Error('invalid_service');
    const scheduledAt = new Date(input.scheduledAt);
    if (apiEnabled()) {
      try {
        const result = await window.NovaTerraApi.request('/appointments', {
          method: 'POST', body: JSON.stringify({
            service: input.service, agentEmail: input.agentEmail || '', scheduledAt: scheduledAt.toISOString(),
            localDate: input.localDate || '', localTime: input.localTime || '',
            timezoneOffset: Number(input.timezoneOffset), purpose: input.purpose,
          }),
        });
        return result.appointment;
      } catch (error) {
        const messages = { INVALID_SLOT: 'invalid_slot', OUTSIDE_HOURS: 'outside_hours', SLOT_UNAVAILABLE: 'slot_unavailable', AGENT_UNAVAILABLE: 'agent_unavailable', INVALID_INPUT: 'invalid_text' };
        throw new Error(messages[error.message] || error.message);
      }
    }
    const now = Date.now();
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < now + 120000 || scheduledAt.getTime() > now + 365 * 86400000) throw new Error('invalid_slot');
    const hour = scheduledAt.getHours();
    const minute = scheduledAt.getMinutes();
    if (hour < 8 || hour >= 17 || (hour === 16 && minute > 30)
      || (minute !== 0 && minute !== 30) || scheduledAt.getDay() === 0 || scheduledAt.getDay() === 6) {
      throw new Error('outside_hours');
    }
    const requestedAgentEmail = String(input.agentEmail || '').trim().toLowerCase();
    const agents = await window.NovaTerraAuth.getAvailableAgents();
    const agent = requestedAgentEmail
      ? agents.find((item) => item.email.toLowerCase() === requestedAgentEmail)
      : agents[0];
    if (!agent) throw new Error('agent_unavailable');
    const collision = (await getAppointments()).some((item) => item.status === 'booked'
      && item.agentEmail === agent.email
      && Math.abs(new Date(item.scheduledAt).getTime() - scheduledAt.getTime()) < 30 * 60000);
    if (collision) throw new Error('slot_unavailable');
    const createdAt = new Date().toISOString();
    const item = normalizeAppointment({
      id: id('RDV'), ownerEmail: session.email, ownerName: session.name, sector: session.sector,
      service: input.service, agentEmail: agent.email, agentName: agent.name,
      purpose: safeText(input.purpose, 500), scheduledAt: scheduledAt.toISOString(), createdAt,
      reminderSentAt: '', status: 'booked', updatedAt: createdAt,
    });
    writeList(appointmentKey, [item, ...readList(appointmentKey)], 'terra-nova:appointments-updated');
    return item;
  }

  async function updateAppointment(appointmentId, status) {
    if (!appointmentStates.has(status)) throw new Error('invalid_appointment_status');
    const session = window.NovaTerraAuth?.getSession();
    if (!session) throw new Error('forbidden');
    if (apiEnabled()) {
      const result = await window.NovaTerraApi.request(`/appointments/${encodeURIComponent(appointmentId)}`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
      return result.appointment;
    }
    const appointments = readList(appointmentKey);
    const entry = appointments.find((item) => item.id === appointmentId);
    if (!entry) throw new Error('appointment_not_found');
    const staff = ['agent', 'admin'].includes(session.profile);
    const owner = entry.ownerEmail.toLowerCase() === session.email.toLowerCase();
    if (!staff && !(owner && status === 'cancelled')) throw new Error('forbidden');
    entry.status = status;
    entry.updatedAt = new Date().toISOString();
    writeList(appointmentKey, appointments, 'terra-nova:appointments-updated');
    return normalizeAppointment(entry);
  }

  async function updateAppointmentStaffNote(appointmentId, staffNote) {
    const session = window.NovaTerraAuth?.getSession();
    if (!session || !['agent', 'admin'].includes(session.profile)) throw new Error('forbidden');
    const note = String(staffNote || '').trim();
    if (note.length > 1000) throw new Error('invalid_note');
    if (apiEnabled()) {
      const result = await window.NovaTerraApi.request(`/appointments/${encodeURIComponent(appointmentId)}`, {
        method: 'PATCH', body: JSON.stringify({ staffNote: note }),
      });
      return result.appointment;
    }
    const appointments = readList(appointmentKey);
    const entry = appointments.find((item) => item.id === appointmentId);
    if (!entry) throw new Error('appointment_not_found');
    if (session.profile === 'agent' && entry.agentEmail?.toLowerCase() !== session.email.toLowerCase()) throw new Error('forbidden');
    entry.staffNote = note;
    entry.updatedAt = new Date().toISOString();
    writeList(appointmentKey, appointments, 'terra-nova:appointments-updated');
    return normalizeAppointment(entry);
  }

  async function markAppointmentReminder(appointmentId) {
    const session = window.NovaTerraAuth?.getSession();
    if (!session) throw new Error('forbidden');
    if (apiEnabled()) {
      await window.NovaTerraApi.request(`/appointments/${encodeURIComponent(appointmentId)}/reminder`, { method: 'POST' });
      return { id: appointmentId, reminderSentAt: new Date().toISOString() };
    }
    const appointments = readList(appointmentKey);
    const entry = appointments.find((item) => item.id === appointmentId && item.ownerEmail.toLowerCase() === session.email.toLowerCase());
    if (!entry) throw new Error('appointment_not_found');
    entry.reminderSentAt = new Date().toISOString();
    writeList(appointmentKey, appointments, 'terra-nova:appointments-updated');
    return normalizeAppointment(entry);
  }

  window.NovaTerraCity = Object.freeze({
    announcementStorageKey: announcementKey,
    appointmentStorageKey: appointmentKey,
    getAnnouncements,
    publishAnnouncement,
    closeAnnouncement,
    getServiceStatuses,
    getAppointments,
    createAppointment,
    updateAppointment,
    updateAppointmentStaffNote,
    markAppointmentReminder,
  });
})();
