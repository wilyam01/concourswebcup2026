/*
 * Public runtime configuration.
 * Never put API keys or secrets in this file: GitHub Pages exposes it publicly.
 */
const DEPLOYED_API_BASE_URL = "";
let configuredApiBaseUrl = DEPLOYED_API_BASE_URL;
try {
  const queryMode = new URLSearchParams(window.location.search).get("api");
  const localHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (localHost && queryMode === "backend") sessionStorage.setItem("novaTerraApiMode", "backend");
  if (localHost && queryMode === "local") sessionStorage.setItem("novaTerraApiMode", "local");
  const localMode = localHost ? sessionStorage.getItem("novaTerraApiMode") : "";
  if (localMode === "backend") configuredApiBaseUrl = "http://localhost:3000/api";
  if (localMode === "local") configuredApiBaseUrl = "";
} catch (_) {
  configuredApiBaseUrl = DEPLOYED_API_BASE_URL;
}

window.TERRA_NOVA_CONFIG = {
  // Set DEPLOYED_API_BASE_URL above to a public HTTPS API origin ending in /api.
  apiBaseUrl: configuredApiBaseUrl,
  requestsApiUrl: !configuredApiBaseUrl && (window.location.hostname.endsWith(".vercel.app")
    || (window.location.hostname === "localhost" && new URLSearchParams(window.location.search).get("api") === "webcup")
    ) ? "/api/requests" : "",
  endpoints: {
    requests: "/requests",
    messages: "/citizen-messages"
  }
};
