(() => {
  const user = window.NovaTerraAuth?.getSession();
  if (!user?.email || user.profile !== 'citizen') return;
  const storageKey = `novaTerraWelcome.v1:${encodeURIComponent(user.email)}`;
  try {
    if (localStorage.getItem(storageKey) === 'complete') return;
  } catch (_) { /* The guide remains available if storage is disabled. */ }

  const dialog = document.querySelector('#welcomeGuide');
  const title = document.querySelector('#welcomeTitle');
  const copy = document.querySelector('#welcomeCopy');
  const stepCount = document.querySelector('#welcomeStepCount');
  const progress = document.querySelector('#welcomeProgress');
  const skipButton = document.querySelector('#welcomeSkip');
  const backButton = document.querySelector('#welcomeBack');
  const nextButton = document.querySelector('#welcomeNext');
  const actionButton = document.querySelector('#welcomeAction');
  let step = 0;

  const guide = {
    fr: [
      { title: 'Bienvenue à Nova Terra.', copy: 'Voici votre espace citoyen. Ce parcours rapide vous montre les repères utiles pour bien commencer.', action: null },
      { title: 'Suivez la vie de la cité.', copy: 'Consultez les signalements récents, leur état et les informations partagées par les services municipaux.', action: 'reports', label: 'Voir les signalements' },
      { title: 'Personnalisez votre profil.', copy: 'Ajoutez une photo, vérifiez votre nom et indiquez votre secteur depuis le panneau de profil.', action: 'profile', label: 'Modifier mon profil' },
      { title: 'Adaptez votre interface.', copy: 'Dans les préférences, choisissez la langue, le contraste et une taille de texte plus confortable.', action: 'preferences', label: 'Ouvrir les préférences' },
    ],
    en: [
      { title: 'Welcome to Nova Terra.', copy: 'This is your citizen space. This short guide introduces the key things to get started.', action: null },
      { title: 'Follow what is happening.', copy: 'Review recent reports, their status and updates shared by city services.', action: 'reports', label: 'View citizen reports' },
      { title: 'Personalize your profile.', copy: 'Add a photo, check your name and set your district in the profile panel.', action: 'profile', label: 'Edit my profile' },
      { title: 'Adjust your interface.', copy: 'Choose a language, stronger contrast or a more comfortable text size in preferences.', action: 'preferences', label: 'Open preferences' },
    ],
  };

  function activeGuide() {
    return guide[document.documentElement.lang === 'en' ? 'en' : 'fr'];
  }

  function renderStep() {
    const item = activeGuide()[step];
    title.textContent = item.title;
    copy.textContent = item.copy;
    stepCount.textContent = `${String(step + 1).padStart(2, '0')} / ${String(activeGuide().length).padStart(2, '0')}`;
    progress.style.width = `${((step + 1) / activeGuide().length) * 100}%`;
    backButton.hidden = step === 0;
    nextButton.innerHTML = step === activeGuide().length - 1
      ? (document.documentElement.lang === 'en' ? 'Finish <span>✓</span>' : 'Terminer <span>✓</span>')
      : (document.documentElement.lang === 'en' ? 'Continue <span>→</span>' : 'Continuer <span>→</span>');
    actionButton.hidden = !item.action;
    actionButton.textContent = item.label || '';
  }

  function finish(action = null) {
    try { localStorage.setItem(storageKey, 'complete'); } catch (_) { /* The tour still closes for this visit. */ }
    dialog.close();
    if (!action) return;
    window.setTimeout(() => {
      if (action === 'reports') {
        const target = document.querySelector('#reports');
        target?.setAttribute('tabindex', '-1');
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target?.focus({ preventScroll: true });
      } else if (action === 'profile') {
        document.querySelector('#editProfileButton')?.click();
      } else if (action === 'preferences') {
        window.NovaTerraPreferences?.open();
      }
    }, 100);
  }

  nextButton.addEventListener('click', () => {
    if (step === activeGuide().length - 1) finish();
    else { step += 1; renderStep(); }
  });
  backButton.addEventListener('click', () => { step = Math.max(0, step - 1); renderStep(); });
  skipButton.addEventListener('click', () => finish());
  actionButton.addEventListener('click', () => finish(activeGuide()[step].action));
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    finish();
  });
  window.addEventListener('nova:language-change', renderStep);

  renderStep();
  window.setTimeout(() => dialog.showModal(), 350);
})();
