const loginForm = document.querySelector('#loginForm');
const loginMessage = document.querySelector('#formMessage');
const passwordInput = document.querySelector('#loginPassword');
const togglePassword = document.querySelector('#togglePassword');
const loginButton = loginForm.querySelector('[type="submit"]');
const profileStep = document.querySelector('#loginProfileStep');
const credentialsStep = document.querySelector('#loginCredentialsStep');
const selectedProfileName = document.querySelector('#selectedProfileName');
const selectedProfileDescription = document.querySelector('#selectedProfileDescription');
const selectedProfileSymbol = document.querySelector('#selectedProfileSymbol');
const signupPrompt = document.querySelector('#signupPrompt');
const signupLink = document.querySelector('#signupLink');
const profileKicker = credentialsStep.querySelector('.section-kicker');
const loginLead = credentialsStep.querySelector('.signup-lead');

const notice = document.querySelector('.prototype-note span');
const loginProfiles = {
  citizen: {
    name: 'Citoyen(ne)',
    description: 'Accès aux services et à la vie citoyenne de Nova Terra.',
    symbol: '◎',
    kicker: 'ESPACE CITOYEN',
    lead: 'Connectez-vous pour suivre les services municipaux et participer à la vie de votre cité.',
    notice: window.NovaTerraApi?.enabled ? '<b>Connexion au serveur Nova Terra</b><br />Les comptes sont vérifiés par le serveur configuré.' : '<b>Connexion locale de démonstration</b><br />Les comptes sont disponibles uniquement dans ce navigateur. Cinq erreurs verrouillent cette adresse 15 minutes dans ce navigateur; ce verrouillage ne protège pas un serveur.',
    destination: 'dashboard.html',
    button: 'Se connecter',
    signupHref: 'inscription.html?profile=citizen',
    signupPrompt: ['Pas encore citoyen·ne ?', 'New to Nova Terra?'],
    signupLabel: ['Créer un compte citoyen', 'Create a citizen account'],
  },
  agent: {
    name: 'Agent',
    description: 'Espace de travail et suivi des demandes citoyennes.',
    symbol: 'A',
    kicker: 'ESPACE AGENT',
    lead: 'Connectez-vous pour consulter les demandes et coordonner les services municipaux.',
    notice: window.NovaTerraApi?.enabled ? '<b>Espace agent sécurisé</b><br />Seul un compte auquel un administrateur a attribué le rôle agent peut accéder à cet espace.' : '<b>Espace agent de démonstration</b><br />Le compte doit avoir reçu le rôle agent. Les rôles ne sont pas attribués par le choix sur cette page.',
    destination: 'agent/dashboard/index.html',
    button: 'Ouvrir mon espace agent',
    signupHref: 'inscription.html?profile=agent',
    signupPrompt: ['Pas encore de compte agent ?', 'Need an agent account?'],
    signupLabel: ['Demander un accès agent', 'Request agent access'],
  },
  admin: {
    name: 'Administrateur',
    description: 'Haut Conseil · pilotage et décisions de la cité.',
    symbol: '⌘',
    kicker: 'ESPACE ADMINISTRATEUR',
    lead: 'Connectez-vous pour ouvrir la vue de supervision du Haut Conseil.',
    notice: window.NovaTerraApi?.enabled ? '<b>Haut Conseil sécurisé</b><br />L’accès administrateur est attribué uniquement depuis le serveur.' : '<b>Administration de démonstration</b><br />Le compte doit avoir reçu le rôle administrateur. Les rôles ne sont pas attribués par le choix sur cette page.',
    destination: 'dashboard.html?view=council',
    button: 'Ouvrir le Haut Conseil',
    signupHref: 'inscription.html?profile=admin',
    signupPrompt: ['Besoin d’un accès administrateur ?', 'Need administrator access?'],
    signupLabel: ['Demander un accès admin', 'Request admin access'],
  },
};
let activeProfile = null;
let loginMessageKey = '';
const loginMessages = {
  profile_required: ['Choisis un profil avant de te connecter.', 'Choose a profile before signing in.'],
  verifying: ['Vérification des identifiants…', 'Checking your sign-in details…'],
  success: ['Connexion réussie. Ouverture de ton espace…', 'Signed in. Opening your space…'],
  invalid_credentials: ['Adresse e-mail ou mot de passe incorrect.', 'Incorrect email address or password.'],
  locked_out: ['Trop de tentatives incorrectes. Réessaie dans 15 minutes.', 'Too many failed attempts. Try again in 15 minutes.'],
  profile_mismatch: ['Ce compte n’a pas accès au profil choisi. Choisis le profil associé au compte.', 'This account does not have the selected role. Choose the role assigned to this account.'],
  account_disabled: ['L’accès à ce compte est suspendu. Contacte un agent municipal.', 'Access to this account is suspended. Contact a municipal agent.'],
  crypto_unavailable: ['Le navigateur ne permet pas la vérification. Ouvre le site en HTTPS ou sur localhost.', 'This browser cannot verify accounts. Open the site using HTTPS or localhost.'],
  storage_unavailable: ['Impossible de lire le compte dans ce navigateur.', 'The account could not be read in this browser.'],
  invalid_profile: ['Le profil choisi n’est pas valide.', 'The selected profile is not valid.'],
  failed: ['La connexion a échoué. Réessaie.', 'Sign-in failed. Please try again.'],
  api_unavailable: ['Le serveur Nova Terra ne répond pas. Vérifie qu’il est démarré.', 'The Nova Terra server is unavailable. Check that it is running.'],
  api_error: ['La connexion au serveur a échoué. Réessaie.', 'The server sign-in request failed. Please try again.'],
  forgot: ['Les comptes locaux ne peuvent pas être récupérés. Crée un nouveau compte avec une autre adresse e-mail.', 'Local demo accounts cannot be recovered. Create a new account with a different email address.'],
};

