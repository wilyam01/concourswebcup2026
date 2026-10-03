const loginForm = document.querySelector('#loginForm');
const loginMessage = document.querySelector('#formMessage');
const passwordInput = document.querySelector('#loginPassword');
const togglePassword = document.querySelector('#togglePassword');

togglePassword.addEventListener('click', () => {
  const reveal = passwordInput.type === 'password';
  passwordInput.type = reveal ? 'text' : 'password';
  togglePassword.textContent = reveal ? 'Masquer' : 'Afficher';
  togglePassword.setAttribute('aria-label', reveal ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
  togglePassword.setAttribute('aria-pressed', String(reveal));
});

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  loginMessage.hidden = false;
  loginMessage.textContent = 'La connexion n’est pas encore activée. Pour découvrir l’interface, ouvrez le tableau de bord démo ci-dessous.';
});

document.querySelector('#forgotPassword').addEventListener('click', () => {
  loginMessage.hidden = false;
  loginMessage.textContent = 'La récupération de compte sera disponible lorsque l’authentification sera activée.';
});
