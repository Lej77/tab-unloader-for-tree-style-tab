import {
  messagePrefix,
} from '../ui/utilities.js';


/**
 * Create a checkbox with a label.
 *
 * @param {undefined | null | string} [id] The id to use for the created check box.
 * @param {undefined | null | string} [message] The i18n message that will be suffixed to the global "messagePrefix" and used as a CSS class.
 * @returns An object with references to the created checkbox and the controls around it.
 */
export function createCheckBox(id, message) {
  const ele = document.createElement('label');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  if (id) {
    checkbox.id = id;
  }
  ele.appendChild(checkbox);

  const label = document.createElement('text');
  if (message) {
    label.classList.add(messagePrefix + message);
  }
  ele.appendChild(label);

  return { area: ele, checkbox: checkbox, label: label };
}


export function createNumberInput(message, min = 0, newLine = false) {
  const timeoutArea = document.createElement('div');

  const timeoutText = document.createElement('text');
  timeoutText.classList.add(messagePrefix + message);
  timeoutArea.appendChild(timeoutText);

  if (newLine) {
    timeoutArea.appendChild(document.createElement('br'));
  }

  const timeoutInput = document.createElement('input');
  timeoutInput.type = 'number';
  if (min || min === 0) {
    timeoutInput.min = String(min);
  }
  timeoutArea.appendChild(timeoutInput);

  return { area: timeoutArea, input: timeoutInput, text: timeoutText };
}
