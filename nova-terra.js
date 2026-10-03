const terraNovaConfig = window.TERRA_NOVA_CONFIG || {};
const NOVA_TERRA_API_BASE_URL = (terraNovaConfig.apiBaseUrl || "").replace(/\/$/, "");
const NOVA_TERRA_REQUESTS_API_URL = (terraNovaConfig.requestsApiUrl || "").replace(/\/$/, "");
const NOVA_TERRA_ENDPOINTS = {
  requests: "/requests",
  messages: "/citizen-messages",
  ...(terraNovaConfig.endpoints || {})
};

const NOVA_TERRA_REQUESTS_KEY = "terra-nova.requests";
const NOVA_TERRA_MESSAGES_KEY = "terra-nova.citizen-messages";

const demoRequests = [
  { id: "TN-1042", title: "Eclairage absent sur l'allee des Mimosas", district: "Quartier Horizon", type: "Infrastructure", priority: "high", status: "todo", updatedAt: "Il y a 12 min", description: "Trois lampadaires ne fonctionnent plus entre la place des Artisans et l'ecole." },
  { id: "TN-1041", title: "Collecte des dechets reportee", district: "Rive Sud", type: "Environnement", priority: "normal", status: "in_progress", updatedAt: "Il y a 27 min", description: "Les bacs de la rue des Mangles n'ont pas ete collectes selon le calendrier prevu." },
  { id: "TN-1039", title: "Passage pieton a securiser", district: "Portes du Levant", type: "Mobilite", priority: "high", status: "todo", updatedAt: "Il y a 48 min", description: "La signalisation pres du marche est effacee et la traversee manque de visibilite." },
  { id: "TN-1035", title: "Fuite d'eau pres du centre sportif", district: "District Aurore", type: "Infrastructure", priority: "normal", status: "in_progress", updatedAt: "Il y a 2 h", description: "Une fuite continue est visible sur le trottoir et rend le passage glissant." },
  { id: "TN-1031", title: "Arbre tombe apres les rafales", district: "Jardins du Nord", type: "Securite", priority: "high", status: "done", updatedAt: "Il y a 3 h", description: "Les espaces verts ont degage la voie et securise la zone." },
  { id: "TN-1028", title: "Ajouter un banc pres de l'arret", district: "Rive Sud", type: "Mobilite", priority: "low", status: "done", updatedAt: "Il y a 5 h", description: "Demande regroupee avec le prochain programme d'amenagement de quartier." }
];

const demoMessages = [
  { id: "MSG-208", name: "Maya R.", email: "maya.r@example.test", subject: "Besoin d'aide pour une demarche", category: "Accompagnement", message: "Je souhaite etre rappelee au sujet de mon dossier de logement.", createdAt: "Il y a 34 min", unread: true },
  { id: "MSG-207", name: "Karim D.", email: "karim.d@example.test", subject: "Suggestion pour le marche", category: "Suggestion", message: "Serait-il possible d'ajouter une zone ombragee pres de l'entree ?", createdAt: "Il y a 1 h", unread: true }
];

function readStored(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveStored(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeStatus(status) {
  if (["done", "resolved", "completed", "termine"].includes(status)) return "done";
  if (["in_progress", "progress", "in-progress", "en_cours"].includes(status)) return "in_progress";
  return "todo";
}

function normalizePriority(priority) {
  if (["critical", "urgent", "high"].includes(priority)) return "high";
  if (["low", "minor"].includes(priority)) return "low";
  return "normal";
}

function normalizeRequest(item) {
  return {
    id: item.id || item.reference || `TN-${Date.now()}`,
    title: item.title || item.subject || item.name || "Demande citoyenne",
    district: item.district || item.location || item.zone || "Secteur non precise",
    type: item.type || item.category || "Demande",
    priority: normalizePriority(item.priority),
    status: normalizeStatus(item.status),
    updatedAt: item.updatedAt || item.createdAt || "Date non précisée",
    description: item.description || item.message || "Aucune description fournie."
  };
}

function extractCollection(payload, preferredKey) {
  const collection = Array.isArray(payload)
    ? payload
    : payload?.[preferredKey] || payload?.data || payload?.items;
  if (!Array.isArray(collection)) throw new Error("API response does not contain a valid collection");
  return collection;
}

async function getCollectionFromUrl(url, preferredKey) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Nova Terra API unavailable");
  return extractCollection(await response.json(), preferredKey);
}

async function getFromApi(path, preferredKey) {
  return getCollectionFromUrl(`${NOVA_TERRA_API_BASE_URL}${path}`, preferredKey);
}

window.NovaTerra = {
  usingDemoData: () => !NOVA_TERRA_API_BASE_URL && !NOVA_TERRA_REQUESTS_API_URL,
  canUpdateRequestStatus: () => !NOVA_TERRA_REQUESTS_API_URL,
  getDataSourceLabel() {
    if (NOVA_TERRA_REQUESTS_API_URL) return "API WebCup · demandes en lecture seule, messages de démo";
    return NOVA_TERRA_API_BASE_URL ? "API Nova Terra connectée" : "Données de démonstration";
  },

  async getRequests() {
    if (NOVA_TERRA_REQUESTS_API_URL) {
      const payload = await getCollectionFromUrl(NOVA_TERRA_REQUESTS_API_URL, "requests");
      return payload.map(normalizeRequest);
    }
    if (NOVA_TERRA_API_BASE_URL) {
      const payload = await getFromApi(NOVA_TERRA_ENDPOINTS.requests, "requests");
      return payload.map(normalizeRequest);
    }
    return readStored(NOVA_TERRA_REQUESTS_KEY, demoRequests).map(normalizeRequest);
  },

  async getMessages() {
    if (NOVA_TERRA_API_BASE_URL) return getFromApi(NOVA_TERRA_ENDPOINTS.messages, "messages");
    return readStored(NOVA_TERRA_MESSAGES_KEY, demoMessages);
  },

  async sendMessage(message) {
    if (NOVA_TERRA_API_BASE_URL) {
      const response = await fetch(`${NOVA_TERRA_API_BASE_URL}${NOVA_TERRA_ENDPOINTS.messages}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message)
      });
      if (!response.ok) throw new Error("Message delivery failed");
      return response.json();
    }
    const messages = readStored(NOVA_TERRA_MESSAGES_KEY, demoMessages);
    const created = { ...message, id: `MSG-${Date.now()}`, createdAt: "A l'instant", unread: true };
    messages.unshift(created);
    saveStored(NOVA_TERRA_MESSAGES_KEY, messages);
    return created;
  },

  async updateRequestStatus(id, status) {
    if (NOVA_TERRA_REQUESTS_API_URL) {
      throw new Error("The configured WebCup API is read-only for request status updates");
    }
    if (NOVA_TERRA_API_BASE_URL) {
      const response = await fetch(`${NOVA_TERRA_API_BASE_URL}${NOVA_TERRA_ENDPOINTS.requests}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error("Request update failed");
      return response.json();
    }
    const requests = readStored(NOVA_TERRA_REQUESTS_KEY, demoRequests);
    const request = requests.find((item) => item.id === id);
    if (!request) throw new Error("Request not found");
    request.status = status;
    request.updatedAt = "A l'instant";
    saveStored(NOVA_TERRA_REQUESTS_KEY, requests);
    return request;
  }
};
