const signupForm = document.querySelector('#signupForm');
const signupMessage = document.querySelector('#formMessage');
const passwordInput = document.querySelector('#signupPassword');
const confirmPasswordInput = document.querySelector('#confirmPassword');
const signupButton = signupForm.querySelector('[type="submit"]');

const notice = document.querySelector('.prototype-note span');
let messageKey = '';
let creatingAccount = false;

const messages = {
  password_mismatch: ['Les deux mots de passe ne correspondent pas.', 'The passwords do not match.'],
  weak_password: ['Le mot de passe doit contenir au moins 8 caractères.', 'Password must be at least 8 characters.'],
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
  if (notice) notice.innerHTML = english
    ? '<b>Local demo account</b><br />Your account is saved only in this browser. Use HTTPS or localhost.'
    : '<b>Compte local de démonstration</b><br />Le compte est conservé uniquement dans ce navigateur. Utilise HTTPS ou localhost.';
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
  if (!signupForm.reportValidity()) return;
  if (passwordInput.value !== confirmPasswordInput.value) {
    showSignupMessage('password_mismatch');
    confirmPasswordInput.focus();
    return;
  }
  if (passwordInput.value.length < 8) {
    showSignupMessage('weak_password');
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
