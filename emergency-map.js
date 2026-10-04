(() => {
  const section = document.querySelector('#urgences');
  if (!section) return;

  const places = [
    { id: 'aurore-hospital', type: 'hospital', name: 'Hôpital des Aurores', englishName: 'Aurora Hospital', district: 'District Boréal', englishDistrict: 'Boreal District', detail: 'Soins et accueil hospitalier · horaires à confirmer', englishDetail: 'Hospital care and reception · hours to be confirmed', x: 20, y: 30 },
    { id: 'boreal-clinic', type: 'hospital', name: 'Centre de santé Boréal', englishName: 'Boreal Health Centre', district: 'District Boréal', englishDistrict: 'Boreal District', detail: 'Centre de soins · fiche illustrative', englishDetail: 'Care centre · illustrative listing', x: 40, y: 18 },
    { id: 'civic-medical', type: 'hospital', name: 'Pôle médical civique', englishName: 'Civic Medical Hub', district: 'Centre civique', englishDistrict: 'Civic Centre', detail: 'Consultations et soins · horaires à confirmer', englishDetail: 'Consultations and care · hours to be confirmed', x: 62, y: 43 },
    { id: 'central-rescue', type: 'rescue', name: 'Poste de secours central', englishName: 'Central Emergency Station', district: 'Centre civique', englishDistrict: 'Civic Centre', detail: 'Point de secours · fiche illustrative', englishDetail: 'Emergency response point · illustrative listing', x: 45, y: 64 },
    { id: 'south-rescue', type: 'rescue', name: 'Relais de secours Sud', englishName: 'South Emergency Relay', district: 'Serres du Sud', englishDistrict: 'Southern Greenhouses', detail: 'Relais de secours · fiche illustrative', englishDetail: 'Emergency relay · illustrative listing', x: 79, y: 73 },
    { id: 'civic-cooling', type: 'cooling', name: 'Espace fraîcheur civique', englishName: 'Civic Cooling Centre', district: 'Centre civique', englishDistrict: 'Civic Centre', detail: 'Espace de fraîcheur · horaires à confirmer', englishDetail: 'Cooling space · hours to be confirmed', x: 29, y: 80 },
    { id: 'civic-services', type: 'municipal', name: 'Maison des services municipaux', englishName: 'Municipal Services Centre', district: 'Centre civique', englishDistrict: 'Civic Centre', detail: 'Accueil et démarches · fiche illustrative', englishDetail: 'Resident services and procedures · illustrative listing', x: 52, y: 29 },
    { id: 'boreal-services', type: 'municipal', name: 'Antenne municipale Boréale', englishName: 'Boreal Municipal Office', district: 'District Boréal', englishDistrict: 'Boreal District', detail: 'Accueil de proximité · fiche illustrative', englishDetail: 'Local resident services · illustrative listing', x: 13, y: 52 },
    { id: 'south-services', type: 'municipal', name: 'Point municipal des Serres', englishName: 'Southern Greenhouses Municipal Desk', district: 'Serres du Sud', englishDistrict: 'Southern Greenhouses', detail: 'Accueil de proximité · fiche illustrative', englishDetail: 'Local resident services · illustrative listing', x: 72, y: 49 },
  ];
  const typeLabels = {
    fr: { hospital: 'Hôpital / soins', rescue: 'Secours', cooling: 'Lieu frais', municipal: 'Service municipal' },
    en: { hospital: 'Hospital / care', rescue: 'Emergency response', cooling: 'Cooling centre', municipal: 'Municipal service' },
  };
  const labels = {
    fr: {
      nav: 'Urgences et services', filterLabel: 'Filtrer les lieux sur la carte', all: 'Tous les lieux', hospital: 'Hôpitaux & soins', rescue: 'Secours', cooling: 'Lieux frais', municipal: 'Services municipaux',
      kicker: '00 · SERVICES LOCAUX', title: 'Services municipaux et lieux d’urgence', intro: 'Repère les antennes municipales, les centres de soin, les postes de secours et les lieux de fraîcheur.',
      call: 'Danger immédiat ? Appelle le 112', map: 'Carte schématique interactive des services municipaux et lieux d’urgence', north: 'District Boréal', center: 'Centre civique', south: 'Serres du Sud', caption: 'CARTE SCHÉMATIQUE · DÉMO',
      locations: 'Lieux répertoriés', count: (n) => `${n} lieu${n > 1 ? 'x' : ''}`, empty: 'Aucun lieu dans cette catégorie.',
      selected: (name, district) => `Lieu sélectionné : ${name}, ${district}.`, details: 'Sélectionner ce lieu sur la carte', callPlace: 'Pour une urgence réelle, appeler le 112',
      disclaimer: 'Maquette illustrative : les lieux affichés, horaires et disponibilités ne sont pas des données officielles. En situation réelle, appelle le 112.',
    },
    en: {
      nav: 'Emergency and city services', filterLabel: 'Filter places on the map', all: 'All places', hospital: 'Hospitals & care', rescue: 'Emergency response', cooling: 'Cooling centres', municipal: 'Municipal services',
      kicker: '00 · LOCAL SERVICES', title: 'Municipal services and emergency locations', intro: 'Find municipal offices, care centres, emergency response points and cooling spaces around the city.',
      call: 'Immediate danger? Call 112', map: 'Schematic interactive map of municipal services and emergency locations', north: 'Boreal District', center: 'Civic Centre', south: 'Southern Greenhouses', caption: 'SCHEMATIC MAP · DEMO',
      locations: 'Listed locations', count: (n) => `${n} place${n === 1 ? '' : 's'}`, empty: 'No locations in this category.',
      selected: (name, district) => `Selected location: ${name}, ${district}.`, details: 'Select this location on the map', callPlace: 'For a real emergency, call 112',
      disclaimer: 'Illustrative demo: locations, hours and availability are not official data. In a real emergency, call 112.',
    },
  };
  const map = section.querySelector('#emergencyMap');
  const markerLayer = section.querySelector('#emergencyMarkers');
  const list = section.querySelector('#emergencyFacilityList');
  const resultCount = section.querySelector('#emergencyResultCount');
  const empty = section.querySelector('#emergencyEmpty');
  const selectedPlace = section.querySelector('#emergencySelectedPlace');
  let filter = 'all';
  let selectedId = places[0].id;
  const english = () => document.documentElement.lang === 'en';
  const currentLabels = () => labels[english() ? 'en' : 'fr'];
  const placeName = (place) => english() ? place.englishName : place.name;
  const placeDistrict = (place) => english() ? place.englishDistrict : place.district;

  function selectPlace(id) {
    selectedId = id;
    const place = places.find((item) => item.id === id);
    markerLayer.querySelectorAll('button').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.placeId === id));
    });
    list.querySelectorAll('[data-place-select]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.placeSelect === id));
    });
    if (selectedPlace && place) selectedPlace.textContent = currentLabels().selected(placeName(place), placeDistrict(place));
  }

  function render() {
    const current = currentLabels();
    const visible = places.filter((place) => filter === 'all' || place.type === filter);
    if (!visible.some((place) => place.id === selectedId)) selectedId = visible[0]?.id || '';
    markerLayer.replaceChildren(...visible.map((place) => {
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = `emergency-marker type-${place.type}`;
      marker.dataset.placeId = place.id;
      marker.style.left = `${place.x}%`;
      marker.style.top = `${place.y}%`;
      marker.textContent = String(places.indexOf(place) + 1);
      marker.setAttribute('aria-pressed', String(place.id === selectedId));
      marker.setAttribute('aria-label', `${placeName(place)} · ${typeLabels[english() ? 'en' : 'fr'][place.type]} · ${placeDistrict(place)}`);
      marker.title = marker.getAttribute('aria-label');
      marker.addEventListener('click', () => selectPlace(place.id));
      return marker;
    }));
    list.replaceChildren(...visible.map((place) => {
      const card = document.createElement('article');
      card.className = `emergency-facility type-${place.type}`;
      const category = document.createElement('span');
      category.className = 'emergency-facility-type';
      category.textContent = typeLabels[english() ? 'en' : 'fr'][place.type];
      const choose = document.createElement('button');
      choose.type = 'button';
      choose.className = 'emergency-facility-select';
      choose.dataset.placeSelect = place.id;
      choose.setAttribute('aria-pressed', String(place.id === selectedId));
      choose.setAttribute('aria-label', `${current.details}: ${placeName(place)}, ${placeDistrict(place)}`);
      const name = document.createElement('b');
      name.textContent = placeName(place);
      const district = document.createElement('span');
      district.textContent = placeDistrict(place);
      choose.append(name, district);
      choose.addEventListener('click', () => {
        selectPlace(place.id);
      });
      const detail = document.createElement('p');
      detail.textContent = english() ? place.englishDetail : place.detail;
      const call = document.createElement('a');
      call.href = 'tel:112';
      call.textContent = '112';
      call.setAttribute('aria-label', current.callPlace);
      card.append(category, choose, detail, call);
      return card;
    }));
    resultCount.textContent = current.count(visible.length);
    empty.textContent = current.empty;
    empty.hidden = visible.length > 0;
    if (visible.length) selectPlace(selectedId);
  }

  function applyLanguage() {
    const current = currentLabels();
    document.querySelector('#emergencyNavLink').textContent = current.nav;
    section.querySelector('#emergencyFilters').setAttribute('aria-label', current.filterLabel);
    section.querySelector('#emergencyFilters [data-emergency-filter="all"]').textContent = current.all;
    section.querySelector('#emergencyFilters [data-emergency-filter="hospital"]').textContent = current.hospital;
    section.querySelector('#emergencyFilters [data-emergency-filter="rescue"]').textContent = current.rescue;
    section.querySelector('#emergencyFilters [data-emergency-filter="cooling"]').textContent = current.cooling;
    section.querySelector('#emergencyFilters [data-emergency-filter="municipal"]').textContent = current.municipal;
    section.querySelector('#emergencyKicker').textContent = current.kicker;
    section.querySelector('#emergencyTitle').textContent = current.title;
    section.querySelector('#emergencyIntro').textContent = current.intro;
    section.querySelector('#emergencyCallLink').textContent = current.call;
    map.setAttribute('aria-label', current.map);
    section.querySelector('#emergencyNorth').textContent = current.north;
    section.querySelector('#emergencyCenter').textContent = current.center;
    section.querySelector('#emergencySouth').textContent = current.south;
    section.querySelector('#emergencyMapCaption').textContent = current.caption;
    section.querySelector('#emergencyLocationsTitle').textContent = current.locations;
    section.querySelector('#emergencyDisclaimer').textContent = current.disclaimer;
    render();
  }

  section.querySelectorAll('[data-emergency-filter]').forEach((button) => button.addEventListener('click', () => {
    filter = button.dataset.emergencyFilter;
    section.querySelectorAll('[data-emergency-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    render();
  }));
  window.addEventListener('nova:language-change', applyLanguage);
  applyLanguage();
})();
