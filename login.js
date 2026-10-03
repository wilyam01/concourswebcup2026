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
const passwordlessToggle = document.querySelector('#passwordlessToggle');
const passwordlessPanel = document.querySelector('#passwordlessPanel');
const passwordlessEmail = document.querySelector('#passwordlessEmail');
const passwordlessRequest = document.querySelector('#passwordlessRequest');
const passwordlessVerifyForm = document.querySelector('#passwordlessVerifyForm');
const passwordlessCode = document.querySelector('#passwordlessCode');
const passwordlessMessage = document.querySelector('#passwordlessMessage');
const twoFactorLoginForm = document.querySelector('#twoFactorLoginForm');
const twoFactorLoginCode = document.querySelector('#twoFactorLoginCode');
const twoFactorLoginMessage = document.querySelector('#twoFactorLoginMessage');
let pendingTwoFactor = null;

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
    notice: window.NovaTerraApi?.enabled ? '<b>Espace agent sécurisé</b><br />Seul un compte auquel un administrateur a attribué le rôle agent peut accéder à cet espace.' : '<b>Espace agent de démonstration</b><br />Tu peux créer un compte agent local; il restera dans ce navigateur.',
    destination: 'agent/dashboard/index.html',
    button: 'Ouvrir mon espace agent',
    signupHref: 'inscription.html?profile=agent',
    signupPrompt: ['Pas encore de compte agent ?', 'Need an agent account?'],
    signupLabel: ['Demander un accès agent', 'Request agent access'],
    demoSignupPrompt: ['Pas encore de compte agent local ?', 'Need a local agent account?'],
    demoSignupLabel: ['Créer un compte agent', 'Create an agent account'],
  },
  admin: {
    name: 'Administrateur',
    description: 'Haut Conseil · pilotage et décisions de la cité.',
    symbol: '⌘',
    kicker: 'ESPACE ADMINISTRATEUR',
    lead: 'Connectez-vous pour ouvrir la vue de supervision du Haut Conseil.',
    notice: window.NovaTerraApi?.enabled ? '<b>Haut Conseil sécurisé</b><br />L’accès administrateur est attribué uniquement depuis le serveur.' : '<b>Administration de démonstration</b><br />Tu peux créer un compte admin local; il restera dans ce navigateur.',
    destination: 'dashboard.html?view=council',
    button: 'Ouvrir le Haut Conseil',
    signupHref: 'inscription.html?profile=admin',
    signupPrompt: ['Besoin d’un accès administrateur ?', 'Need administrator access?'],
    signupLabel: ['Demander un accès admin', 'Request admin access'],
    demoSignupPrompt: ['Pas encore de compte admin local ?', 'Need a local admin account?'],
    demoSignupLabel: ['Créer un compte admin', 'Create an admin account'],
  },
};
let activeProfile = null;
let loginMessageKey = '';
let passwordlessMessageKey = '';
let twoFactorMessageKey = '';
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
  api_not_configured: ['La connexion sans mot de passe nécessite le serveur Nova Terra.', 'Passwordless sign-in requires the Nova Terra server.'],
  email_delivery_not_configured: ['L’envoi d’e-mails n’est pas configuré sur le serveur. Réessaie plus tard.', 'Email delivery is not configured on the server. Try again later.'],
  email_delivery_failed: ['Le code n’a pas pu être envoyé. Réessaie plus tard.', 'The code could not be sent. Try again later.'],
  passwordless_code_sent: ['Si un compte citoyen actif correspond à cette adresse, un code vient d’être envoyé.', 'If an active citizen account matches this address, a code has been sent.'],
  invalid_one_time_code: ['Le code est invalide ou expiré. Demande-en un nouveau.', 'The code is invalid or expired. Request a new one.'],
  invalid_two_factor_code: ['Le code de vérification est invalide ou déjà utilisé.', 'The verification code is invalid or has already been used.'],
  two_factor_challenge_expired: ['La vérification a expiré. Recommence la connexion.', 'The verification expired. Sign in again.'],
  two_factor_not_configured: ['La configuration de sécurité du serveur est incomplète. Contacte la mairie.', 'The server security configuration is incomplete. Contact the city.'],
  forgot_local: ['Les comptes locaux ne peuvent pas être récupérés. Crée un nouveau compte avec une autre adresse e-mail.', 'Local demo accounts cannot be recovered. Create a new account with a different email address.'],
  forgot_server: ['La réinitialisation du mot de passe serveur n’est pas encore disponible. Contacte l’assistance Nova Terra.', 'Server password reset is not available yet. Contact Nova Terra support.'],
};

