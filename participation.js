(() => {
  const session = window.NovaTerraAuth?.getSession();
  if (!session || !document.querySelector('#participation')) return;

  const userKey = encodeURIComponent(session.email || 'citizen');
  const votesKey = `nova-terra.participation-votes.v1:${userKey}`;
  const ideasKey = `nova-terra.participation-ideas.v1:${userKey}`;
  let english = false;
  let sharedVoteData = { totals: [], mine: [] };
  try { english = localStorage.getItem('novaTerraLanguage.v1') === 'en'; } catch (_) { /* Keep French when preferences cannot be read. */ }

  const consultations = {
    fr: [
      { id: 'water-cycle', title: 'Préserver le cycle de l’eau', body: 'Quelle action la ville devrait-elle prioriser pour préserver les ressources en eau ?', options: ['Réparer les fuites en priorité', 'Récupérer davantage l’eau de pluie', 'Aider les foyers à réduire leur consommation'] },
      { id: 'green-streets', title: 'Plus de végétation dans chaque quartier', body: 'Où commencer le prochain programme de plantations ?', options: ['Les trajets vers les écoles', 'Les rues principales', 'Les places publiques'] },
    ],
    en: [
      { id: 'water-cycle', title: 'Protecting the city water cycle', body: 'Which action should the city prioritise to preserve water resources?', options: ['Repair leaks first', 'Expand rainwater recovery', 'Help households reduce use'] },
      { id: 'green-streets', title: 'Greener streets in every district', body: 'Where should the next planting programme begin?', options: ['School routes', 'Main streets', 'Public squares'] },
    ],
  };
  const projects = {
    fr: [
      ['Récupération de l’eau en ville', 'Installer des systèmes de collecte et de réutilisation de l’eau de pluie sur les bâtiments municipaux.'],
      ['Des rues plus fraîches et plus vertes', 'Planter des arbres d’ombrage et améliorer les cheminements piétons dans les quartiers.'],
      ['Énergie propre pour les services publics', 'Étudier l’énergie solaire pour les équipements collectifs et les centres de services.'],
    ],
    en: [
      ['Urban water recovery', 'Installing rainwater collection and reuse systems on municipal buildings.'],
      ['Cooler, greener streets', 'Planting shade trees and improving walking routes in neighbourhoods.'],
      ['Clean energy for public services', 'Studying solar power for community facilities and service centres.'],
    ],
  };

  function read(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) { return []; }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) { return false; }
  }

  const consultationList = document.querySelector('#consultationList');
  const projectList = document.querySelector('#cityProjectList');
  const ideaList = document.querySelector('#citizenIdeaList');
  const feedback = document.querySelector('#participationFeedback');

  function renderCopy() {
    const copy = english ? {
      intro: 'Explore city projects, share your view on current decisions and suggest ideas for the planet and your neighbourhood.',
      storage: 'Demo space: projects and consultations are illustrative; your votes and ideas are saved only in this browser.',
      title: 'Projects & consultations', opinion: 'Share your view', projects: 'Current projects',
      ideaKicker: 'F68 · CITIZEN PROPOSAL', ideaTitle: 'An idea for the city or planet?', ideaHint: 'Share a practical proposal. Do not include personal contact details.',
      titleLabel: 'Idea title', bodyLabel: 'Describe your idea', save: 'Save my idea',
    } : {
      intro: 'Consulte les projets de la ville, donne ton avis sur les décisions en cours et propose tes idées pour la planète et ton quartier.',
      storage: 'Espace de démonstration : projets et consultations illustratifs; tes réponses et idées sont enregistrées uniquement dans ce navigateur.',
      title: 'Projets & consultations', opinion: 'Donner son avis', projects: 'Projets en cours',
      ideaKicker: 'F68 · PROPOSITION CITOYENNE', ideaTitle: 'Une idée pour la ville ou la planète ?', ideaHint: 'Partage une proposition concrète. N’ajoute pas de coordonnées personnelles.',
      titleLabel: 'Titre de l’idée', bodyLabel: 'Décris ton idée', save: 'Enregistrer mon idée',
    };
    document.querySelector('#participationIntro').textContent = copy.intro;
    document.querySelector('#participationStorageNote').textContent = window.NovaTerraApi?.enabled
      ? (english
        ? 'Connected city service: consultation votes are counted together and submitted ideas are shared with signed-in residents. Project cards are currently illustrative examples.'
        : 'Service municipal connecté : les avis sont comptabilisés ensemble et les idées transmises sont partagées avec les habitants connectés. Les projets affichés sont encore des exemples illustratifs.')
      : copy.storage;
    document.querySelector('#participationTitle').textContent = copy.title;
    document.querySelector('#consultationsTitle').textContent = copy.opinion;
    document.querySelector('#projectsTitle').textContent = copy.projects;
    document.querySelector('.participation-idea-form .panel-kicker').textContent = copy.ideaKicker;
    document.querySelector('.participation-idea-form h3').textContent = copy.ideaTitle;
    document.querySelector('.participation-idea-form>div>p').textContent = copy.ideaHint;
    document.querySelector('label[for="participationIdeaTitle"]').firstChild.textContent = copy.titleLabel;
    document.querySelector('label[for="participationIdeaBody"]').firstChild.textContent = copy.bodyLabel;
    document.querySelector('#participationIdeaForm button[type="submit"]').textContent = copy.save;
  }

  function renderConsultations() {
    consultationList.replaceChildren();
    const votes = read(votesKey);
    (english ? consultations.en : consultations.fr).forEach((consultation) => {
      const card = document.createElement('article');
      card.className = 'participation-card';
      const title = document.createElement('h4');
      title.textContent = consultation.title;
      const description = document.createElement('p');
      description.textContent = consultation.body;
      card.append(title, description);
      const group = document.createElement('div');
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', english ? `Your opinion: ${consultation.title}` : `Ton avis : ${consultation.title}`);
      consultation.options.forEach((option, index) => {
        const label = document.createElement('label');
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `consultation-${consultation.id}`;
        radio.value = String(index);
        radio.checked = window.NovaTerraApi?.enabled
          ? sharedVoteData.mine.some((vote) => vote.consultationId === consultation.id && Number(vote.choice) === index)
          : votes.some((vote) => vote.id === consultation.id && vote.choice === index);
        radio.addEventListener('change', async () => {
          if (window.NovaTerraApi?.enabled) {
            radio.disabled = true;
            try {
              await window.NovaTerraApi.request(`/consultation-votes/${encodeURIComponent(consultation.id)}`, {
                method: 'PUT', body: JSON.stringify({ choice: index }),
              });
              await loadSharedVotes();
              feedback.textContent = english ? 'Your opinion was shared with the consultation results.' : 'Ton avis a été ajouté aux résultats partagés de la consultation.';
            } catch (_) {
              feedback.textContent = english ? 'Your opinion could not be sent.' : 'Ton avis n’a pas pu être transmis.';
            } finally { radio.disabled = false; }
            return;
          }
          const nextVotes = read(votesKey).filter((vote) => vote.id !== consultation.id);
          nextVotes.push({ id: consultation.id, choice: index, updatedAt: new Date().toISOString() });
          feedback.textContent = save(votesKey, nextVotes)
            ? (english ? 'Your choice is saved on this device only.' : 'Ton choix est enregistré sur cet appareil uniquement.')
            : (english ? 'This device could not save your choice.' : 'Impossible d’enregistrer ton choix sur cet appareil.');
        });
        const text = document.createElement('span');
        text.textContent = option;
        label.append(radio, text);
        if (window.NovaTerraApi?.enabled) {
          const total = sharedVoteData.totals.filter((vote) => vote.consultationId === consultation.id && Number(vote.choice) === index).reduce((sum, vote) => sum + Number(vote.count), 0);
          const tally = document.createElement('small');
          tally.textContent = english ? `${total} votes` : `${total} avis`;
          label.append(tally);
        }
        group.append(label);
      });
      card.append(group);
      consultationList.append(card);
    });
  }

  async function loadSharedVotes() {
    if (!window.NovaTerraApi?.enabled) return;
    try {
      sharedVoteData = await window.NovaTerraApi.request('/consultation-votes');
      sharedVoteData.totals = Array.isArray(sharedVoteData.totals) ? sharedVoteData.totals : [];
      sharedVoteData.mine = Array.isArray(sharedVoteData.mine) ? sharedVoteData.mine : [];
      renderConsultations();
    } catch (_) {
      feedback.textContent = english ? 'Shared consultation results are unavailable.' : 'Les résultats partagés des consultations ne sont pas disponibles.';
    }
  }

  function renderProjects() {
    projectList.replaceChildren();
    (english ? projects.en : projects.fr).forEach(([name, description]) => {
      const card = document.createElement('article');
      card.className = 'participation-card';
      const title = document.createElement('h4');
      title.textContent = name;
      const summary = document.createElement('p');
      summary.textContent = description;
      card.append(title, summary);
      projectList.append(card);
    });
  }

  function renderIdeas(ideas) {
    ideaList.replaceChildren();
    ideas.forEach((idea) => {
      const item = document.createElement('li');
      const title = document.createElement('b');
      title.textContent = idea.title;
      const body = document.createElement('span');
      body.textContent = idea.body;
      item.append(title, body);
      ideaList.append(item);
    });
  }

  async function loadIdeas() {
    if (!window.NovaTerraApi?.enabled) {
      renderIdeas(read(ideasKey));
      return;
    }
    try {
      const result = await window.NovaTerraApi.request('/citizen-ideas');
      renderIdeas(Array.isArray(result.ideas) ? result.ideas : []);
    } catch (_) {
      renderIdeas([]);
      feedback.textContent = english
        ? 'Shared ideas could not be loaded. Please try again.'
        : 'Les idées partagées ne sont pas disponibles pour le moment.';
    }
  }

  renderCopy();
  renderConsultations();
  loadSharedVotes();
  renderProjects();
  loadIdeas();
  window.addEventListener('nova:language-change', () => {
    english = document.documentElement.lang === 'en';
    renderCopy();
    renderConsultations();
    renderProjects();
  });

  document.querySelector('#participationIdeaForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const idea = {
      title: String(formData.get('title') || '').trim(),
      body: String(formData.get('body') || '').trim(),
      createdAt: new Date().toISOString(),
    };
    if (!idea.title || !idea.body) return;
    if (window.NovaTerraApi?.enabled) {
      try {
        await window.NovaTerraApi.request('/citizen-ideas', {
          method: 'POST',
          body: JSON.stringify({ title: idea.title, body: idea.body }),
        });
        event.currentTarget.reset();
        feedback.textContent = english
          ? 'Your idea was sent and is now shared with residents.'
          : 'Ton idée a été transmise et partagée avec les habitants.';
        await loadIdeas();
      } catch (_) {
        feedback.textContent = english
          ? 'Your idea could not be sent. Please try again.'
          : 'Ton idée n’a pas pu être transmise. Réessaie.';
      }
      return;
    }
    const updated = [...read(ideasKey), idea].slice(-20);
    if (!save(ideasKey, updated)) {
      feedback.textContent = english ? 'This device could not save your idea.' : 'Impossible d’enregistrer ton idée sur cet appareil.';
      return;
    }
    renderIdeas(updated);
    event.currentTarget.reset();
    feedback.textContent = english
      ? 'Your idea is saved on this device only; it has not been sent to the city.'
      : 'Ton idée est enregistrée sur cet appareil uniquement ; elle n’a pas été envoyée à la mairie.';
  });
})();
