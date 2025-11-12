(() => {
  const STORAGE_KEY = 'wastebasket:entry';

  const textarea = document.getElementById('typeInput');
  const tossBtn = document.getElementById('tossBtn');
  const copyBtn = document.getElementById('copyBtn');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const toolbar = document.querySelector('.toolbar');
  const customCaret = document.querySelector('.custom-caret');

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

  function escapeHtml(input) {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
