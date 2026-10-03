const menuToggle = document.querySelector('#menuToggle');
const publicNav = document.querySelector('#publicNav');
const hero = document.querySelector('.hero');

if (hero && 'IntersectionObserver' in window) {
  hero.classList.add('is-observed');
  const heroObserver = new IntersectionObserver(([entry]) => {
    hero.classList.toggle('is-visible', entry.isIntersecting);
  });
  heroObserver.observe(hero);
}

const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const motionLimited = motionPreference?.matches
  || document.documentElement.dataset.lowBandwidth === 'on'
  || document.documentElement.dataset.lowResource === 'on';
const revealTargets = document.querySelectorAll(
  '.emergency-heading, .emergency-layout, .section-heading, .service-card, .service-note, .mobility-route, .news-lead, .news-item, .join-content'
);

if ('IntersectionObserver' in window && !motionLimited && revealTargets.length) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });

  revealTargets.forEach((element) => {
    element.classList.add('scroll-reveal');
    revealObserver.observe(element);
  });
}

menuToggle?.addEventListener('click', () => {
  const isOpen = publicNav.classList.toggle('open');
  const english = document.documentElement.lang === 'en';
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? (english ? 'Close menu' : 'Fermer le menu') : (english ? 'Open menu' : 'Ouvrir le menu'));
  menuToggle.textContent = isOpen ? '×' : '☰';
});

publicNav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  publicNav.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  menuToggle?.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Open menu' : 'Ouvrir le menu');
  if (menuToggle) menuToggle.textContent = '☰';
}));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && publicNav?.classList.contains('open')) {
    publicNav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Open menu' : 'Ouvrir le menu');
    menuToggle?.focus();
    if (menuToggle) menuToggle.textContent = '☰';
  }
});

const newsSection = document.querySelector('#actualites');
const newsSearch = document.createElement('input');
const newsSearchLabel = document.createElement('label');
const newsSearchTools = document.createElement('div');
const newsSearchFeedback = document.createElement('p');
const newsEmpty = document.createElement('p');
let newsExpanded = false;
if (newsSection) {
  newsSearch.type = 'search';
  newsSearch.id = 'newsSearch';
  newsSearch.setAttribute('aria-controls', 'news-list');
  newsSearchLabel.className = 'news-search';
  newsSearchLabel.append(newsSearch);
  newsSearchTools.className = 'news-tools';
  newsSearchTools.append(newsSearchLabel, newsSearchFeedback);
  newsSearchFeedback.setAttribute('role', 'status');
  newsSearchFeedback.setAttribute('aria-live', 'polite');
  newsEmpty.className = 'news-search-empty';
  newsEmpty.setAttribute('role', 'status');
  newsEmpty.hidden = true;
  const newsLayout = newsSection.querySelector('.news-layout');
  newsLayout?.before(newsSearchTools, newsEmpty);
  const english = document.documentElement.lang === 'en';
  newsSearch.setAttribute('aria-label', english ? 'Search municipal announcements' : 'Rechercher une annonce municipale');
  newsSearch.placeholder = english ? 'Search announcements…' : 'Rechercher une annonce…';
  newsEmpty.textContent = english ? 'No announcements match your search.' : 'Aucune annonce ne correspond à votre recherche.';
}

function renderNewsSearch() {
  if (!newsSection) return;
  const query = normalizeServiceText(newsSearch.value);
  const cards = [...newsSection.querySelectorAll('.news-item')];
  const lead = newsSection.querySelector('.news-lead');
  const searchableText = (entry) => normalizeServiceText(`${entry.textContent} ${entry.querySelector('time')?.dateTime || ''}`);
  let visibleCount = 0;
  cards.forEach((entry) => {
    const matches = !query || searchableText(entry).includes(query);
    entry.hidden = !matches || (entry.classList.contains('archived-news') && !newsExpanded && !query);
    if (!entry.hidden) visibleCount += 1;
  });
  if (lead) {
    lead.hidden = Boolean(query && !searchableText(lead).includes(query));
    if (!lead.hidden) visibleCount += 1;
  }
  newsSearchFeedback.textContent = document.documentElement.lang === 'en'
    ? `${visibleCount} announcement${visibleCount === 1 ? '' : 's'}`
    : `${visibleCount} annonce${visibleCount === 1 ? '' : 's'}`;
  newsEmpty.hidden = visibleCount > 0;
  const link = document.querySelector('#allNews');
  if (link) link.setAttribute('aria-expanded', String(newsExpanded));
  updateNewsToggleLabel();
}

