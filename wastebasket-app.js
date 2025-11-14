(() => {
  const STORAGE_KEY = 'wastebasket:entry';
  const FONT_STORAGE_KEY = 'wastebasket:font';
  const THEME_STORAGE_KEY = 'wastebasket:theme';
  const TOOLBAR_STORAGE_KEY = 'wastebasket:toolbar';
  const WTF_HINT_STORAGE_KEY = 'wastebasket:wtfSeen';
  const DEFAULT_WRITING_FONT = 'mono';
  const WRITING_FONTS = new Set(['sans', 'serif', 'mono']);
  const DEFAULT_THEME = 'auto';
  const THEME_OPTIONS = new Set(['auto', 'light', 'dark']);
  const DEFAULT_TOOLBAR_POSITION = 'bottom';
  const TOOLBAR_POSITIONS = new Set(['bottom', 'top']);

  const textarea = document.getElementById('typeInput');
  const tossBtn = document.getElementById('tossBtn');
  const copyBtn = document.getElementById('copyBtn');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const toolbar = document.querySelector('.toolbar');
  const customCaret = document.querySelector('.custom-caret');
  const wtfHint = document.getElementById('wtfHint');
  const wtfLink = document.getElementById('wtfLink');
  const tossIcon = document.querySelector('.toolbar-item--toss .toolbar-action__icon');
  const tossAnimationContainer = tossIcon?.querySelector('.toss-animation');
  const tossAnimationTemplate = document.getElementById('tossAnimationTemplate');

  let text = '';
  let toolbarHidden = false;

  const supportsLocalStorage = (() => {
    try {
      const testKey = '__wastebasket_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('LocalStorage unavailable', error);
      return false;
    }
  })();

  applyThemePreference(getStoredThemePreference());
  applyToolbarPreference(getStoredToolbarPreference());
  setWritingFontOnBody(getStoredWritingFont());
  maybeShowWtfHint();
  registerServiceWorker();
  suppressInstallPrompt();

  if (supportsLocalStorage) {
    text = localStorage.getItem(STORAGE_KEY) || '';
    textarea.value = text;
  }

  const basePaddingTop = getComputedPadding('padding-top');
  const basePaddingBottom = getComputedPadding('padding-bottom');
  const basePaddingLeft = getComputedPadding('padding-left');
  const basePaddingRight = getComputedPadding('padding-right');

  const textMirror = createMirror();
  const caretMirror = createCaretMirror();

  textarea.addEventListener('input', handleInput);
  textarea.addEventListener('keyup', updateCaretPosition);
  textarea.addEventListener('click', updateCaretPosition);
  textarea.addEventListener('focus', () => {
    toggleCaretVisibility(true);
    updateCaretPosition();
  });
  textarea.addEventListener('blur', () => toggleCaretVisibility(false));

  const blockedInputTypes = new Set([
    'insertReplacementText',
    'insertFromYank',
    'insertFromPasteAsQuotation',
    'insertTranspose',
    'formatBold',
    'formatItalic'
  ]);

  textarea.addEventListener('beforeinput', (event) => {
    if (blockedInputTypes.has(event.inputType)) {
      event.preventDefault();
    }
  });

  textarea.addEventListener('selectstart', stopEvent);
  textarea.addEventListener('contextmenu', stopEvent);
  textarea.addEventListener('copy', stopEvent);
  textarea.addEventListener('cut', stopEvent);
  textarea.addEventListener('paste', stopEvent);

  ['scroll', 'wheel', 'touchmove'].forEach((eventName) => {
    textarea.addEventListener(
      eventName,
      () =>
        requestAnimationFrame(() => {
          textarea.scrollTop = textarea.scrollHeight;
          updateCaretPosition();
        }),
      { passive: true }
    );
  });

  ['pointermove', 'pointerdown', 'touchstart'].forEach((eventName) => {
    document.addEventListener(eventName, revealToolbarOnPointer, { passive: true });
  });

  if (wtfLink) {
    wtfLink.addEventListener('click', () => {
      markWtfHintSeen();
    });
  }

  tossBtn.addEventListener('click', () => {
    if (!text) {
      focusInput();
      clearStatus();
      updateButtonState();
      return;
    }
    text = '';
    textarea.value = '';
    if (supportsLocalStorage) {
      localStorage.removeItem(STORAGE_KEY);
    }
    lockViewport();
    updateCaretPosition();
    focusInput();
    clearStatus();
    updateButtonState();
    playTossAnimation();
  });

  copyBtn.addEventListener('click', async () => {
    if (!text) {
      setStatus('Nothing to copy yet.');
      focusInput();
      updateButtonState();
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Copied!');
      scheduleStatusClear();
    } catch (error) {
      fallbackCopy();
    } finally {
      focusInput();
      updateButtonState();
    }
  });

  saveBtn.addEventListener('click', () => {
    if (!text) {
      setStatus('Nothing to save yet.');
      focusInput();
      updateButtonState();
      return;
    }
    const now = new Date();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const filename = `wastebasket-${formatLocalTimestamp(now)}.txt`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    focusInput();
    updateButtonState();
  });

  fullscreenBtn.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', syncFullscreenState);

  window.addEventListener('resize', () => {
    syncMirrorDimensions();
    syncCaretMirrorDimensions();
    lockViewport();
    updateCaretPosition();
  });

  window.addEventListener('storage', (event) => {
    if (event.key === FONT_STORAGE_KEY) {
      handleExternalFontChange(event.newValue);
      return;
    }
    if (event.key === THEME_STORAGE_KEY) {
      handleExternalThemeChange(event.newValue);
      return;
    }
    if (event.key === TOOLBAR_STORAGE_KEY) {
      handleExternalToolbarChange(event.newValue);
    }
  });

  window.addEventListener('pageshow', () => {
    handleExternalFontChange(getStoredWritingFont());
    handleExternalThemeChange(getStoredThemePreference());
    handleExternalToolbarChange(getStoredToolbarPreference());
  });

  focusInput();
  syncFullscreenState();
  lockViewport();
  updateCaretPosition();
  updateButtonState();

  function handleInput(event) {
    text = event.target.value.replace(/\r/g, '');
    if (supportsLocalStorage) {
      localStorage.setItem(STORAGE_KEY, text);
    }
    lockViewport();
    updateCaretPosition();
    updateButtonState();
    hideToolbar();
    clearStatus();
  }

  function lockViewport() {
    requestAnimationFrame(() => {
      textarea.style.paddingBottom = `${basePaddingBottom}px`;

      const availableHeight =
        textarea.clientHeight - basePaddingTop - basePaddingBottom;
      const contentHeight = measureContentHeight();
      const extraTop = Math.max(availableHeight - contentHeight, 0);

      const topPadding = basePaddingTop + extraTop;
      textarea.style.paddingTop = `${topPadding}px`;
      textarea.scrollTop = textarea.scrollHeight;
    });
  }

  function fallbackCopy() {
    textarea.focus();
    textarea.select();
    try {
      const success = document.execCommand('copy');
      if (success) {
        setStatus('Copied.');
      } else {
        setStatus('Copy unavailable.');
      }
    } catch (error) {
      setStatus('Copy unavailable.');
    } finally {
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      lockViewport();
      updateCaretPosition();
    }
  }

  function focusInput() {
    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPosition = textarea.value.length;
      textarea.setSelectionRange(cursorPosition, cursorPosition);
      updateCaretPosition();
    });
  }

  function setStatus(message) {
    status.textContent = message;
    if (message) {
      status.classList.add('is-visible');
    } else {
      status.classList.remove('is-visible');
    }
  }

  function clearStatus() {
    status.textContent = '';
    status.classList.remove('is-visible');
  }

  function scheduleStatusClear() {
    setTimeout(() => {
      clearStatus();
    }, 5000);
  }

  function updateButtonState() {
    const hasText = Boolean(text && text.length);
    copyBtn.disabled = !hasText;
    saveBtn.disabled = !hasText;
    tossBtn.disabled = !hasText;
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    document.documentElement.requestFullscreen().catch(() => {
      setStatus('Fullscreen unavailable.');
    });
  }

  function syncFullscreenState() {
    if (!fullscreenBtn) {
      return;
    }
    const active = Boolean(document.fullscreenElement);
    fullscreenBtn.setAttribute('aria-pressed', String(active));
    fullscreenBtn.setAttribute('aria-label', active ? 'Exit' : 'Fullscreen');
    const enterIcon = fullscreenBtn.querySelector('[data-icon="enter"]');
    const exitIcon = fullscreenBtn.querySelector('[data-icon="exit"]');
    if (enterIcon && exitIcon) {
      enterIcon.hidden = active;
      exitIcon.hidden = !active;
    }
    const label = fullscreenBtn.parentElement?.querySelector('[data-fullscreen-label]');
    if (label) {
      label.textContent = active ? 'Exit' : 'Fullscreen';
    }
    focusInput();
  }

  function getComputedPadding(property) {
    const styles = window.getComputedStyle(textarea);
    return parseFloat(styles.getPropertyValue(property)) || 0;
  }

  function formatLocalTimestamp(date) {
    const dayPart = [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join('-');
    const timePart = [
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds())
    ].join('-');
    const msPart = pad(date.getMilliseconds(), 3);
    return `${dayPart}T${timePart}-${msPart}`;
  }

  function pad(value, digits = 2) {
    return String(value).padStart(digits, '0');
  }

  function createMirror() {
    const mirror = document.createElement('div');
    mirror.setAttribute('aria-hidden', 'true');
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordBreak = 'break-word';
    mirror.style.top = '0';
    mirror.style.left = '-9999px';
    syncMirrorTypography(mirror);
    document.body.appendChild(mirror);
    syncMirrorDimensions(mirror);
    return mirror;
  }

  function createCaretMirror() {
    const mirror = document.createElement('div');
    mirror.setAttribute('aria-hidden', 'true');
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordBreak = 'break-word';
    mirror.style.top = '0';
    mirror.style.left = '-9999px';
    document.body.appendChild(mirror);
    syncCaretMirrorDimensions(mirror);
    return mirror;
  }

  function syncMirrorTypography(target) {
    const styles = window.getComputedStyle(textarea);
    target.style.font = styles.font;
    target.style.letterSpacing = styles.letterSpacing;
    target.style.lineHeight = styles.lineHeight;
    target.style.textTransform = styles.textTransform;
    target.style.textAlign = styles.textAlign;
    target.style.padding = '0';
    target.style.border = '0';
  }

  function syncMirrorDimensions(target = textMirror) {
    const contentWidth =
      textarea.clientWidth - basePaddingLeft - basePaddingRight;
    target.style.width = `${Math.max(contentWidth, 0)}px`;
  }

  function syncCaretMirrorDimensions(target = caretMirror) {
    const styles = window.getComputedStyle(textarea);
    target.style.font = styles.font;
    target.style.letterSpacing = styles.letterSpacing;
    target.style.lineHeight = styles.lineHeight;
    target.style.textTransform = styles.textTransform;
    target.style.textAlign = styles.textAlign;
    target.style.paddingTop = styles.paddingTop;
    target.style.paddingRight = styles.paddingRight;
    target.style.paddingBottom = styles.paddingBottom;
    target.style.paddingLeft = styles.paddingLeft;
    target.style.border = styles.border;
    target.style.width = `${textarea.clientWidth}px`;
  }

  function measureContentHeight() {
    syncMirrorDimensions();
    textMirror.textContent = textarea.value || '\u200b';
    return textMirror.scrollHeight;
  }

  function stopEvent(event) {
    event.preventDefault();
  }

  function hideToolbar() {
    if (!toolbar || toolbarHidden) {
      return;
    }
    toolbarHidden = true;
    toolbar.classList.add('is-hidden');
  }

  function maybeShowWtfHint() {
    if (!wtfHint) {
      return;
    }
    if (!supportsLocalStorage) {
      wtfHint.classList.add('is-visible');
      return;
    }
    const hasSeen = localStorage.getItem(WTF_HINT_STORAGE_KEY) === '1';
    wtfHint.classList.toggle('is-visible', !hasSeen);
  }

  function markWtfHintSeen() {
    if (!wtfHint) {
      return;
    }
    wtfHint.classList.remove('is-visible');
    if (supportsLocalStorage) {
      localStorage.setItem(WTF_HINT_STORAGE_KEY, '1');
    }
  }

  function playTossAnimation() {
    if (!tossAnimationContainer || !tossIcon || !tossAnimationTemplate) {
      return;
    }
    const svg = tossAnimationTemplate.content.firstElementChild;
    if (!svg) {
      return;
    }
    tossAnimationContainer.innerHTML = '';
    tossAnimationContainer.appendChild(svg.cloneNode(true));
    tossAnimationContainer.classList.add('is-visible');
    tossIcon.classList.add('is-animating');
    setTimeout(() => {
      tossAnimationContainer.classList.remove('is-visible');
      tossIcon.classList.remove('is-animating');
      tossAnimationContainer.innerHTML = '';
    }, 1000);
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      return;
    }
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .catch((error) => console.warn('SW registration failed', error));
    });
  }

  function suppressInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
    });
  }

  function revealToolbarOnPointer() {
    if (!toolbar || !toolbarHidden) {
      return;
    }
    toolbarHidden = false;
    toolbar.classList.remove('is-hidden');
  }

  function updateCaretPosition() {
    if (!customCaret || document.activeElement !== textarea) {
      return;
    }
    requestAnimationFrame(() => {
      const caretCoords = getCaretCoordinates();
      if (!caretCoords) {
        toggleCaretVisibility(false);
        return;
      }
      customCaret.style.transform = `translate(${caretCoords.left}px, ${caretCoords.top}px)`;
      customCaret.style.height = `${caretCoords.height}px`;
      toggleCaretVisibility(true);
    });
  }

  function toggleCaretVisibility(isVisible) {
    if (!customCaret) {
      return;
    }
    customCaret.classList.toggle('is-visible', isVisible);
    customCaret.classList.toggle('is-hidden', !isVisible);
  }

  function getCaretCoordinates() {
    if (typeof textarea.selectionStart !== 'number') {
      return null;
    }
    syncCaretMirrorDimensions();
    const value = textarea.value;
    const before = value.slice(0, textarea.selectionStart) || '\u200b';
    const after = value.slice(textarea.selectionStart) || '';
    caretMirror.innerHTML = `${escapeHtml(before).replace(/\n/g, '<br>')}<span data-caret="true">\u200b</span>${escapeHtml(after).replace(/\n/g, '<br>')}`;
    const marker = caretMirror.querySelector('[data-caret="true"]');
    if (!marker) {
      return null;
    }
    const caretTop = marker.offsetTop;
    const caretLeft = marker.offsetLeft;
    const styles = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) || 24;
    return {
      top: textarea.offsetTop + caretTop - textarea.scrollTop,
      left: textarea.offsetLeft + caretLeft - textarea.scrollLeft,
      height: lineHeight
    };
  }

  function handleExternalFontChange(nextFont) {
    const targetFont = isValidFontValue(nextFont) ? nextFont : DEFAULT_WRITING_FONT;
    if (document.body?.dataset.writingFont === targetFont) {
      return;
    }
    setWritingFontOnBody(targetFont);
    syncMirrorTypography(textMirror);
    syncCaretMirrorDimensions();
    lockViewport();
    updateCaretPosition();
  }

  function handleExternalThemeChange(nextTheme) {
    const previousTheme = document.documentElement?.dataset.theme;
    applyThemePreference(isValidThemeValue(nextTheme) ? nextTheme : DEFAULT_THEME);
    const currentTheme = document.documentElement?.dataset.theme;
    if (previousTheme === currentTheme) {
      return;
    }
    syncMirrorTypography(textMirror);
    syncCaretMirrorDimensions();
    lockViewport();
    updateCaretPosition();
  }

  function handleExternalToolbarChange(nextPosition) {
    const previousPosition = document.documentElement?.dataset.toolbarPosition;
    applyToolbarPreference(
      isValidToolbarValue(nextPosition) ? nextPosition : DEFAULT_TOOLBAR_POSITION
    );
    const currentPosition = document.documentElement?.dataset.toolbarPosition;
    if (previousPosition === currentPosition) {
      return;
    }
    lockViewport();
    updateCaretPosition();
  }

  function getStoredWritingFont() {
    if (!supportsLocalStorage) {
      return DEFAULT_WRITING_FONT;
    }
    const stored = localStorage.getItem(FONT_STORAGE_KEY);
    return isValidFontValue(stored) ? stored : DEFAULT_WRITING_FONT;
  }

  function getStoredThemePreference() {
    if (!supportsLocalStorage) {
      return DEFAULT_THEME;
    }
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isValidThemeValue(stored) ? stored : DEFAULT_THEME;
  }

  function getStoredToolbarPreference() {
    if (!supportsLocalStorage) {
      return DEFAULT_TOOLBAR_POSITION;
    }
    const stored = localStorage.getItem(TOOLBAR_STORAGE_KEY);
    return isValidToolbarValue(stored) ? stored : DEFAULT_TOOLBAR_POSITION;
  }

  function setWritingFontOnBody(fontValue) {
    const body = document.body;
    if (!body) {
      return;
    }
    body.dataset.writingFont = isValidFontValue(fontValue)
      ? fontValue
      : DEFAULT_WRITING_FONT;
  }

  function applyThemePreference(themeValue) {
    const nextTheme = isValidThemeValue(themeValue) ? themeValue : DEFAULT_THEME;
    if (document.documentElement) {
      document.documentElement.dataset.theme = nextTheme;
    }
    if (document.body) {
      document.body.dataset.theme = nextTheme;
    }
  }

  function applyToolbarPreference(positionValue) {
    const nextPosition = isValidToolbarValue(positionValue)
      ? positionValue
      : DEFAULT_TOOLBAR_POSITION;
    if (document.documentElement) {
      document.documentElement.dataset.toolbarPosition = nextPosition;
    }
    if (document.body) {
      document.body.dataset.toolbarPosition = nextPosition;
    }
  }

  function isValidFontValue(value) {
    return typeof value === 'string' && WRITING_FONTS.has(value);
  }

  function isValidThemeValue(value) {
    return typeof value === 'string' && THEME_OPTIONS.has(value);
  }

  function isValidToolbarValue(value) {
    return typeof value === 'string' && TOOLBAR_POSITIONS.has(value);
  }

  function escapeHtml(input) {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
