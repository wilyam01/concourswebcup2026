(() => {
  const storageKey = 'novaTerraTheme';
  let currentTheme = 'dark';

  try {
    const savedTheme = localStorage.getItem(storageKey);
    if (savedTheme === 'light' || savedTheme === 'dark') currentTheme = savedTheme;
  } catch (_) {
    // Keep the default theme when browser storage is unavailable.
  }

  const applyTheme = (theme) => {
    currentTheme = theme;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem(storageKey, theme);
    } catch (_) {
      // Theme switching still works for this page without persistent storage.
    }

    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      const nextTheme = theme === 'dark' ? 'clair' : 'sombre';
      button.setAttribute('aria-label', `Activer le thème ${nextTheme}`);
      button.setAttribute('title', `Passer au thème ${nextTheme}`);
      button.setAttribute('aria-pressed', String(theme === 'light'));
      const icon = button.querySelector('.theme-symbol');
      if (icon) icon.textContent = theme === 'dark' ? '☼' : '☾';
    });
  };

  document.documentElement.dataset.theme = currentTheme;
  document.documentElement.style.colorScheme = currentTheme;
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(currentTheme);
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', () => applyTheme(currentTheme === 'dark' ? 'light' : 'dark'));
    });
  });
})();
