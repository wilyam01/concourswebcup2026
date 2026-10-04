const form = document.querySelector("#contact-form");
const success = document.querySelector("#success-message");
const error = document.querySelector("#form-error");
const deliveryNote = document.querySelector("#delivery-mode");
const successLabel = document.querySelector("#contactSuccessKicker");
const successTitle = document.querySelector("#contactSuccessTitle");
const successDescription = document.querySelector("#contactSuccessDescription");
const submitButton = form.querySelector("button[type='submit']");
const messagesAreDemo = !window.TERRA_NOVA_CONFIG?.apiBaseUrl;
const introDescription = document.querySelector("#contact-intro-description");
const serviceDescription = document.querySelector("#service-description");
const followUpMethod = document.querySelector("#follow-up-method");
let sending = false;

function applyContactLanguage() {
  const english = document.documentElement.lang === "en";
  const copy = messagesAreDemo ? (english ? {
    intro: "This demo form saves messages in this browser only. For emergencies, contact local emergency services.",
    delivery: "Demo mode: the message stays in this browser and is not sent to municipal services.",
    successLabel: "DEMO · SAVED ON THIS DEVICE",
    successTitle: "Your message is saved in this browser.",
    successDescription: "No municipal team receives it, and no follow-up email will be sent.",
    service: "Demo form: messages stay in this browser and are not sent to municipal services. For an immediate emergency, contact local emergency services.",
    followUp: "No delivery",
  } : {
    intro: "Ce formulaire est en mode démonstration : les messages restent sur cet appareil. Pour une urgence, contactez les services d'urgence locaux.",
    delivery: "Mode démonstration : votre message sera conservé uniquement dans ce navigateur. Il ne sera pas transmis aux services municipaux.",
    successLabel: "DÉMONSTRATION · ENREGISTRÉ SUR CET APPAREIL",
    successTitle: "Votre message reste local à ce navigateur.",
    successDescription: "Aucune équipe ne le reçoit et aucun e-mail de suivi ne sera envoyé.",
    service: "Ce formulaire fonctionne en démonstration : les messages restent dans ce navigateur et ne sont pas transmis aux services municipaux. Pour une urgence immédiate, contactez les services d'urgence locaux.",
    followUp: "Aucun envoi",
  }) : (english ? {
    intro: "Send your request to municipal services through the configured channel. For emergencies, contact local emergency services.",
    delivery: "Your message will be sent through the configured municipal channel.",
    successLabel: "MESSAGE SENT",
    successTitle: "Your message has been sent.",
    successDescription: "The service accepted the message. Follow-up details depend on the municipal team.",
    service: "Messages are sent through the configured channel. For immediate emergencies, contact local emergency services.",
    followUp: "According to service",
  } : {
    intro: "Transmettez votre demande aux services municipaux par le canal configuré. Pour une urgence, contactez les services d'urgence locaux.",
    delivery: "Votre message sera transmis aux services municipaux par le canal configuré.",
    successLabel: "MESSAGE TRANSMIS",
    successTitle: "Votre message a été transmis.",
    successDescription: "La transmission a été acceptée par le service. Les modalités de suivi dépendent de l’équipe municipale.",
    service: "Les messages sont transmis via le canal configuré. Pour une urgence immédiate, contactez les services d'urgence locaux.",
    followUp: "Selon le service",
  });
  introDescription.textContent = copy.intro;
  deliveryNote.textContent = copy.delivery;
  successLabel.textContent = copy.successLabel;
  successTitle.textContent = copy.successTitle;
  successDescription.textContent = copy.successDescription;
  serviceDescription.textContent = copy.service;
  followUpMethod.textContent = copy.followUp;
  if (!sending) submitButton.textContent = english ? "Send message" : "Envoyer le message";
  document.querySelector("#new-message").textContent = english ? "Send another message" : "Envoyer un autre message";
  if (!error.hidden) error.textContent = english
    ? "The message could not be sent. Please try again in a moment."
    : "Le message n'a pas pu être envoyé. Réessaie dans un instant.";
}

applyContactLanguage();
window.addEventListener("nova:language-change", applyContactLanguage);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  error.hidden = true;
  submitButton.disabled = true;
  sending = true;
  submitButton.textContent = document.documentElement.lang === "en" ? "Sending…" : "Transmission…";
  const values = Object.fromEntries(new FormData(form));
  if (values.website) {
    sending = false;
    submitButton.disabled = false;
    applyContactLanguage();
    return;
  }
  try {
    await window.NovaTerra.sendMessage(values);
    form.hidden = true;
    success.hidden = false;
  } catch (sendError) {
    error.textContent = document.documentElement.lang === "en"
      ? (sendError?.message === 'DUPLICATE_SUBMISSION' ? 'This message was already received recently.' : 'The message could not be sent. Please try again in a moment.')
      : (sendError?.message === 'DUPLICATE_SUBMISSION' ? 'Ce message a déjà été reçu récemment.' : 'Le message n’a pas pu être envoyé. Réessaie dans un instant.');
    error.hidden = false;
  } finally {
    sending = false;
    submitButton.disabled = false;
    submitButton.textContent = document.documentElement.lang === "en" ? "Send message" : "Envoyer le message";
  }
});

document.querySelector("#new-message").addEventListener("click", () => {
  form.reset();
  success.hidden = true;
  form.hidden = false;
  form.querySelector("input").focus();
});
