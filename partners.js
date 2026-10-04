(() => {
  const section = document.querySelector('#partenaires');
  if (!section) return;
  const partners = [
    { name: 'Maison des familles', area: 'Centre civique · Secteur 04', type: 'Accompagnement social', note: 'Accueil et orientation des familles.' },
    { name: 'Réseau des jardins partagés', area: 'Serres du Sud · Secteur 07', type: 'Environnement', note: 'Ateliers de compostage et cultures partagées.' },
    { name: 'Collectif mobilité inclusive', area: 'District Boréal · Secteur 01', type: 'Accessibilité', note: 'Conseil sur les déplacements accessibles.' },
    { name: 'Point d’entraide de quartier', area: 'Centre civique · Secteur 04', type: 'Solidarité', note: 'Mise en relation avec les services d’entraide.' },
    { name: 'Atelier numérique citoyen', area: 'District Boréal · Secteur 01', type: 'Médiation numérique', note: 'Aide aux démarches et à l’accès numérique.' },
    { name: 'Association des eaux vivantes', area: 'Serres du Sud · Secteur 07', type: 'Environnement', note: 'Actions de sensibilisation à la ressource en eau.' },
  ];
  const list = section.querySelector('#partnerDirectoryList');
  const search = section.querySelector('#partnerSearch');
  function render() {
    const query = search.value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const visible = partners.filter((partner) => `${partner.name} ${partner.area} ${partner.type} ${partner.note}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query));
    list.replaceChildren(...visible.map((partner) => {
      const card = document.createElement('article');
      card.className = 'partner-card';
      const type = document.createElement('p'); type.className = 'partner-type'; type.textContent = partner.type;
      const title = document.createElement('h3'); title.textContent = partner.name;
      const area = document.createElement('p'); area.className = 'partner-area'; area.textContent = partner.area;
      const note = document.createElement('p'); note.textContent = partner.note;
      card.append(type, title, area, note); return card;
    }));
    section.querySelector('#partnersEmpty').hidden = visible.length > 0;
  }
  search.addEventListener('input', render);
  window.addEventListener('nova:language-change', () => {
    const english = document.documentElement.lang === 'en';
    section.querySelector('.section-kicker').textContent = english ? 'F74 · LOCAL NETWORK' : 'F74 · RÉSEAU LOCAL';
    section.querySelector('#partnersTitle').textContent = english ? 'Associations & partners' : 'Associations & partenaires';
    section.querySelector('#partnersNote').textContent = english ? 'Demo directory: confirm contact details and availability before visiting.' : 'Annuaire de démonstration : coordonnées et disponibilités à confirmer avant tout déplacement.';
    section.querySelector('.partner-search-label').textContent = english ? 'Find a partner' : 'Rechercher un partenaire';
    search.placeholder = english ? 'Name, neighbourhood or field' : 'Nom, quartier ou domaine';
    section.querySelector('#partnersEmpty').textContent = english ? 'No partner matches this search.' : 'Aucun partenaire ne correspond à cette recherche.';
  });
  render();
})();
