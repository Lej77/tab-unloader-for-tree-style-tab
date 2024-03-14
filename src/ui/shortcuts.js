'use strict';

import {
  messagePrefix,
  setTextMessages,
  toggleClass,
} from '../ui/utilities.js';

import {
  createCollapsableArea,
  AnimationInfo
} from '../ui/collapsable.js';


export function createShortcutsArea({
  sectionAnimation = {},

  commandInfos,
  headerMessage,
  infoMessage,

  resetButtonMessage,
  promptButtonMessage,
}) {
  sectionAnimation = AnimationInfo.asInfo(sectionAnimation);
  const callbacks = [];

  const section = createCollapsableArea(sectionAnimation);
  section.area.classList.add('standardFormat');
  section.title.classList.add('center');
  section.title.classList.add('enablable');
  document.body.appendChild(section.area);

  const header = document.createElement('div');
  header.classList.add(messagePrefix + headerMessage);
  section.title.appendChild(header);

  section.content.classList.add('commandsContentArea');


  const information = document.createElement('div');
  information.classList.add(messagePrefix + infoMessage);
  information.classList.add('textSelectable');
  section.content.appendChild(information);


  section.content.appendChild(document.createElement('br'));


  const commandsArea = document.createElement('div');
  commandsArea.classList.add('commandsArea');
  section.content.appendChild(commandsArea);


  var allCommands = [];
  const checkCommands = () => {
    const enabled = allCommands.some(command => command.shortcut);
    toggleClass(section.title, 'enabled', enabled);
  };


  const platformInfo = browser.runtime.getPlatformInfo().then(({ os, arch }) => {
    return {
      isMac: os.toLowerCase() === 'mac',
    };
  });

  // See: https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands#Shortcut_values
  const keyLookup = {
    ',': 'Comma',
    '.': 'Period',
    ' ': 'Space',
    // Home, End, PageUp, PageDown, Space, Insert, Delete, Up, Down, Left, Right
  };

  // See: https://developer.mozilla.org/docs/Web/API/KeyboardEvent/getModifierState
  const modifierKeys = {
    alt: 'Alt',
    ctrl: 'Control',
    capsLock: 'CapsLock',
    fn: 'Fn',
    fnLock: 'FnLock',
    hyper: 'Hyper',
    meta: 'Meta',
    numLock: 'NumLock',
    os: 'OS',
    scrollLock: 'ScrollLock',
    shift: 'Shift',
    super: 'Super',
    symbol: 'Symbol',
    symbolLock: 'SymbolLock',
  };

  const fixKey = (key) => {
    key = key.charAt(0).toUpperCase() + key.toString().slice(1);
    if (key.startsWith('Arrow')) {
      key = key.slice(5);
    }
    const fixedKey = keyLookup[key];
    if (fixedKey)
      key = fixedKey;

    return key;
  };

  const createShortcutArea = async (command) => {
    const { isMac = false } = await platformInfo;
    let commandInfo = commandInfos[command.name] || {};


    const commandSection = createCollapsableArea(sectionAnimation);
    commandSection.area.classList.add('standardFormat');
    commandSection.title.classList.add('stretch');
    commandSection.title.classList.add('enablable');
    commandsArea.appendChild(commandSection.area);

    {
      let contentArea = null;
      if (commandInfo.createContent && typeof commandInfo.createContent === 'function')
        contentArea = commandInfo.createContent();

      if (contentArea)
        commandSection.content.appendChild(contentArea);
      else {
        commandSection.title.classList.add('preventOpen');
        commandSection.isButton = false;
      }
    }


    const area = document.createElement('div');
    area.classList.add('commandArea');
    commandSection.title.appendChild(area);

    const inputsArea = document.createElement('div');
    inputsArea.classList.add('inputArea');
    inputsArea.classList.add('preventOpen');
    area.appendChild(inputsArea);

    const resetButton = document.createElement('button');
    resetButton.classList.add(messagePrefix + resetButtonMessage);
    inputsArea.appendChild(resetButton);

    const promptButton = document.createElement('button');
    promptButton.classList.add(messagePrefix + promptButtonMessage);
    inputsArea.appendChild(promptButton);

    const inputField = document.createElement('input');
    inputField.type = "text";
    inputField.readOnly = true;
    inputsArea.appendChild(inputField);

    const description = document.createElement('label');
    if (commandInfo.description)
      description.classList.add(messagePrefix + commandInfo.description);
    else
      description.textContent = command.name;
    area.appendChild(description);


    inputField.value = command.shortcut;


    const checkCommand = () => {
      toggleClass(commandSection.title, 'enabled', command.shortcut);
    };
    checkCommand();


    const updateShortcut = async () => {
      const [afterUpdate,] = (await browser.commands.getAll()).filter(com => com.name === command.name);
      if (afterUpdate) {
        Object.assign(command, afterUpdate);
      }
      inputField.value = command.shortcut;

      checkCommand();
      checkCommands();
    };
    callbacks.push(updateShortcut);

    resetButton.addEventListener('click', async (e) => {
      await browser.commands.reset(command.name);
      updateShortcut();
    });

    promptButton.addEventListener('click', async (e) => {
      const value = prompt(browser.i18n.getMessage('options_Commands_PromptButton_Description'), command.shortcut || '');
      if (value == null) {
        // Canceled
        return;
      }

      await browser.commands.update({
        name: command.name,
        shortcut: value || '',
      });

      updateShortcut();
    });

    inputField.addEventListener('keydown', async (e) => {
      if (Object.values(modifierKeys).includes(e.key))
        return;

      let keys = [];
      if (e.ctrlKey) {
        keys.push(isMac ? 'MacCtrl' : 'Ctrl');
      }
      if (e.altKey) {
        keys.push('Alt');
      }
      if (e.metaKey) {
        keys.push('Command');
      }
      if (e.shiftKey) {
        keys.push('Shift');
      }
      keys.push(fixKey(e.key));

      await browser.commands.update({
        name: command.name,
        shortcut: keys.join('+'),
      });

      updateShortcut();
    });
  };


  // Create areas for all commands:
  browser.commands.getAll().then(async (commands) => {
    for (const command of commands) {
      await createShortcutArea(command);
    }

    setTextMessages(section.content);
    allCommands = commands;

    callbacks.push(checkCommands);
    checkCommands();
  });

  setTextMessages(section.area);

  return {
    area: section.area,
    section,
    update: () => {
      for (const callback of callbacks) {
        callback();
      }
    },
    sectionAnimation,
  };
}
