const form = document.querySelector("#contact-form");
const success = document.querySelector("#success-message");
const error = document.querySelector("#form-error");
const deliveryNote = document.querySelector("#delivery-mode");
const successLabel = success.querySelector(".kicker");
const successTitle = success.querySelector("h2");
const successDescription = success.querySelector("p:not(.kicker)");
const submitButton = form.querySelector("button[type='submit']");
const messagesAreDemo = window.NovaTerra.messagesAreDemo();
const introDescription = document.querySelector("#contact-intro-description");
const serviceDescription = document.querySelector("#service-description");
const followUpMethod = document.querySelector("#follow-up-method");

if (messagesAreDemo) {
  introDescription.textContent = "Ce formulaire est en mode démonstration : les messages restent sur cet appareil. Pour une urgence, contactez les services d'urgence locaux.";
  deliveryNote.textContent = "Mode démonstration : votre message sera conservé uniquement dans ce navigateur. Il ne sera pas transmis aux services municipaux.";
  successLabel.textContent = "DÉMONSTRATION · ENREGISTRÉ SUR CET APPAREIL";
  successTitle.textContent = "Votre message reste local à ce navigateur.";
  successDescription.textContent = "Aucune équipe ne le reçoit et aucun e-mail de suivi ne sera envoyé.";
  serviceDescription.textContent = "Ce formulaire fonctionne en démonstration : les messages restent dans ce navigateur et ne sont pas transmis aux services municipaux. Pour une urgence immédiate, contactez les services d'urgence locaux.";
  followUpMethod.textContent = "Aucun envoi";
} else {
  introDescription.textContent = "Transmettez votre demande aux services municipaux par le canal configuré. Pour une urgence, contactez les services d'urgence locaux.";
  deliveryNote.textContent = "Votre message sera transmis aux services municipaux par le canal configuré.";
  successLabel.textContent = "MESSAGE TRANSMIS";
  successTitle.textContent = "Votre message a été transmis.";
  successDescription.textContent = "La transmission a été acceptée par le service. Les modalités de suivi dépendent de l’équipe municipale.";
  serviceDescription.textContent = "Les messages sont transmis via le canal configuré. Pour une urgence immédiate, contactez les services d'urgence locaux.";
  followUpMethod.textContent = "Selon le service";
}

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
