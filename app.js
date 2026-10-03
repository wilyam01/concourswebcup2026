/* Change API_BASE_URL when the API team publishes its service. */
const API_BASE_URL = "";

const seedRequests = [
  { id: "TN-1042", title: "Eclairage absent sur l'allee des Mimosas", location: "Quartier Horizon", category: "Infrastructure", priority: "critical", status: "pending", createdAt: "Il y a 12 min", description: "Les trois lampadaires entre la place des Artisans et l'ecole ne fonctionnent plus depuis hier soir." },
  { id: "TN-1041", title: "Collecte des dechets reportee", location: "Rive Sud", category: "Environnement", priority: "normal", status: "in_progress", createdAt: "Il y a 27 min", description: "Les bacs de la rue des Mangles n'ont pas ete collectes selon le calendrier prevu." },
  { id: "TN-1039", title: "Passage pieton a securiser", location: "Portes du Levant", category: "Mobilite", priority: "critical", status: "pending", createdAt: "Il y a 48 min", description: "La signalisation pres du marche est effacee et les enfants traversent dans une zone peu visible." },
  { id: "TN-1037", title: "Proposer un jardin partage", location: "Plateau Est", category: "Solidarite", priority: "low", status: "pending", createdAt: "Il y a 1 h", description: "Un collectif d'habitants propose de valoriser la parcelle municipale actuellement inutilisee." },
  { id: "TN-1035", title: "Fuite d'eau pres du centre sportif", location: "District Aurore", category: "Infrastructure", priority: "normal", status: "in_progress", createdAt: "Il y a 2 h", description: "Une fuite continue est visible sur le trottoir et rend le passage glissant." },
  { id: "TN-1031", title: "Arbre tombe apres les rafales", location: "Jardins du Nord", category: "Securite", priority: "critical", status: "resolved", createdAt: "Il y a 3 h", description: "L'intervention des espaces verts a permis de degager la voie et de securiser la zone." },
  { id: "TN-1028", title: "Ajouter un banc pres de l'arret", location: "Rive Sud", category: "Mobilite", priority: "low", status: "rejected", createdAt: "Il y a 5 h", description: "La demande a ete regroupee avec le prochain programme d'amenagement de quartier." }
];

let requests = [...seedRequests];
let selectedId = requests[0].id;

const statusLabels = { pending: "En attente", in_progress: "En traitement", resolved: "Resolue", rejected: "Refusee" };
const priorityLabels = { critical: "Haute", normal: "Normale", low: "Basse" };

