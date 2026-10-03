(() => {
  const storageKeys = {
    language: 'novaTerraLanguage.v1',
    contrast: 'novaTerraContrast.v1',
    textSize: 'novaTerraTextSize.v1',
  };
  const safeRead = (key, fallback) => {
    try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; }
  };
  const safeWrite = (key, value) => {
    try { localStorage.setItem(key, value); } catch (_) { /* Preferences still apply for this page. */ }
  };

  const dialog = document.createElement('dialog');
  dialog.className = 'a11y-dialog';
  dialog.setAttribute('aria-labelledby', 'a11yTitle');
  dialog.innerHTML = `
    <div class="a11y-dialog-heading"><div><p class="a11y-kicker">NOVA TERRA · CONFORT DE LECTURE</p><h2 id="a11yTitle">Langue et accessibilité</h2></div><button class="a11y-close" type="button" aria-label="Fermer les préférences">×</button></div>
    <label class="a11y-setting" for="interfaceLanguage"><span><b>Langue de l’interface</b><small>Choisis la langue des commandes et repères.</small></span><select id="interfaceLanguage"><option value="fr">Français</option><option value="en">English</option></select></label>
    <label class="a11y-contrast-setting" for="highContrast"><span><b>Contraste élevé</b><small>Renforce les contours et la lisibilité.</small></span><input id="highContrast" type="checkbox" /></label>
    <fieldset class="a11y-size-setting"><legend>Taille du texte</legend><div role="group" aria-label="Taille du texte"><button type="button" data-text-size="normal" aria-pressed="false">A</button><button type="button" data-text-size="large" aria-pressed="false">A+</button><button type="button" data-text-size="largest" aria-pressed="false">A++</button></div></fieldset>
  `;
  const launcher = document.createElement('button');
  launcher.className = 'a11y-launcher';
  launcher.type = 'button';
  launcher.textContent = 'Aa';
  launcher.setAttribute('aria-label', 'Ouvrir les préférences de langue et d’accessibilité');
  launcher.setAttribute('aria-haspopup', 'dialog');
  launcher.setAttribute('aria-controls', 'a11yPreferences');
  dialog.id = 'a11yPreferences';
  document.body.append(launcher, dialog);
  const skipLink = document.querySelector('.skip-link');
  const skipTarget = skipLink?.getAttribute('href') ? document.querySelector(skipLink.getAttribute('href')) : null;
  if (skipTarget && !skipTarget.hasAttribute('tabindex')) skipTarget.setAttribute('tabindex', '-1');

  let language = safeRead(storageKeys.language, 'fr');
  let contrast = safeRead(storageKeys.contrast, 'off') === 'on';
  let textSize = safeRead(storageKeys.textSize, 'normal');
  if (!['fr', 'en'].includes(language)) language = 'fr';
  if (!['normal', 'large', 'largest'].includes(textSize)) textSize = 'normal';
  const languageSelect = dialog.querySelector('#interfaceLanguage');
  const contrastToggle = dialog.querySelector('#highContrast');
  const closeButton = dialog.querySelector('.a11y-close');
  languageSelect.value = language;
  contrastToggle.checked = contrast;

  const translations = {
    home: [
      ['.public-nav a:nth-child(1)', 'Services'],
      ['.public-nav a:nth-child(2)', 'News'],
      ['.public-nav a:nth-child(3)', 'Community'],
      ['.header-actions .login-link', 'Sign in'],
      ['.header-actions .button-small', 'Join Nova Terra'],
      ['.hero-actions .button', 'Explore my space'],
      ['.hero-actions .quiet-link', 'Discover services'],
      ['.section-aside .arrow-link', 'View the dashboard'],
      ['.news-more', 'All news'],
      ['.join-actions .button', 'Create my citizen account'],
      ['.join-actions .join-secondary', 'Sign in to my space'],
      ['#serviceSearchLabel', 'Search services by name or need'],
      ['#serviceSearch', null, 'Search services…'],
      ['.service-grid article:nth-child(1) h3', 'Water and environment'],
      ['.service-grid article:nth-child(1) p', 'Check water quality, reserves and initiatives that protect the planet.'],
      ['.service-grid article:nth-child(1) .service-info span:first-child', '24/7 ASSISTANCE'],
      ['.service-grid article:nth-child(2) h3', 'Health and wellbeing'],
      ['.service-grid article:nth-child(2) p', 'Care centres, support and prevention for every generation.'],
      ['.service-grid article:nth-child(2) .service-info span:first-child', 'EMERGENCY CARE · 24/7'],
      ['.service-grid article:nth-child(3) h3', 'Energy and housing'],
      ['.service-grid article:nth-child(3) p', 'Network status, maintenance requests and home solutions.'],
      ['.service-grid article:nth-child(3) .service-info span:first-child', 'STABLE NETWORK · 97%'],
      ['.service-grid article:nth-child(4) h3', 'Getting around'],
      ['.service-grid article:nth-child(4) p', 'Routes, timetables and accessible travel information.'],
      ['.service-grid article:nth-child(4) .service-info span:first-child', 'ROUTES & TIMETABLES'],
      ['.service-grid article:nth-child(5) h3', 'Take part in decisions'],
      ['.service-grid article:nth-child(5) p', 'Share ideas, follow projects and join Council consultations.'],
      ['.service-grid article:nth-child(5) .service-info span:first-child', '3 OPEN CONSULTATIONS'],
      ['.service-grid article:nth-child(6) h3', 'Support and assistance'],
      ['.service-grid article:nth-child(6) p', 'Practical guidance, local support and help with procedures.'],
      ['.service-grid article:nth-child(6) .service-info span:first-child', 'OPEN · 08:00–20:00'],
      ['#mobilityKicker', 'TRANSPORT & MOBILITY'],
      ['#mobilityTitle', 'The network, at your pace.'],
      ['#mobilityIntro', 'Check routes, service hours and shuttle frequency.'],
      ['#mobilityBlueLabel', 'BLUE LINE'],
      ['#mobilityBlueRoute', 'Boreal District ↔ Civic Centre'],
      ['#mobilityBlueHours', 'Service · 06:00–22:00'],
      ['#mobilityBlueFrequency', 'Every 12 min'],
      ['#mobilityBlueAccess', 'Accessible shuttle · main stop: Place des Étoiles'],
      ['#mobilityGreenLabel', 'GREEN LINE'],
      ['#mobilityGreenRoute', 'Southern Greenhouses ↔ Civic Centre'],
      ['#mobilityGreenHours', 'Service · 06:00–20:00'],
      ['#mobilityGreenFrequency', 'Every 20 min'],
      ['#mobilityGreenAccess', 'Greenhouse stop · connects with line A'],
      ['#mobilityGoldLabel', 'GOLD LINE'],
      ['#mobilityGoldRoute', 'Health Centre ↔ Boreal District'],
      ['#mobilityGoldHours', 'Service · 06:00–23:00'],
      ['#mobilityGoldFrequency', 'Every 15 min'],
      ['#mobilityGoldAccess', 'Low-floor line · serves the medical centre'],
      ['#mobilityDemoNote', 'Illustrative demo timetable. Check municipal transit channels for live information.'],
      ['#allNews', 'All news'],
    ],
    login: [
      ['#loginProfileStep .signup-lead', 'Select a profile before entering your credentials.'],
      ['[data-login-profile="citizen"] .login-profile-copy b', 'Citizen'],
      ['[data-login-profile="citizen"] .login-profile-copy small', 'City services, reports and community life.'],
      ['[data-login-profile="agent"] .login-profile-copy small', 'Citizen requests and city service coordination.'],
      ['[data-login-profile="admin"] .login-profile-copy b', 'Administrator'],
      ['[data-login-profile="admin"] .login-profile-copy small', 'High Council · city oversight and decisions.'],
      ['#changeLoginProfile', '← Change profile'],
      ['#loginEmail', null, 'Email address'],
      ['#loginPassword', null, 'Password'],
      ['#togglePassword', 'Show'],
      ['#forgotPassword', 'Forgot password?'],
      ['.signup-login a', 'Create an account'],
    ],
    signup: [
      ['#signupForm label[for="fullName"]', 'Full name'],
      ['#signupForm label[for="email"]', 'Email address'],
      ['#signupForm label[for="sector"]', 'Your district'],
      ['#signupForm label[for="signupPassword"]', 'Password'],
      ['#signupForm label[for="confirmPassword"]', 'Confirm password'],
      ['#fullName', null, 'e.g. Alex Morgan'],
      ['#email', null, 'you@novaterra.city'],
      ['#signupPassword', null, 'At least 8 characters'],
      ['#confirmPassword', null, 'Repeat your password'],
      ['#sector option:nth-child(1)', 'Choose a district'],
      ['#sector option:nth-child(2)', 'Boreal District · Sector 01'],
      ['#sector option:nth-child(3)', 'Civic Centre · Sector 04'],
      ['#sector option:nth-child(4)', 'Southern Greenhouses · Sector 07'],
      ['#sector option:nth-child(5)', 'Other district'],
      ['#signupForm button[type="submit"]', 'Continue'],
      ['.signup-login a', 'Sign in to my account'],
    ],
    dashboard: [
      ['.breadcrumbs span:first-child', 'New Dawn'],
      ['.nav-item[href="#overview"]', 'Overview'],
      ['.nav-item[href="#planet"]', 'Planet and resources'],
      ['.nav-item[href="#reports"]', 'Citizen reports'],
      ['.nav-item[href="#my-requests"]', 'My requests'],
      ['.nav-item[href="#council"]', 'High Council'],
      ['.nav-item[href="contact/index.html"]', 'Citizen contact'],
      ['.nav-item[href="agent/dashboard/index.html"]', 'Agent workspace'],
      ['#logoutButton', 'Sign out'],
      ['.view-btn[data-view="citizen"]', '◉ Citizen'],
      ['.view-btn[data-view="council"]', '⌘ High Council'],
      ['#refreshReports', 'Refresh'],
      ['#allReports', 'View all'],
      ['#myRequestsKicker', 'PERSONAL SPACE · LOCAL REQUESTS'],
      ['#myRequestsTitle', 'My requests and history'],
      ['#openReportForm', '＋ Report an issue'],
      ['#myRequestsNote', 'Follow reports created from this account. They are saved in this browser and are not sent to city services in this version.'],
      ['[data-personal-filter="all"]', 'All'],
      ['[data-personal-filter="open"]', 'In progress'],
      ['[data-personal-filter="history"]', 'History'],
      ['#reportFormKicker', 'CITIZEN REPORT'],
      ['#reportFormTitle', 'Report an urban issue'],
      ['#reportFormNote', 'Describe the issue and choose the service. This form saves reports on this device and does not send them to the city. For emergencies, call '],
      ['#reportTitleLabel', 'Summary'],
      ['#reportCategoryLabel', 'Issue type'],
      ['#reportServiceLabel', 'Municipal service'],
      ['#reportDistrictLabel', 'District or address'],
      ['#reportPriorityLabel', 'Priority level'],
      ['#reportDescriptionLabel', 'Description'],
      ['#reportTitleInput', null, 'e.g. Street lights out on Star Street'],
      ['#reportDistrictInput', null, 'e.g. Sector 04, Place des Étoiles'],
      ['#reportDescriptionInput', null, 'Add details that will help the city team respond.'],
      ['#reportCategory option[value=""]', 'Choose a category'],
      ['#reportCategory option[value="road"]', 'Roads and sidewalks'],
      ['#reportCategory option[value="lighting"]', 'Public lighting'],
      ['#reportCategory option[value="water"]', 'Water and sanitation'],
      ['#reportCategory option[value="waste"]', 'Waste and cleanliness'],
      ['#reportCategory option[value="mobility"]', 'Transport and mobility'],
      ['#reportCategory option[value="safety"]', 'Safety'],
      ['#reportCategory option[value="health"]', 'Health and support'],
      ['#reportCategory option[value="other"]', 'Other'],
      ['#reportService option[value=""]', 'Choose a service'],
      ['#reportService option[value="water"]', 'Water and environment'],
      ['#reportService option[value="health"]', 'Health and wellbeing'],
      ['#reportService option[value="energy"]', 'Energy and housing'],
      ['#reportService option[value="mobility"]', 'Mobility'],
      ['#reportService option[value="civic"]', 'Civic life'],
      ['#reportService option[value="solidarity"]', 'Support and assistance'],
      ['#reportService option[value="other"]', 'Other service'],
      ['#reportPriority option[value="normal"]', 'Standard'],
      ['#reportPriority option[value="high"]', 'Urgent'],
      ['#citizenReportForm #cancelReportForm', 'Cancel'],
      ['#citizenReportForm button[type="submit"]', 'Save report'],
    ],
    agent: [
      ['.sidebar nav a:nth-child(1)', 'Dashboard'],
      ['.sidebar nav a:nth-child(2)', 'Requests'],
      ['.sidebar nav a:nth-child(3)', 'Citizen messages'],
      ['.agent-page .topbar .kicker span', 'New Dawn'],
      ['.agent-page .topbar .kicker b', 'Coordination'],
      ['.top-actions a', 'Citizen contact'],
      ['#agentLogout', 'Sign out'],
      ['#refresh-data', 'Refresh'],
      ['#clear-filters', 'Clear filters'],
    ],
    contact: [
      ['.site-header nav a:nth-child(1)', 'Citizen dashboard'],
      ['.site-header nav a:nth-child(2)', 'Agent workspace'],
      ['.contact-page .intro .kicker', 'CITIZEN SERVICES'],
      ['.contact-page .intro h1', 'Let’s talk about your neighbourhood.'],
      ['.contact-page .service-note .kicker', 'OPEN CHANNEL'],
      ['.contact-page .service-note h2', 'A clear request and follow-up.'],
      ['#contact-form .form-heading .kicker', 'NEW MESSAGE'],
      ['#contact-form .form-heading h2', 'Contact municipal services'],
      ['#contact-form .form-footer span', 'All fields are required.'],
      ['.contact-page .service-note dl dt:first-of-type', 'Estimated response'],
      ['.contact-page .service-note dl div:last-child dt', 'Follow-up'],
      ['#contactNameLabel', 'Your name'],
      ['#contactEmailLabel', 'Your email'],
      ['#contactCategoryLabel', 'Request type'],
      ['#contactSubjectLabel', 'Subject'],
      ['#contactMessageLabel', 'Your message'],
      ['#contactNameLabel input', null, 'e.g. Alex Morgan'],
      ['#contactEmailLabel input', null, 'you@example.com'],
      ['#contactSubjectLabel input', null, 'Summarize your request'],
      ['#contactMessageLabel textarea', null, 'Add the details our team needs.'],
      ['#contactCategoryInfo', 'Information'],
      ['#contactCategorySupport', 'Support'],
      ['#contactCategorySuggestion', 'Suggestion'],
      ['#contactCategoryIssue', 'Neighbourhood issue'],
      ['#contactCategoryOther', 'Other'],
      ['#contact-form button[type="submit"]', 'Send message'],
      ['#new-message', 'Send another message'],
    ],
  };
  const originals = new Map();
  const page = document.body.classList.contains('login-page') ? 'login'
    : document.body.classList.contains('signup-page') ? 'signup'
      : document.body.classList.contains('agent-page') ? 'agent'
        : document.body.classList.contains('contact-page') ? 'contact'
          : document.querySelector('.app-shell') ? 'dashboard' : 'home';

  function setText(element, value, placeholder = null) {
    if (!element) return;
    if (placeholder !== null) {
      if (!originals.has(element)) originals.set(element, element.getAttribute('placeholder'));
      element.setAttribute('placeholder', language === 'en' ? placeholder : originals.get(element));
      return;
    }
    const node = [...element.childNodes].find((child) => child.nodeType === Node.TEXT_NODE && child.nodeValue.trim());
    if (node) {
      if (!originals.has(node)) originals.set(node, node.nodeValue);
      const original = originals.get(node);
      if (language === 'fr') node.nodeValue = original;
      else node.nodeValue = original.replace(original.trim(), value);
    } else if (element.children.length === 0) {
      if (!originals.has(element)) originals.set(element, element.textContent);
      element.textContent = language === 'en' ? value : originals.get(element);
    }
  }

  function applyLanguage() {
    document.documentElement.lang = language;
    (translations[page] || []).forEach(([selector, value, placeholder]) => {
      setText(document.querySelector(selector), value, placeholder);
    });
    const currentDashboardView = document.querySelector('.breadcrumbs b[data-current-view]');
    if (currentDashboardView) {
      currentDashboardView.textContent = currentDashboardView.dataset.currentView === 'council'
        ? (language === 'en' ? 'High Council' : 'Haut Conseil')
        : (language === 'en' ? 'Overview' : 'Vue d’ensemble');
    }
    document.querySelectorAll('.breadcrumbs,.agent-page .topbar .kicker').forEach((breadcrumb) => {
      breadcrumb.setAttribute('role', 'navigation');
      breadcrumb.setAttribute('aria-label', language === 'en' ? 'Breadcrumb' : 'Fil d’Ariane');
      const current = breadcrumb.querySelector('b, [aria-current="page"]');
      if (current) current.setAttribute('aria-current', 'page');
    });
    if (page === 'login') applyLoginLanguage();
    if (page === 'home') {
      const menuButton = document.querySelector('#menuToggle');
      menuButton?.setAttribute('aria-label', language === 'en'
        ? (menuButton.getAttribute('aria-expanded') === 'true' ? 'Close menu' : 'Open menu')
        : (menuButton.getAttribute('aria-expanded') === 'true' ? 'Fermer le menu' : 'Ouvrir le menu'));
      const serviceNames = language === 'en'
        ? ['Water and environment', 'Health and wellbeing', 'Energy and housing', 'Mobility routes and timetables', 'Civic participation', 'Support and assistance']
        : ['Eau et environnement', 'Santé et bien-être', 'Énergie et habitat', 'Horaires et informations de mobilité', 'Vie citoyenne', 'Aide et accompagnement'];
      document.querySelectorAll('.service-grid article a[aria-label]').forEach((link, index) => {
        if (serviceNames[index]) link.setAttribute('aria-label', language === 'en' ? `Learn about ${serviceNames[index]}` : `En savoir plus sur ${serviceNames[index]}`);
      });
    }
    const labels = language === 'en'
      ? { title: 'Language and accessibility', kicker: 'NOVA TERRA · READING COMFORT', language: 'Interface language', languageHint: 'Choose the language for controls and navigation.', contrast: 'High contrast', contrastHint: 'Strengthen outlines and improve readability.', size: 'Text size', close: 'Close preferences', launcher: 'Open language and accessibility preferences' }
      : { title: 'Langue et accessibilité', kicker: 'NOVA TERRA · CONFORT DE LECTURE', language: 'Langue de l’interface', languageHint: 'Choisis la langue des commandes et repères.', contrast: 'Contraste élevé', contrastHint: 'Renforce les contours et la lisibilité.', size: 'Taille du texte', close: 'Fermer les préférences', launcher: 'Ouvrir les préférences de langue et d’accessibilité' };
    dialog.querySelector('#a11yTitle').textContent = labels.title;
    dialog.querySelector('.a11y-kicker').textContent = labels.kicker;
    dialog.querySelector('.a11y-setting b').textContent = labels.language;
    dialog.querySelector('.a11y-setting small').textContent = labels.languageHint;
    dialog.querySelector('.a11y-contrast-setting b').textContent = labels.contrast;
    dialog.querySelector('.a11y-contrast-setting small').textContent = labels.contrastHint;
    dialog.querySelector('.a11y-size-setting legend').textContent = labels.size;
    closeButton.setAttribute('aria-label', labels.close);
    launcher.setAttribute('aria-label', labels.launcher);
    window.dispatchEvent(new Event('nova:language-change'));
  }

  function applyLoginLanguage() {
    const english = language === 'en';
    const pickerHeading = document.querySelector('#loginProfileStep h1');
    const pickerKicker = document.querySelector('#loginProfileStep .section-kicker');
    pickerHeading.innerHTML = english ? 'Choose<br />your <em>space.</em>' : 'Choisissez<br />votre <em>espace.</em>';
    pickerKicker.innerHTML = english
      ? '<span>NOVA TERRA ACCESS</span> · CHOOSE A PROFILE'
      : '<span>ACCÈS NOVA TERRA</span> · CHOIX DE PROFIL';

    const credentialsStep = document.querySelector('#loginCredentialsStep');
    if (credentialsStep.hidden) return;
    const symbol = document.querySelector('#selectedProfileSymbol');
    const profile = symbol.classList.contains('agent-symbol') ? 'agent'
      : symbol.classList.contains('admin-symbol') ? 'admin' : 'citizen';
    const content = {
      citizen: {
        name: english ? 'Citizen' : 'Citoyen(ne)',
        description: english ? 'City services, reports and community life.' : 'Accès aux services et à la vie citoyenne de Nova Terra.',
        kicker: english ? 'CITIZEN SPACE' : 'ESPACE CITOYEN',
        lead: english ? 'Sign in to follow city services and take part in community life.' : 'Connectez-vous pour suivre les services municipaux et participer à la vie de votre cité.',
        notice: english ? '<b>Local demo sign-in</b><br />Accounts are stored only in this browser.' : '<b>Connexion locale de démonstration</b><br />Les comptes sont disponibles uniquement dans ce navigateur.',
        button: english ? 'Sign in' : 'Se connecter',
      },
      agent: {
        name: 'Agent',
        description: english ? 'Work area for citizen requests and city services.' : 'Espace de travail et suivi des demandes citoyennes.',
        kicker: english ? 'AGENT SPACE' : 'ESPACE AGENT',
        lead: english ? 'Sign in to review requests and coordinate city services.' : 'Connectez-vous pour consulter les demandes et coordonner les services municipaux.',
        notice: english ? '<b>Agent demo space</b><br />Demo profiles are stored in this browser.' : '<b>Espace agent de démonstration</b><br />Les profils de cette version fonctionnent dans ce navigateur.',
        button: english ? 'Open agent space' : 'Ouvrir mon espace agent',
      },
      admin: {
        name: english ? 'Administrator' : 'Administrateur',
        description: english ? 'High Council · city oversight and decisions.' : 'Haut Conseil · pilotage et décisions de la cité.',
        kicker: english ? 'ADMINISTRATOR SPACE' : 'ESPACE ADMINISTRATEUR',
        lead: english ? 'Sign in to open the High Council oversight view.' : 'Connectez-vous pour ouvrir la vue de supervision du Haut Conseil.',
        notice: english ? '<b>Administrator demo view</b><br />Demo profiles are stored in this browser.' : '<b>Administration de démonstration</b><br />Les profils de cette version fonctionnent dans ce navigateur.',
        button: english ? 'Open High Council' : 'Ouvrir le Haut Conseil',
      },
    }[profile];
    document.querySelector('#selectedProfileName').textContent = content.name;
    document.querySelector('#selectedProfileDescription').textContent = content.description;
    credentialsStep.querySelector('.section-kicker').innerHTML = `<span>${content.kicker}</span> · ${english ? 'NEW DAWN' : 'NOUVELLE AURORE'}`;
    credentialsStep.querySelector('.signup-lead').textContent = content.lead;
    document.querySelector('.prototype-note span').innerHTML = content.notice;
    document.querySelector('#loginForm [type="submit"]').innerHTML = `${content.button} <span>→</span>`;
    const toggle = document.querySelector('#togglePassword');
    if (toggle) {
      const visible = document.querySelector('#loginPassword').type === 'text';
      toggle.textContent = visible ? (english ? 'Hide' : 'Masquer') : (english ? 'Show' : 'Afficher');
      toggle.setAttribute('aria-label', visible
        ? (english ? 'Hide password' : 'Masquer le mot de passe')
        : (english ? 'Show password' : 'Afficher le mot de passe'));
    }
  }

  function applyTextSize() {
    document.documentElement.dataset.textSize = textSize;
    dialog.querySelectorAll('[data-text-size]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.textSize === textSize));
    });
  }

  function applyContrast() {
    document.documentElement.dataset.contrast = contrast ? 'high' : 'normal';
    contrastToggle.checked = contrast;
  }

  launcher.addEventListener('click', () => dialog.showModal());
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  languageSelect.addEventListener('change', () => {
    language = languageSelect.value;
    safeWrite(storageKeys.language, language);
    applyLanguage();
  });
  contrastToggle.addEventListener('change', () => {
    contrast = contrastToggle.checked;
    safeWrite(storageKeys.contrast, contrast ? 'on' : 'off');
    applyContrast();
  });
  dialog.querySelectorAll('[data-text-size]').forEach((button) => {
    button.addEventListener('click', () => {
      textSize = button.dataset.textSize;
      safeWrite(storageKeys.textSize, textSize);
      applyTextSize();
    });
  });

  applyLanguage();
  applyContrast();
  applyTextSize();
  window.addEventListener('nova:profile-change', () => {
    if (page === 'login') applyLoginLanguage();
  });
  window.NovaTerraPreferences = Object.freeze({ open: () => dialog.showModal() });
})();
