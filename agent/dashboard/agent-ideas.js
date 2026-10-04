(() => {
  const user = window.NovaTerraAuth?.getSession();
  const section = document.querySelector('#citizenIdeasSection');
  if (!section || !['agent', 'admin'].includes(user?.profile)) {
    if (section) section.hidden = true;
    return;
  }

  const host = document.querySelector('#citizenIdeasList');
  const feedback = document.querySelector('#citizenIdeasFeedback');
  const refresh = document.querySelector('#refreshCitizenIdeas');
  const english = () => document.documentElement.lang === 'en';

  async function renderIdeas() {
    refresh.disabled = true;
    host.replaceChildren();
    feedback.textContent = english() ? 'Loading citizen ideas…' : 'Chargement des propositions…';
    try {
      let ideas;
      if (window.NovaTerraApi?.enabled) {
        const result = await window.NovaTerraApi.request('/citizen-ideas');
        ideas = Array.isArray(result.ideas) ? result.ideas : [];
      } else {
        try {
          const saved = JSON.parse(localStorage.getItem('nova-terra.public-project-ideas.v1') || '[]');
          ideas = Array.isArray(saved) ? saved : [];
        } catch (_) { ideas = []; }
      }

      host.replaceChildren();
      ideas.forEach((idea) => {
        const card = document.createElement('article');
        card.className = 'citizen-idea-management-card';
        const title = document.createElement('h3');
        title.textContent = idea.title || '';
        const body = document.createElement('p');
        body.textContent = idea.body || '';
        const meta = document.createElement('small');
        meta.textContent = `${idea.reference ? `${english() ? 'Reference' : 'Référence'} ${idea.reference} · ` : ''}${new Intl.DateTimeFormat(english() ? 'en' : 'fr', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(idea.createdAt))}`;
        const status = document.createElement('select');
        status.setAttribute('aria-label', english() ? `Project status: ${idea.title}` : `État du projet : ${idea.title}`);
        const stages = english()
          ? [['received', 'Received'], ['reviewing', 'Under review'], ['planned', 'Planned'], ['in_progress', 'In progress'], ['completed', 'Completed'], ['declined', 'Declined']]
          : [['received', 'Reçue'], ['reviewing', 'À l’étude'], ['planned', 'Planifiée'], ['in_progress', 'En cours'], ['completed', 'Terminée'], ['declined', 'Non retenue']];
        stages.forEach(([value, label]) => status.add(new Option(label, value)));
        status.value = idea.status || 'received';
        status.disabled = !window.NovaTerraApi?.enabled || !idea.reference;
        status.addEventListener('change', async () => {
          status.disabled = true;
          try {
            await window.NovaTerraApi.request(`/citizen-ideas/${encodeURIComponent(idea.reference)}`, {
              method: 'PATCH', body: JSON.stringify({ status: status.value }),
            });
            idea.status = status.value;
            feedback.textContent = english() ? 'Project status updated.' : 'État du projet mis à jour.';
          } catch (_) {
            status.value = idea.status || 'received';
            feedback.textContent = english() ? 'Project status could not be saved.' : 'Impossible d’enregistrer cet état.';
          } finally { status.disabled = false; }
        });
        card.append(title, body, meta, status);
        host.append(card);
      });
      feedback.textContent = ideas.length
        ? (window.NovaTerraApi?.enabled
          ? (english() ? `${ideas.length} idea(s) received by the city service.` : `${ideas.length} proposition(s) reçue(s) par le service municipal.`)
          : (english() ? `${ideas.length} demo idea(s) saved in this browser.` : `${ideas.length} proposition(s) de démonstration enregistrée(s) dans ce navigateur.`))
        : (english() ? 'No citizen ideas have been submitted yet.' : 'Aucune proposition citoyenne pour le moment.');
    } catch (_) {
      feedback.textContent = english() ? 'Citizen ideas could not be loaded.' : 'Les propositions citoyennes n’ont pas pu être chargées.';
    } finally {
      refresh.disabled = false;
    }
  }

  refresh.addEventListener('click', renderIdeas);
  window.addEventListener('nova:language-change', renderIdeas);
  window.addEventListener('storage', (event) => {
    if (event.key === 'nova-terra.public-project-ideas.v1') void renderIdeas();
  });
  renderIdeas();
  if (window.NovaTerraApi?.enabled) window.NovaTerraEco.schedulePolling(renderIdeas);
})();
