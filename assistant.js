(() => {
  if (document.querySelector('#terraAssistant')) return;
  const bodyClass = document.body.classList;
  const root = bodyClass.contains('agent-page') ? '../../' : bodyClass.contains('contact-page') ? '../' : '';
  const host = document.createElement('div');
  host.id = 'terraAssistant';
  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'assistant-launcher';
  launcher.setAttribute('aria-haspopup', 'dialog');
  launcher.setAttribute('aria-controls', 'assistantPanel');
  launcher.setAttribute('aria-expanded', 'false');
  const panel = document.createElement('section');
  panel.className = 'assistant-panel';
  panel.id = 'assistantPanel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Assistant Nova Terra');
  panel.innerHTML = '<div class="assistant-heading"><div><b id="assistantTitle">Assistant Nova Terra</b><small id="assistantSubtitle">Assistant guidé · démonstration</small></div><button class="assistant-close" id="assistantClose" type="button" aria-label="Fermer">×</button></div><div class="assistant-messages" id="assistantMessages" role="log" aria-live="polite" aria-relevant="additions"></div><div class="assistant-quick-actions" id="assistantQuickActions"></div><form class="assistant-form" id="assistantForm"><label class="sr-only" id="assistantInputLabel" for="assistantInput">Ta question</label><input id="assistantInput" name="question" maxlength="240" autocomplete="off" required /><button id="assistantSend" type="submit">Envoyer</button></form>';
  document.body.append(launcher, panel);
  const messages = panel.querySelector('#assistantMessages');
  const closeButton = panel.querySelector('#assistantClose');
  const input = panel.querySelector('#assistantInput');
  const form = panel.querySelector('#assistantForm');

  function english() { return document.documentElement.lang === 'en'; }

  function translate() {
    launcher.textContent = english() ? '✧ Ask Nova Terra' : '✧ Aide Nova Terra';
    launcher.setAttribute('aria-label', english() ? 'Open the Nova Terra assistant' : 'Ouvrir l’assistant Nova Terra');
    panel.querySelector('#assistantTitle').textContent = english() ? 'Nova Terra assistant' : 'Assistant Nova Terra';
    panel.querySelector('#assistantSubtitle').textContent = english() ? 'Guided help · demo' : 'Assistant guidé · démonstration';
    closeButton.setAttribute('aria-label', english() ? 'Close assistant' : 'Fermer l’assistant');
    panel.querySelector('#assistantInputLabel').textContent = english() ? 'Your question' : 'Ta question';
    input.placeholder = english() ? 'Ask about a city service…' : 'Pose une question sur la ville…';
    panel.querySelector('#assistantSend').textContent = english() ? 'Send' : 'Envoyer';
    renderQuickActions();
    if (!messages.children.length) addMessage(english()
      ? 'I can guide you to services, incident reports, appointments and current announcements. For an immediate emergency, call 112.'
      : 'Je peux te guider vers les services, les signalements, les rendez-vous et les annonces en cours. En cas d’urgence immédiate, appelle le 112.');
  }

  function addMessage(text, type = 'assistant', link = null) {
    const message = document.createElement('div');
    message.className = `assistant-message ${type}`;
    message.textContent = text;
    if (link) {
      const anchor = document.createElement('a');
      anchor.href = link.href;
      anchor.textContent = link.label;
      message.append(document.createElement('br'), anchor);
    }
    messages.append(message);
    messages.scrollTop = messages.scrollHeight;
  }

  function route(href) { return `${root}${href}`; }

  function renderQuickActions() {
    const host = panel.querySelector('#assistantQuickActions');
    host.replaceChildren();
    const suggestions = english()
      ? ['Find a service', 'Report an issue', 'Book an appointment', 'Current alerts']
      : ['Trouver un service', 'Signaler un problème', 'Prendre rendez-vous', 'Alertes en cours'];
    suggestions.forEach((suggestion) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = suggestion;
      button.addEventListener('click', () => answer(suggestion));
      host.append(button);
    });
  }

  function answer(question) {
    const raw = String(question).trim();
    if (!raw) return;
    addMessage(raw, 'user');
    const query = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    let reply;
    let link;
    if (/urgence|inond|crue|flood|danger|canicule|heat|medical/.test(query)) {
      reply = english()
        ? 'For immediate danger or a medical emergency, call 112. Check the alert centre for city warnings and prevention instructions.'
        : 'En cas de danger immédiat ou d’urgence médicale, appelle le 112. Consulte le centre des alertes pour les avertissements et consignes de la ville.';
      link = { href: route('dashboard.html#reports'), label: english() ? 'Open city information' : 'Ouvrir les informations de la ville' };
    } else if (/rendez|appointment|book|reserver/.test(query)) {
      reply = english() ? 'The citizen dashboard lets you choose a municipal service, agent and weekday time slot.' : 'Dans le tableau citoyen, choisis un service, un agent et un créneau en semaine.';
      link = { href: route('dashboard.html#appointments'), label: english() ? 'Go to appointments' : 'Accéder aux rendez-vous' };
    } else if (/signal|incident|probleme|voirie|report/.test(query)) {
      reply = english() ? 'You can file and track a local demo report from your citizen dashboard. For a message to the city, use the contact form.' : 'Tu peux créer et suivre un signalement de démonstration depuis le tableau citoyen. Pour écrire à la mairie, utilise le formulaire de contact.';
      link = { href: route('dashboard.html#my-requests'), label: english() ? 'Open incident reports' : 'Ouvrir les signalements' };
    } else if (/annonce|alerte|notification|news/.test(query)) {
      reply = english() ? 'The alert centre lists current announcements and any service maintenance notices.' : 'Le centre des alertes rassemble les annonces en cours et les avis de maintenance.';
      const inboxTrigger = document.querySelector('.notification, .community-inbox-trigger');
      inboxTrigger?.click();
      link = { href: route('index.html#actualites'), label: english() ? 'View city news' : 'Lire les actualités' };
    } else if (/bus|mobil|transport|horaire|schedule/.test(query)) {
      reply = english() ? 'Route and illustrative shuttle timetable details are listed in the transport section.' : 'Les lignes et horaires illustratifs des navettes figurent dans la section Transports.';
      link = { href: route('index.html#mobilite'), label: english() ? 'View routes and timetables' : 'Voir les lignes et horaires' };
    } else if (/service|sante|health|eau|water|logement|housing/.test(query)) {
      reply = english() ? 'Search the city service catalogue by name or need; it includes health, water, housing and mobility.' : 'Recherche un service par nom ou besoin dans le catalogue : santé, eau, logement, mobilité et plus.';
      link = { href: route('index.html#services'), label: english() ? 'Open the service catalogue' : 'Ouvrir le catalogue des services' };
    } else if (/compte|password|connexion|login|account/.test(query)) {
      reply = window.NovaTerraApi?.enabled
        ? (english() ? 'Sign-in and account creation are connected to the Nova Terra server; your account can be used on another device.' : 'La connexion et la création de compte sont reliées au serveur Nova Terra; ton compte peut être utilisé depuis un autre appareil.')
        : (english() ? 'Sign-in and account creation work in local demo mode. Accounts are stored only in this browser.' : 'La connexion et la création de compte fonctionnent en mode démonstration local. Les comptes sont conservés uniquement dans ce navigateur.');
      link = { href: route('connexion.html'), label: english() ? 'Open sign-in' : 'Ouvrir la connexion' };
    } else {
      reply = english() ? 'I can help with services, reports, appointments, transport or alerts. For another question, contact the municipal team.' : 'Je peux aider pour les services, signalements, rendez-vous, transports ou alertes. Pour une autre question, contacte la mairie.';
      link = { href: route('contact/index.html'), label: english() ? 'Contact city services' : 'Contacter la mairie' };
    }
    addMessage(reply, 'assistant', link);
    input.value = '';
  }

  launcher.addEventListener('click', () => {
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    input.focus();
  });
  closeButton.addEventListener('click', () => {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    answer(input.value);
  });
  window.addEventListener('nova:language-change', translate);
  translate();
})();
