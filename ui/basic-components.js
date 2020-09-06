'use strict';

import {
  messagePrefix,
} from '../ui/utilities.js';


export function createCheckBox(id, message) {
  let ele = document.createElement('label');

  let checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  if (id) {
    checkbox.id = id;
  }
  ele.appendChild(checkbox);

  let label = document.createElement('text');
  if (message) {
    label.classList.add(messagePrefix + message);
  }
  ele.appendChild(label);

  return { area: ele, checkbox: checkbox, label: label };
}


export function createNumberInput(message, min = 0, newLine = false) {
  let timeoutArea = document.createElement('div');

  let timeoutText = document.createElement('text');
  timeoutText.classList.add(messagePrefix + message);
  timeoutArea.appendChild(timeoutText);

  if (newLine) {
    timeoutArea.appendChild(document.createElement('br'));
  }

  let timeoutInput = document.createElement('input');
  timeoutInput.type = 'number';
  if (min || min === 0) {
    timeoutInput.min = String(min);
  }
  timeoutArea.appendChild(timeoutInput);

  return { area: timeoutArea, input: timeoutInput, text: timeoutText };
}