function isEnglish() { return document.documentElement.lang === 'en'; }

function showLoginMessage(key) {
  loginMessageKey = key;
  loginMessage.hidden = false;
  loginMessage.textContent = loginMessages[key][isEnglish() ? 1 : 0];
}

window.addEventListener('nova:language-change', () => {
  if (loginMessageKey && !loginMessage.hidden) loginMessage.textContent = loginMessages[loginMessageKey][isEnglish() ? 1 : 0];
});

function chooseLoginProfile(profileId) {
  const profile = loginProfiles[profileId];
  if (!profile) return;
  activeProfile = profileId;
  profileStep.hidden = true;
  credentialsStep.hidden = false;
  selectedProfileName.textContent = profile.name;
  selectedProfileDescription.textContent = profile.description;
  selectedProfileSymbol.textContent = profile.symbol;
  selectedProfileSymbol.className = `login-profile-symbol ${profileId}-symbol`;
  profileKicker.innerHTML = `<span>${profile.kicker}</span> · NOUVELLE AURORE`;
  loginLead.textContent = profile.lead;
  loginButton.innerHTML = `${profile.button} <span>→</span>`;
  signupPrompt.textContent = profile.signupPrompt[isEnglish() ? 1 : 0];
  signupLink.href = profile.signupHref;
  signupLink.innerHTML = `${profile.signupLabel[isEnglish() ? 1 : 0]} <span>↗</span>`;
  if (notice) notice.innerHTML = profile.notice;
  loginMessage.hidden = true;
  loginMessage.textContent = '';
  loginMessageKey = '';
  window.dispatchEvent(new Event('nova:profile-change'));
  window.setTimeout(() => document.querySelector('#loginEmail').focus(), 0);
}

document.querySelectorAll('[data-login-profile]').forEach((button) => {
  button.addEventListener('click', () => chooseLoginProfile(button.dataset.loginProfile));
});
document.querySelector('#changeLoginProfile').addEventListener('click', () => {
  activeProfile = null;
  credentialsStep.hidden = true;
  profileStep.hidden = false;
  passwordInput.value = '';
  loginMessage.hidden = true;
  loginMessage.textContent = '';
  loginMessageKey = '';
});

const requestedProfile = new URLSearchParams(window.location.search).get('profile');
const requestedProfileId = requestedProfile === 'council' ? 'admin' : requestedProfile;
if (loginProfiles[requestedProfileId]) chooseLoginProfile(requestedProfileId);

togglePassword.addEventListener('click', () => {
  const reveal = passwordInput.type === 'password';
  const english = document.documentElement.lang === 'en';
  passwordInput.type = reveal ? 'text' : 'password';
  togglePassword.textContent = reveal ? (english ? 'Hide' : 'Masquer') : (english ? 'Show' : 'Afficher');
  togglePassword.setAttribute('aria-label', reveal
    ? (english ? 'Hide password' : 'Masquer le mot de passe')
    : (english ? 'Show password' : 'Afficher le mot de passe'));
  togglePassword.setAttribute('aria-pressed', String(reveal));
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!activeProfile) {
    showLoginMessage('profile_required');
    return;
  }
  if (!loginForm.reportValidity()) return;
  const submittedProfile = activeProfile;
  loginButton.disabled = true;
  showLoginMessage('verifying');
  const result = await window.NovaTerraAuth.signIn({
    email: loginForm.elements.email.value,
    password: passwordInput.value,
    remember: loginForm.elements.remember.checked,
    profile: submittedProfile,
  });

  if (result.ok) {
    showLoginMessage('success');
    window.location.assign(loginProfiles[submittedProfile].destination);
    return;
  }

  showLoginMessage(loginMessages[result.error] ? result.error : 'failed');
  loginButton.disabled = false;
});

document.querySelector('#forgotPassword').addEventListener('click', () => {
  showLoginMessage('forgot');
});
