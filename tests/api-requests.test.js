const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const handler = require("../api/requests.js");

const originalFetch = global.fetch;
const originalApiKey = process.env.WEBCUP_API_KEY;

afterEach(() => {
  global.fetch = originalFetch;
  if (originalApiKey === undefined) {
    delete process.env.WEBCUP_API_KEY;
  } else {
    process.env.WEBCUP_API_KEY = originalApiKey;
  }
});

function createResponse() {
  const headers = new Map();
  let statusCode;
  let body;

  return {
    headers,
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    setHeader(name, value) {
      headers.set(name, value);
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    }
  };
}

async function invokeHandler(options = {}) {
  const { method = "GET", fetchImpl } = options;
  const apiKey = Object.hasOwn(options, "apiKey") ? options.apiKey : "test-key";
  if (apiKey === undefined) {
    delete process.env.WEBCUP_API_KEY;
  } else {
    process.env.WEBCUP_API_KEY = apiKey;
  }
  if (fetchImpl) global.fetch = fetchImpl;

  const response = createResponse();
  await handler({ method }, response);
  return response;
}

test("rejects methods other than GET without contacting WebCup", async () => {
  let fetchCalled = false;
  const response = await invokeHandler({
    method: "POST",
    fetchImpl: async () => {
      fetchCalled = true;
      throw new Error("fetch should not be called");
    }
  });

  assert.equal(response.statusCode, 405);
  assert.deepEqual(response.body, { error: "Method not allowed" });
  assert.equal(response.headers.get("Allow"), "GET");
  assert.equal(fetchCalled, false);
});

test("reports a missing server API key without contacting WebCup", async () => {
  let fetchCalled = false;
  const response = await invokeHandler({
    apiKey: undefined,
    fetchImpl: async () => {
      fetchCalled = true;
      throw new Error("fetch should not be called");
    }
  });

  assert.equal(response.statusCode, 503);
  assert.equal(fetchCalled, false);
});

test("normalizes valid requests and excludes upstream-only fields", async () => {
  let requestedUrl;
  const response = await invokeHandler({
    fetchImpl: async (url, options) => {
      requestedUrl = new URL(url);
      assert.equal(options.method, "GET");
      assert.equal(options.headers.Accept, "application/json");
      return {
        ok: true,
        text: async () => JSON.stringify([
          {
            id: 7,
            title: "Éclairage en panne",
            district: "Quartier Nord",
            type: "Infrastructure",
            priority: "urgent",
            status: "in progress",
            updatedAt: "2026-10-03",
            description: "Un lampadaire est éteint.",
            internalNote: "Ne doit pas être transmis"
          },
          { id: "invalid", priority: "unsupported" }
        ])
      };
    }
  });

  assert.equal(requestedUrl.searchParams.get("api_key"), "test-key");
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    requests: [{
      id: "7",
      title: "Éclairage en panne",
      district: "Quartier Nord",
      type: "Infrastructure",
      priority: "high",
      status: "in_progress",
      updatedAt: "2026-10-03",
      description: "Un lampadaire est éteint."
    }],
    meta: { skippedRecords: 1 }
  });
  assert.equal(response.headers.get("X-WebCup-Skipped-Records"), "1");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(JSON.stringify(response.body).includes("internalNote"), false);
});

test("returns a gateway error when WebCup responds unsuccessfully", async () => {
  const response = await invokeHandler({
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      text: async () => "upstream details"
    })
  });

  assert.equal(response.statusCode, 502);
  assert.deepEqual(response.body, { error: "The WebCup API rejected the request" });
});

test("returns a gateway error when WebCup returns invalid JSON", async () => {
  const response = await invokeHandler({
    fetchImpl: async () => ({ ok: true, text: async () => "not-json" })
  });

  assert.equal(response.statusCode, 502);
  assert.deepEqual(response.body, { error: "The WebCup API returned invalid JSON" });
});

test("returns a timeout response when the WebCup request is aborted", async () => {
  const response = await invokeHandler({
    fetchImpl: async () => {
      const error = new Error("request aborted");
      error.name = "AbortError";
      throw error;
    }
  });

  assert.equal(response.statusCode, 504);
  assert.deepEqual(response.body, { error: "The WebCup API request timed out" });
});
