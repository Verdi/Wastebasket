(() => {
  const FONT_STORAGE_KEY = 'wastebasket:font';
  const DEFAULT_FONT = 'mono';
  const AVAILABLE_FONTS = new Set(['mono', 'sans', 'serif']);

  const form = document.querySelector('[data-font-form]');
  if (!form) {
    return;
  }

  const radioInputs = Array.from(
    form.querySelectorAll('input[name="writingFont"]')
  );
  if (!radioInputs.length) {
    return;
  }

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

  const initialFont = supportsLocalStorage
    ? localStorage.getItem(FONT_STORAGE_KEY)
    : null;
  applyFontPreference(isValidFont(initialFont) ? initialFont : DEFAULT_FONT, false);

  window.addEventListener('pageshow', () => {
    const latestFont = supportsLocalStorage
      ? localStorage.getItem(FONT_STORAGE_KEY)
      : null;
    applyFontPreference(isValidFont(latestFont) ? latestFont : DEFAULT_FONT, false);
  });

  form.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    if (target.name !== 'writingFont' || !isValidFont(target.value)) {
      return;
    }
    applyFontPreference(target.value, true);
  });

  function applyFontPreference(fontValue, persist) {
    const nextFont = isValidFont(fontValue) ? fontValue : DEFAULT_FONT;
    const body = document.body;
    if (body) {
      body.dataset.writingFont = nextFont;
    }
    syncRadios(nextFont);
    if (persist && supportsLocalStorage) {
      localStorage.setItem(FONT_STORAGE_KEY, nextFont);
    }
  }

  function syncRadios(activeValue) {
    radioInputs.forEach((input) => {
      input.checked = input.value === activeValue;
    });
  }

  function isValidFont(value) {
    return typeof value === 'string' && AVAILABLE_FONTS.has(value);
  }
})();
