'use strict';


export let messagePrefix = 'message_';

export function setMessagePrefix(value) {
  messagePrefix = value;
}


export function getMessageElements(rootElement = null) {
  if (!rootElement)
    rootElement = document;
  const messageElements = Array.from(rootElement.querySelectorAll(`*[class*='${messagePrefix}']`));
  if (rootElement !== document && Array.from(rootElement.classList).some(c => c.startsWith(messagePrefix)))
    messageElements.push(rootElement);
  return messageElements;
}

export function setTextMessages(elementsToText = null, { asHTML = false } = {}) {
  if (!Array.isArray(elementsToText))
    elementsToText = getMessageElements(elementsToText);

  for (let i = 0; i < elementsToText.length; i++) {
    const ele = elementsToText[i];
    for (const c of ele.classList) {
      if (c.length > messagePrefix.length && c.startsWith(messagePrefix)) {
        const messageId = c.substring(messagePrefix.length);
        const message = browser.i18n.getMessage(messageId);
        if (asHTML) {
          ele.innerHTML = message;
        } else {
          ele.textContent = message;
        }
        break;
      }
    }
  }
}

export function toggleClass(element, className, enabled) {
  if (enabled) {
    element.classList.add(className);
  } else {
    element.classList.remove(className);
  }
}