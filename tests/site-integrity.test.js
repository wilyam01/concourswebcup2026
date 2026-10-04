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

test('public map locates municipal offices and emergency services with clear demo data', () => {
  const markup = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  const map = fs.readFileSync(path.join(projectRoot, 'emergency-map.js'), 'utf8');
  const styles = fs.readFileSync(path.join(projectRoot, 'emergency-map.css'), 'utf8');
  assert.match(markup, /data-emergency-filter="municipal"/, 'the map should provide a municipal services filter');
  assert.match(map, /id: 'civic-services', type: 'municipal'/);
  assert.match(map, /id: 'boreal-services', type: 'municipal'/);
  assert.match(map, /id: 'south-services', type: 'municipal'/);
  assert.match(map, /data-emergency-filter="municipal"/);
  assert.match(map, /typeLabels[\s\S]*?municipal:/);
  assert.match(map, /Maquette illustrative[\s\S]*?pas des données officielles/);
  assert.match(styles, /\.emergency-marker\.type-municipal/);
});

test('mairie navigation groups municipal transit schedules and the complete city news feed', () => {
  const markup = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  const community = fs.readFileSync(path.join(projectRoot, 'community.js'), 'utf8');
  assert.match(markup, /href="#mairie">Mairie<\/a>/);
  assert.match(markup, /id="mairie"[\s\S]*?id="mobilite"[\s\S]*?id="actualites"[\s\S]*?id="inscription"/);
  assert.match(markup, /id="mobilityBlueHours"[\s\S]*?id="mobilityGreenHours"[\s\S]*?id="mobilityGoldHours"/);
  assert.match(community, /filter\(\(item\) => item\.kind === 'news'\);/);
  assert.doesNotMatch(community, /filter\(\(item\) => item\.kind === 'news'\)\.slice/);
});

test('citizen dashboard lists municipal services and shows their current status', () => {
  const markup = fs.readFileSync(path.join(projectRoot, 'dashboard.html'), 'utf8');
  const community = fs.readFileSync(path.join(projectRoot, 'community.js'), 'utf8');
  assert.match(markup, /href="#citizenServices"[\s\S]*?Services municipaux/);
  assert.match(markup, /id="citizenServices"[\s\S]*?id="citizenServicesTitle"/);
  assert.match(markup, /id="serviceStatusUpdated"/);
  const serviceIds = [...markup.matchAll(/class="service-card citizen-service-card" data-service-id="([a-z]+)"/g)].map((match) => match[1]);
  assert.deepEqual(serviceIds, ['water', 'health', 'energy', 'mobility', 'civic', 'solidarity', 'other']);
  assert.match(community, /document\.querySelectorAll\('\.service-card\[data-service-id\]'\)/);
  assert.match(community, /NovaTerraCity\.getServiceStatuses\(\)/);
});

test('resident announcement inbox does not reuse the admin request-alert button', () => {
  const community = fs.readFileSync(path.join(projectRoot, 'community.js'), 'utf8');
  const assistant = fs.readFileSync(path.join(projectRoot, 'assistant.js'), 'utf8');
  assert.match(community, /querySelector\('\.community-inbox-trigger'\) \|\| document\.createElement\('button'\)/);
  assert.doesNotMatch(community, /querySelector\('\.notification'\)/);
  assert.match(assistant, /querySelector\('\.community-inbox-trigger'\)/);
});

