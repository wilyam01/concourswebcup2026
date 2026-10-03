const UPSTREAM_URL = "https://24h.webcup.fr/wp-json/webcup/v1/requests";
const UPSTREAM_TIMEOUT_MS = 8000;

function extractRequests(payload) {
  const requests = Array.isArray(payload)
    ? payload
    : payload?.requests || payload?.data || payload?.items;
  if (!Array.isArray(requests)) throw new Error("Unexpected request collection");
  return requests;
}

function safeText(value, fallback, maxLength) {
  if (typeof value !== "string" && typeof value !== "number") return fallback;
  const text = String(value).trim();
  return text ? text.slice(0, maxLength) : fallback;
}

function normalizeStatus(value) {
  const status = String(value || "todo").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["todo", "to_do", "pending", "open", "new", "submitted", "created", "a_traiter"].includes(status)) return "todo";
  if (["in_progress", "progress", "processing", "en_cours"].includes(status)) return "in_progress";
  if (["done", "resolved", "completed", "closed", "termine", "terminee"].includes(status)) return "done";
  throw new Error("Unsupported request status");
}

function normalizePriority(value) {
  const priority = String(value || "normal").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  if (["normal", "medium", "moderate", "moyenne", "normale"].includes(priority)) return "normal";
  if (["critical", "urgent", "high", "haute", "elevee", "critique"].includes(priority)) return "high";
  if (["low", "minor", "basse", "faible"].includes(priority)) return "low";
  throw new Error("Unsupported request priority");
}

function normalizeRequest(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error("Unexpected request record");
  }

  const id = item.id ?? item.reference ?? item.request_id;
  if ((typeof id !== "string" && typeof id !== "number") || String(id).trim() === "") {
    throw new Error("Request record is missing its identifier");
  }

  return {
    id: String(id).trim().slice(0, 100),
    title: safeText(item.title || item.subject || item.name, "Demande citoyenne", 240),
    district: safeText(item.district || item.location || item.zone, "Secteur non precise", 120),
    type: safeText(item.type || item.category, "Demande", 80),
    priority: normalizePriority(item.priority),
    status: normalizeStatus(item.status),
    updatedAt: safeText(item.updatedAt || item.updated_at || item.createdAt || item.created_at, "Date non precise", 80),
    description: safeText(item.description || item.message, "Aucune description fournie.", 2000)
  };
}

function normalizeRequests(items) {
  const requests = [];
  let skipped = 0;
  for (const item of items) {
    try { requests.push(normalizeRequest(item)); }
    catch { skipped += 1; }
  }
  if (items.length && !requests.length) throw new Error("No valid request records");
  return { requests, skipped };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.WEBCUP_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "The WebCup API key is not configured on the server" });
  }

  const url = new URL(UPSTREAM_URL);
  url.searchParams.set("api_key", apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstreamResponse = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    const responseText = await upstreamResponse.text();

    if (!upstreamResponse.ok) {
      return res.status(502).json({ error: "The WebCup API rejected the request" });
    }

    let payload;
    try {
      payload = JSON.parse(responseText);
    } catch {
      return res.status(502).json({ error: "The WebCup API returned invalid JSON" });
    }

    let result;
    try {
      result = normalizeRequests(extractRequests(payload));
    } catch {
      return res.status(502).json({ error: "The WebCup API returned an unsupported request format" });
    }

    res.setHeader("X-WebCup-Skipped-Records", String(result.skipped));
    return res.status(200).json({ requests: result.requests, meta: { skippedRecords: result.skipped } });
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(504).json({ error: "The WebCup API request timed out" });
    }
    return res.status(502).json({ error: "The WebCup API is unavailable" });
  } finally {
    clearTimeout(timeout);
  }
};
