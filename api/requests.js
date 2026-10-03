const UPSTREAM_URL = "https://24h.webcup.fr/wp-json/webcup/v1/requests";
const UPSTREAM_TIMEOUT_MS = 8000;

function extractRequests(payload) {
  const requests = Array.isArray(payload)
    ? payload
    : payload?.requests || payload?.data || payload?.items;
  if (!Array.isArray(requests)) throw new Error("Unexpected request collection");
  return requests;
}

function normalizeRequest(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error("Unexpected request record");
  }

  const id = item.id ?? item.reference;
  if (id === undefined || id === null || String(id).trim() === "") {
    throw new Error("Request record is missing its identifier");
  }

  return {
    id: String(id),
    title: item.title || item.subject || item.name || "Demande citoyenne",
    district: item.district || item.location || item.zone || "Secteur non précisé",
    type: item.type || item.category || "Demande",
    priority: item.priority || "normal",
    status: item.status || "todo",
    updatedAt: item.updatedAt || item.createdAt || ""
  };
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

    let requests;
    try {
      requests = extractRequests(payload).map(normalizeRequest);
    } catch {
      return res.status(502).json({ error: "The WebCup API returned an unsupported request format" });
    }

    return res.status(200).json({ requests });
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(504).json({ error: "The WebCup API request timed out" });
    }
    return res.status(502).json({ error: "The WebCup API is unavailable" });
  } finally {
    clearTimeout(timeout);
  }
};
