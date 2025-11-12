(() => {
  const FONT_STORAGE_KEY = 'wastebasket:font';
  const THEME_STORAGE_KEY = 'wastebasket:theme';
  const DEFAULT_FONT = 'mono';
  const DEFAULT_THEME = 'auto';
  const AVAILABLE_FONTS = new Set(['mono', 'sans', 'serif']);
  const AVAILABLE_THEMES = new Set(['auto', 'light', 'dark']);

  const supportsLocalStorage = (() => {
    try {
      const testKey = '__wastebasket_settings_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('LocalStorage unavailable', error);
      return false;
    }
  })();

  const fontForm = document.querySelector('[data-font-form]');
  const fontRadios = fontForm
    ? Array.from(fontForm.querySelectorAll('input[name="writingFont"]'))
    : [];

  const themeForm = document.querySelector('[data-theme-form]');
  const themeRadios = themeForm
    ? Array.from(themeForm.querySelectorAll('input[name="theme"]'))
    : [];

  initFontSettings();
  initThemeSettings();

  window.addEventListener('pageshow', () => {
    refreshFontPreference();
    refreshThemePreference();
  });

  function initFontSettings() {
    if (!fontForm || !fontRadios.length) {
      return;
    }
    refreshFontPreference();
    fontForm.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      if (target.name !== 'writingFont' || !isValidFont(target.value)) {
        return;
      }
      applyFontPreference(target.value, true);
    });
  }

  function initThemeSettings() {
    if (!themeForm || !themeRadios.length) {
      return;
    }
    refreshThemePreference();
    themeForm.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      if (target.name !== 'theme' || !isValidTheme(target.value)) {
        return;
      }
      applyThemePreference(target.value, true);
    });
  }

  function refreshFontPreference() {
    const stored = supportsLocalStorage ? localStorage.getItem(FONT_STORAGE_KEY) : null;
    applyFontPreference(isValidFont(stored) ? stored : DEFAULT_FONT, false);
  }

  function refreshThemePreference() {
    const stored = supportsLocalStorage ? localStorage.getItem(THEME_STORAGE_KEY) : null;
    applyThemePreference(isValidTheme(stored) ? stored : DEFAULT_THEME, false);
  }

  function applyFontPreference(fontValue, persist) {
    const nextFont = isValidFont(fontValue) ? fontValue : DEFAULT_FONT;
    if (document.body) {
      document.body.dataset.writingFont = nextFont;
    }
    fontRadios.forEach((input) => {
      input.checked = input.value === nextFont;
    });
    if (persist && supportsLocalStorage) {
      localStorage.setItem(FONT_STORAGE_KEY, nextFont);
    }
  }

  function applyThemePreference(themeValue, persist) {
    const nextTheme = isValidTheme(themeValue) ? themeValue : DEFAULT_THEME;
    if (document.documentElement) {
      document.documentElement.dataset.theme = nextTheme;
    }
    if (document.body) {
      document.body.dataset.theme = nextTheme;
    }
    themeRadios.forEach((input) => {
      input.checked = input.value === nextTheme;
    });
    if (persist && supportsLocalStorage) {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    }
  }

  function isValidFont(value) {
    return typeof value === 'string' && AVAILABLE_FONTS.has(value);
  }

  function isValidTheme(value) {
    return typeof value === 'string' && AVAILABLE_THEMES.has(value);
  }
})();
