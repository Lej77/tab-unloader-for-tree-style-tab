'use strict';

import {
  messagePrefix,
  getMessageElements,
  setTextMessages,
  toggleClass,
} from './utilities.js';


let gScreenBlocker = null;
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


let gBrowserActionPrompt = null;
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
      Array.from(ele.classList)
        .map(c => c.startsWith(messagePrefix))
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
