const state = { requests: [], messages: [] };
const columns = [
  { status: "todo", title: "A traiter" },
  { status: "in_progress", title: "En cours" },
  { status: "done", title: "Termine" }
];

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[character]));
const priorityLabel = { high:"Haute", normal:"Normale", low:"Basse" };

function visibleRequests() {
  const query = document.querySelector("#request-search").value.trim().toLowerCase();
  const priority = document.querySelector("#priority-filter").value;
  return state.requests.filter((request) => {
    const searchable = [request.id, request.title, request.district, request.type].join(" ").toLowerCase();
    return (!query || searchable.includes(query)) && (priority === "all" || request.priority === priority);
  });
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
  return `<button class="request-card ${escapeHtml(request.priority)}" type="button" data-id="${escapeHtml(request.id)}" title="Faire avancer le dossier">
    <p class="request-meta"><span>${escapeHtml(request.id)}</span><span>${escapeHtml(request.updatedAt)}</span></p>
    <h4>${escapeHtml(request.title)}</h4><p class="request-place">${escapeHtml(request.district)}</p>
    <footer><span class="type-label">${escapeHtml(request.type)}</span><span class="priority-label ${escapeHtml(request.priority)}">${priorityLabel[request.priority] || "Normale"}</span></footer>
  </button>`;
}

function renderKanban() {
  const requests = visibleRequests();
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

async function loadDashboard() {
  const stateLabel = document.querySelector("#api-state");
  stateLabel.textContent = "Synchronisation...";
  try {
    [state.requests, state.messages] = await Promise.all([window.NovaTerra.getRequests(), window.NovaTerra.getMessages()]);
    stateLabel.textContent = window.NovaTerra.usingDemoData() ? "Donnees de demonstration" : "API Nova Terra connectee";
  } catch {
    stateLabel.textContent = "API indisponible";
  }
  render();
}

document.querySelector("#request-search").addEventListener("input", renderKanban);
document.querySelector("#priority-filter").addEventListener("change", renderKanban);
document.querySelector("#refresh-data").addEventListener("click", loadDashboard);
document.querySelector("#kanban").addEventListener("click", async (event) => {
  const card = event.target.closest("[data-id]");
  if (!card) return;
  const request = state.requests.find((item) => item.id === card.dataset.id);
  const next = { todo:"in_progress", in_progress:"done", done:"todo" }[request.status];
  card.disabled = true;
  try { await window.NovaTerra.updateRequestStatus(request.id, next); request.status = next; request.updatedAt = "A l'instant"; render(); }
  catch { card.disabled = false; }
});

loadDashboard();
