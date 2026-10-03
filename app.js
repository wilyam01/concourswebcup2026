const toast = document.querySelector('#toast');
let toastTimer;
function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

document.querySelectorAll('.filter').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    const filter = button.dataset.filter;
    document.querySelectorAll('.report-row').forEach((row) => {
      row.hidden = filter !== 'all' && row.dataset.status !== filter;
    });
  });
});

document.querySelectorAll('.view-btn').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.view-btn').forEach((item) => item.classList.remove('selected'));
    button.classList.add('selected');
    const councilView = button.dataset.view === 'council';
    document.querySelector('h1').innerHTML = councilView
      ? 'La cité, sous <span>contrôle.</span>'
      : 'Le pouls de <span>Terra Nova.</span>';
    document.querySelector('.subheading').textContent = councilView
      ? 'Vue stratégique du Haut Conseil · données consolidées en temps réel.'
      : 'Chaque signal compte. Voici ce qui se passe dans votre cité.';
    document.querySelector('.nav-item.active').classList.remove('active');
    const destination = document.querySelector(councilView ? '.nav-item[href="#council"]' : '.nav-item[href="#overview"]');
    destination.classList.add('active');
    if (councilView) document.querySelector('#council').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
});

document.querySelector('#voteButton').addEventListener('click', () => notify('Consultation du vote #TN-084 — consensus actuel : 72 %.'));
document.querySelectorAll('.map-point').forEach((point) => point.addEventListener('click', () => notify(`${point.getAttribute('aria-label')} · Secteur connecté.`)));
document.querySelectorAll('.map-controls button').forEach((button, index) => button.addEventListener('click', () => notify(['Carte agrandie.', 'Carte réduite.', 'Carte recentrée.'][index])));
document.querySelector('#allReports').addEventListener('click', () => {
  document.querySelector('[data-filter="all"]').click();
  notify('Affichage de tous les signalements disponibles.');
});
document.querySelector('#mobileReports').addEventListener('click', () => {
  document.querySelector('[data-filter="all"]').click();
  notify('Affichage de tous les signalements disponibles.');
});
document.querySelector('#menuButton').addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
document.querySelectorAll('.nav-item').forEach((link) => link.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
  link.classList.add('active');
  document.querySelector('#sidebar').classList.remove('open');
}));
