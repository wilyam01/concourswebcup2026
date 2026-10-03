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

document.querySelector('#allNews')?.addEventListener('click', (event) => {
  event.preventDefault();
  const link = event.currentTarget;
  const entries = [...document.querySelectorAll('.archived-news')];
  const isExpanded = link.getAttribute('aria-expanded') === 'true';
  entries.forEach((entry) => { entry.hidden = isExpanded; });
  link.setAttribute('aria-expanded', String(!isExpanded));
  updateNewsToggleLabel();
});

const serviceSearch = document.querySelector('#serviceSearch');
const serviceCards = [...document.querySelectorAll('.service-card[data-service-id]')];
const serviceSearchEmpty = document.querySelector('#serviceSearchEmpty');
const serviceSearchFeedback = document.querySelector('#serviceSearchFeedback');
const servicePopularityNote = document.querySelector('#servicePopularityNote');

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

function renderServicePopularity() {
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
  updateNewsToggleLabel();
});
window.addEventListener('storage', (event) => {
  if (event.key === 'terra-nova.citizen-requests.v1') renderServicePopularity();
});
renderServiceSearch();
renderServicePopularity();
