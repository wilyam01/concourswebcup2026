/*
 * Public runtime configuration.
 * Never put API keys or secrets in this file: GitHub Pages exposes it publicly.
 */
window.TERRA_NOVA_CONFIG = {
  apiBaseUrl: "",
  requestsApiUrl: window.location.hostname.endsWith(".vercel.app")
    || (window.location.hostname === "localhost" && new URLSearchParams(window.location.search).get("api") === "webcup")
    ? "/api/requests"
    : "",
  endpoints: {
    requests: "/requests",
    messages: "/citizen-messages"
  }
};
