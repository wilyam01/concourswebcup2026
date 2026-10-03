document.querySelector('#signupForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = document.querySelector('#formMessage');
  message.hidden = false;
  message.textContent = 'Maquette uniquement : vos informations ne sont pas transmises. Le portail citoyen de Nova Terra sera bientôt ouvert.';
});
