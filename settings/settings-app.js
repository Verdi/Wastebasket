(() => {
  const FONT_STORAGE_KEY = 'wastebasket:font';
  const THEME_STORAGE_KEY = 'wastebasket:theme';
  const TOOLBAR_STORAGE_KEY = 'wastebasket:toolbar';
  const DEFAULT_FONT = 'mono';
  const DEFAULT_THEME = 'auto';
  const DEFAULT_TOOLBAR_POSITION = 'bottom';
  const AVAILABLE_FONTS = new Set(['mono', 'sans', 'serif']);
  const AVAILABLE_THEMES = new Set(['auto', 'light', 'dark']);
  const AVAILABLE_TOOLBAR_POSITIONS = new Set(['bottom', 'top']);

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

  const toolbarForm = document.querySelector('[data-toolbar-form]');
  const toolbarRadios = toolbarForm
    ? Array.from(toolbarForm.querySelectorAll('input[name="toolbarPosition"]'))
    : [];

  initFontSettings();
  initThemeSettings();
  initToolbarSettings();

  window.addEventListener('pageshow', () => {
    refreshFontPreference();
    refreshThemePreference();
    refreshToolbarPreference();
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

  function initToolbarSettings() {
    if (!toolbarForm || !toolbarRadios.length) {
      return;
    }
    refreshToolbarPreference();
    toolbarForm.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      if (target.name !== 'toolbarPosition' || !isValidToolbarPosition(target.value)) {
        return;
      }
      applyToolbarPreference(target.value, true);
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

  function refreshToolbarPreference() {
    const stored = supportsLocalStorage ? localStorage.getItem(TOOLBAR_STORAGE_KEY) : null;
    applyToolbarPreference(
      isValidToolbarPosition(stored) ? stored : DEFAULT_TOOLBAR_POSITION,
      false
    );
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

  function applyToolbarPreference(positionValue, persist) {
    const nextPosition = isValidToolbarPosition(positionValue)
      ? positionValue
      : DEFAULT_TOOLBAR_POSITION;
    if (document.documentElement) {
      document.documentElement.dataset.toolbarPosition = nextPosition;
    }
    if (document.body) {
      document.body.dataset.toolbarPosition = nextPosition;
    }
    toolbarRadios.forEach((input) => {
      input.checked = input.value === nextPosition;
    });
    if (persist && supportsLocalStorage) {
      localStorage.setItem(TOOLBAR_STORAGE_KEY, nextPosition);
    }
  }

  function isValidFont(value) {
    return typeof value === 'string' && AVAILABLE_FONTS.has(value);
  }

  function isValidTheme(value) {
    return typeof value === 'string' && AVAILABLE_THEMES.has(value);
  }

  function isValidToolbarPosition(value) {
    return typeof value === 'string' && AVAILABLE_TOOLBAR_POSITIONS.has(value);
  }
})();
