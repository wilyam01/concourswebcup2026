(() => {
  const storageKeys = {
    language: 'novaTerraLanguage.v1',
    contrast: 'novaTerraContrast.v1',
    textSize: 'novaTerraTextSize.v1',
    colorVision: 'novaTerraColorVision.v1',
    simplified: 'novaTerraSimplified.v1',
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
    <label class="a11y-setting" for="interfaceLanguage"><span><b>Langue de l’interface</b><small>Français, anglais, chinois, espagnol, italien, portugais, allemand et kiswahili disponibles.</small></span><select id="interfaceLanguage"><option value="fr">🇫🇷 Français</option><option value="en">🇬🇧 English</option><option value="zh">🇨🇳 中文</option><option value="es">🇪🇸 Español</option><option value="it">🇮🇹 Italiano</option><option value="pt">🇵🇹 Português</option><option value="de">🇩🇪 Deutsch</option><option value="sw">🇹🇿 Kiswahili</option></select></label>
    <label class="a11y-contrast-setting" for="highContrast"><span><b>Contraste élevé</b><small>Renforce les contours et la lisibilité.</small></span><input id="highContrast" type="checkbox" /></label>
    <label class="a11y-setting a11y-color-setting" for="colorVisionMode"><span><b>Palette de couleurs</b><small>Choisis des repères mieux différenciés pour le daltonisme.</small></span><select id="colorVisionMode"><option value="normal">Standard</option><option value="safe">Daltonisme · contrastée</option></select></label>
    <label class="a11y-contrast-setting" for="simplifiedInterface"><span><b>Interface simplifiée</b><small>Allège les décors et facilite le repérage.</small></span><input id="simplifiedInterface" type="checkbox" /></label>
    <label class="a11y-setting" for="lowBandwidthMode"><span><b>Mode connexion lente</b><small>Réduit les effets visuels et espace les vérifications. Le réseau peut l’activer automatiquement.</small></span><select id="lowBandwidthMode"><option value="auto">Automatique</option><option value="on">Activé</option><option value="off">Désactivé</option></select></label>
    <section class="eco-impact" aria-labelledby="ecoImpactTitle"><h3 id="ecoImpactTitle">F57 · Bilan environnemental</h3><p id="ecoImpactMeasurement" role="status" aria-live="polite">Mesure du transfert de cette page…</p><small id="ecoImpactMethod">Mesure partielle du navigateur; cache et ressources tierces peuvent être exclus. Ce n’est pas une estimation d’énergie ou de CO₂.</small></section>
    <fieldset class="a11y-size-setting"><legend>Taille du texte</legend><div role="group" aria-label="Taille du texte"><button type="button" data-text-size="normal" aria-pressed="false">A</button><button type="button" data-text-size="large" aria-pressed="false">A+</button><button type="button" data-text-size="largest" aria-pressed="false">A++</button></div></fieldset>
    <button class="a11y-glossary-button" type="button" id="openGlossary">Ouvrir le glossaire facile à lire</button>
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
  const glossary = document.createElement('dialog');
  glossary.className = 'a11y-dialog a11y-glossary';
  glossary.setAttribute('aria-labelledby', 'glossaryTitle');
  glossary.innerHTML = '<div class="a11y-dialog-heading"><div><p class="a11y-kicker" id="glossaryKicker">NOVA TERRA · MOTS SIMPLES</p><h2 id="glossaryTitle">Petit glossaire</h2></div><button class="a11y-close" type="button" id="closeGlossary" aria-label="Fermer le glossaire">×</button></div><dl class="a11y-glossary-list" id="glossaryList"></dl>';
  document.body.append(glossary);
  const skipLink = document.querySelector('.skip-link');
  const skipTarget = skipLink?.getAttribute('href') ? document.querySelector(skipLink.getAttribute('href')) : null;
  if (skipTarget && !skipTarget.hasAttribute('tabindex')) skipTarget.setAttribute('tabindex', '-1');

  let language = safeRead(storageKeys.language, 'fr');
  let contrast = safeRead(storageKeys.contrast, 'off') === 'on';
  let textSize = safeRead(storageKeys.textSize, 'normal');
  if (!['fr', 'en', 'zh', 'es', 'it', 'pt', 'de', 'sw'].includes(language)) language = 'fr';
  if (!['normal', 'large', 'largest'].includes(textSize)) textSize = 'normal';
  const languageSelect = dialog.querySelector('#interfaceLanguage');
  const contrastToggle = dialog.querySelector('#highContrast');
  const colorVisionSelect = dialog.querySelector('#colorVisionMode');
  const simplifiedToggle = dialog.querySelector('#simplifiedInterface');
  const lowBandwidthSelect = dialog.querySelector('#lowBandwidthMode');
  const ecoImpactMeasurement = dialog.querySelector('#ecoImpactMeasurement');
  const glossaryButton = dialog.querySelector('#openGlossary');
  let colorVision = safeRead(storageKeys.colorVision, 'normal');
  let simplified = safeRead(storageKeys.simplified, 'off') === 'on';
  if (!['normal', 'safe'].includes(colorVision)) colorVision = 'normal';
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
      ['#appointments .panel-kicker', 'CITIZEN SPACE · APPOINTMENTS'],
      ['#appointmentsTitle', 'My municipal appointments'],
      ['#appointments .appointments-note', 'Choose a weekday slot between 8 a.m. and 4:30 p.m. An in-app reminder appears one hour before (or as soon as possible for a nearby appointment). Local bookings stay in this browser; server bookings are shared across devices.'],
      ['#enableAppointmentNotifications', 'Enable system reminders'],
      ['#appointmentForm label[for="appointmentService"]', 'Municipal service'],
      ['#appointmentForm label[for="appointmentAgent"]', 'Municipal agent'],
      ['#appointmentForm label[for="appointmentDate"]', 'Date'],
      ['#appointmentForm label[for="appointmentTime"]', 'Time'],
      ['#appointmentForm label[for="appointmentPurpose"]', 'Appointment reason'],
      ['#appointmentService option[value=""]', 'Choose a service'],
      ['#appointmentService option[value="water"]', 'Water and environment'],
      ['#appointmentService option[value="health"]', 'Health and wellbeing'],
      ['#appointmentService option[value="energy"]', 'Energy and housing'],
      ['#appointmentService option[value="mobility"]', 'Mobility'],
      ['#appointmentService option[value="civic"]', 'Civic life'],
      ['#appointmentService option[value="solidarity"]', 'Support and assistance'],
      ['#appointmentService option[value="other"]', 'Other service'],
      ['#appointmentAgent option[value=""]', 'First available agent'],
      ['#appointmentPurpose', null, 'Briefly explain what you want to discuss.'],
      ['#appointmentForm button[type="submit"]', 'Book this time'],
      ['#appointmentEmpty', 'No appointments booked yet.'],
      ['#profileDialog #deleteAccountButton', 'Delete my account'],
      ['#deleteAccountTitle', 'Delete my citizen account'],
      ['#deleteAccountDialog .panel-kicker', 'ACCOUNT DELETION'],
      ['#deleteAccountNote', 'This action is permanent. In local mode, it removes the account, requests and appointments stored in this browser; in server mode, it deletes the associated data from the city server.'],
      ['#deleteAccountForm label[for="deleteAccountPassword"]', 'Confirm your password'],
      ['#deleteAccountForm .delete-confirmation', 'I understand that my account will be deleted.'],
      ['#cancelDeleteAccount', 'Cancel'],
      ['#deleteAccountForm button[type="submit"]', 'Confirm deletion'],
    ],
    agent: [
      ['.sidebar nav a:nth-child(1)', 'Dashboard'],
      ['.sidebar nav a:nth-child(2)', 'Requests'],
      ['.sidebar nav a:nth-child(3)', 'Citizen messages'],
      ['.sidebar nav a:nth-child(4)', 'Alerts and access'],
      ['.sidebar nav a:nth-child(5)', 'Appointments'],
      ['.agent-page .topbar .kicker span', 'New Dawn'],
      ['.agent-page .topbar .kicker b', 'Coordination'],
      ['.top-actions a', 'Citizen contact'],
      ['#agentLogout', 'Sign out'],
      ['#refresh-data', 'Refresh'],
      ['#clear-filters', 'Clear filters'],
      ['#pendingDemandLabel', 'Pending requests'],
      ['#pendingDemandDescription', 'Requests waiting for review'],
      ['#city-management .section-heading h2', 'City management'],
      ['#city-management .section-heading>span', 'Local demo storage'],
      ['#city-management .management-card:nth-child(1) .kicker', 'D18 · CITIZEN ALERTS'],
      ['#city-management .management-card:nth-child(1) h3', 'Publish information'],
      ['#city-management .management-card:nth-child(1)>p:not(.kicker)', 'Residents using this browser will see the notice in the banner and alert centre.'],
      ['#announcementForm > label:nth-of-type(1)', 'Information type'],
      ['#announcementForm > label:nth-of-type(2)', 'Target area'],
      ['#announcementForm > label:nth-of-type(3)', 'Title'],
      ['#announcementForm > label:nth-of-type(4)', 'Message and instructions'],
      ['#announcementForm > label:nth-of-type(5)', 'Expiry (optional)'],
      ['#announcementKind option[value="general"]', 'Priority message to all residents'],
      ['#announcementKind option[value="news"]', 'Municipal announcement'],
      ['#announcementKind option[value="flood"]', 'Flood warning'],
      ['#announcementKind option[value="health"]', 'Health / heat alert'],
      ['#announcementKind option[value="service_status"]', 'Service status'],
      ['#announcementForm [name="targetSector"] option[value=""]', 'All residents'],
      ['#announcementForm [name="targetSector"] option[value="District Boréal · Secteur 01"]', 'Boreal District · Sector 01'],
      ['#announcementForm [name="targetSector"] option[value="Centre civique · Secteur 04"]', 'Civic Centre · Sector 04'],
      ['#announcementForm [name="targetSector"] option[value="Serres du Sud · Secteur 07"]', 'Southern Greenhouses · Sector 07'],
      ['#announcementServiceFields label:first-child', 'Service'],
      ['#announcementServiceFields label:last-child', 'Status'],
      ['#announcementServiceFields [name="service"] option[value="water"]', 'Water and environment'],
      ['#announcementServiceFields [name="service"] option[value="health"]', 'Health and wellbeing'],
      ['#announcementServiceFields [name="service"] option[value="energy"]', 'Energy and housing'],
      ['#announcementServiceFields [name="service"] option[value="mobility"]', 'Mobility'],
      ['#announcementServiceFields [name="service"] option[value="civic"]', 'Civic life'],
      ['#announcementServiceFields [name="service"] option[value="solidarity"]', 'Support and assistance'],
      ['#announcementServiceFields [name="service"] option[value="other"]', 'Other service'],
      ['#announcementServiceFields [name="serviceStatus"] option[value="operational"]', 'Available'],
      ['#announcementServiceFields [name="serviceStatus"] option[value="maintenance"]', 'Maintenance'],
      ['#announcementServiceFields [name="serviceStatus"] option[value="unavailable"]', 'Unavailable'],
      ['#announcementForm [name="title"]', null, 'e.g. Flood warning · Sector 04'],
      ['#announcementForm [name="body"]', null, 'Add the affected area, official instructions or service impact.'],
      ['#announcementForm button[type="submit"]', 'Publish information'],
      ['#city-management .management-card:nth-child(2) .kicker', 'F34 · ACCOUNT ACCESS'],
      ['#city-management .management-card:nth-child(2) h3', 'Resident accounts'],
      ['#city-management .management-card:nth-child(2)>p:not(.kicker)', 'Suspend or restore citizen access. Passwords are never displayed.'],
      ['#agentAppointments .section-heading .kicker', 'F39 · BOOKED APPOINTMENTS'],
      ['#agentAppointments .section-heading h2', 'Agent schedule'],
      ['#agentAppointments .section-heading>span', 'Bookings stored in this browser'],
      ['#managedAppointmentsEmpty', 'No appointments to show.'],
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
      if (language !== 'en') node.nodeValue = original;
      else node.nodeValue = original.replace(original.trim(), value);
    } else if (element.children.length === 0) {
      if (!originals.has(element)) originals.set(element, element.textContent);
      element.textContent = language === 'en' ? value : originals.get(element);
    }
  }

  function applyLanguage() {
    document.documentElement.lang = language;
    languageSelect.value = language;
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
    document.querySelector('#closeDeleteAccount')?.setAttribute('aria-label', language === 'en' ? 'Close account deletion dialog' : 'Fermer la confirmation de suppression');
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
      ? { title: 'Language and accessibility', kicker: 'NOVA TERRA · READING COMFORT', language: 'Interface language', languageHint: 'French, English, Chinese, Spanish, Italian, Portuguese, German and Kiswahili are available.', contrast: 'High contrast', contrastHint: 'Strengthen outlines and improve readability.', size: 'Text size', close: 'Close preferences', launcher: 'Open language and accessibility preferences', colors: 'Colour palette', colorsHint: 'Choose clearer colour cues for colour vision deficiency.', colorOptionNormal: 'Standard', colorOptionSafe: 'Colour vision friendly', simple: 'Simplified interface', simpleHint: 'Reduce decoration and make content easier to scan.', lowBandwidth: 'Low-bandwidth mode', lowBandwidthHint: 'Reduce visual effects and space out checks. The network can enable it automatically.', lowAuto: 'Automatic', lowOn: 'Enabled', lowOff: 'Disabled', ecoTitle: 'F57 · Environmental report', ecoMethod: 'Partial browser measurement; cached and third-party resources may be excluded. This is not an estimate of energy use or CO₂.', glossary: 'Open the plain language glossary', glossaryTitle: 'Quick glossary', glossaryKicker: 'NOVA TERRA · PLAIN LANGUAGE', glossaryClose: 'Close glossary' }
      : { title: 'Langue et accessibilité', kicker: 'NOVA TERRA · CONFORT DE LECTURE', language: 'Langue de l’interface', languageHint: 'Français, anglais, chinois, espagnol, italien, portugais, allemand et kiswahili disponibles.', contrast: 'Contraste élevé', contrastHint: 'Renforce les contours et la lisibilité.', size: 'Taille du texte', close: 'Fermer les préférences', launcher: 'Ouvrir les préférences de langue et d’accessibilité', colors: 'Palette de couleurs', colorsHint: 'Choisis des repères mieux différenciés pour le daltonisme.', colorOptionNormal: 'Standard', colorOptionSafe: 'Palette adaptée', simple: 'Interface simplifiée', simpleHint: 'Allège les décors et facilite le repérage.', lowBandwidth: 'Mode connexion lente', lowBandwidthHint: 'Réduit les effets visuels et espace les vérifications. Le réseau peut l’activer automatiquement.', lowAuto: 'Automatique', lowOn: 'Activé', lowOff: 'Désactivé', ecoTitle: 'F57 · Bilan environnemental', ecoMethod: 'Mesure partielle du navigateur; cache et ressources tierces peuvent être exclues. Ce n’est pas une estimation d’énergie ou de CO₂.', glossary: 'Ouvrir le glossaire facile à lire', glossaryTitle: 'Petit glossaire', glossaryKicker: 'NOVA TERRA · MOTS SIMPLES', glossaryClose: 'Fermer le glossaire' };
    dialog.querySelector('#a11yTitle').textContent = labels.title;
    dialog.querySelector('.a11y-kicker').textContent = labels.kicker;
    dialog.querySelector('.a11y-setting b').textContent = labels.language;
    dialog.querySelector('.a11y-setting small').textContent = labels.languageHint;
    dialog.querySelector('.a11y-contrast-setting b').textContent = labels.contrast;
    dialog.querySelector('.a11y-contrast-setting small').textContent = labels.contrastHint;
    dialog.querySelector('.a11y-color-setting b').textContent = labels.colors;
    dialog.querySelector('.a11y-color-setting small').textContent = labels.colorsHint;
    colorVisionSelect.options[0].textContent = labels.colorOptionNormal;
    colorVisionSelect.options[1].textContent = labels.colorOptionSafe;
    dialog.querySelector('label[for="simplifiedInterface"] b').textContent = labels.simple;
    dialog.querySelector('label[for="simplifiedInterface"] small').textContent = labels.simpleHint;
    dialog.querySelector('label[for="lowBandwidthMode"] b').textContent = labels.lowBandwidth;
    dialog.querySelector('label[for="lowBandwidthMode"] small').textContent = labels.lowBandwidthHint;
    lowBandwidthSelect.options[0].textContent = labels.lowAuto;
    lowBandwidthSelect.options[1].textContent = labels.lowOn;
    lowBandwidthSelect.options[2].textContent = labels.lowOff;
    dialog.querySelector('#ecoImpactTitle').textContent = labels.ecoTitle;
    dialog.querySelector('#ecoImpactMethod').textContent = labels.ecoMethod;
    dialog.querySelector('.a11y-size-setting legend').textContent = labels.size;
    glossaryButton.textContent = labels.glossary;
    glossary.querySelector('#glossaryTitle').textContent = labels.glossaryTitle;
    glossary.querySelector('#glossaryKicker').textContent = labels.glossaryKicker;
    glossary.querySelector('#closeGlossary').setAttribute('aria-label', labels.glossaryClose);
    renderGlossary();
    refreshEcoReport();
    closeButton.setAttribute('aria-label', labels.close);
    launcher.setAttribute('aria-label', labels.launcher);
    window.dispatchEvent(new CustomEvent('nova:language-change', { detail: { language } }));
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
        notice: window.NovaTerraApi?.enabled
          ? (english ? '<b>Nova Terra server sign-in</b><br />Accounts are verified and protected by the configured server.' : '<b>Connexion au serveur Nova Terra</b><br />Les comptes sont vérifiés par le serveur configuré.')
          : (english ? '<b>Local demo sign-in</b><br />Accounts are stored only in this browser. Five failed attempts lock this address for 15 minutes here; this does not secure a server.' : '<b>Connexion locale de démonstration</b><br />Les comptes sont disponibles uniquement dans ce navigateur. Cinq erreurs verrouillent cette adresse 15 minutes dans ce navigateur; ce verrouillage ne protège pas un serveur.'),
        button: english ? 'Sign in' : 'Se connecter',
      },
      agent: {
        name: 'Agent',
        description: english ? 'Work area for citizen requests and city services.' : 'Espace de travail et suivi des demandes citoyennes.',
        kicker: english ? 'AGENT SPACE' : 'ESPACE AGENT',
        lead: english ? 'Sign in to review requests and coordinate city services.' : 'Connectez-vous pour consulter les demandes et coordonner les services municipaux.',
        notice: window.NovaTerraApi?.enabled
          ? (english ? '<b>Secured agent workspace</b><br />An administrator must assign this account the agent role.' : '<b>Espace agent sécurisé</b><br />Seul un compte auquel un administrateur a attribué le rôle agent peut accéder à cet espace.')
          : (english ? '<b>Agent demo space</b><br />This account must already have the agent role. Choosing a profile here does not grant it.' : '<b>Espace agent de démonstration</b><br />Le compte doit avoir reçu le rôle agent. Les rôles ne sont pas attribués par le choix sur cette page.'),
        button: english ? 'Open agent space' : 'Ouvrir mon espace agent',
      },
      admin: {
        name: english ? 'Administrator' : 'Administrateur',
        description: english ? 'High Council · city oversight and decisions.' : 'Haut Conseil · pilotage et décisions de la cité.',
        kicker: english ? 'ADMINISTRATOR SPACE' : 'ESPACE ADMINISTRATEUR',
        lead: english ? 'Sign in to open the High Council oversight view.' : 'Connectez-vous pour ouvrir la vue de supervision du Haut Conseil.',
        notice: window.NovaTerraApi?.enabled
          ? (english ? '<b>Secured High Council</b><br />Administrator access is assigned only from the server.' : '<b>Haut Conseil sécurisé</b><br />L’accès administrateur est attribué uniquement depuis le serveur.')
          : (english ? '<b>Administrator demo view</b><br />This account must already have the administrator role. Choosing a profile here does not grant it.' : '<b>Administration de démonstration</b><br />Le compte doit avoir reçu le rôle administrateur. Les rôles ne sont pas attribués par le choix sur cette page.'),
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

  function applyColorVision() {
    document.documentElement.dataset.colorVision = colorVision;
    colorVisionSelect.value = colorVision;
  }

  function applySimplified() {
    document.documentElement.dataset.simple = simplified ? 'on' : 'off';
    simplifiedToggle.checked = simplified;
  }

  function refreshEcoReport() {
    if (!window.NovaTerraEco) return;
    lowBandwidthSelect.value = window.NovaTerraEco.getPreference();
    const report = window.NovaTerraEco.measureTransfer();
    const megabytes = (report.bytes / 1_000_000).toLocaleString(language === 'en' ? 'en' : 'fr', {
      maximumFractionDigits: 2,
    });
    const measuredResources = language === 'en'
      ? `${report.measuredCount} measured resource${report.measuredCount === 1 ? '' : 's'}`
      : `${report.measuredCount} ressource${report.measuredCount === 1 ? '' : 's'} mesurée${report.measuredCount === 1 ? '' : 's'}`;
    const externalResources = language === 'en'
      ? `${report.externalResources} third-party resource${report.externalResources === 1 ? '' : 's'}`
      : `${report.externalResources} ressource${report.externalResources === 1 ? '' : 's'} tierce${report.externalResources === 1 ? '' : 's'}`;
    const mediaCount = language === 'en'
      ? `${report.mediaCount} images/videos`
      : `${report.mediaCount} image(s)/vidéo(s)`;
    ecoImpactMeasurement.textContent = language === 'en'
      ? `Observed transfer: ${megabytes} MB from this site (${measuredResources}); ${mediaCount} on this page. ${externalResources} are not included.`
      : `Transfert observé : ${megabytes} Mo depuis ce site (${measuredResources}) ; ${mediaCount} sur cette page. ${externalResources} ne sont pas incluses.`;
  }

  function renderGlossary() {
    const terms = language === 'en'
      ? [['City request', 'A message asking the city to help or fix something.'], ['Incident report', 'A report about a problem in a street or neighbourhood.'], ['City service', 'A team or service provided by the municipality.'], ['District', 'A named area of the city.'], ['High Council', 'The city team that reviews priorities and decisions.'], ['Alert', 'Important information that may need quick attention.']]
      : [['Démarche', 'Une demande envoyée à la mairie pour obtenir de l’aide ou un service.'], ['Signalement', 'Un message qui décrit un problème dans la rue ou le quartier.'], ['Service municipal', 'Une équipe ou une aide proposée par la mairie.'], ['Secteur', 'Une zone de la ville qui porte un nom.'], ['Haut Conseil', 'L’équipe de la ville qui examine les priorités et les décisions.'], ['Alerte', 'Une information importante qui peut demander une action rapide.']];
    const list = glossary.querySelector('#glossaryList');
    list.replaceChildren(...terms.flatMap(([term, definition]) => {
      const title = document.createElement('dt');
      const description = document.createElement('dd');
      title.textContent = term;
      description.textContent = definition;
      return [title, description];
    }));
  }

  launcher.addEventListener('click', () => {
    refreshEcoReport();
    dialog.showModal();
  });
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  glossaryButton.addEventListener('click', () => glossary.showModal());
  glossary.querySelector('#closeGlossary').addEventListener('click', () => glossary.close());
  glossary.addEventListener('click', (event) => {
    if (event.target === glossary) glossary.close();
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
  colorVisionSelect.addEventListener('change', () => {
    colorVision = colorVisionSelect.value;
    safeWrite(storageKeys.colorVision, colorVision);
    applyColorVision();
  });
  simplifiedToggle.addEventListener('change', () => {
    simplified = simplifiedToggle.checked;
    safeWrite(storageKeys.simplified, simplified ? 'on' : 'off');
    applySimplified();
  });
  lowBandwidthSelect.addEventListener('change', () => {
    window.NovaTerraEco?.setPreference(lowBandwidthSelect.value);
    refreshEcoReport();
  });
  window.addEventListener('nova:eco-mode-change', refreshEcoReport);
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
  applyColorVision();
  applySimplified();
  refreshEcoReport();
  window.addEventListener('nova:profile-change', () => {
    if (page === 'login') applyLoginLanguage();
  });
  window.NovaTerraPreferences = Object.freeze({ open: () => dialog.showModal() });
})();
