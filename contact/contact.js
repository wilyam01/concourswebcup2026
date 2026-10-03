const form = document.querySelector("#contact-form");
const success = document.querySelector("#success-message");
const error = document.querySelector("#form-error");
const submitButton = form.querySelector("button[type='submit']");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  error.hidden = true;
  submitButton.disabled = true;
  submitButton.textContent = "Transmission...";
  const values = Object.fromEntries(new FormData(form));
  try {
    await window.NovaTerra.sendMessage(values);
    form.hidden = true;
    success.hidden = false;
  } catch {
    error.textContent = "Le message n'a pas pu etre envoye. Reessayez dans un instant.";
    error.hidden = false;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Envoyer le message";
  }
});

document.querySelector("#new-message").addEventListener("click", () => {
  form.reset();
  success.hidden = true;
  form.hidden = false;
  form.querySelector("input").focus();
});