test('role navigation shows one category and keeps administration rights on the server', () => {
  const dashboard = fs.readFileSync(path.join(projectRoot, 'dashboard.html'), 'utf8');
  const app = fs.readFileSync(path.join(projectRoot, 'app.js'), 'utf8');
  const agentPage = fs.readFileSync(path.join(projectRoot, 'agent/dashboard/index.html'), 'utf8');
  const agentApp = fs.readFileSync(path.join(projectRoot, 'agent/dashboard/agent.js'), 'utf8');
  const backend = fs.readFileSync(path.join(projectRoot, 'backend/src/server.js'), 'utf8');
  const roles = fs.readFileSync(path.join(projectRoot, 'docs/role-permissions.md'), 'utf8');
  for (const category of ['overview', 'citizenServices', 'reports', 'my-requests', 'appointments', 'planet', 'participation', 'council']) {
    assert.match(dashboard, new RegExp(`href="#${category}"`), `citizen workspace should navigate to ${category}`);
  }
  assert.match(app, /function activateNavigationCategory/);
  assert.match(app, /document\.querySelector\('\.nav-item\[href="agent\/dashboard\/index\.html"\]'\)\.hidden = isCitizen/);
  assert.match(app, /document\.querySelector\('\.nav-item\[href="#council"\]'\)\.hidden = isCitizen/);
  for (const category of ['#dashboard', '#demandes', '#messages', '#city-management', '#agentAppointments']) {
    assert.ok(agentPage.includes(`href="${category}"`), `team workspace should navigate to ${category}`);
  }
  assert.match(agentApp, /function activateAgentNavigation/);
  assert.match(backend, /app\.patch\('\/api\/accounts\/:id\/role', authenticate, allowRoles\('ADMIN'\)/);
  assert.match(backend, /app\.patch\('\/api\/privacy-requests\/:id', authenticate, allowRoles\('ADMIN'\)/);
  assert.match(backend, /app\.get\('\/api\/activity-summary', authenticate, allowRoles\('ADMIN'\)/);
  assert.match(roles, /Citoyen[\s\S]*Agent[\s\S]*Administrateur/);
});

test('interface languages are available across the app and backed by local catalogs', () => {
  const accessibility = fs.readFileSync(path.join(projectRoot, 'accessibility.js'), 'utf8');
  const language = fs.readFileSync(path.join(projectRoot, 'language.js'), 'utf8');
  const expectedLocales = ['fr', 'en', 'zh', 'es', 'it', 'pt', 'de', 'sw'];
  const pickerMarkup = accessibility.match(/<select id="interfaceLanguage">([\s\S]*?)<\/select>/);
  assert.ok(pickerMarkup, 'the accessibility dialog should include a language selector');
  const pickerLocales = [...pickerMarkup[1].matchAll(/<option value="([a-z]{2})">/g)].map((match) => match[1]);
  const supportedMatch = language.match(/const supported = \[([^\]]+)\]/);
  assert.ok(supportedMatch, 'language.js should declare supported locales');
  assert.deepEqual(pickerLocales, expectedLocales);
  assert.deepEqual([...supportedMatch[1].matchAll(/'([a-z]{2})'/g)].map((match) => match[1]), expectedLocales);
  for (const locale of expectedLocales.slice(2)) {
    assert.match(language, new RegExp(`'${locale}'`), `${locale} should have local translations`);
  }

  const pages = [
    'index.html', 'dashboard.html', 'connexion.html', 'inscription.html',
    'contact/index.html', 'agent/dashboard/index.html', 'presentation.html',
    'proposer-un-projet.html',
  ];
  for (const page of pages) {
    const markup = fs.readFileSync(path.join(projectRoot, page), 'utf8');
    assert.match(markup, /language\.js(?:\?[^"]*)?"/, `${page} should load the local language catalog`);
  }
});

test('public site content has translations for every supported language', () => {
  const language = fs.readFileSync(path.join(projectRoot, 'language.js'), 'utf8');
  const translationsMatch = language.match(/const additionalTranslations = \[([\s\S]*?)\n  \];/);
  assert.ok(translationsMatch, 'language.js should declare its additional translations');
  const translations = vm.runInNewContext(`[${translationsMatch[1]}]`);
  const englishMatch = language.match(/const englishTranslations = \{([\s\S]*?)\n  \};/);
  assert.ok(englishMatch, 'language.js should declare English additions for the expanded catalog');
  const english = vm.runInNewContext(`({${englishMatch[1]}})`);
  const locales = ['en', 'zh', 'es', 'it', 'pt', 'de', 'sw'];
  const row = translations.find(([source]) => source === 'TRANSPORTS & MOBILITÉ');
  assert.ok(row, 'the public transport introduction should be translated');
  assert.equal(row.length, 7, 'the translation should cover the six non-English locales');
  for (const [index, locale] of locales.entries()) {
    const translated = locale === 'en' ? english[row[0]] : row[index];
    assert.ok(translated, `${locale} should translate the public transport introduction`);
    assert.notEqual(translated, row[0], `${locale} should not fall back to French`);
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
