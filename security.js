(() => {
  const user = window.NovaTerraAuth?.getSession();
  const host = document.querySelector('#citizenSecuritySettings');
  if (!host || !user || user.profile !== 'citizen') return;
  const intro = document.querySelector('#citizenSecurityIntro');
  const state = document.querySelector('#citizenSecurityState');
  const feedback = document.querySelector('#citizenSecurityFeedback');
  const startButton = document.querySelector('#startTwoFactorSetup');
  const setupPanel = document.querySelector('#twoFactorSetupPanel');
  const setupCode = document.querySelector('#twoFactorSetupCode');
  const recoveryPanel = document.querySelector('#twoFactorRecoveryPanel');
  const recoveryList = document.querySelector('#twoFactorRecoveryCodes');
  const disableForm = document.querySelector('#disableTwoFactorForm');
  const disableCode = document.querySelector('#disableTwoFactorCode');
  let recoveryCodes = [];

  const english = () => document.documentElement.lang === 'en';
  const apiEnabled = () => Boolean(window.NovaTerraApi?.enabled);

  function updateCopy() {
    const en = english();
    document.querySelector('#citizenSecurityTitle').textContent = en ? 'Two-factor sign-in' : 'Double facteur de connexion';
    intro.textContent = en
      ? 'Add a temporary code from an authenticator app to your sign-in.'
      : 'Ajoute à la connexion un code temporaire fourni par une application d’authentification.';
    document.querySelector('#twoFactorSetupInstructions').textContent = en
      ? 'Enter this key in your authenticator app, then type its current six-digit code.'
      : 'Ajoute cette clé dans ton application d’authentification, puis saisis le code actuel à 6 chiffres.';
    document.querySelector('#twoFactorRecoveryIntro').textContent = en
      ? 'Keep these one-time recovery codes somewhere safe. They will only be shown once.'
      : 'Conserve ces codes de secours à usage unique en lieu sûr. Ils ne seront affichés qu’une fois.';
    document.querySelector('#disableTwoFactorLabel').firstChild.textContent = en ? 'Authenticator or recovery code' : 'Code d’authentification ou code de secours';
    startButton.textContent = en ? 'Enable two-step verification' : 'Activer la double vérification';
    document.querySelector('#twoFactorConfirmForm button').textContent = en ? 'Confirm activation' : 'Confirmer l’activation';
    document.querySelector('#downloadRecoveryCodes').textContent = en ? 'Download recovery codes' : 'Télécharger les codes';
    document.querySelector('#finishRecoveryCodes').textContent = en ? 'I saved my codes' : 'J’ai conservé mes codes';
    disableForm.querySelector('button').textContent = en ? 'Turn off two-factor sign-in' : 'Désactiver le double facteur';
  }

  async function refreshStatus() {
    setupPanel.hidden = true;
    recoveryPanel.hidden = true;
    disableForm.hidden = true;
    if (!apiEnabled()) {
      state.textContent = english()
        ? 'Two-factor sign-in requires the city server; browser demo accounts cannot enable it.'
        : 'Le double facteur nécessite le serveur municipal; les comptes de démonstration du navigateur ne peuvent pas l’activer.';
      startButton.disabled = true;
      return;
    }
    startButton.disabled = false;
    state.textContent = english() ? 'Checking security settings…' : 'Vérification des paramètres de sécurité…';
    try {
      const result = await window.NovaTerraApi.request('/auth/2fa/status');
      state.textContent = result.enabled
        ? (english() ? 'Two-factor verification is enabled for this account.' : 'La double vérification est active pour ce compte.')
        : (english() ? 'Two-factor verification is not enabled.' : 'La double vérification n’est pas activée.');
      startButton.hidden = Boolean(result.enabled);
      disableForm.hidden = !result.enabled;
    } catch (error) {
      startButton.hidden = false;
      startButton.disabled = true;
      state.textContent = error.message === 'TWO_FACTOR_NOT_CONFIGURED'
        ? (english() ? 'The server needs a TOTP encryption key before this can be enabled.' : 'Le serveur doit être configuré avec une clé de chiffrement TOTP avant l’activation.')
        : (english() ? 'Security settings could not be loaded.' : 'Les paramètres de sécurité n’ont pas pu être chargés.');
    }
  }

  startButton.addEventListener('click', async () => {
    startButton.disabled = true;
    feedback.textContent = '';
    try {
      const result = await window.NovaTerraApi.request('/auth/2fa/setup', { method: 'POST', body: '{}' });
      document.querySelector('#twoFactorSecret').textContent = result.secret;
      setupPanel.hidden = false;
      setupCode.value = '';
      setupCode.focus();
    } catch (error) {
      feedback.textContent = error.message === 'TWO_FACTOR_NOT_CONFIGURED'
        ? (english() ? 'The server security key is not configured.' : 'La clé de sécurité du serveur n’est pas configurée.')
        : (english() ? 'Two-factor setup could not be started.' : 'La configuration du double facteur n’a pas pu démarrer.');
    } finally { startButton.disabled = false; }
  });

  document.querySelector('#twoFactorConfirmForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('[type="submit"]');
    button.disabled = true;
    feedback.textContent = '';
    try {
      const result = await window.NovaTerraApi.request('/auth/2fa/confirm', {
        method: 'POST', body: JSON.stringify({ code: setupCode.value.trim() }),
      });
      recoveryCodes = result.recoveryCodes || [];
      recoveryList.replaceChildren(...recoveryCodes.map((code) => {
        const item = document.createElement('li');
        item.textContent = code;
        return item;
      }));
      setupPanel.hidden = true;
      recoveryPanel.hidden = false;
      state.textContent = english() ? 'Two-factor verification is enabled.' : 'La double vérification est activée.';
    } catch (error) {
      feedback.textContent = error.message === 'INVALID_TWO_FACTOR_CODE'
        ? (english() ? 'That code is not valid yet. Check your authenticator and try again.' : 'Ce code n’est pas valide. Vérifie ton application et réessaie.')
        : (english() ? 'Two-factor verification could not be enabled.' : 'Le double facteur n’a pas pu être activé.');
    } finally { button.disabled = false; }
  });

  function downloadRecoveryCodes() {
    if (!recoveryCodes.length) return;
    const text = `${english() ? 'Nova Terra recovery codes' : 'Codes de secours Nova Terra'}\n\n${recoveryCodes.join('\n')}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nova-terra-codes-de-secours.txt';
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  document.querySelector('#downloadRecoveryCodes').addEventListener('click', downloadRecoveryCodes);
  document.querySelector('#finishRecoveryCodes').addEventListener('click', async () => {
    recoveryCodes = [];
    recoveryPanel.hidden = true;
    await refreshStatus();
  });

  disableForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = disableForm.querySelector('[type="submit"]');
    button.disabled = true;
    feedback.textContent = '';
    try {
      await window.NovaTerraApi.request('/auth/2fa', {
        method: 'DELETE', body: JSON.stringify({ code: disableCode.value.trim() }),
      });
      disableForm.reset();
      await refreshStatus();
      feedback.textContent = english() ? 'Two-factor verification has been turned off.' : 'La double vérification a été désactivée.';
    } catch (error) {
      feedback.textContent = error.message === 'INVALID_TWO_FACTOR_CODE'
        ? (english() ? 'The authenticator or recovery code is invalid.' : 'Le code d’authentification ou de secours est invalide.')
        : (english() ? 'Two-factor verification could not be turned off.' : 'Le double facteur n’a pas pu être désactivé.');
    } finally { button.disabled = false; }
  });

  window.addEventListener('nova:language-change', updateCopy);
  updateCopy();
  refreshStatus();
})();
