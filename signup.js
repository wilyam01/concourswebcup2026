const signupForm = document.querySelector('#signupForm');
const signupMessage = document.querySelector('#formMessage');
const passwordInput = document.querySelector('#signupPassword');
const confirmPasswordInput = document.querySelector('#confirmPassword');
const signupButton = signupForm.querySelector('[type="submit"]');
const signupProfile = new URLSearchParams(window.location.search).get('profile');
const selectedProfile = ['citizen', 'agent', 'admin'].includes(signupProfile) ? signupProfile : 'citizen';
const existingAccountLink = document.querySelector('.signup-login');
const roleAccessPanel = document.createElement('section');
roleAccessPanel.className = 'prototype-note role-access-panel';
roleAccessPanel.hidden = true;
roleAccessPanel.setAttribute('aria-labelledby', 'roleAccessTitle');
const roleAccessIcon = document.createElement('i');
roleAccessIcon.setAttribute('aria-hidden', 'true');
roleAccessIcon.textContent = 'i';
const roleAccessContent = document.createElement('span');
const roleAccessTitle = document.createElement('b');
roleAccessTitle.id = 'roleAccessTitle';
const roleAccessMessage = document.createElement('span');
const roleContactLink = document.createElement('a');
roleContactLink.className = 'button signup-submit';
roleContactLink.href = 'contact/index.html';
const roleLoginLink = document.createElement('a');
roleLoginLink.className = 'signup-login';
roleAccessContent.append(roleAccessTitle, document.createElement('br'), roleAccessMessage, document.createElement('br'), roleContactLink, document.createElement('br'), roleLoginLink);
roleAccessPanel.append(roleAccessIcon, roleAccessContent);
signupForm.after(roleAccessPanel);

const notice = document.querySelector('.prototype-note span');
let messageKey = '';
let creatingAccount = false;

const signupProfiles = {
  citizen: {
    kicker: ['ESPACE CITOYEN · NOUVELLE AURORE', 'CITIZEN SPACE · NEW DAWN'],
    title: ['Votre place<br />est <em>ici.</em>', 'Your place<br />is <em>here.</em>'],
    lead: ['Créez votre espace pour suivre la vie municipale et prendre part aux décisions de la cité.', 'Create your space to follow city services and take part in community life.'],
  },
  agent: {
    kicker: ['ESPACE AGENT · ACCÈS SUR AUTORISATION', 'AGENT SPACE · ACCESS BY APPROVAL'],
    title: ['Demander un<br />accès <em>agent.</em>', 'Request <em>agent</em><br />access.'],
    lead: ['Les comptes agents sont attribués par un administrateur. Le choix du profil ne donne pas à lui seul un accès agent.', 'Agent accounts are assigned by an administrator. Selecting this profile alone does not grant agent access.'],
    noticeTitle: ['Accès agent réservé', 'Agent access is restricted'],
    notice: ['Les inscriptions publiques créent uniquement des comptes citoyens. Contacte l’administration pour demander un accès agent.', 'Public sign-up creates citizen accounts only. Contact an administrator to request agent access.'],
    contact: ['Contacter l’administration', 'Contact an administrator'],
    login: ['Retour à la connexion Agent', 'Back to agent sign-in'],
  },
  admin: {
    kicker: ['HAUT CONSEIL · ACCÈS SUR AUTORISATION', 'HIGH COUNCIL · ACCESS BY APPROVAL'],
    title: ['Demander un<br />accès <em>admin.</em>', 'Request <em>admin</em><br />access.'],
    lead: ['Les comptes administrateur sont créés ou autorisés par un administrateur existant. Le choix du profil ne crée pas de privilèges.', 'Administrator accounts are created or approved by an existing administrator. Choosing this profile does not grant privileges.'],
    noticeTitle: ['Accès administrateur réservé', 'Administrator access is restricted'],
    notice: ['Les inscriptions publiques créent uniquement des comptes citoyens. Contacte un administrateur existant pour demander un accès Haut Conseil.', 'Public sign-up creates citizen accounts only. Contact an existing administrator to request High Council access.'],
    contact: ['Demander un accès administrateur', 'Request administrator access'],
    login: ['Retour à la connexion Admin', 'Back to administrator sign-in'],
  },
};

