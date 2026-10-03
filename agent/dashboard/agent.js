const agentUser = window.NovaTerraAuth.getSession();
window.addEventListener('nova:session-revoked', () => window.location.replace('../../connexion.html?reason=access-revoked'));
if (!agentUser || !['agent', 'admin'].includes(agentUser.profile)) {
  window.location.replace('../../connexion.html?profile=agent');
} else {
const agentInitials = agentUser.name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
document.querySelector('#agentAvatar').textContent = agentInitials || 'AG';
document.querySelector('#agentName').textContent = agentUser.name;
document.querySelector('#agentGreetingName').textContent = agentUser.name.split(/\s+/)[0];
function includeCitizenSubmissions(requests, citizenSubmissions = window.NovaTerra.getLocalCitizenRequests()) {
  const existingIds = new Set(requests.map((request) => request.id));
  return [...citizenSubmissions.filter((request) => !existingIds.has(request.id)), ...requests];
}

const state = { requests: includeCitizenSubmissions(window.NovaTerra.getCachedRequests()), messages: [] };
let dashboardLoading = false;
let lastSuccessfulSyncAt = 0;
const columns = [
  { status: "todo", title: "A traiter" },
  { status: "in_progress", title: "En cours" },
  { status: "done", title: "Termine" }
];

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[character]));
const priorityLabel = { high:"Haute", normal:"Normale", low:"Basse" };
const citizenCategoryLabel = { road:"Voirie et trottoirs", lighting:"Éclairage public", water:"Eau et assainissement", waste:"Déchets et propreté", mobility:"Transports et mobilité", safety:"Sécurité", health:"Santé et solidarité", other:"Autre" };
const citizenServiceLabel = { water:"Eau et environnement", health:"Santé et bien-être", energy:"Énergie et habitat", mobility:"Mobilité", civic:"Vie citoyenne", solidarity:"Aide et accompagnement", other:"Autre service" };

