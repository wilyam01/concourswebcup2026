const loginForm = document.querySelector('#loginForm');
const loginMessage = document.querySelector('#formMessage');
const passwordInput = document.querySelector('#loginPassword');
const togglePassword = document.querySelector('#togglePassword');
const loginButton = loginForm.querySelector('[type="submit"]');

const notice = document.querySelector('.prototype-note span');
if (notice) {
  notice.innerHTML = '<b>Connexion locale de demonstration</b><br />Les comptes sont disponibles uniquement dans ce navigateur.';
}
function showLoginMessage(message) {
  loginMessage.hidden = false;
  loginMessage.textContent = message;
}

togglePassword.addEventListener('click', () => {
  const reveal = passwordInput.type === 'password';
  passwordInput.type = reveal ? 'text' : 'password';
  togglePassword.textContent = reveal ? 'Masquer' : 'Afficher';
  togglePassword.setAttribute('aria-label', reveal ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
  togglePassword.setAttribute('aria-pressed', String(reveal));
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!loginForm.reportValidity()) return;
  loginButton.disabled = true;
  showLoginMessage('Vérification des identifiants...');
  const result = await window.NovaTerraAuth.signIn({
    email: loginForm.elements.email.value,
    password: passwordInput.value,
    remember: loginForm.elements.remember.checked,
  });

  if (result.ok) {
    showLoginMessage('Connexion réussie. Ouverture de votre espace...');
    window.location.assign('dashboard.html');
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
