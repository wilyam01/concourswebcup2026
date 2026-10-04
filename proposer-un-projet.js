(() => {
  const form = document.querySelector('#projectProposalForm');
  const status = document.querySelector('#proposalStatus');
  const note = document.querySelector('#proposalStorageNote');
  const api = window.NovaTerraApi;
  if (api?.enabled) note.textContent = 'Votre proposition sera transmise à la mairie. N’indiquez aucune coordonnée personnelle.';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    const idea = { title: String(data.get('title') || '').trim(), body: String(data.get('body') || '').trim(), website: String(data.get('website') || '') };
    if (idea.website) return;
    button.disabled = true;
    status.textContent = 'Envoi en cours…';
    try {
      if (api?.enabled) {
        const result = await api.request('/citizen-ideas', { method: 'POST', body: JSON.stringify(idea) });
        form.reset();
        status.textContent = `Merci ! Votre proposition a été transmise. Référence : ${result.idea.reference}.`;
      } else {
        const key = 'nova-terra.public-project-ideas.v1';
        const saved = JSON.parse(localStorage.getItem(key) || '[]');
        saved.push({ ...idea, createdAt: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(saved.slice(-20)));
        form.reset();
        status.textContent = 'Proposition enregistrée sur cet appareil uniquement. Elle n’a pas été transmise à la mairie.';
      }
    } catch (error) {
      status.textContent = error.message === 'INVALID_INPUT'
        ? 'Vérifiez le titre et la description puis réessayez.'
        : error.message === 'DUPLICATE_SUBMISSION'
          ? 'Cette proposition a déjà été reçue récemment.'
        : 'Envoi impossible pour le moment. Réessayez plus tard.';
    } finally {
      button.disabled = false;
    }
  });
})();