function normalizeSearchText(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function visibleRequests() {
  const query = normalizeSearchText(document.querySelector("#request-search").value.trim());
  const priority = document.querySelector("#priority-filter").value;
  const status = document.querySelector("#status-filter").value;
  const type = document.querySelector("#type-filter").value;
  return state.requests.filter((request) => {
    const searchable = normalizeSearchText([request.id, request.title, request.district, request.type, request.description].join(" "));
    return (!query || searchable.includes(query))
      && (priority === "all" || request.priority === priority)
      && (status === "all" || request.status === status)
      && (type === "all" || request.type === type);
  });
}

function renderRequestSummary(requests) {
  const count = document.querySelector("#request-count");
  const filtersActive = document.querySelector("#request-search").value.trim()
    || document.querySelector("#priority-filter").value !== "all"
    || document.querySelector("#status-filter").value !== "all"
    || document.querySelector("#type-filter").value !== "all";
  count.textContent = filtersActive
    ? `${requests.length} résultat${requests.length === 1 ? "" : "s"} sur ${state.requests.length}`
    : `${state.requests.length} demande${state.requests.length === 1 ? "" : "s"} au total`;
}

function renderTypeOptions() {
  const select = document.querySelector("#type-filter");
  const selectedType = select.value;
  const types = [...new Set(state.requests.map((request) => request.type).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "fr"));
  select.replaceChildren(new Option("Toutes les catégories", "all"));
  types.forEach((type) => select.add(new Option(citizenCategoryLabel[type] || type, type)));
  select.value = types.includes(selectedType) ? selectedType : "all";
}

function renderMetrics() {
  document.querySelector("#todo-total").textContent = state.requests.filter((item) => item.status === "todo").length;
  document.querySelector("#progress-total").textContent = state.requests.filter((item) => item.status === "in_progress").length;
  document.querySelector("#done-total").textContent = state.requests.filter((item) => item.status === "done").length;
  document.querySelector("#message-total").textContent = state.messages.length;
  const unread = state.messages.filter((message) => message.unread).length;
  document.querySelector("#unread-count").textContent = unread;
  document.querySelector("#message-label").textContent = `${state.messages.length} message${state.messages.length > 1 ? "s" : ""}`;
}

function requestCard(request) {
  const statusDisabled = request.source === "citizen-local" || !window.NovaTerra.canUpdateRequestStatus() ? "" : "disabled";
  const updatedAt = request.source === "citizen-local"
    ? new Intl.DateTimeFormat(document.documentElement.lang === "en" ? "en" : "fr", { dateStyle: "medium", timeStyle: "short" }).format(new Date(request.updatedAt))
    : request.updatedAt;
  return `<article class="request-card ${escapeHtml(request.priority)}">
    <p class="request-meta"><span>${escapeHtml(request.id)}</span><span>${escapeHtml(updatedAt)}</span></p>
    <h4>${escapeHtml(request.title)}</h4><p class="request-place">${escapeHtml(request.district)}</p><p class="request-description">${escapeHtml(request.description)}</p>
    <footer><span class="request-badges"><span class="type-label">${escapeHtml(citizenCategoryLabel[request.type] || request.type)}</span>${request.service ? `<span class="service-label">${escapeHtml(citizenServiceLabel[request.service] || request.service)}</span>` : ""}<span class="priority-label ${escapeHtml(request.priority)}">${priorityLabel[request.priority] || "Normale"}</span></span><label class="status-select">Statut<select class="request-status" data-id="${escapeHtml(request.id)}" aria-label="Statut du dossier ${escapeHtml(request.id)}" ${statusDisabled}><option value="todo" ${request.status === "todo" ? "selected" : ""}>À traiter</option><option value="in_progress" ${request.status === "in_progress" ? "selected" : ""}>En cours</option><option value="done" ${request.status === "done" ? "selected" : ""}>Terminé</option></select></label></footer>
  </article>`;
}

function renderKanban() {
  const requests = visibleRequests();
  renderRequestSummary(requests);
  document.querySelector("#kanban").innerHTML = columns.map((column) => {
    const items = requests.filter((request) => request.status === column.status);
    return `<section class="kanban-column"><header class="column-heading"><h3>${column.title}</h3><span>${items.length}</span></header>${items.length ? items.map(requestCard).join("") : "<div class=\"empty-column\">Aucune demande dans cette colonne.</div>"}</section>`;
  }).join("");
}

function renderMessages() {
  const list = document.querySelector("#message-list");
  if (!state.messages.length) { list.innerHTML = "<div class=\"empty-column\">Aucun message citoyen pour le moment.</div>"; return; }
  list.innerHTML = state.messages.map((message) => `<article class="message-row ${message.unread ? "unread" : ""}"><div class="message-sender"><b>${escapeHtml(message.name || "Citoyen")}</b><span>${escapeHtml(message.category || "Message")}</span></div><div class="message-copy"><b>${escapeHtml(message.subject || "Sans sujet")}</b><p>${escapeHtml(message.message || "")}</p></div><time>${escapeHtml(message.createdAt || "Recu recemment")}</time></article>`).join("");
}

function render() { renderMetrics(); renderKanban(); renderMessages(); }

function showDashboardError(message) {
  const error = document.querySelector("#dashboard-error");
  error.textContent = message;
  error.hidden = !message;
}

async function loadDashboard() {
  if (dashboardLoading) return;
  dashboardLoading = true;
  const stateLabel = document.querySelector("#api-state");
  const refreshButton = document.querySelector("#refresh-data");
  refreshButton.disabled = true;
  refreshButton.textContent = "Actualisation…";
  document.querySelector("#requests-readonly").hidden = window.NovaTerra.canUpdateRequestStatus();
  stateLabel.textContent = "Synchronisation...";
  try {
    const [requestsResult, messagesResult, citizenRequestsResult] = await Promise.allSettled([
      window.NovaTerra.getRequests(),
      window.NovaTerra.getMessages(),
      window.NovaTerra.getCitizenRequests()
    ]);
    const failures = [];
    if (requestsResult.status === "fulfilled" && citizenRequestsResult.status === "fulfilled") state.requests = includeCitizenSubmissions(requestsResult.value, citizenRequestsResult.value);
    else {
      const cacheTime = window.NovaTerra.getRequestsCacheTime();
      const cacheStamp = cacheTime ? ` (${new Date(cacheTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })})` : "";
      failures.push(state.requests.length ? `Les demandes du cache local${cacheStamp} sont affichees, mais n'ont pas pu etre actualisees.` : "Les demandes sont indisponibles.");
    }
    if (citizenRequestsResult.status === "rejected") failures.push('Les signalements citoyens ne sont pas disponibles.');
    if (messagesResult.status === "fulfilled") state.messages = messagesResult.value;
    else failures.push("Les messages citoyens n'ont pas pu etre actualises.");

    renderTypeOptions();
    if (failures.length) {
      stateLabel.textContent = state.requests.length ? "Donnees partiellement disponibles" : "API indisponible";
      showDashboardError(failures.join(" "));
    } else {
      stateLabel.textContent = window.NovaTerra.getDataSourceLabel();
      showDashboardError("");
      lastSuccessfulSyncAt = Date.now();
    }
  } finally {
    dashboardLoading = false;
    refreshButton.disabled = false;
    refreshButton.textContent = "Actualiser";
  }
  render();
}

document.querySelector("#request-search").addEventListener("input", renderKanban);
document.querySelectorAll("#priority-filter, #status-filter, #type-filter").forEach((control) => control.addEventListener("change", renderKanban));
document.querySelector("#refresh-data").addEventListener("click", loadDashboard);
window.addEventListener("online", loadDashboard);
document.addEventListener("visibilitychange", () => {
  const staleAfter = window.NovaTerraEco.isLowBandwidth() ? 300_000 : 60_000;
  if (!document.hidden && Date.now() - lastSuccessfulSyncAt >= staleAfter) loadDashboard();
});
document.querySelector("#clear-filters").addEventListener("click", () => {
  document.querySelector("#request-search").value = "";
  document.querySelector("#priority-filter").value = "all";
  document.querySelector("#status-filter").value = "all";
  document.querySelector("#type-filter").value = "all";
  renderKanban();
  document.querySelector("#request-search").focus();
});
document.querySelector("#kanban").addEventListener("change", async (event) => {
  const control = event.target.closest(".request-status");
  if (!control) return;
  const request = state.requests.find((item) => item.id === control.dataset.id);
  if (!request || (request.source !== "citizen-local" && !window.NovaTerra.canUpdateRequestStatus())) return;
  const previousStatus = request.status;
  control.disabled = true;
  try {
    if (request.source === "citizen-local") Object.assign(request, await window.NovaTerra.updateLocalCitizenRequestStatus(request.id, control.value));
    else Object.assign(request, await window.NovaTerra.updateRequestStatus(request.id, control.value));
    showDashboardError("");
    render();
  }
  catch { control.value = previousStatus; control.disabled = false; showDashboardError("La mise a jour du statut a echoue. Reessayez dans un instant."); }
});

window.addEventListener("storage", (event) => {
  if (event.key !== window.NovaTerra.citizenRequestsStorageKey) return;
  state.requests = includeCitizenSubmissions(state.requests.filter((request) => request.source !== "citizen-local"));
  renderTypeOptions();
  render();
});

renderTypeOptions();
render();
loadDashboard();
if (!window.NovaTerra.usingDemoData()) {
  window.NovaTerraEco.schedulePolling(loadDashboard);
}
document.querySelector('#agentLogout').addEventListener('click', () => {
  window.NovaTerraAuth.signOut();
  window.location.replace('../../connexion.html');
});
}
