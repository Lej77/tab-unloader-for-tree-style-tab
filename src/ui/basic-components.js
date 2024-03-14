'use strict';

import {
  messagePrefix,
} from '../ui/utilities.js';


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
