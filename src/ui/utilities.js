'use strict';


export let messagePrefix = 'message_';

export function setMessagePrefix(value) {
  messagePrefix = value;
}


/** Get all elements that we can load i18n messages for.
 *
 * @export
 * @param {null | Element} [rootElement=null] The parent element whose
 * descendants to search. This element can be included among the returned
 * elements.
 * @returns {Element[]} The elements that we can load i18n message for. */
export function getMessageElements(rootElement = null) {
  const searchFrom = rootElement ? rootElement : document;
  const messageElements = Array.from(searchFrom.querySelectorAll(`*[class*='${messagePrefix}']`));
  if (rootElement && Array.from(rootElement.classList).some(c => c.startsWith(messagePrefix)))
    messageElements.push(rootElement);
  return messageElements;
}

/**
 * Load i18n text messages for all descendants of the specified element.
 *
 * @export
 * @param {null | Element | Element[]} [elementsToText=null] If specified then only load messages for this element and its descendants.
 * @param {Object} [Options] Extra options
 * @param {boolean} [Options.asHTML=false] The loaded text messages should be interpreted as HTML.
 * @param {null | string} [Options.specialHtmlClass=null] Any element that has this class will interpret its i18n message as HTML.
 */
export function setTextMessages(elementsToText = null, { asHTML = false, specialHtmlClass = null } = {}) {
  if (!Array.isArray(elementsToText)) {
    elementsToText = getMessageElements(elementsToText);
  }

  for (let i = 0; i < elementsToText.length; i++) {
    const ele = elementsToText[i];
    const hasSpecialHtmlClass = specialHtmlClass && ele.classList.contains(specialHtmlClass);
    for (const c of ele.classList) {
      if (c.length > messagePrefix.length && c.startsWith(messagePrefix)) {
        const messageId = c.substring(messagePrefix.length);
        const message = browser.i18n.getMessage(messageId);
        if (asHTML || hasSpecialHtmlClass) {
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