function isEnglish() { return document.documentElement.lang === 'en'; }

function showLoginMessage(key) {
  loginMessageKey = key;
  loginMessage.hidden = false;
  loginMessage.textContent = loginMessages[key][isEnglish() ? 1 : 0];
}

function showPasswordlessMessage(key) {
  passwordlessMessageKey = key;
  passwordlessMessage.hidden = false;
  passwordlessMessage.textContent = loginMessages[key]?.[isEnglish() ? 1 : 0] || loginMessages.failed[isEnglish() ? 1 : 0];
}

function showTwoFactorMessage(key) {
  twoFactorMessageKey = key;
  twoFactorLoginMessage.hidden = false;
  twoFactorLoginMessage.textContent = loginMessages[key]?.[isEnglish() ? 1 : 0] || loginMessages.failed[isEnglish() ? 1 : 0];
}

function showTwoFactorStep(result, remember, profile) {
  pendingTwoFactor = { challengeToken: result.challengeToken, remember, profile };
  loginForm.hidden = true;
  passwordlessToggle.hidden = true;
  passwordlessPanel.hidden = true;
  twoFactorLoginForm.hidden = false;
  twoFactorLoginMessage.hidden = true;
  twoFactorLoginCode.value = '';
  twoFactorLoginCode.focus();
}

function resetLoginMethods() {
  pendingTwoFactor = null;
  loginButton.disabled = false;
  loginForm.hidden = false;
  passwordlessToggle.hidden = activeProfile !== 'citizen';
  passwordlessPanel.hidden = true;
  passwordlessVerifyForm.hidden = true;
  passwordlessMessage.hidden = true;
  twoFactorLoginForm.hidden = true;
  twoFactorLoginMessage.hidden = true;
}

function updateLoginMethodsCopy() {
  const en = isEnglish();
  passwordlessToggle.textContent = en ? 'D02 · Sign in with an email code' : 'D02 · Se connecter avec un code e-mail';
  document.querySelector('#passwordlessHeading').textContent = en ? 'Sign in with an email code' : 'Connexion par code e-mail';
  passwordlessPanel.querySelector('p').textContent = en
    ? 'Receive a one-time code valid for 10 minutes at your citizen account email address.'
    : 'Reçois un code à usage unique valable 10 minutes sur l’adresse de ton compte citoyen.';
  passwordlessPanel.querySelector('label[for="passwordlessEmail"]').textContent = en ? 'Email address' : 'Adresse e-mail';
  passwordlessRequest.textContent = en ? 'Send a code' : 'Envoyer un code';
  passwordlessVerifyForm.querySelector('label[for="passwordlessCode"]').textContent = en ? '8-digit code' : 'Code à 8 chiffres';
  passwordlessVerifyForm.querySelector('label.remember-option span').textContent = en ? 'Stay signed in' : 'Rester connecté·e';
  passwordlessVerifyForm.querySelector('[type="submit"]').textContent = en ? 'Verify code' : 'Vérifier le code';
  document.querySelector('#passwordlessBack').textContent = en ? 'Back to password sign-in' : 'Retour à la connexion par mot de passe';
  twoFactorLoginForm.querySelector('h2').textContent = en ? 'Two-step verification' : 'Vérification en deux étapes';
  twoFactorLoginForm.querySelector('p').textContent = en
    ? 'Enter the current code from your authenticator app or one of your recovery codes.'
    : 'Saisis le code actuel de ton application d’authentification ou l’un de tes codes de secours.';
  twoFactorLoginForm.querySelector('label').firstChild.textContent = en ? 'Verification code' : 'Code de vérification';
  twoFactorLoginForm.querySelector('[type="submit"]').textContent = en ? 'Verify and continue' : 'Vérifier et continuer';
  document.querySelector('#twoFactorLoginBack').textContent = en ? 'Cancel and return to sign-in' : 'Annuler et revenir à la connexion';
  if (passwordlessMessageKey && !passwordlessMessage.hidden) showPasswordlessMessage(passwordlessMessageKey);
  if (twoFactorMessageKey && !twoFactorLoginMessage.hidden) showTwoFactorMessage(twoFactorMessageKey);
}

