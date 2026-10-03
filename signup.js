const signupForm = document.querySelector('#signupForm');
const signupMessage = document.querySelector('#formMessage');
const passwordInput = document.querySelector('#signupPassword');
const confirmPasswordInput = document.querySelector('#confirmPassword');
const signupButton = signupForm.querySelector('[type="submit"]');

const notice = document.querySelector('.prototype-note span');
if (notice) {
  notice.innerHTML = '<b>Compte local de démonstration</b><br />Le compte est conservé uniquement dans ce navigateur. Utilisez HTTPS ou localhost.';
}

function showSignupMessage(message) {
  signupMessage.hidden = false;
  signupMessage.textContent = message;
}

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!signupForm.reportValidity()) return;
  if (passwordInput.value !== confirmPasswordInput.value) {
    showSignupMessage('Les deux mots de passe ne correspondent pas.');
    confirmPasswordInput.focus();
    return;
  }
  if (passwordInput.value.length < 8) {
    showSignupMessage('Le mot de passe doit contenir au moins 8 caractères.');
    passwordInput.focus();
    return;
  }

  signupButton.disabled = true;
  showSignupMessage('Création du compte...');
  const result = await window.NovaTerraAuth.createAccount({
    name: signupForm.elements.fullName.value,
    email: signupForm.elements.email.value,
    sector: signupForm.elements.sector.value,
    password: passwordInput.value,
  });

  if (result.ok) {
    showSignupMessage('Compte créé. Ouverture de votre espace...');
    window.location.assign('dashboard.html');
    return;
  }

  const errors = {
    email_exists: 'Un compte existe déjà avec cette adresse. Connectez-vous.',
    crypto_unavailable: 'Le navigateur ne permet pas le chiffrement. Ouvrez le site en HTTPS ou sur localhost.',
    storage_full: 'Le stockage du navigateur est plein. Libérez de la place puis réessayez.',
    storage_unavailable: 'Impossible d’enregistrer le compte dans ce navigateur.',
  };
  showSignupMessage(errors[result.error] || 'La création du compte a échoué. Réessayez.');
  signupButton.disabled = false;
});