document.querySelector('#allNews')?.addEventListener('click', (event) => {
  event.preventDefault();
  newsExpanded = !newsExpanded;
  renderNewsSearch();
});
newsSearch.addEventListener('input', renderNewsSearch);

const serviceSearch = document.querySelector('#serviceSearch');
const serviceCards = [...document.querySelectorAll('.service-card[data-service-id]')];
const serviceSearchEmpty = document.querySelector('#serviceSearchEmpty');
const serviceSearchFeedback = document.querySelector('#serviceSearchFeedback');
const servicePopularityNote = document.querySelector('#servicePopularityNote');
let serverServicePopularity = null;
let servicePopularityLoaded = !window.NovaTerraApi?.enabled;
let servicePopularityLoading = false;

function normalizeServiceText(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function differsByAtMostOneCharacter(left, right) {
  if (Math.abs(left.length - right.length) > 1) return false;
  let leftIndex = 0;
  let rightIndex = 0;
  let differences = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }
    differences += 1;
    if (differences > 1) return false;
    if (left.length > right.length) leftIndex += 1;
    else if (right.length > left.length) rightIndex += 1;
    else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }
  if (leftIndex < left.length || rightIndex < right.length) differences += 1;
  return differences <= 1;
}

function matchesServiceQuery(searchable, query) {
  if (searchable.includes(query)) return true;
  const words = searchable.split(/\s+/);
  return query.split(/\s+/).every((queryWord) => words.some((word) => (
    word.startsWith(queryWord)
    || (queryWord.length >= 4 && differsByAtMostOneCharacter(queryWord, word))
  )));
}

function renderServiceSearch() {
  if (!serviceSearch) return;
  const query = normalizeServiceText(serviceSearch.value);
  const visibleCount = serviceCards.reduce((count, card) => {
    const searchable = normalizeServiceText([
      card.querySelector('h3')?.textContent,
      card.querySelector('p')?.textContent,
      card.querySelector('.service-info')?.textContent,
      card.dataset.searchTerms,
    ].join(' '));
    const matches = !query || matchesServiceQuery(searchable, query);
    card.hidden = !matches;
    return count + Number(matches);
  }, 0);
  const english = document.documentElement.lang === 'en';
  serviceSearchFeedback.textContent = english
    ? `${visibleCount} service${visibleCount === 1 ? '' : 's'} found`
    : `${visibleCount} résultat${visibleCount === 1 ? '' : 's'}`;
  serviceSearchEmpty.textContent = english ? 'No service matches your search.' : 'Aucun service ne correspond à cette recherche.';
  serviceSearchEmpty.hidden = visibleCount > 0;
}

function renderLocalServicePopularity() {
  let requests = [];
  try {
    const saved = JSON.parse(localStorage.getItem('terra-nova.citizen-requests.v1') || '[]');
    if (Array.isArray(saved)) requests = saved;
  } catch (_) { /* Service discovery stays available if local storage is disabled. */ }
  const counts = new Map(serviceCards.map((card) => [card.dataset.serviceId, 0]));
  requests.forEach((request) => {
    if (counts.has(request?.service)) counts.set(request.service, counts.get(request.service) + 1);
  });
  const ranked = [...counts.entries()].filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1]);
  const winners = new Map(ranked.slice(0, 3).map(([serviceId, count], index) => [serviceId, { count, rank: index + 1 }]));
  const english = document.documentElement.lang === 'en';
  serviceCards.forEach((card) => {
    const badge = card.querySelector('[data-popularity-badge]');
    const item = winners.get(card.dataset.serviceId);
    badge.hidden = !item;
    if (item) badge.textContent = english
      ? `${item.rank === 1 ? 'MOST REQUESTED' : `POPULAR #${item.rank}`} · ${item.count}`
      : `${item.rank === 1 ? 'LE PLUS DEMANDÉ' : `POPULAIRE Nº ${item.rank}`} · ${item.count}`;
  });
  servicePopularityNote.textContent = requests.length
    ? (english ? 'Popularity is based on reports saved in this browser.' : 'La popularité est calculée d’après les signalements enregistrés sur cet appareil.')
    : (english ? 'Popularity labels will appear after reports are saved on this device.' : 'Les indicateurs de popularité apparaîtront après les premiers signalements enregistrés sur cet appareil.');
}

