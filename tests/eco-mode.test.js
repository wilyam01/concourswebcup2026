const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const source = readFileSync(path.join(__dirname, "..", "eco-mode.js"), "utf8");

function createEco({ connection = null, deviceMemory, hardwareConcurrency, navigationEntries = [], resourceEntries = [] } = {}) {
  const values = new Map();
  const root = { dataset: {}, matches: () => false, querySelectorAll: () => [] };
  const document = { readyState: "complete", documentElement: root, querySelectorAll: () => [] };
  const navigator = { connection, deviceMemory, hardwareConcurrency };
  const listeners = new Map();
  const intervals = [];
  const window = {
    dispatchEvent(event) {
      (listeners.get(event.type) || []).forEach((listener) => listener(event));
    },
    addEventListener(type, listener) {
      listeners.set(type, [...(listeners.get(type) || []), listener]);
    },
    removeEventListener(type, listener) {
      listeners.set(type, (listeners.get(type) || []).filter((candidate) => candidate !== listener));
    },
    setInterval(_callback, delay) {
      intervals.push(delay);
      return intervals.length;
    },
    clearInterval() {}
  };
  const performance = {
    getEntriesByType(type) {
      return type === "navigation" ? navigationEntries : resourceEntries;
    }
  };
  vm.runInNewContext(source, {
    document,
    navigator,
    window,
    performance,
    location: { origin: "https://nova.test" },
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value)
    },
    URL,
    Node: { ELEMENT_NODE: 1 },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }
  });
  return { eco: window.NovaTerraEco, root, values, intervals };
}

test("automatically enables low-bandwidth mode on Save-Data and detects low-resource devices", () => {
  const { root } = createEco({
    connection: { saveData: true, effectiveType: "4g", addEventListener() {} },
    deviceMemory: 4
  });

  assert.equal(root.dataset.lowBandwidth, "on");
  assert.equal(root.dataset.lowResource, "on");
});

test("manual mode overrides network detection and persists across pages", () => {
  const { eco, root, values } = createEco({
    connection: { saveData: true, effectiveType: "2g", addEventListener() {} }
  });

  eco.setPreference("off");
  assert.equal(root.dataset.lowBandwidth, "off");
  assert.equal(values.get("novaTerraLowBandwidth.v1"), "off");

  eco.setPreference("on");
  assert.equal(root.dataset.lowBandwidth, "on");
  assert.throws(() => eco.setPreference("invalid"), { message: "invalid_low_bandwidth_preference" });
});

test("transfer report sums measurable same-origin bytes without claiming hidden resources", () => {
  const { eco } = createEco({
    navigationEntries: [{ name: "https://nova.test/", transferSize: 512 }],
    resourceEntries: [
      { name: "https://nova.test/app.js", transferSize: 1024 },
      { name: "https://nova.test/cached.css", transferSize: 0 },
      { name: "https://fonts.example/font.woff2", transferSize: 2048 }
    ]
  });

  const report = eco.measureTransfer();
  assert.equal(report.bytes, 1536);
  assert.equal(report.measuredCount, 2);
  assert.equal(report.sameOriginCount, 3);
  assert.equal(report.externalResources, 1);
  assert.equal(report.mediaCount, 0);
});

test("new media receives lazy-load defaults while critical images stay eager", () => {
  const { eco } = createEco();
  const image = {
    tagName: "IMG",
    attributes: new Set(),
    matches: () => true,
    querySelectorAll: () => [],
    hasAttribute(name) { return this.attributes.has(name); }
  };

  eco.optimizeMedia(image);
  assert.equal(image.loading, "lazy");
  assert.equal(image.decoding, "async");
  assert.equal(image.fetchPriority, "low");

  const criticalImage = {
    ...image,
    attributes: new Set(["data-critical"])
  };
  eco.optimizeMedia(criticalImage);
  assert.equal(criticalImage.loading, "eager");
  assert.equal(criticalImage.fetchPriority, "high");
});

test("polling backs off to five minutes in low-bandwidth mode and adapts live", () => {
  const { eco, intervals } = createEco();
  const stop = eco.schedulePolling(() => {}, 60_000);
  eco.setPreference("on");
  eco.setPreference("off");
  stop();

  assert.deepEqual(intervals, [60_000, 300_000, 60_000]);
});
