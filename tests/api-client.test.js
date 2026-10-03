const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const source = readFileSync(path.join(__dirname, "..", "api-client.js"), "utf8");

function createApi(fetchImpl) {
  const window = {
    TERRA_NOVA_CONFIG: { apiBaseUrl: "https://api.example.test/api" },
    NovaTerraAuth: { getToken: () => "test-token", signOut() {} },
    dispatchEvent() {}
  };
  vm.runInNewContext(source, { window, fetch: fetchImpl, CustomEvent: class {} });
  return window.NovaTerraApi;
}

test("returns decoded JSON from a successful API response", async () => {
  const api = createApi(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ status: "ok" })
  }));

  assert.deepEqual(await api.request("/health"), { status: "ok" });
});

test("rejects a successful response with invalid JSON", async () => {
  const api = createApi(async () => ({
    ok: true,
    status: 200,
    json: async () => { throw new SyntaxError("invalid JSON"); }
  }));

  await assert.rejects(api.request("/health"), { message: "invalid_api_response" });
});

test("preserves the HTTP status for an error response with invalid JSON", async () => {
  const api = createApi(async () => ({
    ok: false,
    status: 503,
    json: async () => { throw new SyntaxError("invalid JSON"); }
  }));

  await assert.rejects(api.request("/health"), (error) => {
    assert.equal(error.message, "http_503");
    assert.equal(error.status, 503);
    return true;
  });
});

test("returns null for a successful no-content response without parsing JSON", async () => {
  const api = createApi(async () => ({
    ok: true,
    status: 204,
    json: async () => { throw new Error("204 responses have no body"); }
  }));

  assert.equal(await api.request("/health"), null);
});
