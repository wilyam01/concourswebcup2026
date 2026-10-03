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
    notice: '<b>Connexion locale de démonstration</b><br />Les comptes sont disponibles uniquement dans ce navigateur.',
    destination: 'dashboard.html',
    button: 'Se connecter',
  },
  agent: {
    name: 'Agent',
    description: 'Espace de travail et suivi des demandes citoyennes.',
    symbol: 'A',
    kicker: 'ESPACE AGENT',
    lead: 'Connectez-vous pour consulter les demandes et coordonner les services municipaux.',
    notice: '<b>Espace agent de démonstration</b><br />Les profils de cette version fonctionnent dans ce navigateur.',
    destination: 'agent/dashboard/index.html',
    button: 'Ouvrir mon espace agent',
  },
  admin: {
    name: 'Administrateur',
    description: 'Haut Conseil · pilotage et décisions de la cité.',
    symbol: '⌘',
    kicker: 'ESPACE ADMINISTRATEUR',
    lead: 'Connectez-vous pour ouvrir la vue de supervision du Haut Conseil.',
    notice: '<b>Administration de démonstration</b><br />Les profils de cette version fonctionnent dans ce navigateur.',
    destination: 'dashboard.html?view=council',
    button: 'Ouvrir le Haut Conseil',
  },
};
let activeProfile = null;

function showLoginMessage(message) {
  loginMessage.hidden = false;
  loginMessage.textContent = message;
}

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
  if (notice) notice.innerHTML = profile.notice;
  loginMessage.hidden = true;
  loginMessage.textContent = '';
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
    showLoginMessage('Choisissez un profil avant de vous connecter.');
    return;
  }
  if (!loginForm.reportValidity()) return;
  const submittedProfile = activeProfile;
  loginButton.disabled = true;
  showLoginMessage('Vérification des identifiants...');
  const result = await window.NovaTerraAuth.signIn({
    email: loginForm.elements.email.value,
    password: passwordInput.value,
    remember: loginForm.elements.remember.checked,
    profile: submittedProfile,
  });

  if (result.ok) {
    showLoginMessage('Connexion réussie. Ouverture de votre espace...');
    window.location.assign(loginProfiles[submittedProfile].destination);
    return;
  }

  const errors = {
    invalid_credentials: 'Adresse e-mail ou mot de passe incorrect.',
    crypto_unavailable: 'Le navigateur ne permet pas la vérification. Ouvrez le site en HTTPS ou sur localhost.',
    storage_unavailable: 'Impossible de lire le compte dans ce navigateur.',
  };
  showLoginMessage(errors[result.error] || 'La connexion a échoué. Réessayez.');
  loginButton.disabled = false;
});

document.querySelector('#forgotPassword').addEventListener('click', () => {
  showLoginMessage('Les comptes locaux ne peuvent pas être récupérés. Créez un nouveau compte avec une autre adresse e-mail.');
});
