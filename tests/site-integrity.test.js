const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const projectRoot = path.resolve(__dirname, '..');

function walk(directory, extension, results = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ['.git', 'node_modules', 'concourswebcup2026-main'].includes(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath, extension, results);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(extension)) results.push(fullPath);
  }
  return results;
}

test('HTML pages reference existing local files and fragment targets', () => {
  const pages = walk(projectRoot, '.html');
  assert.ok(pages.length > 0, 'HTML pages should be present');
  const idPattern = /\bid\s*=\s*["']([^"']+)["']/gi;
  const linkPattern = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;

  for (const page of pages) {
    const markup = fs.readFileSync(page, 'utf8');
    const ids = [...markup.matchAll(idPattern)].map((match) => match[1]);
    const pageIds = new Set(ids);
    assert.equal(pageIds.size, ids.length, `${path.relative(projectRoot, page)} contains duplicate IDs`);
    for (const [, reference] of markup.matchAll(linkPattern)) {
      if (/^(?:https?:|mailto:|tel:|javascript:|data:|\/\/)/i.test(reference)) continue;
      const [localPath] = reference.split(/[?#]/, 1);
      const fragment = reference.includes('#') ? reference.slice(reference.indexOf('#') + 1).split(/[?&]/, 1)[0] : '';
      if (!localPath) {
        if (reference.startsWith('#') && fragment) {
          assert.ok(pageIds.has(fragment), `${path.relative(projectRoot, page)} links to missing #${fragment}`);
        }
        continue;
      }
      const target = path.resolve(path.dirname(page), decodeURIComponent(localPath));
      assert.ok(fs.existsSync(target), `${path.relative(projectRoot, page)} references missing ${reference}`);
      if (fragment && /\.html?$/i.test(localPath)) {
        const targetMarkup = fs.readFileSync(target, 'utf8');
        const targetIds = new Set([...targetMarkup.matchAll(idPattern)].map((match) => match[1]));
        assert.ok(targetIds.has(fragment), `${path.relative(projectRoot, page)} links to missing ${reference}`);
      }
    }
  }
});

test('citizen participation saves private votes and ideas and follows language changes', () => {
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag;
      this.children = [];
      this.attributes = new Map();
      this.listeners = new Map();
      this.textContent = '';
      this.firstChild = { textContent: '' };
      this.checked = false;
    }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = [...children]; }
    setAttribute(name, value) { this.attributes.set(name, value); }
    addEventListener(name, callback) { this.listeners.set(name, callback); }
  }

  const selectors = [
    '#participation', '#participationIntro', '#participationStorageNote', '#participationTitle',
    '#consultationsTitle', '#projectsTitle', '.participation-idea-form .panel-kicker',
    '.participation-idea-form h3', '.participation-idea-form>div>p',
    'label[for="participationIdeaTitle"]', 'label[for="participationIdeaBody"]',
    '#participationIdeaForm button[type="submit"]', '#consultationList', '#cityProjectList',
    '#citizenIdeaList', '#participationFeedback', '#participationIdeaForm',
  ];
  const elements = new Map(selectors.map((selector) => [selector, new Element(selector.includes('label[') ? 'label' : 'div')]));
  const languageEvents = new Map();
  const values = new Map([['novaTerraLanguage.v1', 'en']]);
  const document = {
    documentElement: { lang: 'en' },
    querySelector: (selector) => elements.get(selector) || null,
    createElement: (tag) => new Element(tag),
  };
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
  class FormDataMock {
    constructor(form) { this.form = form; }
    get(name) { return this.form.submittedValues[name] || ''; }
  }
  const form = elements.get('#participationIdeaForm');
  form.submittedValues = {};
  form.reset = () => { form.wasReset = true; };
  const window = {
    NovaTerraAuth: { getSession: () => ({ email: 'citizen@example.invalid' }) },
    addEventListener: (name, callback) => languageEvents.set(name, callback),
  };
  const script = fs.readFileSync(path.join(projectRoot, 'participation.js'), 'utf8');
  vm.runInNewContext(script, { window, document, localStorage, FormData: FormDataMock });

  const consultations = elements.get('#consultationList');
  const projects = elements.get('#cityProjectList');
  assert.equal(consultations.children.length, 2);
  assert.equal(projects.children.length, 3);
  assert.match(consultations.children[0].children[0].textContent, /Protecting/);
  const radios = consultations.children[0].children[2].children.flatMap((label) => label.children).filter((child) => child.tagName === 'input');
  radios[1].listeners.get('change')();
  assert.equal(JSON.parse(values.get('nova-terra.participation-votes.v1:citizen%40example.invalid'))[0].choice, 1);

  document.documentElement.lang = 'fr';
  languageEvents.get('nova:language-change')();
  assert.match(elements.get('#participationTitle').textContent, /consultations/i);
  assert.match(consultations.children[0].children[0].textContent, /Préserver/);
  const restoredRadios = consultations.children[0].children[2].children.flatMap((label) => label.children).filter((child) => child.tagName === 'input');
  assert.equal(restoredRadios[1].checked, true);

  form.submittedValues = { title: 'A shaded bus stop', body: 'Plant a tree beside the eastern stop.' };
  form.listeners.get('submit')({ preventDefault() {}, currentTarget: form });
  const savedIdeas = JSON.parse(values.get('nova-terra.participation-ideas.v1:citizen%40example.invalid'));
  assert.equal(savedIdeas[0].title, 'A shaded bus stop');
  assert.equal(elements.get('#citizenIdeaList').children.length, 1);
  assert.equal(form.wasReset, true);
  assert.match(elements.get('#participationFeedback').textContent, /pas été envoyée à la mairie/);
});

