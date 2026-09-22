import {
  messagePrefix,
  getMessageElements,
  setTextMessages,
  toggleClass,
} from './utilities.js';


/** @type {null | HTMLDivElement} */
let gScreenBlocker = null;
/** Enable or disable the "screen blocker" that makes most controls (except the
 * dialog box) unusable.
 *
 * @param {boolean} value `true` to block the screen.
 */
export function toggleScreenBlocker(value) {
  if (!gScreenBlocker) {
    gScreenBlocker = document.createElement('div');
    gScreenBlocker.classList.add('screenBlocker');
    document.body.appendChild(gScreenBlocker);
  }
  toggleClass(document.documentElement, 'blockScreen', value);
}

export function isScreenBlockerActive() {
  return document.documentElement.classList.contains('blockScreen');
}


/** Singleton with the created dialog box.
 * @type {null | {area: HTMLDivElement, browserActionPromptInfo: HTMLDivElement }} */
let gBrowserActionPrompt = null;

/** Show or hide the dialog box.
 *
 * @param {boolean} value `true` to show the dialog.
 * @param {Object} [options] Extra options.
 * @param {string | null} [options.message] The i18n message id for the text to show in the dialog.
 * @param {number | null} [options.yPos] The y offset in pixels for where to show the dialog box.
 */
export function toggleInfoPrompt(value, { message = null, yPos = null } = {}) {
  if (!gBrowserActionPrompt) {
    const area = document.createElement('div');
    area.classList.add('browserActionPrompt');
    area.classList.add('prompt');
    document.documentElement.appendChild(area);

    const browserActionPromptInfo = document.createElement('div');
    area.appendChild(browserActionPromptInfo);

    gBrowserActionPrompt = {
      area,
      browserActionPromptInfo,
    };
  }

  if (value) {
    getMessageElements(gBrowserActionPrompt.area).forEach((ele) => {
      // Remove previous i18n message classes since we now might want to see a different message:
      Array.from(ele.classList)
        .filter(c => c.startsWith(messagePrefix))
        .forEach(c => toggleClass(ele, c, false));
      ele.textContent = '';
    });

    if (message) {
      gBrowserActionPrompt.browserActionPromptInfo.classList.add(messagePrefix + message);
      setTextMessages(gBrowserActionPrompt.area);
    }
  }

  toggleScreenBlocker(value);
  toggleClass(document.documentElement, 'prompting', value);
  toggleClass(gBrowserActionPrompt.area, 'active', value);

  if (!value || yPos || yPos === 0)
    gBrowserActionPrompt.area.style.top = (value ? yPos : 0) + 'px';
}
