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
const NOVA_TERRA_REQUESTS_CACHE_KEY = "terra-nova.requests.cache.v1";
const NOVA_TERRA_REQUESTS_CACHE_TIME_KEY = "terra-nova.requests.cache-time.v1";
const NOVA_TERRA_FETCH_TIMEOUT_MS = 12000;

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
  const normalized = String(status || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (!normalized || ["todo", "to_do", "pending", "open", "new", "submitted", "created", "a_traiter"].includes(normalized)) return "todo";
  if (["done", "resolved", "completed", "closed", "termine", "terminee"].includes(normalized)) return "done";
  if (["in_progress", "progress", "processing", "en_cours"].includes(normalized)) return "in_progress";
  throw new Error("Unsupported request status");
}

function normalizePriority(priority) {
  const normalized = String(priority || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  if (!normalized || ["normal", "medium", "moderate", "moyenne", "normale"].includes(normalized)) return "normal";
  if (["critical", "urgent", "high", "haute", "elevee", "critique"].includes(normalized)) return "high";
  if (["low", "minor", "basse", "faible"].includes(normalized)) return "low";
  throw new Error("Unsupported request priority");
}

function normalizeRequest(item) {
  const source = item && typeof item === "object" && !Array.isArray(item) ? item : {};
  const id = source.id ?? source.reference;
  if ((typeof id !== "string" && typeof id !== "number") || String(id).trim() === "") {
    throw new Error("Request is missing its identifier");
  }
  return {
    id: String(id).trim().slice(0, 100),
    title: toSafeText(source.title || source.subject || source.name, "Demande citoyenne", 240),
    district: toSafeText(source.district || source.location || source.zone, "Secteur non precise", 120),
    type: toSafeText(source.type || source.category, "Demande", 80),
    priority: normalizePriority(source.priority),
    status: normalizeStatus(source.status),
    updatedAt: toSafeText(source.updatedAt || source.createdAt, "Date non precise", 80),
    description: toSafeText(source.description || source.message, "Aucune description fournie.", 2000)
  };
}

function extractCollection(payload, preferredKey) {
  const collection = Array.isArray(payload)
    ? payload
    : payload?.[preferredKey] || payload?.data || payload?.items;
  if (!Array.isArray(collection)) throw new Error("API response does not contain a valid collection");
  return collection;
}

function toSafeText(value, fallback, maxLength) {
  if (typeof value !== "string" && typeof value !== "number") return fallback;
  const text = String(value).trim();
  return text ? text.slice(0, maxLength) : fallback;
}

function normalizeRequests(items) {
  const requests = [];
  for (const item of items) {
    try { requests.push(normalizeRequest(item)); }
    catch { /* Skip one malformed record without discarding the valid collection. */ }
  }
  if (items.length && !requests.length) throw new Error("API response contains no valid requests");
  return requests;
}

async function getCollectionFromUrl(url, preferredKey) {
  return extractCollection(await requestJson(url), preferredKey);
}

async function requestJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), NOVA_TERRA_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      headers: { Accept: "application/json", ...(options.headers || {}) },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`API request failed (${response.status})`);
    if (response.status === 204) return null;
    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") throw new Error("API request timed out");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function cacheRequests(requests) {
  try {
    localStorage.setItem(NOVA_TERRA_REQUESTS_CACHE_KEY, JSON.stringify(requests));
    localStorage.setItem(NOVA_TERRA_REQUESTS_CACHE_TIME_KEY, String(Date.now()));
  } catch {
    // Keep the live response usable when browser storage is full or disabled.
  }
}

function getCachedRequests() {
  return readStored(NOVA_TERRA_REQUESTS_CACHE_KEY, []).flatMap((item) => {
    try { return [normalizeRequest(item)]; }
    catch { return []; }
  });
}

async function getFromApi(path, preferredKey) {
  return getCollectionFromUrl(`${NOVA_TERRA_API_BASE_URL}${path}`, preferredKey);
}

window.NovaTerra = {
  usingDemoData: () => !NOVA_TERRA_API_BASE_URL && !NOVA_TERRA_REQUESTS_API_URL,
  messagesAreDemo: () => !NOVA_TERRA_API_BASE_URL,
  canUpdateRequestStatus: () => !NOVA_TERRA_REQUESTS_API_URL,
  getDemoRequests() {
    return readStored(NOVA_TERRA_REQUESTS_KEY, demoRequests).flatMap((item) => {
      try { return [normalizeRequest(item)]; }
      catch { return []; }
    });
  },
  getCachedRequests,
  getRequestsCacheTime() {
    try {
      const value = Number(localStorage.getItem(NOVA_TERRA_REQUESTS_CACHE_TIME_KEY));
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
      return null;
    }
  },
  getDataSourceLabel() {
    if (NOVA_TERRA_REQUESTS_API_URL) return "API WebCup · demandes en lecture seule, messages de démo";
    return NOVA_TERRA_API_BASE_URL ? "API Nova Terra connectée" : "Données de démonstration";
  },

  async getRequests() {
    let requests;
    if (NOVA_TERRA_REQUESTS_API_URL) {
      const payload = await getCollectionFromUrl(NOVA_TERRA_REQUESTS_API_URL, "requests");
      requests = normalizeRequests(payload);
    } else if (NOVA_TERRA_API_BASE_URL) {
      const payload = await getFromApi(NOVA_TERRA_ENDPOINTS.requests, "requests");
      requests = normalizeRequests(payload);
    } else {
      return readStored(NOVA_TERRA_REQUESTS_KEY, demoRequests).map(normalizeRequest);
    }
    cacheRequests(requests);
    return requests;
  },

  async getMessages() {
    if (NOVA_TERRA_API_BASE_URL) return getFromApi(NOVA_TERRA_ENDPOINTS.messages, "messages");
    return readStored(NOVA_TERRA_MESSAGES_KEY, demoMessages);
  },

  async sendMessage(message) {
    if (NOVA_TERRA_API_BASE_URL) {
      return requestJson(`${NOVA_TERRA_API_BASE_URL}${NOVA_TERRA_ENDPOINTS.messages}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message)
      });
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
      return requestJson(`${NOVA_TERRA_API_BASE_URL}${NOVA_TERRA_ENDPOINTS.requests}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
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