function escapeHtml(value) {
  return String(value).replace(/[&<>'\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

const elements = {
  list: document.querySelector("#request-list"), detail: document.querySelector("#detail-panel"), council: document.querySelector("#council-list"),
  search: document.querySelector("#search-input"), status: document.querySelector("#status-filter"), priority: document.querySelector("#priority-filter"),
  resultCount: document.querySelector("#result-count"), navCount: document.querySelector("#nav-count"), councilCount: document.querySelector("#council-count"),
  dialog: document.querySelector("#report-dialog"), form: document.querySelector("#report-form"), syncState: document.querySelector("#sync-state")
};

function filteredRequests() {
  const query = elements.search.value.trim().toLowerCase();
  return requests.filter((request) => {
    const matchesQuery = !query || [request.title, request.location, request.category, request.id].join(" ").toLowerCase().includes(query);
    return matchesQuery && (elements.status.value === "all" || request.status === elements.status.value) && (elements.priority.value === "all" || request.priority === elements.priority.value);
  });
}

function updateMetrics() {
  const count = (status) => requests.filter((request) => request.status === status).length;
  document.querySelector("#metric-pending").textContent = count("pending");
  document.querySelector("#metric-progress").textContent = count("in_progress");
  document.querySelector("#metric-critical").textContent = requests.filter((request) => request.priority === "critical" && request.status !== "resolved").length;
  document.querySelector("#metric-done").textContent = count("resolved");
  document.querySelector("#completion-rate").textContent = `${Math.round((count("resolved") / requests.length) * 100)}% de resolution`;
  elements.navCount.textContent = requests.filter((request) => request.status !== "resolved" && request.status !== "rejected").length;
}

function renderList() {
  const visible = filteredRequests();
  elements.resultCount.textContent = `${visible.length} demande${visible.length > 1 ? "s" : ""}`;
  if (!visible.length) {
    elements.list.replaceChildren(document.querySelector("#empty-template").content.cloneNode(true));
    return;
  }
  elements.list.innerHTML = visible.map((request) => `
    <button class="request-item ${request.id === selectedId ? "selected" : ""}" type="button" data-request-id="${escapeHtml(request.id)}">
      <span class="priority-marker ${request.priority}"></span>
      <span><span class="request-meta">${escapeHtml(request.id)} / ${escapeHtml(request.category)} / ${escapeHtml(request.createdAt)}</span><strong class="request-title">${escapeHtml(request.title)}</strong><span class="request-location">${escapeHtml(request.location)}</span></span>
      <span class="status-pill ${request.status}">${statusLabels[request.status]}</span>
    </button>`).join("");
}

function renderDetail() {
  const request = requests.find((item) => item.id === selectedId);
  if (!request) {
    elements.detail.innerHTML = "<p class=\"detail-placeholder\">Selectionne une demande pour consulter son dossier.</p>";
    return;
  }
  const canDecide = request.status === "pending";
  elements.detail.innerHTML = `
    <span class="detail-id">DOSSIER ${escapeHtml(request.id)}</span>
    <h3>${escapeHtml(request.title)}</h3>
    <span class="status-pill ${request.status}">${statusLabels[request.status]}</span>
    <p>${escapeHtml(request.description)}</p>
    <div class="detail-info"><div><span>LOCALISATION</span><strong>${escapeHtml(request.location)}</strong></div><div><span>PRIORITE</span><strong>${priorityLabels[request.priority]}</strong></div><div><span>THEME</span><strong>${escapeHtml(request.category)}</strong></div><div><span>RECU</span><strong>${escapeHtml(request.createdAt)}</strong></div></div>
    ${canDecide ? `<div class="detail-actions"><button class="decision-button approve" type="button" data-decision="in_progress">Mettre en action</button><button class="decision-button" type="button" data-decision="resolved">Clore le dossier</button><button class="decision-button reject" type="button" data-decision="rejected">Refuser la demande</button></div>` : "<p>La decision est enregistree dans le flux de coordination.</p>"}`;
}

function renderCouncil() {
  const pending = requests.filter((request) => request.status === "pending");
  elements.councilCount.textContent = `${pending.length} a statuer`;
  elements.council.innerHTML = pending.length ? pending.map((request) => `
    <article class="council-card"><span class="category-pill">${escapeHtml(request.category.toUpperCase())}</span><h3>${escapeHtml(request.title)}</h3><p>${escapeHtml(request.location)} / Priorite ${priorityLabels[request.priority].toLowerCase()}</p><footer><span>${escapeHtml(request.id)}</span><button type="button" data-open-id="${escapeHtml(request.id)}">Etudier</button></footer></article>`).join("") : "<div class=\"empty-state\"><strong>Aucune decision en attente</strong><p>Le Haut Conseil est a jour.</p></div>";
}

function render() { updateMetrics(); renderList(); renderDetail(); renderCouncil(); }

function changeStatus(id, status) {
  const request = requests.find((item) => item.id === id);
  if (!request) return;
  request.status = status;
  render();
}

async function loadRequests() {
  elements.syncState.innerHTML = "<i></i> Synchronisation...";
  try {
    if (!API_BASE_URL) throw new Error("Demo mode");
    const response = await fetch(`${API_BASE_URL}/requests`);
    if (!response.ok) throw new Error("API unavailable");
    requests = await response.json();
    elements.syncState.innerHTML = "<i></i> API synchronisee";
  } catch {
    elements.syncState.innerHTML = "<i></i> Donnees de demo";
  }
  render();
}

document.addEventListener("click", (event) => {
  const requestItem = event.target.closest("[data-request-id]");
  const decision = event.target.closest("[data-decision]");
  const councilItem = event.target.closest("[data-open-id]");
  if (requestItem) { selectedId = requestItem.dataset.requestId; render(); }
  if (decision) changeStatus(selectedId, decision.dataset.decision);
  if (councilItem) { selectedId = councilItem.dataset.openId; document.querySelector("#demandes").scrollIntoView(); render(); }
});

[elements.search, elements.status, elements.priority].forEach((input) => input.addEventListener("input", render));
document.querySelector("#reset-filters").addEventListener("click", () => { elements.search.value = ""; elements.status.value = "all"; elements.priority.value = "all"; render(); });
document.querySelector("#sync-button").addEventListener("click", loadRequests);
document.querySelector("#new-report-button").addEventListener("click", () => elements.dialog.showModal());
document.querySelector("#close-dialog").addEventListener("click", () => elements.dialog.close());
document.querySelector("#cancel-dialog").addEventListener("click", () => elements.dialog.close());
elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(elements.form);
  const nextNumber = Math.max(...requests.map((request) => Number(request.id.slice(3)))) + 1;
  const request = { id: `TN-${nextNumber}`, title: formData.get("title"), location: formData.get("location"), category: formData.get("category"), priority: formData.get("priority"), status: "pending", createdAt: "A l'instant", description: formData.get("description") };
  requests.unshift(request); selectedId = request.id; elements.form.reset(); elements.dialog.close(); render();
});

function updateClock() { document.querySelector("#local-time").textContent = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date()); }
updateClock(); setInterval(updateClock, 30000); loadRequests();
