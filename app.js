const currentUser = window.NovaTerraAuth.getSession();
window.addEventListener('nova:session-revoked', () => window.location.replace('connexion.html?reason=access-revoked'));
const requestedDashboardView = new URLSearchParams(window.location.search).get('view');
if (!currentUser || (requestedDashboardView === 'council' && !['agent', 'admin'].includes(currentUser.profile))) {
  window.location.replace(currentUser ? 'connexion.html?profile=agent' : 'connexion.html');
} else {
const toast = document.querySelector('#toast');
let toastTimer;
let publicReportsLoading = false;
let publicRequests = [];
let lastPublicReportsSuccessAt = 0;
let displayedReportCount = 5;
let reportDataSourceLabel = "Chargement des signalements…";
const reportsPageSize = 5;
let adminAlertFilter = "all";
let personalRequestFilter = "all";
const alertsButton = document.querySelector("#alertsButton");
const alertsDialog = document.querySelector("#alertsDialog");
const alertsCount = document.querySelector("#alertsCount");
const alertsSummary = document.querySelector("#alertsSummary");
const adminAlertList = document.querySelector("#adminAlertList");
const adminAlertEmpty = document.querySelector("#adminAlertEmpty");
const personalRequestsPanel = document.querySelector("#my-requests");
const personalRequestsDialog = document.querySelector("#reportFormDialog");
const citizenReportForm = document.querySelector("#citizenReportForm");
let reportFormTrigger = null;
let lastCitizenReportId = "";
let citizenReportErrorKey = "";
const serviceForReportCategory = {
  road: "mobility", lighting: "energy", water: "water", waste: "water",
  mobility: "mobility", safety: "solidarity", health: "health", other: "civic",
};

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function reportFilterStatus(request) {
  if (request.status === "done") return "resolved";
  if (request.status === "in_progress") return "progress";
  return request.priority === "high" ? "urgent" : "todo";
}

function createReportRow(request) {
  const status = reportFilterStatus(request);
  const labels = { urgent: "URGENT", progress: "EN COURS", resolved: "RÉSOLU", todo: "À TRAITER" };
  const icons = { urgent: "ϟ", progress: "⌁", resolved: "✓", todo: "•" };
  const row = document.createElement("tr");
  row.className = "report-row";
  row.dataset.status = status;
  row.dataset.priority = request.priority;

  const subjectCell = document.createElement("th");
  subjectCell.scope = "row";
  subjectCell.className = "report-subject-cell";

  const icon = document.createElement("div");
  icon.className = `report-icon icon-${status === "todo" ? "progress" : status}`;
  icon.textContent = icons[status];

  const info = document.createElement("div");
  info.className = "report-info";
  const title = document.createElement("b");
  title.textContent = request.title;
  const metadata = document.createElement("span");
  metadata.textContent = `${request.id} · ${request.updatedAt}`;
  info.append(title, metadata);
  const subject = document.createElement("div");
  subject.className = "report-subject";
  subject.append(icon, info);
  subjectCell.append(subject);

  const districtCell = document.createElement("td");
  districtCell.className = "report-district";
  districtCell.textContent = request.district;

  const statusLabel = document.createElement("span");
  statusLabel.className = `status status-${status}`;
  statusLabel.textContent = labels[status];

  const statusCell = document.createElement("td");
  statusCell.className = "report-status-cell";
  statusCell.append(statusLabel);

  const openButton = document.createElement("button");
  openButton.className = "row-arrow";
  openButton.type = "button";
  openButton.dataset.requestId = request.id;
  openButton.setAttribute("aria-haspopup", "dialog");
  openButton.setAttribute("aria-label", `Ouvrir le signalement ${request.id}`);
  openButton.textContent = "↗";

  const actionCell = document.createElement("td");
  actionCell.className = "report-action-cell";
  actionCell.append(openButton);
  row.append(subjectCell, districtCell, statusCell, actionCell);
  return row;
}

function updateCouncilSummary(requests) {
  const urgentRequests = requests.filter((request) => request.priority === "high" && request.status !== "done");
  const openCount = requests.filter((request) => request.status !== "done").length;
  const highlightedRequest = urgentRequests[0];
  const urgentCount = document.querySelector("#council-urgent-count");
  const title = document.querySelector("#council-priority-title");
  const metadata = document.querySelector("#council-priority-meta");
  const description = document.querySelector("#council-priority-description");
  const meter = document.querySelector("#council-urgent-meter");
  const progress = meter.parentElement;

  document.querySelector("#council-source").textContent = reportDataSourceLabel;
  urgentCount.textContent = urgentRequests.length;
  document.querySelector("#council-open-summary").textContent = `${openCount} demande${openCount === 1 ? "" : "s"} ouverte${openCount === 1 ? "" : "s"} sur ${requests.length}`;

  const priorityShare = openCount ? Math.round((urgentRequests.length / openCount) * 100) : 0;
  meter.style.width = `${priorityShare}%`;
  progress.setAttribute("aria-valuenow", String(priorityShare));

  if (!highlightedRequest) {
    title.textContent = requests.length ? "Aucune urgence ouverte" : "Aucun signalement disponible";
    metadata.textContent = requests.length ? "Les demandes haute priorité sont résolues." : "Les données apparaîtront après leur chargement.";
    description.hidden = true;
    description.textContent = "";
    return;
  }

  title.textContent = highlightedRequest.title;
  metadata.textContent = `${highlightedRequest.id} · ${highlightedRequest.district} · ${highlightedRequest.type}`;
  description.textContent = highlightedRequest.description;
  description.hidden = !highlightedRequest.description || highlightedRequest.description === "Aucune description fournie.";
}

function updateReportCounts(requests) {
  const openCount = requests.filter((request) => request.status !== "done").length;
  const counts = {
    all: requests.length,
    urgent: requests.filter((request) => request.priority === "high" && request.status !== "done").length,
    progress: requests.filter((request) => request.status === "in_progress").length,
    resolved: requests.filter((request) => request.status === "done").length
  };
  document.querySelector("#report-total-count").textContent = counts.all;
  document.querySelector("#nav-open-report-count").textContent = openCount;
  document.querySelector("#open-report-count").textContent = openCount;
  Object.entries(counts).forEach(([filter, count]) => {
    document.querySelector(`#report-count-${filter}`).textContent = count;
  });
  updateCouncilSummary(requests);
  renderAdminAlerts(requests);
}

function renderAdminAlerts(requests = publicRequests) {
  const isAdmin = currentUser.profile === "admin";
  alertsButton.hidden = !isAdmin;
  alertsDialog.hidden = !isAdmin;
  if (!isAdmin) return;

  const openCount = requests.filter((request) => request.status !== "done").length;
  const urgentCount = requests.filter((request) => request.priority === "high" && request.status !== "done").length;
  alertsCount.textContent = openCount;
  alertsCount.hidden = openCount === 0;
  alertsButton.setAttribute("aria-label", `Ouvrir le centre d’alertes, ${openCount} alerte${openCount === 1 ? "" : "s"} ouverte${openCount === 1 ? "" : "s"}`);
  alertsSummary.textContent = `${requests.length} signalement${requests.length === 1 ? "" : "s"} · ${openCount} ouvert${openCount === 1 ? "" : "s"} · ${urgentCount} urgent${urgentCount === 1 ? "" : "s"}`;

  const visibleAlerts = requests.filter((request) => {
    if (adminAlertFilter === "urgent") return request.priority === "high" && request.status !== "done";
    if (adminAlertFilter === "open") return request.status !== "done";
    if (adminAlertFilter === "resolved") return request.status === "done";
    return true;
  });
  const statusLabels = { urgent: "URGENT", progress: "EN COURS", resolved: "RÉSOLU", todo: "À TRAITER" };

  adminAlertList.replaceChildren(...visibleAlerts.map((request) => {
    const status = reportFilterStatus(request);
    const card = document.createElement("article");
    card.className = "admin-alert-card";
    card.dataset.status = status;

    const header = document.createElement("div");
    header.className = "admin-alert-card-header";
    const reference = document.createElement("span");
    reference.className = "admin-alert-reference";
    reference.textContent = request.id;
    const statusBadge = document.createElement("span");
    statusBadge.className = `alert-status status-${status}`;
    statusBadge.textContent = statusLabels[status];
    header.append(reference, statusBadge);

    const title = document.createElement("h3");
    title.className = "admin-alert-title";
    title.textContent = request.title;
    const meta = document.createElement("p");
    meta.className = "admin-alert-meta";
    meta.textContent = `${request.district} · ${request.updatedAt}`;

    const actions = document.createElement("div");
    actions.className = "admin-alert-actions";
    if (request.priority === "high" && request.status !== "done") {
      const priority = document.createElement("span");
      priority.className = "alert-priority-high";
      priority.textContent = "Haute priorité";
      actions.append(priority);
    }
    const openButton = document.createElement("button");
    openButton.className = "alert-open-button";
    openButton.type = "button";
    openButton.dataset.alertRequestId = request.id;
    openButton.setAttribute("aria-haspopup", "dialog");
    openButton.textContent = "Voir le détail ↗";
    actions.append(openButton);

    card.append(header, title, meta, actions);
    return card;
  }));
  adminAlertEmpty.hidden = visibleAlerts.length > 0;
}

function matchesReportFilter(request, filter) {
  const status = reportFilterStatus(request);
  return filter === "all"
    || (filter === "urgent" && request.priority === "high" && status !== "resolved")
    || status === filter;
}

function renderPublicReports() {
  const filter = document.querySelector(".filter.active")?.dataset.filter || "all";
  const query = normalizePublicSearch(document.querySelector("#reports-search").value.trim());
  const matchingRequests = publicRequests.filter((request) => {
    const searchable = normalizePublicSearch([request.id, request.title, request.district, request.type, request.description].join(" "));
    return matchesReportFilter(request, filter) && (!query || searchable.includes(query));
  });
  const displayedRequests = matchingRequests.slice(0, displayedReportCount);
  document.querySelector(".report-list").replaceChildren(...displayedRequests.map(createReportRow));
  document.querySelector("#reports-empty").hidden = matchingRequests.length > 0;
  document.querySelector("#loadMoreReports").hidden = displayedRequests.length >= matchingRequests.length;
  document.querySelector("#loadMoreReports").textContent = `Afficher les signalements suivants (${matchingRequests.length - displayedRequests.length})`;
}

function normalizePublicSearch(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function personalRequestLabels() {
  return document.documentElement.lang === "en" ? {
    empty: "No personal requests yet. Use the button above to report an issue.",
    emptyFilter: "There are no requests in this section yet.",
    updated: "Updated",
    status: { todo: "Received", in_progress: "In progress", done: "Resolved" },
    priority: { high: "Urgent priority", normal: "Standard priority", low: "Low priority" },
    service: { water: "Water and environment", health: "Health and wellbeing", energy: "Energy and housing", mobility: "Mobility", civic: "Civic life", solidarity: "Support and assistance", other: "Other service" },
    type: { road: "Roads and sidewalks", lighting: "Public lighting", water: "Water and sanitation", waste: "Waste and cleanliness", mobility: "Transport and mobility", safety: "Safety", health: "Health and support", other: "Other" },
  } : {
    empty: "Aucune demande personnelle pour le moment. Utilise le bouton ci-dessus pour signaler un problème.",
    emptyFilter: "Aucune demande dans cette partie de l’historique.",
    updated: "Mise à jour",
    status: { todo: "Reçue", in_progress: "En cours", done: "Résolue" },
    priority: { high: "Priorité urgente", normal: "Priorité normale", low: "Priorité faible" },
    service: { water: "Eau et environnement", health: "Santé et bien-être", energy: "Énergie et habitat", mobility: "Mobilité", civic: "Vie citoyenne", solidarity: "Aide et accompagnement", other: "Autre service" },
    type: { road: "Voirie et trottoirs", lighting: "Éclairage public", water: "Eau et assainissement", waste: "Déchets et propreté", mobility: "Transports et mobilité", safety: "Sécurité", health: "Santé et solidarité", other: "Autre" },
  };
}

let communitySupportLoad = 0;
async function renderCommunitySupports() {
  const list = document.querySelector('#communitySupportList');
  const note = document.querySelector('#communitySupportNote');
  const feedback = document.querySelector('#communitySupportFeedback');
  const english = document.documentElement.lang === 'en';
  if (!window.NovaTerraApi?.enabled) {
    note.textContent = english
      ? 'Community support needs the shared city service. Demo reports remain on this device.'
      : 'Le soutien communautaire nécessite le service municipal partagé. En mode démo, les signalements restent sur cet appareil.';
    list.replaceChildren();
    feedback.textContent = '';
    return;
  }
  note.textContent = english
    ? 'Support open reports that matter to your area. Names, email addresses and descriptions are not shown here.'
    : 'Soutiens les signalements ouverts qui concernent aussi ton quartier. Les noms, adresses e-mail et descriptions ne sont pas affichés ici.';
  const load = ++communitySupportLoad;
  try {
    const result = await window.NovaTerraApi.request('/citizen-requests/community');
    if (load !== communitySupportLoad) return;
    const requests = Array.isArray(result.requests) ? result.requests : [];
    feedback.textContent = '';
    if (!requests.length) {
      const empty = document.createElement('p');
      empty.className = 'community-support-empty';
      empty.textContent = english ? 'No open shared reports yet.' : 'Aucun signalement ouvert à soutenir pour le moment.';
      list.replaceChildren(empty);
      return;
    }
    const labels = personalRequestLabels();
    const states = english ? { todo: 'Received', in_progress: 'In progress' } : { todo: 'Reçue', in_progress: 'En cours' };
    const cards = requests.map((request) => {
      const card = document.createElement('article');
      card.className = 'community-support-card';
      const copy = document.createElement('div');
      copy.className = 'community-support-copy';
      const title = document.createElement('h4');
      title.textContent = request.title;
      const meta = document.createElement('p');
      meta.textContent = `${request.id} · ${request.district} · ${labels.service[request.service] || labels.service.other} · ${states[request.status] || request.status}`;
      copy.append(title, meta);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'community-support-button';
      button.setAttribute('aria-pressed', String(Boolean(request.supportedByMe)));
      button.disabled = Boolean(request.isMine);
      const setLabel = () => {
        const count = Number(request.supportCount) || 0;
        button.textContent = request.isMine
          ? (english ? `Your report · ${count} support${count === 1 ? '' : 's'}` : `Ton signalement · ${count} soutien${count > 1 ? 's' : ''}`)
          : request.supportedByMe
            ? (english ? `Withdraw support · ${count}` : `Retirer mon soutien · ${count}`)
            : (english ? `Support · ${count}` : `Soutenir · ${count}`);
      };
      setLabel();
      button.addEventListener('click', async () => {
        if (request.isMine || button.disabled) return;
        button.disabled = true;
        feedback.textContent = '';
        try {
          await window.NovaTerraApi.request(`/citizen-requests/${encodeURIComponent(request.id)}/support`, {
            method: request.supportedByMe ? 'DELETE' : 'PUT',
          });
          await renderCommunitySupports();
        } catch (error) {
          feedback.textContent = error.message === 'REQUEST_CLOSED'
            ? (english ? 'This report has been closed.' : 'Ce signalement est clôturé.')
            : (english ? 'Your support could not be saved. Try again.' : 'Ton soutien n’a pas pu être enregistré. Réessaie.');
          button.disabled = false;
        }
      });
      card.append(copy, button);
      return card;
    });
    list.replaceChildren(...cards);
  } catch (_) {
    if (load !== communitySupportLoad) return;
    list.replaceChildren();
    feedback.textContent = english ? 'Community requests could not be loaded.' : 'Les demandes de la communauté n’ont pas pu être chargées.';
  }
}

async function renderPersonalRequests() {
  if (!personalRequestsPanel || personalRequestsPanel.hidden) return;
  const english = document.documentElement.lang === "en";
  const labels = personalRequestLabels();
  let requests;
  try {
    requests = (await window.NovaTerra.getCitizenRequests(currentUser.email))
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  } catch (_) {
    const empty = document.querySelector('#personalRequestEmpty');
    empty.textContent = document.documentElement.lang === 'en' ? 'Your requests could not be loaded. Try again shortly.' : 'Tes demandes n’ont pas pu être chargées. Réessaie dans un instant.';
    empty.hidden = false;
    return;
  }
  const openCount = requests.filter((request) => request.status !== "done").length;
  const historyCount = requests.length - openCount;
  document.querySelector("#myRequestCountAll").textContent = requests.length;
  document.querySelector("#myRequestCountOpen").textContent = openCount;
  document.querySelector("#myRequestCountHistory").textContent = historyCount;
  document.querySelector("#my-requests-nav-count").textContent = requests.length;
  document.querySelectorAll("[data-personal-filter]").forEach((button) => {
    const active = button.dataset.personalFilter === personalRequestFilter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const visibleRequests = requests.filter((request) => personalRequestFilter === "all"
    || (personalRequestFilter === "open" && request.status !== "done")
    || (personalRequestFilter === "history" && request.status === "done"));
  const list = document.querySelector("#personalRequestList");
  list.replaceChildren(...visibleRequests.map((request) => {
    const card = document.createElement("article");
    card.className = "personal-request-card";
    const top = document.createElement("div");
    top.className = "personal-request-top";
    const reference = document.createElement("span");
    reference.className = "personal-request-reference";
    reference.textContent = request.id;
    const date = document.createElement("time");
    date.className = "personal-request-date";
    date.dateTime = request.updatedAt;
    date.textContent = `${labels.updated} · ${new Intl.DateTimeFormat(english ? "en" : "fr", { dateStyle: "medium", timeStyle: "short" }).format(new Date(request.updatedAt))}`;
    top.append(reference, date);
    const title = document.createElement("h3");
    title.className = "personal-request-title";
    title.textContent = request.title;
    const description = document.createElement("p");
    description.className = "personal-request-description";
    description.textContent = request.description;
    const bottom = document.createElement("div");
    bottom.className = "personal-request-bottom";
    const status = document.createElement("span");
    status.className = `status ${request.status === "done" ? "status-resolved" : "status-progress"}`;
    status.textContent = labels.status[request.status];
    const service = document.createElement("span");
    service.className = "personal-request-service";
    service.textContent = labels.service[request.service] || labels.service.other;
    const category = document.createElement("span");
    category.className = "personal-request-type";
    category.textContent = labels.type[request.type] || request.type;
    const priority = document.createElement("span");
    priority.className = `personal-request-priority ${request.priority}`;
    priority.textContent = labels.priority[request.priority] || labels.priority.normal;
    bottom.append(status, service, category, priority);
    card.append(top, title, description, bottom);
    if (request.status === 'done') {
      let savedFeedback = request.feedback;
      if (!window.NovaTerraApi?.enabled) {
        try { savedFeedback = JSON.parse(localStorage.getItem(`nova-terra.request-feedback.v1:${request.id}`) || 'null'); } catch (_) { savedFeedback = null; }
      }
      if (savedFeedback) {
        const note = document.createElement('p');
        note.className = 'request-feedback-saved';
        note.textContent = `${english ? 'Your rating' : 'Ton avis'} : ${'★'.repeat(savedFeedback.rating)}${savedFeedback.comment ? ` · ${savedFeedback.comment}` : ''}`;
        card.append(note);
      } else {
        const form = document.createElement('form');
        form.className = 'request-feedback-form';
        const label = document.createElement('label'); label.textContent = english ? 'Rate this service' : 'Évalue ce service';
        const rating = document.createElement('select'); rating.name = 'rating'; rating.required = true;
        rating.add(new Option(english ? 'Choose a rating' : 'Choisir une note', ''));
        for (let value = 5; value >= 1; value -= 1) rating.add(new Option(`${value} / 5`, String(value)));
        const comment = document.createElement('input'); comment.name = 'comment'; comment.maxLength = 500; comment.placeholder = english ? 'Optional comment' : 'Commentaire facultatif';
        const button = document.createElement('button'); button.type = 'submit'; button.textContent = english ? 'Send feedback' : 'Envoyer mon avis';
        const message = document.createElement('span'); message.setAttribute('role', 'status');
        label.append(rating); form.append(label, comment, button, message);
        form.addEventListener('submit', async (event) => {
          event.preventDefault(); button.disabled = true;
          const value = { rating: Number(rating.value), comment: comment.value.trim() };
          try {
            if (window.NovaTerraApi?.enabled) await window.NovaTerraApi.request(`/citizen-requests/${encodeURIComponent(request.id)}/feedback`, { method: 'POST', body: JSON.stringify(value) });
            else localStorage.setItem(`nova-terra.request-feedback.v1:${request.id}`, JSON.stringify(value));
            message.textContent = english ? 'Thank you for your feedback.' : 'Merci pour ton retour.';
            savedFeedback = value;
            await renderPersonalRequests();
          } catch (_) {
            message.textContent = english ? 'Your feedback could not be saved.' : 'Impossible d’enregistrer ton avis.';
            button.disabled = false;
          }
        });
        card.append(form);
      }
    }
    return card;
  }));
  document.querySelector("#personalRequestEmpty").textContent = requests.length ? labels.emptyFilter : labels.empty;
  document.querySelector("#personalRequestEmpty").hidden = visibleRequests.length > 0;
  renderCommunitySupports();
}

function openCitizenReportForm(trigger) {
  reportFormTrigger = trigger;
  citizenReportErrorKey = "";
  document.querySelector("#citizenReportError").hidden = true;
  const english = document.documentElement.lang === "en";
  document.querySelector("#reportFormNote").innerHTML = window.NovaTerraApi?.enabled
    ? (english
      ? 'Your report will be sent to the municipal service and shared with signed-in residents in a privacy-filtered list. Your name, email and full description stay private. For an immediate emergency, call <a href="tel:112">112</a>.'
      : 'Ton signalement sera envoyé au service municipal et partagé dans une liste filtrée avec les habitants connectés. Ton nom, ton e-mail et ta description complète restent privés. Pour une urgence immédiate, appelle le <a href="tel:112">112</a>.')
    : (english
      ? 'Demo mode: this report is saved only on this device. Connect the shared municipal service to send it to city staff and share it with residents. For an immediate emergency, call <a href="tel:112">112</a>.'
      : 'Mode démo : ce signalement est enregistré uniquement sur cet appareil. Le service municipal partagé doit être connecté pour le transmettre aux équipes et le partager avec les habitants. Pour une urgence immédiate, appelle le <a href="tel:112">112</a>.');
  citizenReportForm.reset();
  document.querySelector("#reportDistrictInput").value = currentUser.sector || "";
  personalRequestsDialog.showModal();
}

function renderPersonalRequestFeedback() {
  if (!lastCitizenReportId) return;
  const english = document.documentElement.lang === "en";
  document.querySelector("#personalRequestFeedback").textContent = english
    ? `Receipt confirmed: report ${lastCitizenReportId} was received and saved ${window.NovaTerraApi?.enabled ? 'to your city account' : 'on this device'}. Keep this reference to follow its status.`
    : `Accusé de réception : le signalement ${lastCitizenReportId} a bien été reçu et enregistré ${window.NovaTerraApi?.enabled ? 'dans ton compte citoyen' : 'sur cet appareil'}. Garde cette référence pour suivre son état.`;
}

function csvCell(value) {
  let text = String(value ?? '').replace(/\r?\n/g, ' ');
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

async function downloadRequestSummary() {
  const english = document.documentElement.lang === 'en';
  try {
    const requests = (await window.NovaTerra.getCitizenRequests(currentUser.email))
      .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
    const headers = english
      ? ['Reference', 'Title', 'Area', 'Category', 'Service', 'Status', 'Priority', 'Created', 'Last updated', 'Description']
      : ['Référence', 'Titre', 'Secteur', 'Catégorie', 'Service', 'État', 'Priorité', 'Créée le', 'Mise à jour', 'Description'];
    const labels = personalRequestLabels();
    const rows = requests.map((request) => [
      request.id, request.title, request.district, labels.type[request.type] || request.type,
      labels.service[request.service] || labels.service.other, labels.status[request.status] || request.status,
      labels.priority[request.priority] || labels.priority.normal, request.createdAt, request.updatedAt, request.description,
    ]);
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `nova-terra-demandes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    notify(english ? 'Your request summary was downloaded.' : 'Le récapitulatif de tes démarches a été téléchargé.');
  } catch (_) {
    notify(english ? 'Your requests could not be exported.' : 'Tes demandes n’ont pas pu être exportées.');
  }
}

function renderCitizenReportError() {
  if (!citizenReportErrorKey) return;
  const error = document.querySelector("#citizenReportError");
  error.textContent = document.documentElement.lang === "en"
    ? "The report could not be saved in this browser. Check available storage and try again."
    : "Le signalement n’a pas pu être enregistré dans ce navigateur. Vérifie l’espace disponible puis réessaie.";
}

personalRequestsPanel.hidden = currentUser.profile !== "citizen";
if (window.NovaTerraApi?.enabled) {
  document.querySelector('#myRequestsNote').textContent = document.documentElement.lang === 'en'
    ? 'Your reports are saved to your city account and can be followed from another device.'
    : 'Tes signalements sont enregistrés dans ton compte et consultables depuis un autre appareil.';
}
document.querySelector('.nav-item[href="#my-requests"]').hidden = personalRequestsPanel.hidden;
if (!personalRequestsPanel.hidden) renderPersonalRequests();
document.querySelector('#exportRequestSummary').addEventListener('click', downloadRequestSummary);
document.querySelector("#openReportForm").addEventListener("click", (event) => openCitizenReportForm(event.currentTarget));
document.querySelector("#closeReportForm").addEventListener("click", () => personalRequestsDialog.close());
document.querySelector("#cancelReportForm").addEventListener("click", () => personalRequestsDialog.close());
document.querySelector("#reportCategory").addEventListener("change", (event) => {
  const service = serviceForReportCategory[event.currentTarget.value];
  if (service) document.querySelector("#reportService").value = service;
});
personalRequestsDialog.addEventListener("close", () => {
  if (reportFormTrigger?.isConnected) reportFormTrigger.focus();
});
citizenReportForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = document.querySelector("#citizenReportError");
  citizenReportErrorKey = "";
  error.hidden = true;
  const values = Object.fromEntries(new FormData(citizenReportForm));
  if (values.website) return;
  try {
    const request = await window.NovaTerra.createCitizenRequest({ ...values, ownerEmail: currentUser.email });
    await renderPersonalRequests();
    if (window.NovaTerraApi?.enabled) await renderCommunitySupports();
    const feedback = document.querySelector("#personalRequestFeedback");
    lastCitizenReportId = request.id;
    renderPersonalRequestFeedback();
    feedback.hidden = false;
    personalRequestFilter = "all";
    renderPersonalRequests();
    citizenReportForm.reset();
    personalRequestsDialog.close();
  } catch (saveError) {
    citizenReportErrorKey = "save-failed";
    if (saveError?.message === 'DUPLICATE_SUBMISSION') {
      document.querySelector('#citizenReportError').textContent = document.documentElement.lang === 'en'
        ? 'A similar report was just submitted. Check your request history before sending it again.'
        : 'Un signalement similaire vient d’être envoyé. Consulte ton historique avant de le soumettre à nouveau.';
    } else renderCitizenReportError();
    error.hidden = false;
  }
});
document.querySelectorAll("[data-personal-filter]").forEach((button) => button.addEventListener("click", () => {
  personalRequestFilter = button.dataset.personalFilter;
  renderPersonalRequests();
}));
window.addEventListener("terra-nova:citizen-requests-updated", renderPersonalRequests);
window.addEventListener("storage", (event) => {
  if (event.key === window.NovaTerra.citizenRequestsStorageKey) renderPersonalRequests();
});
window.addEventListener("nova:language-change", () => {
  renderPersonalRequests();
  renderPersonalRequestFeedback();
  renderCitizenReportError();
  document.querySelector('#exportRequestSummary').textContent = document.documentElement.lang === 'en' ? 'Download my summary' : 'Télécharger mon récapitulatif';
  if (window.NovaTerraApi?.enabled) {
    const english = document.documentElement.lang === 'en';
    document.querySelector('#myRequestsNote').textContent = english
      ? 'Your reports are saved to your city account and can be followed from another device.'
      : 'Tes signalements sont enregistrés dans ton compte et consultables depuis un autre appareil.';
    document.querySelector('#profileDialog .profile-dialog-intro').textContent = english
      ? 'Your name and district are saved to your city account. Your profile photo is stored with the account.'
      : 'Ton nom, ton secteur et ta photo sont enregistrés avec ton compte citoyen.';
    document.querySelector('#profileDialog .profile-photo-setting small').textContent = english
      ? 'Image · 8 MB maximum · synced to your city account'
      : 'Image · 8 Mo maximum · synchronisée avec ton compte';
    document.querySelector('#deleteAccountNote').textContent = english
      ? 'This permanently deletes your account, reports, contact messages and appointments from the city database.'
      : 'Cette action supprime définitivement ton compte, tes signalements, messages de contact et rendez-vous du serveur municipal.';
  }
});
if (window.NovaTerraApi?.enabled && !personalRequestsPanel.hidden) window.NovaTerraEco.schedulePolling(renderPersonalRequests);

const reportDialog = document.querySelector("#reportDialog");
const reportDialogStatusLabels = { todo: "À traiter", urgent: "Urgent", progress: "En cours", resolved: "Résolu" };
const reportDialogPriorityLabels = { high: "Haute priorité", normal: "Priorité normale", low: "Priorité basse" };

function openReportDetails(requestId, trigger) {
  const request = publicRequests.find((item) => item.id === requestId);
  if (!request) {
    notify("Ce signalement n’est plus disponible. Actualise la liste puis réessaie.");
    return;
  }

  const status = reportFilterStatus(request);
  document.querySelector("#reportDialogReference").textContent = `SIGNALEMENT ${request.id}`;
  document.querySelector("#reportDialogTitle").textContent = request.title;
  document.querySelector("#reportDialogStatus").textContent = reportDialogStatusLabels[status];
  document.querySelector("#reportDialogStatus").className = `detail-badge status-${status === "todo" ? "progress" : status}`;
  document.querySelector("#reportDialogPriority").textContent = reportDialogPriorityLabels[request.priority];
  document.querySelector("#reportDialogUpdated").textContent = request.updatedAt;
  document.querySelector("#reportDialogDescription").textContent = request.description;
  document.querySelector("#reportDialogLocation").textContent = `${request.district} · ${request.type}`;
  reportDialog.returnValue = "";
  reportDialog.showModal();
  reportDialog.addEventListener("close", () => {
    if (trigger.isConnected) trigger.focus();
  }, { once: true });
}

async function loadPublicReports() {
  if (publicReportsLoading) return;

  if (!publicRequests.length) {
    const cachedRequests = window.NovaTerra.getCachedRequests();
    if (cachedRequests.length) {
      publicRequests = cachedRequests;
      reportDataSourceLabel = "Instantané local · actualisation en cours";
      updateReportCounts(publicRequests);
      renderPublicReports();
    }
  }

  const error = document.querySelector("#reports-api-error");
  const loading = document.querySelector("#reports-loading");
  const apiStatus = document.querySelector("#api-status");
  const refreshButton = document.querySelector("#refreshReports");
  const apiStatusText = apiStatus.querySelector("span:last-child");
  refreshButton.disabled = true;
  refreshButton.textContent = "Actualisation…";
  apiStatus.classList.remove("demo", "unavailable");
  apiStatusText.textContent = "Actualisation des signalements…";
  publicReportsLoading = true;
  loading.hidden = false;
  loading.textContent = "Actualisation des signalements…";
  try {
    publicRequests = await window.NovaTerra.getRequests();
    lastPublicReportsSuccessAt = Date.now();
    reportDataSourceLabel = window.NovaTerra.usingDemoData()
      ? "Mode démonstration · données fictives"
      : window.NovaTerra.getDataSourceLabel();
    updateReportCounts(publicRequests);
    renderPublicReports();
    if (window.NovaTerra.usingDemoData()) {
      apiStatus.classList.add("demo");
      apiStatusText.textContent = "Mode démonstration · signalements fictifs";
    } else {
      apiStatusText.textContent = window.NovaTerra.getDataSourceLabel();
    }
    error.hidden = true;
  } catch (loadError) {
    console.error("Unable to load public reports.", loadError);
    const cachedRequests = window.NovaTerra.getCachedRequests();
    const usingDemoData = window.NovaTerra.usingDemoData();
    let fallbackSource = "unavailable";
    if (cachedRequests.length) {
      publicRequests = cachedRequests;
      fallbackSource = usingDemoData ? "demo-cache" : "api-cache";
      reportDataSourceLabel = usingDemoData
        ? "Instantané local · mode démonstration"
        : "Instantané local · API indisponible";
    } else if (!publicRequests.length && usingDemoData) {
      publicRequests = window.NovaTerra.getDemoRequests();
      fallbackSource = "demo";
      reportDataSourceLabel = "Mode démonstration · données fictives";
    } else if (!publicRequests.length) {
      reportDataSourceLabel = "Données indisponibles · API inaccessible";
    } else {
      fallbackSource = "memory";
      reportDataSourceLabel = "Dernière réponse en mémoire · API indisponible";
    }
    updateReportCounts(publicRequests);
    renderPublicReports();
    apiStatus.classList.toggle("unavailable", !usingDemoData);
    apiStatus.classList.toggle("demo", usingDemoData);
    const cacheTime = window.NovaTerra.getRequestsCacheTime();
    const cacheStamp = cacheTime ? ` (${new Date(cacheTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })})` : "";
    const fallbackLabels = {
      "api-cache": `API indisponible · instantané local${cacheStamp}`,
      "demo-cache": "Mode démonstration · données locales",
      demo: "Mode démonstration · données fictives",
      memory: "API indisponible · dernière réponse en mémoire",
      unavailable: "API indisponible · aucune donnée disponible"
    };
    apiStatusText.textContent = fallbackLabels[fallbackSource];
    error.textContent = usingDemoData
      ? "Les données de démonstration n’ont pas pu être chargées correctement. Réessaie."
      : publicRequests.length
      ? "La connexion est interrompue. Les dernières demandes disponibles restent affichées."
      : "Les demandes ne sont pas disponibles pour le moment. Reessaie lorsque la connexion est retablie.";
    error.hidden = false;
  } finally {
    loading.hidden = true;
    publicReportsLoading = false;
    refreshButton.disabled = false;
    refreshButton.textContent = "Actualiser ↻";
  }
}

document.querySelectorAll('.filter').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    displayedReportCount = reportsPageSize;
    renderPublicReports();
  });
});

document.querySelectorAll('.view-btn').forEach((button) => {
  button.addEventListener('click', () => {
    const councilView = button.dataset.view === 'council';
    if (councilView && !['agent', 'admin'].includes(currentUser.profile)) {
      notify('Cette vue est réservée aux agents et au Haut Conseil.');
      return;
    }
    document.querySelectorAll('.view-btn').forEach((item) => item.classList.remove('selected'));
    button.classList.add('selected');
    document.querySelector('h1').innerHTML = councilView
      ? 'La cité, sous <span>contrôle.</span>'
      : 'Le pouls de <span>Terra Nova.</span>';
    document.querySelector('.subheading').textContent = councilView
      ? 'Signalements disponibles et priorités à examiner par le Haut Conseil.'
      : 'Chaque signal compte. Voici ce qui se passe dans votre cité.';
    const breadcrumbCurrent = document.querySelector('.breadcrumbs b');
    breadcrumbCurrent.dataset.currentView = councilView ? 'council' : 'citizen';
    breadcrumbCurrent.textContent = councilView
      ? (document.documentElement.lang === 'en' ? 'High Council' : 'Haut Conseil')
      : (document.documentElement.lang === 'en' ? 'Overview' : 'Vue d’ensemble');
    activateNavigationCategory(councilView ? '#council' : '#overview', { writeHistory: true });
  });
});

document.querySelectorAll('.map-point').forEach((point) => point.addEventListener('click', () => notify(`${point.getAttribute('aria-label')} · Point de la carte de démonstration sélectionné.`)));
document.querySelectorAll('.map-controls button').forEach((button, index) => button.addEventListener('click', () => notify(['Carte agrandie.', 'Carte réduite.', 'Carte recentrée.'][index])));
document.querySelector('#allReports').addEventListener('click', () => {
  document.querySelector('[data-filter="all"]').click();
  displayedReportCount = Number.POSITIVE_INFINITY;
  renderPublicReports();
  notify('Affichage de tous les signalements disponibles.');
});
document.querySelector('#mobileReports').addEventListener('click', () => {
  document.querySelector('[data-filter="all"]').click();
  displayedReportCount = Number.POSITIVE_INFINITY;
  renderPublicReports();
  notify('Affichage de tous les signalements disponibles.');
});
document.querySelector("#reports-search").addEventListener("input", () => {
  displayedReportCount = reportsPageSize;
  renderPublicReports();
});
document.querySelector("#loadMoreReports").addEventListener("click", () => {
  displayedReportCount += reportsPageSize;
  renderPublicReports();
});
document.querySelector(".report-list").addEventListener("click", (event) => {
  const trigger = event.target.closest(".row-arrow[data-request-id]");
  if (trigger) openReportDetails(trigger.dataset.requestId, trigger);
});
document.querySelector("#closeReportDialog").addEventListener("click", () => reportDialog.close());
document.querySelector("#closeReportDialogAction").addEventListener("click", () => reportDialog.close());
reportDialog.addEventListener("click", (event) => {
  if (event.target === reportDialog) reportDialog.close();
});
document.querySelector("#reviewUrgentReports").addEventListener("click", () => {
  activateNavigationCategory('#reports', { writeHistory: true });
  document.querySelector('[data-filter="urgent"]').click();
  document.querySelector("#reports").scrollIntoView({ behavior: "smooth", block: "start" });
  document.querySelector("#reports-search").focus({ preventScroll: true });
});
document.querySelector("#refreshReports").addEventListener("click", loadPublicReports);
window.addEventListener("online", loadPublicReports);
document.addEventListener("visibilitychange", () => {
  const staleAfter = window.NovaTerraEco.isLowBandwidth() ? 300_000 : 60_000;
  if (!document.hidden && Date.now() - lastPublicReportsSuccessAt >= staleAfter) loadPublicReports();
});
const menuButton = document.querySelector('#menuButton');
const sidebar = document.querySelector('#sidebar');

function setSidebarOpen(isOpen) {
  sidebar.classList.toggle('open', isOpen);
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
}

menuButton.addEventListener('click', () => setSidebarOpen(!sidebar.classList.contains('open')));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && sidebar.classList.contains('open')) {
    setSidebarOpen(false);
    menuButton.focus();
  }
});
const dashboardNavigation = {
  '#overview': ['.welcome-row', '.metric-grid', '.main-grid', '.bottom-grid'],
  '#citizenServices': ['#citizenServices'],
  '#reports': ['.bottom-grid'],
  '#my-requests': ['#my-requests'],
  '#planet': ['.main-grid'],
  '#participation': ['#participation'],
  '#appointments': ['#appointments'],
  '#council': ['.bottom-grid'],
};
const dashboardNavigationElements = [
  '.welcome-row', '.metric-grid', '.main-grid', '.bottom-grid', '#my-requests',
  '#citizenServices', '#appointments', '#participation',
].map((selector) => document.querySelector(selector)).filter(Boolean);

function activateNavigationCategory(hash, { writeHistory = false } = {}) {
  const isCitizen = currentUser.profile === 'citizen';
  const staffOnlyCategory = hash === '#council';
  const citizenOnlyCategory = ['#my-requests', '#appointments', '#participation'].includes(hash);
  let selectedHash = dashboardNavigation[hash] ? hash : '#overview';
  if ((staffOnlyCategory && isCitizen) || (citizenOnlyCategory && !isCitizen)) selectedHash = '#overview';

  dashboardNavigationElements.forEach((element) => { element.hidden = true; });
  dashboardNavigation[selectedHash].forEach((selector) => {
    const element = document.querySelector(selector);
    if (element) element.hidden = false;
  });
  const reportsPanel = document.querySelector('#reports');
  const councilPanel = document.querySelector('#council');
  reportsPanel.hidden = selectedHash === '#council';
  councilPanel.hidden = isCitizen || selectedHash === '#reports';
  const climatePanel = document.querySelector('.climate-panel');
  if (climatePanel) climatePanel.hidden = selectedHash === '#planet';
  const alertHost = document.querySelector('#communityAlertHost');
  if (alertHost) alertHost.hidden = selectedHash !== '#overview';

  document.querySelector('#my-requests').hidden = !isCitizen || selectedHash !== '#my-requests';
  document.querySelector('#appointments').hidden = !isCitizen || selectedHash !== '#appointments';
  document.querySelector('#participation').hidden = !isCitizen || selectedHash !== '#participation';
  document.querySelector('.nav-item[href="#my-requests"]').hidden = !isCitizen;
  document.querySelector('.nav-item[href="#appointments"]').hidden = !isCitizen;
  document.querySelector('.nav-item[href="#participation"]').hidden = !isCitizen;
  document.querySelector('.nav-item[href="#council"]').hidden = isCitizen;
  document.querySelector('.nav-item[href="agent/dashboard/index.html"]').hidden = isCitizen;
  document.querySelector('.view-btn[data-view="council"]').hidden = isCitizen;
  document.querySelector('.view-switch').hidden = isCitizen;

  document.querySelectorAll('.nav-item').forEach((item) => {
    const active = item.getAttribute('href') === selectedHash;
    item.classList.toggle('active', active);
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
  const councilView = selectedHash === '#council';
  document.querySelectorAll('.view-btn').forEach((button) => button.classList.toggle('selected', button.dataset.view === (councilView ? 'council' : 'citizen')));
  const breadcrumb = document.querySelector('.breadcrumbs b[data-current-view]');
  breadcrumb.dataset.currentView = councilView ? 'council' : 'citizen';
  breadcrumb.textContent = councilView
    ? (document.documentElement.lang === 'en' ? 'High Council' : 'Haut Conseil')
    : (document.documentElement.lang === 'en' ? 'Overview' : 'Vue d’ensemble');
  if (selectedHash === '#overview') {
    document.querySelector('h1').innerHTML = document.documentElement.lang === 'en'
      ? 'The pulse of <span>Terra Nova.</span>' : 'Le pouls de <span>Terra Nova.</span>';
    document.querySelector('.subheading').textContent = document.documentElement.lang === 'en'
      ? 'Every report matters. Here is what is happening in your city.' : 'Chaque signal compte. Voici ce qui se passe dans votre cité.';
  }
  if (writeHistory && window.location.hash !== selectedHash) history.pushState(null, '', selectedHash);
  setSidebarOpen(false);
}

document.querySelectorAll('.nav-item').forEach((link) => link.addEventListener('click', (event) => {
  const href = link.getAttribute('href');
  if (!dashboardNavigation[href]) return;
  event.preventDefault();
  activateNavigationCategory(href, { writeHistory: true });
}));
window.addEventListener('popstate', () => activateNavigationCategory(window.location.hash || '#overview'));
window.addEventListener('hashchange', () => activateNavigationCategory(window.location.hash || '#overview'));
activateNavigationCategory(window.location.hash || '#overview');

const profilePhotoInput = document.querySelector('#profilePhotoInput');
const profilePhotoButtons = [...document.querySelectorAll('.profile-photo-trigger')];
const topProfileButton = document.querySelector('.top-avatar.profile-photo-trigger');
const profilePhotoStorageKey = `novaTerraProfilePhoto.v1:${encodeURIComponent(currentUser.email)}`;
const legacyProfilePhotoStorageKey = 'novaTerraProfilePhoto';
const profileDialog = document.querySelector('#profileDialog');
const profileForm = document.querySelector('#profileForm');
const profileNameInput = document.querySelector('#profileNameInput');
const profileSectorInput = document.querySelector('#profileSectorInput');
const profileFormError = document.querySelector('#profileFormError');
const deleteAccountButton = document.querySelector('#deleteAccountButton');
const deleteAccountDialog = document.querySelector('#deleteAccountDialog');
const deleteAccountForm = document.querySelector('#deleteAccountForm');
const deleteAccountPassword = document.querySelector('#deleteAccountPassword');
const deleteAccountError = document.querySelector('#deleteAccountError');
deleteAccountButton.hidden = currentUser.profile !== 'citizen';
const privacyRequestButton = document.querySelector('#openPrivacyRequests');
const privacyRequestDialog = document.querySelector('#privacyRequestDialog');
const privacyRequestForm = document.querySelector('#privacyRequestForm');
const privacyRequestFields = document.querySelector('#privacyRequestFields');
const privacyRequestList = document.querySelector('#privacyRequestList');
const privacyRequestFeedback = document.querySelector('#privacyRequestFeedback');
privacyRequestButton.hidden = currentUser.profile !== 'citizen';
const exportPersonalDataButton = document.querySelector('#exportPersonalData');
const citizenSecuritySettings = document.querySelector('#citizenSecuritySettings');
exportPersonalDataButton.hidden = currentUser.profile !== 'citizen';
citizenSecuritySettings.hidden = currentUser.profile !== 'citizen';
const profileRole = document.querySelector('#profileRole');

async function exportPersonalData() {
  const english = document.documentElement.lang === 'en';
  exportPersonalDataButton.disabled = true;
  try {
    let data;
    if (window.NovaTerraApi?.enabled) {
      data = await window.NovaTerraApi.request('/auth/me/export');
    } else {
      const readArray = (key) => {
        try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
        catch (_) { return []; }
      };
      const email = currentUser.email.toLowerCase();
      const localAccount = readArray('novaTerraAccounts.v1').find((item) => item.email?.toLowerCase() === email);
      data = {
        format: 'nova-terra-personal-data-v1',
        source: 'local-browser',
        exportedAt: new Date().toISOString(),
        account: {
          email: currentUser.email, name: currentUser.name, sector: currentUser.sector,
          profile: currentUser.profile, createdAt: localAccount?.createdAt || '',
          avatarDataUrl: localStorage.getItem(profilePhotoStorageKey) || '',
        },
        requests: await window.NovaTerra.getCitizenRequests(currentUser.email),
        appointments: readArray('terra-nova.appointments.v1').filter((item) => item.ownerEmail?.toLowerCase() === email),
        contactMessages: readArray('terra-nova.citizen-messages').filter((item) => item.email?.toLowerCase() === email),
        announcementReads: readArray(`terra-nova.announcement-reads.v1:${currentUser.email}`),
        privacyRequests: [],
        security: { note: 'Les données de sécurité et demandes de confidentialité du serveur ne sont pas présentes dans ce navigateur.' },
      };
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nova-terra-donnees-personnelles-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    notify(english ? 'Your personal data export was downloaded.' : 'L’export de tes données personnelles a été téléchargé.');
  } catch (_) {
    notify(english ? 'Your personal data could not be exported.' : 'Tes données personnelles n’ont pas pu être exportées.');
  } finally {
    exportPersonalDataButton.disabled = false;
  }
}

topProfileButton.setAttribute('aria-label', 'Personnaliser le profil');
topProfileButton.title = 'Personnaliser le profil';

function renderProfile(user) {
  const initials = user.name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const roles = {
    citizen: { label: 'CITOYEN', tone: 'citizen' },
    agent: { label: 'AGENT', tone: 'agent' },
    admin: { label: 'ADMIN', tone: 'admin' },
  };
  const role = roles[user.profile] || roles.citizen;
  profileRole.textContent = role.label;
  profileRole.dataset.role = role.tone;
  document.querySelector('.nav-item[href="#council"] .nav-lock').hidden = !['agent', 'admin'].includes(user.profile);
  alertsButton.hidden = user.profile !== 'admin';
  alertsDialog.hidden = user.profile !== 'admin';
  if (user.profile === 'admin') renderAdminAlerts(publicRequests);
  profilePhotoButtons.forEach((button) => {
    if (!button.classList.contains('has-profile-photo')) button.textContent = initials || 'NT';
  });
}

renderProfile(currentUser);

function showProfilePhoto(dataUrl) {
  profilePhotoButtons.forEach((button) => {
    const image = document.createElement('img');
    image.src = dataUrl;
    image.alt = '';
    button.replaceChildren(image);
    const label = button === topProfileButton ? 'Personnaliser le profil' : 'Changer la photo de profil';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.classList.add('has-profile-photo');
  });
}

try {
  let savedProfilePhoto = localStorage.getItem(profilePhotoStorageKey);
  if (!savedProfilePhoto) {
    const legacyProfilePhoto = localStorage.getItem(legacyProfilePhotoStorageKey);
    if (legacyProfilePhoto) {
      localStorage.setItem(profilePhotoStorageKey, legacyProfilePhoto);
      localStorage.removeItem(legacyProfilePhotoStorageKey);
      savedProfilePhoto = legacyProfilePhoto;
    }
  }
  if (savedProfilePhoto) showProfilePhoto(savedProfilePhoto);
} catch (_) {
  // A saved photo is optional when browser storage is unavailable.
}
if (window.NovaTerraApi?.enabled) {
  document.querySelector('#profileDialog .profile-dialog-intro').textContent = document.documentElement.lang === 'en'
    ? 'Your name and district are saved to your city account. Your profile photo is stored with the account.'
    : 'Ton nom, ton secteur et ta photo sont enregistrés avec ton compte citoyen.';
  document.querySelector('#profileDialog .profile-photo-setting small').textContent = document.documentElement.lang === 'en'
    ? 'Image · 8 MB maximum · synced to your city account'
    : 'Image · 8 Mo maximum · synchronisée avec ton compte';
  document.querySelector('#deleteAccountNote').textContent = document.documentElement.lang === 'en'
    ? 'This permanently deletes your account, reports, contact messages and appointments from the city database.'
    : 'Cette action supprime définitivement ton compte, tes signalements, messages de contact et rendez-vous du serveur municipal.';
  window.NovaTerraAuth.getProfilePhoto().then((dataUrl) => { if (dataUrl) showProfilePhoto(dataUrl); }).catch(() => {});
}

function openProfileDialog() {
  profileNameInput.value = currentUser.name;
  profileSectorInput.value = currentUser.sector;
  profileFormError.hidden = true;
  profileFormError.textContent = '';
  profileDialog.showModal();
}

topProfileButton.addEventListener('click', openProfileDialog);
exportPersonalDataButton.addEventListener('click', exportPersonalData);
document.querySelector('#logoutButton').addEventListener('click', () => {
  window.NovaTerraAuth.signOut();
  window.location.replace('connexion.html');
});
document.querySelector('#profileDialogPhoto').addEventListener('click', () => profilePhotoInput.click());
document.querySelector('#closeProfileDialog').addEventListener('click', () => profileDialog.close());
document.querySelector('#cancelProfileEdit').addEventListener('click', () => profileDialog.close());
deleteAccountButton.addEventListener('click', () => {
  profileDialog.close();
  deleteAccountForm.reset();
  deleteAccountError.hidden = true;
  deleteAccountDialog.showModal();
  deleteAccountPassword.focus();
});
document.querySelector('#closeDeleteAccount').addEventListener('click', () => deleteAccountDialog.close());
document.querySelector('#cancelDeleteAccount').addEventListener('click', () => deleteAccountDialog.close());
deleteAccountDialog.addEventListener('close', () => topProfileButton.focus());

const privacyRequestTypeLabels = () => document.documentElement.lang === 'en'
  ? { access: 'Access my personal data', copy: 'Receive a copy of my data', rectification: 'Correct my data', restriction: 'Limit how my data is used', opposition: 'Object to a use of my data' }
  : { access: 'Accès à mes données', copy: 'Recevoir une copie de mes données', rectification: 'Correction de mes données', restriction: 'Limitation de leur utilisation', opposition: 'Opposition à un traitement' };
const privacyRequestStatusLabels = () => document.documentElement.lang === 'en'
  ? { received: 'Received', in_review: 'Under review', completed: 'Completed', declined: 'Declined' }
  : { received: 'Reçue', in_review: 'En cours d’examen', completed: 'Traitée', declined: 'Refusée' };

function updatePrivacyRequestLanguage() {
  const english = document.documentElement.lang === 'en';
  document.querySelector('#privacyRequestKicker').textContent = english ? 'F51 · YOUR DATA' : 'F51 · TES DONNÉES';
  document.querySelector('#privacyRequestTitle').textContent = english ? 'Privacy and personal data' : 'Confidentialité et données personnelles';
  document.querySelector('#privacyRequestAvailability').textContent = !window.NovaTerraApi?.enabled
    ? (english ? 'The privacy register requires the city service to be online. This browser will not store your request.' : 'Le registre de confidentialité nécessite le service municipal en ligne. Ta demande ne sera pas enregistrée dans ce navigateur.')
    : (english ? 'Submit and follow privacy requests linked to your city account.' : 'Dépose et consulte tes demandes de confidentialité liées à ton compte municipal.');
  document.querySelector('#privacyRequestFormTitle').textContent = english ? 'New request' : 'Nouvelle demande';
  document.querySelector('#privacyRequestTypeLabel').firstChild.textContent = english ? 'Request type' : 'Type de demande';
  document.querySelector('#privacyRequestDetailsLabel').firstChild.textContent = english ? 'Details' : 'Précisions';
  document.querySelector('#privacyRequestDetails').placeholder = english ? 'Describe the data concerned and what you are asking for.' : 'Indique les données concernées et ce que tu demandes.';
  document.querySelector('#privacyRequestHint').textContent = english ? 'Do not include your password or unnecessary sensitive information.' : 'N’indique pas ton mot de passe ni d’informations sensibles inutiles.';
  document.querySelector('#submitPrivacyRequest').textContent = english ? 'Submit my request' : 'Envoyer ma demande';
  document.querySelector('#privacyRequestHistoryTitle').textContent = english ? 'My submitted requests' : 'Mes demandes envoyées';
  privacyRequestFields.disabled = !window.NovaTerraApi?.enabled;
  [...document.querySelector('#privacyRequestType').options].forEach((option) => { option.textContent = privacyRequestTypeLabels()[option.value]; });
  if (privacyRequestDialog.open) renderPrivacyRequests();
}

function renderPrivacyRequests(requests = []) {
  const english = document.documentElement.lang === 'en';
  if (!requests.length) {
    const empty = document.createElement('p');
    empty.className = 'privacy-request-empty';
    empty.textContent = english ? 'You have not submitted a privacy request.' : 'Tu n’as pas encore envoyé de demande de confidentialité.';
    privacyRequestList.replaceChildren(empty);
    return;
  }
  privacyRequestList.replaceChildren(...requests.map((request) => {
    const card = document.createElement('article');
    card.className = 'privacy-request-entry';
    const heading = document.createElement('div');
    heading.className = 'privacy-request-entry-heading';
    const title = document.createElement('b');
    title.textContent = privacyRequestTypeLabels()[request.requestType] || request.requestType;
    const state = document.createElement('span');
    state.textContent = privacyRequestStatusLabels()[request.status] || request.status;
    heading.append(title, state);
    const details = document.createElement('p');
    details.textContent = request.details;
    const meta = document.createElement('small');
    meta.textContent = `${request.id} · ${new Intl.DateTimeFormat(english ? 'en' : 'fr', { dateStyle: 'medium' }).format(new Date(request.createdAt))}`;
    card.append(heading, details, meta);
    if (request.responseNote) {
      const response = document.createElement('p');
      response.className = 'privacy-request-response';
      response.textContent = `${english ? 'City response' : 'Réponse de la mairie'}: ${request.responseNote}`;
      card.append(response);
    }
    return card;
  }));
}

async function loadPrivacyRequests() {
  if (!window.NovaTerraApi?.enabled) {
    privacyRequestList.replaceChildren();
    return;
  }
  privacyRequestList.textContent = document.documentElement.lang === 'en' ? 'Loading requests…' : 'Chargement des demandes…';
  try {
    const result = await window.NovaTerraApi.request('/privacy-requests');
    if (!Array.isArray(result.requests)) throw new Error('invalid_privacy_request_response');
    renderPrivacyRequests(result.requests);
  } catch (_) {
    privacyRequestList.textContent = document.documentElement.lang === 'en' ? 'Your requests could not be loaded.' : 'Tes demandes n’ont pas pu être chargées.';
  }
}

privacyRequestButton.addEventListener('click', () => {
  profileDialog.close();
  privacyRequestFeedback.hidden = true;
  privacyRequestFeedback.textContent = '';
  updatePrivacyRequestLanguage();
  privacyRequestDialog.showModal();
  loadPrivacyRequests();
});
document.querySelector('#closePrivacyRequests').addEventListener('click', () => privacyRequestDialog.close());
privacyRequestDialog.addEventListener('close', () => {
  profileDialog.showModal();
  privacyRequestButton.focus();
});
privacyRequestForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  privacyRequestFeedback.hidden = true;
  const submitButton = document.querySelector('#submitPrivacyRequest');
  submitButton.disabled = true;
  try {
    await window.NovaTerraApi.request('/privacy-requests', {
      method: 'POST',
      body: JSON.stringify({ requestType: privacyRequestForm.elements.requestType.value, details: privacyRequestForm.elements.details.value }),
    });
    privacyRequestForm.reset();
    privacyRequestFeedback.classList.remove('is-error');
    privacyRequestFeedback.textContent = document.documentElement.lang === 'en' ? 'Your request has been recorded.' : 'Ta demande a été enregistrée.';
    await loadPrivacyRequests();
  } catch (error) {
    privacyRequestFeedback.classList.add('is-error');
    privacyRequestFeedback.textContent = error.message === 'INVALID_PRIVACY_REQUEST'
      ? (document.documentElement.lang === 'en' ? 'Choose a request type and add a short description.' : 'Choisis un type et ajoute quelques précisions.')
      : (document.documentElement.lang === 'en' ? 'The request could not be recorded. Try again later.' : 'La demande n’a pas pu être enregistrée. Réessaie plus tard.');
  } finally {
    privacyRequestFeedback.hidden = false;
    submitButton.disabled = false;
  }
});
window.addEventListener('nova:language-change', updatePrivacyRequestLanguage);
window.setTimeout(updatePrivacyRequestLanguage, 0);

deleteAccountForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  deleteAccountError.hidden = true;
  const submitButton = deleteAccountForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  const result = await window.NovaTerraAuth.deleteCitizenAccount(deleteAccountPassword.value);
  submitButton.disabled = false;
  if (!result.ok) {
    const messages = {
      invalid_credentials: 'Le mot de passe ne correspond pas à ce compte.',
      account_not_found: 'Le compte est introuvable dans ce navigateur.',
      citizen_account_required: 'Cette action est réservée aux comptes citoyens.',
      storage_unavailable: 'La suppression n’a pas pu être terminée dans ce navigateur.',
    };
    deleteAccountError.textContent = messages[result.error] || 'Impossible de supprimer le compte.';
    deleteAccountError.hidden = false;
    return;
  }
  deleteAccountDialog.close();
  notify(window.NovaTerraApi?.enabled ? 'Compte citoyen et données associées supprimés.' : 'Compte et données locales supprimés.');
  const deletionSource = window.NovaTerraApi?.enabled ? '&source=server' : '';
  window.setTimeout(() => window.location.replace(`index.html?account=deleted${deletionSource}`), 900);
});
profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  profileFormError.hidden = true;
  const result = await window.NovaTerraAuth.updateProfile({
    name: profileNameInput.value,
    sector: profileSectorInput.value,
  });
  if (!result.ok) {
    const messages = {
      account_not_found: 'Le compte est introuvable. Reconnecte-toi puis réessaie.',
      invalid_name: 'Saisis un nom de 1 à 60 caractères.',
      invalid_sector: 'Saisis un secteur de 1 à 60 caractères.',
      storage_full: 'Le stockage du navigateur est plein. Libère de l’espace puis réessaie.',
      storage_unavailable: 'Le profil n’a pas pu être enregistré dans ce navigateur.',
      not_authenticated: 'Ta session a expiré. Reconnecte-toi puis réessaie.',
    };
    profileFormError.textContent = messages[result.error] || 'Impossible d’enregistrer le profil.';
    profileFormError.hidden = false;
    return;
  }

  Object.assign(currentUser, result.user);
  renderProfile(currentUser);
  profileDialog.close();
  notify('Profil mis à jour.');
});

profilePhotoButtons
  .filter((button) => button !== topProfileButton)
  .forEach((button) => button.addEventListener('click', () => profilePhotoInput.click()));
profilePhotoInput.addEventListener('change', () => {
  const photo = profilePhotoInput.files?.[0];
  profilePhotoInput.value = '';
  if (!photo) return;
  if (!photo.type.startsWith('image/')) {
    notify('Choisis un fichier image pour ta photo de profil.');
    return;
  }
  if (photo.size > 8 * 1024 * 1024) {
    notify('La photo doit faire moins de 8 Mo.');
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => notify('Impossible de lire cette photo. Essaie un autre fichier.');
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => notify('Ce format d’image ne peut pas être affiché ici.');
    image.onload = async () => {
      const maxDimension = 512;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        notify('Impossible de préparer cette photo.');
        return;
      }
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
      if (window.NovaTerraApi?.enabled) {
        const saved = await window.NovaTerraAuth.saveProfilePhoto(dataUrl);
        if (!saved.ok) {
          notify('La photo n’a pas pu être enregistrée sur le serveur.');
          return;
        }
        try { localStorage.setItem(profilePhotoStorageKey, dataUrl); } catch (_) { /* The server copy is authoritative. */ }
        showProfilePhoto(dataUrl);
        notify(document.documentElement.lang === 'en' ? 'Profile photo synced to your account.' : 'Photo de profil synchronisée avec ton compte.');
        return;
      }
      let saved = true;
      try {
        localStorage.setItem(profilePhotoStorageKey, dataUrl);
      } catch (_) {
        saved = false;
      }
      showProfilePhoto(dataUrl);
      notify(saved ? 'Photo de profil mise à jour sur cet appareil.' : 'Photo affichée, mais le navigateur ne peut pas la mémoriser.');
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(photo);
});

if (requestedDashboardView === 'council' || currentUser.profile === 'admin') {
  document.querySelector('.view-btn[data-view="council"]')?.click();
}

alertsButton.addEventListener('click', () => {
  if (currentUser.profile !== 'admin') return;
  renderAdminAlerts(publicRequests);
  alertsDialog.showModal();
});
document.querySelector('#closeAlertsDialog').addEventListener('click', () => alertsDialog.close());
alertsDialog.addEventListener('click', (event) => {
  if (event.target === alertsDialog) alertsDialog.close();
});
document.querySelectorAll('[data-alert-filter]').forEach((button) => button.addEventListener('click', () => {
  adminAlertFilter = button.dataset.alertFilter;
  document.querySelectorAll('[data-alert-filter]').forEach((filterButton) => {
    const isActive = filterButton === button;
    filterButton.classList.toggle('active', isActive);
    filterButton.setAttribute('aria-pressed', String(isActive));
  });
  renderAdminAlerts(publicRequests);
}));
adminAlertList.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-alert-request-id]');
  if (trigger) openReportDetails(trigger.dataset.alertRequestId, trigger);
});

if (window.NovaTerra.usingDemoData()) {
  const apiStatus = document.querySelector("#api-status");
  apiStatus.classList.add("demo");
  apiStatus.querySelector("span:last-child").textContent = "Mode démonstration · signalements fictifs";
} else {
  window.NovaTerraEco.schedulePolling(loadPublicReports);
}
loadPublicReports();
}
