const toast = document.querySelector('#toast');
let toastTimer;
let publicReportsLoading = false;
let publicRequests = [];
let displayedReportCount = 5;
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
  openButton.setAttribute("aria-label", `Ouvrir le signalement ${request.id}`);
  openButton.textContent = "↗";

  row.append(icon, info, statusLabel, openButton);
  return row;
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

async function loadPublicReports() {
  if (publicReportsLoading) return;

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
    updateReportCounts(publicRequests);
    renderPublicReports();
    if (window.NovaTerra.usingDemoData()) {
      apiStatus.classList.add("demo");
      apiStatusText.textContent = "Mode démonstration · signalements fictifs";
    } else {
      apiStatusText.textContent = "API WebCup · signalements";
    }
    error.hidden = true;
  } catch {
    publicRequests = window.NovaTerra.getDemoRequests();
    updateReportCounts(publicRequests);
    renderPublicReports();
    apiStatus.classList.add("unavailable");
    apiStatusText.textContent = "API indisponible · exemples affichés";
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
      ? 'Vue stratégique du Haut Conseil · données consolidées en temps réel.'
      : 'Chaque signal compte. Voici ce qui se passe dans votre cité.';
    document.querySelector('.nav-item.active').classList.remove('active');
    const destination = document.querySelector(councilView ? '.nav-item[href="#council"]' : '.nav-item[href="#overview"]');
    destination.classList.add('active');
    if (councilView) document.querySelector('#council').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
});

document.querySelector('#voteButton').addEventListener('click', () => notify('Maquette de vote : aucune décision ni aucun vote ne sont enregistrés.'));
document.querySelectorAll('.map-point').forEach((point) => point.addEventListener('click', () => notify(`${point.getAttribute('aria-label')} · Secteur connecté.`)));
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
document.querySelector("#refreshReports").addEventListener("click", loadPublicReports);
document.querySelector('#menuButton').addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
document.querySelectorAll('.nav-item').forEach((link) => link.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
  link.classList.add('active');
  document.querySelector('#sidebar').classList.remove('open');
}));

const profilePhotoInput = document.querySelector('#profilePhotoInput');
const profilePhotoButtons = [...document.querySelectorAll('.profile-photo-trigger')];
const profilePhotoStorageKey = 'novaTerraProfilePhoto';

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
  const savedProfilePhoto = localStorage.getItem(profilePhotoStorageKey);
  if (savedProfilePhoto) showProfilePhoto(savedProfilePhoto);
} catch (_) {
  // A saved photo is optional when browser storage is unavailable.
}

profilePhotoButtons.forEach((button) => button.addEventListener('click', () => profilePhotoInput.click()));
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

if (window.NovaTerra.usingDemoData()) {
  const apiStatus = document.querySelector("#api-status");
  apiStatus.classList.add("demo");
  apiStatus.querySelector("span:last-child").textContent = "Mode démonstration · signalements fictifs";
} else {
  window.setInterval(loadPublicReports, 60_000);
}
loadPublicReports();