const messages = {
  password_mismatch: ['Les deux mots de passe ne correspondent pas.', 'The passwords do not match.'],
  weak_password: ['Le mot de passe doit contenir au moins 8 caractères.', 'Password must be at least 8 characters.'],
  weak_password_server: ['Le mot de passe doit contenir au moins 12 caractères pour le compte serveur.', 'Server accounts require a password of at least 12 characters.'],
  invalid_input: ['Vérifie le formulaire et utilise un mot de passe d’au moins 12 caractères en mode serveur.', 'Check the form and use a password of at least 12 characters in server mode.'],
  api_unavailable: ['Le serveur Nova Terra ne répond pas. Vérifie qu’il est démarré.', 'The Nova Terra server is unavailable. Check that it is running.'],
  api_error: ['La création du compte a échoué côté serveur. Réessaie.', 'The server could not create this account. Please try again.'],
  creating: ['Création du compte…', 'Creating your account…'],
  created: ['Compte créé. Ouverture de votre espace…', 'Account created. Opening your space…'],
  email_exists: ['Un compte existe déjà avec cette adresse. Connecte-toi.', 'An account already exists for this email. Sign in instead.'],
  crypto_unavailable: ['Le navigateur ne permet pas le chiffrement. Ouvre le site en HTTPS ou sur localhost.', 'This browser cannot verify accounts. Open the site using HTTPS or localhost.'],
  invalid_name: ['Saisis ton nom complet.', 'Enter your full name.'],
  invalid_email: ['Saisis une adresse e-mail valide.', 'Enter a valid email address.'],
  invalid_sector: ['Choisis ton secteur.', 'Choose your district.'],
  storage_full: ['Le stockage du navigateur est plein. Libère de la place puis réessaie.', 'Browser storage is full. Free up space and try again.'],
  storage_unavailable: ['Impossible d’enregistrer le compte dans ce navigateur.', 'The account could not be saved in this browser.'],
  failed: ['La création du compte a échoué. Réessaie.', 'Account creation failed. Please try again.'],
};

function isEnglish() { return document.documentElement.lang === 'en'; }

function updateSignupLanguage() {
  const english = isEnglish();
  const languageIndex = english ? 1 : 0;
  const profile = signupProfiles[selectedProfile];
  document.querySelector('.section-kicker').textContent = profile.kicker[languageIndex];
  document.querySelector('.signup-card h1').innerHTML = profile.title[languageIndex];
  document.querySelector('.signup-lead').textContent = profile.lead[languageIndex];
  const needsApproval = selectedProfile !== 'citizen';
  signupForm.hidden = needsApproval;
  existingAccountLink.hidden = needsApproval;
  roleAccessPanel.hidden = !needsApproval;
  if (needsApproval) {
    roleAccessTitle.textContent = profile.noticeTitle[languageIndex];
    roleAccessMessage.textContent = profile.notice[languageIndex];
    roleContactLink.textContent = profile.contact[languageIndex];
    roleLoginLink.href = `connexion.html?profile=${selectedProfile}`;
    roleLoginLink.textContent = profile.login[languageIndex];
  }
  passwordInput.minLength = window.NovaTerraApi?.enabled ? 12 : 8;
  if (notice) notice.innerHTML = window.NovaTerraApi?.enabled
    ? (english ? '<b>Server account</b><br />Your account is saved by the Nova Terra API and can be used on another device.' : '<b>Compte sur le serveur</b><br />Ton compte est enregistré par l’API Nova Terra et pourra être utilisé sur un autre appareil.')
    : (english ? '<b>Local demo account</b><br />Your account is saved only in this browser. Use HTTPS or localhost.' : '<b>Compte local de démonstration</b><br />Le compte est conservé uniquement dans ce navigateur. Utilise HTTPS ou localhost.');
  if (messageKey) signupMessage.textContent = messages[messageKey][english ? 1 : 0];
  signupButton.innerHTML = creatingAccount
    ? (english ? 'Creating account…' : 'Création du compte…')
    : (english ? 'Continue <span>→</span>' : 'Continuer <span>→</span>');
}

function showSignupMessage(key) {
  messageKey = key;
  signupMessage.hidden = false;
  signupMessage.textContent = messages[key][isEnglish() ? 1 : 0];
}

updateSignupLanguage();
window.addEventListener('nova:language-change', updateSignupLanguage);

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (selectedProfile !== 'citizen') return;
  if (!signupForm.reportValidity()) return;
  if (passwordInput.value !== confirmPasswordInput.value) {
    showSignupMessage('password_mismatch');
    confirmPasswordInput.focus();
    return;
  }
  if (passwordInput.value.length < (window.NovaTerraApi?.enabled ? 12 : 8)) {
    showSignupMessage(window.NovaTerraApi?.enabled ? 'weak_password_server' : 'weak_password');
    passwordInput.focus();
    return;
  }

  signupButton.disabled = true;
  creatingAccount = true;
  showSignupMessage('creating');
  updateSignupLanguage();
  const result = await window.NovaTerraAuth.createAccount({
    name: signupForm.elements.fullName.value,
    email: signupForm.elements.email.value,
    sector: signupForm.elements.sector.value,
    password: passwordInput.value,
  });

  if (result.ok) {
    showSignupMessage('created');
    window.location.assign('dashboard.html');
    return;
  }

  creatingAccount = false;
  showSignupMessage(messages[result.error] ? result.error : 'failed');
  signupButton.disabled = false;
  updateSignupLanguage();
});
