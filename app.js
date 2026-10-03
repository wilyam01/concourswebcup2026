const currentUser = window.NovaTerraAuth.getSession();
if (!currentUser) {
  window.location.replace('connexion.html');
} else {
const toast = document.querySelector('#toast');
let toastTimer;
let publicReportsLoading = false;
let publicRequests = [];
let lastPublicReportsSuccessAt = 0;
let displayedReportCount = 5;
let reportDataSourceLabel = "Chargement des signalements…";
const reportsPageSize = 5;
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
  const row = document.createElement("article");
  row.className = "report-row";
  row.dataset.status = status;
  row.dataset.priority = request.priority;

  const icon = document.createElement("div");
  icon.className = `report-icon icon-${status === "todo" ? "progress" : status}`;
  icon.textContent = icons[status];

  const info = document.createElement("div");
  info.className = "report-info";
  const title = document.createElement("b");
  title.textContent = request.title;
  const metadata = document.createElement("span");
  metadata.textContent = `${request.district} · ${request.updatedAt}`;
  info.append(title, metadata);

  const statusLabel = document.createElement("span");
  statusLabel.className = `status status-${status === "todo" ? "progress" : status}`;
  statusLabel.textContent = labels[status];

  const openButton = document.createElement("button");
  openButton.className = "row-arrow";
  openButton.type = "button";
  openButton.dataset.requestId = request.id;
  openButton.setAttribute("aria-haspopup", "dialog");
  openButton.setAttribute("aria-label", `Ouvrir le signalement ${request.id}`);
  openButton.textContent = "↗";

  row.append(icon, info, statusLabel, openButton);
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
  } catch {
    const cachedRequests = window.NovaTerra.getCachedRequests();
    let fallbackSource = "unavailable";
    if (cachedRequests.length) {
      publicRequests = cachedRequests;
      fallbackSource = window.NovaTerra.usingDemoData() ? "demo-cache" : "api-cache";
      reportDataSourceLabel = window.NovaTerra.usingDemoData()
        ? "Instantané local · mode démonstration"
        : "Instantané local · API indisponible";
    } else if (!publicRequests.length && window.NovaTerra.usingDemoData()) {
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
    apiStatus.classList.add("unavailable");
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
    error.textContent = publicRequests.length
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
    document.querySelectorAll('.view-btn').forEach((item) => item.classList.remove('selected'));
    button.classList.add('selected');
    const councilView = button.dataset.view === 'council';
    document.querySelector('h1').innerHTML = councilView
      ? 'La cité, sous <span>contrôle.</span>'
      : 'Le pouls de <span>Terra Nova.</span>';
    document.querySelector('.subheading').textContent = councilView
      ? 'Signalements disponibles et priorités à examiner par le Haut Conseil.'
      : 'Chaque signal compte. Voici ce qui se passe dans votre cité.';
    document.querySelector('.nav-item.active').classList.remove('active');
    const destination = document.querySelector(councilView ? '.nav-item[href="#council"]' : '.nav-item[href="#overview"]');
    destination.classList.add('active');
    if (councilView) document.querySelector('#council').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
  document.querySelector('[data-filter="urgent"]').click();
  document.querySelector("#reports").scrollIntoView({ behavior: "smooth", block: "start" });
  document.querySelector("#reports-search").focus({ preventScroll: true });
});
document.querySelector("#refreshReports").addEventListener("click", loadPublicReports);
window.addEventListener("online", loadPublicReports);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && Date.now() - lastPublicReportsSuccessAt >= 60_000) loadPublicReports();
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
document.querySelectorAll('.nav-item').forEach((link) => link.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
  link.classList.add('active');
  setSidebarOpen(false);
}));

const profilePhotoInput = document.querySelector('#profilePhotoInput');
const profilePhotoButtons = [...document.querySelectorAll('.profile-photo-trigger')];
const profilePhotoStorageKey = `novaTerraProfilePhoto.v1:${encodeURIComponent(currentUser.email)}`;
const legacyProfilePhotoStorageKey = 'novaTerraProfilePhoto';
const profileName = document.querySelector('#profileName');
const profileSector = document.querySelector('#profileSector');
const profileDialog = document.querySelector('#profileDialog');
const profileForm = document.querySelector('#profileForm');
const profileNameInput = document.querySelector('#profileNameInput');
const profileSectorInput = document.querySelector('#profileSectorInput');
const profileFormError = document.querySelector('#profileFormError');

function renderProfile(user) {
  profileName.textContent = user.name;
  profileSector.textContent = `Citoyen · ${user.sector}`;
  const initials = user.name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
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
    button.setAttribute('aria-label', 'Changer la photo de profil');
    button.title = 'Changer la photo de profil';
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

document.querySelector('#editProfileButton').addEventListener('click', () => {
  profileNameInput.value = currentUser.name;
  profileSectorInput.value = currentUser.sector;
  profileFormError.hidden = true;
  profileFormError.textContent = '';
  profileDialog.showModal();
});
document.querySelector('#profileDialogPhoto').addEventListener('click', () => profilePhotoInput.click());
document.querySelector('#closeProfileDialog').addEventListener('click', () => profileDialog.close());
document.querySelector('#cancelProfileEdit').addEventListener('click', () => profileDialog.close());
profileForm.addEventListener('submit', (event) => {
  event.preventDefault();
  profileFormError.hidden = true;
  const result = window.NovaTerraAuth.updateProfile({
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

profilePhotoButtons.forEach((button) => button.addEventListener('click', () => profilePhotoInput.click()));
document.querySelector('#logoutButton').addEventListener('click', () => {
  window.NovaTerraAuth.signOut();
  window.location.replace('connexion.html');
});
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
    image.onload = () => {
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

if (new URLSearchParams(window.location.search).get('view') === 'council') {
  document.querySelector('.view-btn[data-view="council"]')?.click();
}

if (window.NovaTerra.usingDemoData()) {
  const apiStatus = document.querySelector("#api-status");
  apiStatus.classList.add("demo");
  apiStatus.querySelector("span:last-child").textContent = "Mode démonstration · signalements fictifs";
} else {
  window.setInterval(() => {
    if (!document.hidden) loadPublicReports();
  }, 60_000);
}
loadPublicReports();
}