test('public project proposal reports local storage and connected delivery truthfully', async () => {
  class Element {
    constructor() { this.listeners = new Map(); this.textContent = ''; this.disabled = false; }
    addEventListener(name, callback) { this.listeners.set(name, callback); }
    querySelector() { return button; }
    reset() { this.wasReset = true; }
  }
  const form = new Element();
  const button = new Element();
  form.values = { title: 'Safer crossings', body: 'Add a raised crossing near the school.' };
  const status = new Element();
  const note = new Element();
  const elements = new Map([['#projectProposalForm', form], ['#proposalStatus', status], ['#proposalStorageNote', note]]);
  const values = new Map();
  const document = { querySelector: (selector) => elements.get(selector) || null };
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
  class FormDataMock {
    constructor(source) { this.source = source; }
    get(name) { return this.source.values[name] || ''; }
  }
  const script = fs.readFileSync(path.join(projectRoot, 'proposer-un-projet.js'), 'utf8');
  const window = { NovaTerraApi: { enabled: false } };
  vm.runInNewContext(script, { window, document, localStorage, FormData: FormDataMock, Date, JSON, String });
  await form.listeners.get('submit')({ preventDefault() {}, currentTarget: form });
  const saved = JSON.parse(values.get('nova-terra.public-project-ideas.v1'));
  assert.equal(saved[0].title, 'Safer crossings');
  assert.match(status.textContent, /pas été transmise/);
  assert.equal(form.wasReset, true);

  let request;
  window.NovaTerraApi.enabled = true;
  window.NovaTerraApi.request = async (path, options) => {
      request = { path, options };
      return { idea: { reference: 'IDEA-QA123', createdAt: '2026-10-01T12:00:00.000Z' } };
  };
  form.wasReset = false;
  await form.listeners.get('submit')({ preventDefault() {}, currentTarget: form });
  assert.equal(request.path, '/citizen-ideas');
  assert.equal(JSON.parse(request.options.body).title, 'Safer crossings');
  assert.match(status.textContent, /IDEA-QA123/);
  assert.equal(form.wasReset, true);
});