function renderServicePopularity() {
  const english = document.documentElement.lang === 'en';
  if (window.NovaTerraApi?.enabled && !servicePopularityLoaded) {
    serviceCards.forEach((card) => { card.querySelector('[data-popularity-badge]').hidden = true; });
    servicePopularityNote.textContent = english ? 'Loading service demand indicators…' : 'Chargement des indicateurs de demande par service…';
    return;
  }
  if (!window.NovaTerraApi?.enabled || !Array.isArray(serverServicePopularity)) {
    renderLocalServicePopularity();
    return;
  }
  const counts = new Map(serviceCards.map((card) => [card.dataset.serviceId, 0]));
  serverServicePopularity.forEach(({ service, count }) => { if (counts.has(service)) counts.set(service, count); });
  const ranked = [...counts.entries()].filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const winners = new Map(ranked.slice(0, 3).map(([serviceId, count], index) => [serviceId, { count, rank: index + 1 }]));
  serviceCards.forEach((card) => {
    const badge = card.querySelector('[data-popularity-badge]');
    const item = winners.get(card.dataset.serviceId);
    badge.hidden = !item;
    if (item) badge.textContent = english
      ? `${item.rank === 1 ? 'MOST REQUESTED' : `POPULAR #${item.rank}`} · ${item.count}`
      : `${item.rank === 1 ? 'LE PLUS DEMANDÉ' : `POPULAIRE Nº ${item.rank}`} · ${item.count}`;
  });
  const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
  servicePopularityNote.textContent = total
    ? (english ? 'Priority labels use aggregated citizen reports received by Nova Terra.' : 'Les services prioritaires sont calculés à partir des signalements citoyens reçus par Nova Terra.')
    : (english ? 'Priority labels will appear when the city receives its first citizen reports.' : 'Les services seront mis en avant après les premiers signalements reçus par la ville.');
}

async function loadServicePopularity() {
  if (!window.NovaTerraApi?.enabled || servicePopularityLoading) return;
  servicePopularityLoading = true;
  try {
    const result = await window.NovaTerraApi.request('/service-popularity');
    if (!Array.isArray(result.services)) throw new Error('invalid_service_popularity');
    serverServicePopularity = result.services.flatMap((item) => (
      item && typeof item.service === 'string' && Number.isSafeInteger(item.count) && item.count >= 0
        ? [{ service: item.service, count: item.count }]
        : []
    ));
  } catch (_) {
    // Keep the last API aggregate while offline; the initial failure falls back to browser-local counts.
  } finally {
    servicePopularityLoaded = true;
    servicePopularityLoading = false;
    renderServicePopularity();
  }
}

function updateNewsToggleLabel() {
  const link = document.querySelector('#allNews');
  if (!link) return;
  const expanded = link.getAttribute('aria-expanded') === 'true';
  const english = document.documentElement.lang === 'en';
  link.innerHTML = expanded
    ? (english ? 'Show fewer updates <span>↑</span>' : 'Réduire les actualités <span>↑</span>')
    : (english ? 'All news <span>↗</span>' : 'Toutes les actualités <span>↗</span>');
}

serviceSearch?.addEventListener('input', renderServiceSearch);
window.addEventListener('nova:language-change', () => {
  renderServiceSearch();
  renderServicePopularity();
  newsSearch.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Search municipal announcements' : 'Rechercher une annonce municipale');
  newsSearch.placeholder = document.documentElement.lang === 'en' ? 'Search announcements…' : 'Rechercher une annonce…';
  newsEmpty.textContent = document.documentElement.lang === 'en' ? 'No announcements match your search.' : 'Aucune annonce ne correspond à votre recherche.';
  renderNewsSearch();
  updateNewsToggleLabel();
});
window.addEventListener('storage', (event) => {
  if (event.key === 'terra-nova.citizen-requests.v1') renderServicePopularity();
});
renderServiceSearch();
renderServicePopularity();
renderNewsSearch();
void loadServicePopularity();
if (window.NovaTerraApi?.enabled) window.NovaTerraEco.schedulePolling(loadServicePopularity);
