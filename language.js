(() => {
  const storageKey = 'nova-terra.language';
  const supported = ['fr', 'en', 'sw'];
  const labels = { fr: 'Français', en: 'English', sw: 'Kiswahili' };
  const catalog = {
    'Aller au contenu principal': { en: 'Skip to main content', sw: 'Ruka hadi maudhui makuu' },
    'Navigation principale': { en: 'Main navigation', sw: 'Urambazaji mkuu' },
    'Services': { en: 'Services', sw: 'Huduma' },
    'Actualités': { en: 'News', sw: 'Habari' },
    'La communauté': { en: 'Community', sw: 'Jamii' },
    'Urgences': { en: 'Emergencies', sw: 'Dharura' },
    'Connexion': { en: 'Sign in', sw: 'Ingia' },
    'Rejoindre Nova Terra': { en: 'Join Nova Terra', sw: 'Jiunge na Nova Terra' },
    'Ouvrir le menu': { en: 'Open menu', sw: 'Fungua menyu' },
    'Fermer le menu': { en: 'Close menu', sw: 'Funga menyu' },
    'Changer le thème': { en: 'Change theme', sw: 'Badilisha mandhari' },
    'Retour à l’accueil': { en: 'Back to home', sw: 'Rudi mwanzo' },
    'Aller au formulaire principal': { en: 'Skip to the main form', sw: 'Ruka hadi fomu kuu' },
    'Espace de travail': { en: 'Workspace', sw: 'Eneo la kazi' },
    'Navigation': { en: 'Navigation', sw: 'Urambazaji' },
    'Vue d’ensemble': { en: 'Overview', sw: 'Muhtasari' },
    'Signalements': { en: 'Reports', sw: 'Ripoti' },
    'Mes demandes': { en: 'My requests', sw: 'Maombi yangu' },
    'État de la planète': { en: 'Planet status', sw: 'Hali ya sayari' },
    'Haut Conseil': { en: 'High Council', sw: 'Baraza Kuu' },
    'Contact citoyen': { en: 'Citizen contact', sw: 'Mawasiliano ya raia' },
    'Espace agent': { en: 'Staff area', sw: 'Eneo la wafanyakazi' },
    'Citoyen': { en: 'Citizen', sw: 'Raia' },
    'Actualiser': { en: 'Refresh', sw: 'Onyesha upya' },
    'Effacer les filtres': { en: 'Clear filters', sw: 'Futa vichujio' },
    'Rechercher une demande': { en: 'Search requests', sw: 'Tafuta maombi' },
    'Tous les statuts': { en: 'All statuses', sw: 'Hali zote' },
    'Toutes les priorités': { en: 'All priorities', sw: 'Vipaumbele vyote' },
    'Toutes les catégories': { en: 'All categories', sw: 'Aina zote' },
    'En cours': { en: 'In progress', sw: 'Inaendelea' },
    'Terminé': { en: 'Completed', sw: 'Imekamilika' },
    'Dossiers en attente': { en: 'Pending cases', sw: 'Kesi zinazosubiri' },
    'Demandes citoyennes': { en: 'Citizen requests', sw: 'Maombi ya raia' },
    'Rendez-vous': { en: 'Appointments', sw: 'Miadi' },
    'Déconnexion': { en: 'Sign out', sw: 'Ondoka' },
    'Bonjour,': { en: 'Hello,', sw: 'Habari,' },
    'Le pouls de': { en: 'The pulse of', sw: 'Mapigo ya' },
    'Explorer mon espace': { en: 'Explore my space', sw: 'Chunguza nafasi yangu' },
    'Découvrir les services': { en: 'Discover services', sw: 'Gundua huduma' },
    'Urgences et lieux de soin': { en: 'Emergencies and care locations', sw: 'Dharura na vituo vya huduma' },
    'Tous les lieux': { en: 'All locations', sw: 'Maeneo yote' },
    'Hôpitaux & soins': { en: 'Hospitals & care', sw: 'Hospitali na huduma' },
    'Secours': { en: 'Rescue services', sw: 'Huduma za uokoaji' },
    'Lieux frais': { en: 'Cooling centres', sw: 'Maeneo ya kupumzika kwenye ubaridi' },
    'Lieux répertoriés': { en: 'Listed locations', sw: 'Maeneo yaliyoorodheshwa' },
    'Aucun lieu dans cette catégorie.': { en: 'No locations in this category.', sw: 'Hakuna maeneo katika kundi hili.' },
    'SANTÉ & SÉCURITÉ': { en: 'HEALTH & SAFETY', sw: 'AFYA NA USALAMA' },
    'Repère les centres de soin, postes de secours et lieux de fraîcheur de la cité.': { en: 'Find the city’s care centres, rescue stations and cooling spaces.', sw: 'Tafuta vituo vya afya, vituo vya uokoaji na maeneo ya kupumzika kwenye ubaridi.' },
    'Danger immédiat ? Appelle le 112': { en: 'Immediate danger? Call 112', sw: 'Hatari ya haraka? Piga simu 112' },
    'Carte schématique interactive des urgences et hôpitaux': { en: 'Interactive schematic map of emergency services and hospitals', sw: 'Ramani shirikishi ya huduma za dharura na hospitali' },
    'Maquette illustrative : les emplacements, horaires et disponibilités ne sont pas des données officielles. En situation réelle, appelle le 112.': { en: 'Illustrative mock-up: locations, hours and availability are not official. In a real emergency, call 112.', sw: 'Mfano wa kuonyesha: maeneo, saa na upatikanaji si taarifa rasmi. Katika dharura halisi, piga simu 112.' },
    'VOTRE VILLE, À PORTÉE DE MAIN': { en: 'YOUR CITY, AT YOUR FINGERTIPS', sw: 'Jiji lako karibu nawe' },
    'Les services qui': { en: 'Services that', sw: 'Huduma zinazofanya' },
    'font la cité.': { en: 'make a city.', sw: 'jiji.' },
    'Les ressources essentielles et les équipes municipales, réunies dans un même lieu.': { en: 'Essential resources and city teams, together in one place.', sw: 'Rasilimali muhimu na timu za jiji, pamoja sehemu moja.' },
    'Voir le tableau de bord': { en: 'View dashboard', sw: 'Tazama dashibodi' },
    'Rechercher un service par nom ou besoin': { en: 'Search services by name or need', sw: 'Tafuta huduma kwa jina au hitaji' },
    'Eau & environnement': { en: 'Water & environment', sw: 'Maji na mazingira' },
    'Santé & bien-être': { en: 'Health & wellbeing', sw: 'Afya na ustawi' },
    'Énergie & habitat': { en: 'Energy & housing', sw: 'Nishati na makazi' },
    'Se déplacer': { en: 'Getting around', sw: 'Usafiri' },
    'Participer aux décisions': { en: 'Take part in decisions', sw: 'Shiriki katika maamuzi' },
    'Aide & accompagnement': { en: 'Help & support', sw: 'Msaada na usaidizi' },
    'Un besoin urgent ?': { en: 'Need urgent help?', sw: 'Unahitaji msaada wa haraka?' },
    'ÉNERGIE': { en: 'ENERGY', sw: 'NISHATI' },
    'BIEN-ÊTRE': { en: 'WELLBEING', sw: 'USTAWI' },
    'ACTUALITÉS': { en: 'NEWS', sw: 'HABARI' },
    'La cité avance': { en: 'The city moves forward', sw: 'Jiji linasonga mbele' },
    'quand chacun·e': { en: 'when everyone', sw: 'kila mtu anaposhiriki' },
    'y prend part.': { en: 'takes part.', sw: 'katika maendeleo yake.' },
    'Créer mon compte citoyen': { en: 'Create my citizen account', sw: 'Fungua akaunti yangu ya raia' },
    'Connexion à mon espace': { en: 'Sign in to my space', sw: 'Ingia kwenye akaunti yangu' },
    'Prendre soin de notre monde, ensemble.': { en: 'Caring for our world, together.', sw: 'Tunajali dunia yetu pamoja.' },
    'Tableau de bord': { en: 'Dashboard', sw: 'Dashibodi' },
    'Demandes': { en: 'Requests', sw: 'Maombi' },
    'Messages citoyens': { en: 'Citizen messages', sw: 'Ujumbe wa raia' },
    'Alertes & accès': { en: 'Alerts & access', sw: 'Arifa na ufikiaji' },
    'Journal d’activité': { en: 'Activity log', sw: 'Rekodi ya shughuli' },
    'Coordination': { en: 'Coordination', sw: 'Uratibu' },
    'SUIVI OPÉRATIONNEL': { en: 'OPERATIONS TRACKING', sw: 'UFUATILIAJI WA SHUGHULI' },
    'À traiter': { en: 'To review', sw: 'Kushughulikiwa' },
    'Priorité haute': { en: 'High priority', sw: 'Kipaumbele cha juu' },
    'Priorité normale': { en: 'Normal priority', sw: 'Kipaumbele cha kawaida' },
    'Priorité basse': { en: 'Low priority', sw: 'Kipaumbele cha chini' },
    'Toutes les catégories': { en: 'All categories', sw: 'Aina zote' },
    'Enregistrer': { en: 'Save', sw: 'Hifadhi' },
    'Annuler': { en: 'Cancel', sw: 'Ghairi' },
    'Continuer': { en: 'Continue', sw: 'Endelea' },
    'Nom complet': { en: 'Full name', sw: 'Jina kamili' },
    'Adresse e-mail': { en: 'Email address', sw: 'Barua pepe' },
    'Votre secteur': { en: 'Your district', sw: 'Eneo lako' },
    'Mot de passe': { en: 'Password', sw: 'Nenosiri' },
    'Confirmer le mot de passe': { en: 'Confirm password', sw: 'Thibitisha nenosiri' },
    'Choisir un secteur': { en: 'Choose a district', sw: 'Chagua eneo' },
    'CITOYEN': { en: 'CITIZEN', sw: 'RAIA' },
    'Agent municipal': { en: 'City staff', sw: 'Mfanyakazi wa jiji' },
  };

  function translateNode(node, language) {
    const original = node.nodeValue.trim();
    const translation = catalog[original]?.[language];
    if (translation) node.nodeValue = node.nodeValue.replace(original, translation);
  }

  function apply(language) {
    const selected = supported.includes(language) ? language : 'fr';
    document.documentElement.lang = selected;
    document.querySelectorAll('[data-language-ui]').forEach((item) => item.remove());
    if (selected !== 'fr') {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) translateNode(node, selected);
      document.querySelectorAll('[aria-label], [placeholder], [title]').forEach((element) => {
        ['aria-label', 'placeholder', 'title'].forEach((attribute) => {
          const original = element.getAttribute(attribute);
          if (catalog[original]?.[selected]) element.setAttribute(attribute, catalog[original][selected]);
        });
      });
    }
    let select = document.querySelector('[data-language-select]');
    if (!select) {
      select = document.createElement('label');
      select.dataset.languageUi = '';
      select.className = 'language-picker';
      select.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin-inline-start:12px;font:inherit;color:inherit;';
      select.textContent = '🌐 ';
      const control = document.createElement('select');
      control.dataset.languageSelect = '';
      control.setAttribute('aria-label', 'Language / Lugha / Langue');
      control.style.cssText = 'min-height:36px;padding:5px 8px;border:1px solid currentColor;border-radius:8px;background:transparent;color:inherit;font:inherit;';
      supported.forEach((code) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = labels[code];
        control.append(option);
      });
      control.addEventListener('change', () => {
        try { localStorage.setItem(storageKey, control.value); } catch (_) { /* Language still applies for this page. */ }
        window.location.reload();
      });
      select.append(control);
      (document.querySelector('.header-actions, .top-actions, .signup-header, header') || document.body).append(select);
    }
    select.querySelector('select').value = selected;
    window.dispatchEvent(new CustomEvent('nova:language-change', { detail: { language: selected } }));
  }

  let saved = null;
  try { saved = localStorage.getItem(storageKey); } catch (_) { /* Use the page default when storage is unavailable. */ }
  const initial = supported.includes(saved) ? saved : (supported.includes(document.documentElement.lang) ? document.documentElement.lang : 'fr');
  apply(initial);
  const observer = new MutationObserver((records) => {
    const language = document.documentElement.lang;
    if (language === 'fr') return;
    records.forEach((record) => {
      if (record.type === 'characterData') translateNode(record.target, language);
      record.addedNodes.forEach((added) => {
        if (added.nodeType === Node.TEXT_NODE) translateNode(added, language);
        else if (added.nodeType === Node.ELEMENT_NODE) {
          const walker = document.createTreeWalker(added, NodeFilter.SHOW_TEXT);
          let node;
          while ((node = walker.nextNode())) translateNode(node, language);
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
})();
