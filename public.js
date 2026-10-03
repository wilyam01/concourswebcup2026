const menuToggle = document.querySelector('#menuToggle');
const publicNav = document.querySelector('#publicNav');

menuToggle?.addEventListener('click', () => {
  const isOpen = publicNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.textContent = isOpen ? '×' : '☰';
});

publicNav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  publicNav.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  if (menuToggle) menuToggle.textContent = '☰';
}));

document.querySelector('#allNews')?.addEventListener('click', (event) => {
  event.preventDefault();
  const link = event.currentTarget;
  const entries = [...document.querySelectorAll('.archived-news')];
  const isExpanded = link.getAttribute('aria-expanded') === 'true';
  entries.forEach((entry) => { entry.hidden = isExpanded; });
  link.setAttribute('aria-expanded', String(!isExpanded));
  link.innerHTML = isExpanded ? 'Toutes les actualités <span>↗</span>' : 'Réduire les actualités <span>↑</span>';
});