window.addEventListener('nova:language-change', () => {
  if (loginMessageKey && !loginMessage.hidden) loginMessage.textContent = loginMessages[loginMessageKey][isEnglish() ? 1 : 0];
  updateLoginMethodsCopy();
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
  const signupPromptText = !window.NovaTerraApi?.enabled && profileId !== 'citizen'
    ? profile.demoSignupPrompt
    : profile.signupPrompt;
  const signupLabelText = !window.NovaTerraApi?.enabled && profileId !== 'citizen'
    ? profile.demoSignupLabel
    : profile.signupLabel;
  signupPrompt.textContent = signupPromptText[isEnglish() ? 1 : 0];
  signupLink.href = profile.signupHref;
  signupLink.innerHTML = `${signupLabelText[isEnglish() ? 1 : 0]} <span>↗</span>`;
  if (notice) notice.innerHTML = profile.notice;
  resetLoginMethods();
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
  resetLoginMethods();
  loginMessage.hidden = true;
  loginMessage.textContent = '';
  loginMessageKey = '';
});

const requestedProfile = new URLSearchParams(window.location.search).get('profile');
const requestedProfileId = requestedProfile === 'council' ? 'admin' : requestedProfile;
if (loginProfiles[requestedProfileId]) chooseLoginProfile(requestedProfileId);
updateLoginMethodsCopy();

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

  if (result.twoFactorRequired) {
    showTwoFactorStep(result, loginForm.elements.remember.checked, submittedProfile);
    return;
  }

  if (result.ok) {
    showLoginMessage('success');
    window.location.assign(loginProfiles[submittedProfile].destination);
    return;
  }

  showLoginMessage(loginMessages[result.error] ? result.error : 'failed');
  loginButton.disabled = false;
});

passwordlessToggle.addEventListener('click', () => {
  passwordlessPanel.hidden = false;
  loginForm.hidden = true;
  passwordlessEmail.value = loginForm.elements.email.value;
  passwordlessMessage.hidden = true;
  passwordlessEmail.focus();
});

document.querySelector('#passwordlessBack').addEventListener('click', () => {
  passwordlessPanel.hidden = true;
  passwordlessVerifyForm.hidden = true;
  loginForm.hidden = false;
  passwordlessToggle.hidden = activeProfile !== 'citizen';
  loginForm.elements.email.value = passwordlessEmail.value;
  loginForm.elements.email.focus();
});

passwordlessRequest.addEventListener('click', async () => {
  if (!passwordlessEmail.reportValidity()) return;
  passwordlessRequest.disabled = true;
  passwordlessMessage.hidden = true;
  const result = await window.NovaTerraAuth.requestPasswordlessCode(passwordlessEmail.value);
  passwordlessRequest.disabled = false;
  if (!result.ok) {
    showPasswordlessMessage(result.error);
    return;
  }
  passwordlessVerifyForm.hidden = false;
  showPasswordlessMessage('passwordless_code_sent');
  passwordlessCode.focus();
});

passwordlessVerifyForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!passwordlessVerifyForm.reportValidity() || !activeProfile) return;
  const button = passwordlessVerifyForm.querySelector('[type="submit"]');
  button.disabled = true;
  const result = await window.NovaTerraAuth.verifyPasswordlessCode({
    email: passwordlessEmail.value,
    code: passwordlessCode.value,
    remember: document.querySelector('#passwordlessRemember').checked,
  });
  button.disabled = false;
  if (result.twoFactorRequired) {
    showTwoFactorStep(result, document.querySelector('#passwordlessRemember').checked, 'citizen');
    return;
  }
  if (result.ok) {
    window.location.assign(loginProfiles.citizen.destination);
    return;
  }
  showPasswordlessMessage(result.error);
});

twoFactorLoginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!pendingTwoFactor || !twoFactorLoginForm.reportValidity()) return;
  const button = twoFactorLoginForm.querySelector('[type="submit"]');
  button.disabled = true;
  twoFactorLoginMessage.hidden = true;
  const result = await window.NovaTerraAuth.verifySecondFactor({
    ...pendingTwoFactor,
    code: twoFactorLoginCode.value,
  });
  button.disabled = false;
  if (result.ok) {
    window.location.assign(loginProfiles[pendingTwoFactor.profile].destination);
    return;
  }
  showTwoFactorMessage(result.error);
});

document.querySelector('#twoFactorLoginBack').addEventListener('click', () => {
  resetLoginMethods();
  pendingTwoFactor = null;
  loginForm.elements.password.value = '';
  loginMessage.hidden = true;
  document.querySelector('#loginEmail').focus();
});

document.querySelector('#forgotPassword').addEventListener('click', () => {
  showLoginMessage(window.NovaTerraApi?.enabled ? 'forgot_server' : 'forgot_local');
});
