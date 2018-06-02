
async function initiatePage() {
  let settingsTracker = new SettingsTracker();
  let settings = settingsTracker.settings;

  let starters = new DisposableCreators();
  let pagePort = new PortConnection();
  let permissionsArea;
  let onPermissionControllerChange = new EventManager();


  starters.createDisposable(() => {
    return bindElementIdsToSettings(settings, true);
  });


  // #region Animation

  let sectionAnimationInfo = {};
  {
    starters.createDisposable(() => {
      let animationUpdate = () => {
        try {
          if (settings.disableOptionsPageAnimations) {
            sectionAnimationInfo.update({ reset: true });
          } else {
            sectionAnimationInfo.update({ standard: true });
          }
        } catch (error) { }
      };
      let listener = new EventListener(settingsTracker.onChange, (changes) => {
        if (changes.disableOptionsPageAnimations) {
          animationUpdate();
        }
      });
      animationUpdate();
      return listener;
    });
  }

  // #endregion Animation


  // #region Enable/Disable Extension

  {
    let enableArea = document.createElement('div');
    enableArea.classList.add('extensionToggleArea');
    document.body.appendChild(enableArea);

    let disableButton = document.createElement('button');
    disableButton.classList.add(messagePrefix + 'options_extensionToggle_DisableButton');
    enableArea.appendChild(disableButton);

    let indicator = createStatusIndicator({
      headerMessage: 'options_extensionToggle_Status_Header',
      enabledMessage: 'options_extensionToggle_Status_Enabled',
      disabledMessage: 'options_extensionToggle_Status_Disabled',
    });
    enableArea.appendChild(indicator.area);

    let enableButton = document.createElement('button');
    enableButton.classList.add(messagePrefix + 'options_extensionToggle_EnableButton');
    enableArea.appendChild(enableButton);


    starters.createDisposable(() => {
      let check = () => {
        indicator.isEnabled = settings.isEnabled;
      };
      let listeners = [
        new EventListener(settingsTracker.onChange, (changes, areaName) => {
          if (changes.isEnabled) {
            check();
          }
        }),
        new EventListener(disableButton, 'click', () => Settings.set('isEnabled', false)),
        new EventListener(enableButton, 'click', () => Settings.set('isEnabled', true)),
      ];
      check();
      return listeners;
    });
  }

  // #endregion Enable/Disable Extension


  // #region Mouse Events

  let mouseAreas = MouseClickComboCollection.createStandard().combos.map(combo => createMouseClickArea(combo, sectionAnimationInfo));
  for (let mouseArea of mouseAreas) {
    document.body.appendChild(mouseArea.area);
  }
  starters.createDisposable(() => {
    let listeners = [];
    for (let area of mouseAreas) {
      let obj = area.combo;
      let key = area.settingKey;

      // Apply settings data to document:
      obj.update(settings[key]);
      area.settingsLoaded.fire();

      // Track document changes and save to settings:
      listeners.push(new EventListener(obj.onChange, () => {
        Settings.set(key, obj.data);
      }));
    }
    return listeners;
  });

  // #endregion Mouse Events


  // #region Context Menu Item

  try {
    let section = createCollapsableArea(sectionAnimationInfo);
    section.area.classList.add('standardFormat');
    section.title.classList.add('center');
    section.title.classList.add('enablable');
    document.body.appendChild(section.area);

    let header = document.createElement('div');
    header.classList.add(messagePrefix + 'options_contextMenuItems_Title');
    section.title.appendChild(header);


    let rootItemLabel_Description = document.createElement('label');
    rootItemLabel_Description.classList.add(messagePrefix + 'options_tstContextMenu_CustomRootLabel');
    section.content.appendChild(rootItemLabel_Description);

    let rootItemLabel = document.createElement('input');
    rootItemLabel.type = 'text';
    rootItemLabel.id = 'tstContextMenu_CustomRootLabel';
    section.content.appendChild(rootItemLabel);


    section.content.appendChild(document.createElement('br'));
    section.content.appendChild(document.createElement('br'));


    let delayedRegistration = createNumberInput('options_unloadInTSTContextMenu_DelayedRegistration', 0, false);
    delayedRegistration.input.id = 'delayedTSTRegistrationTimeInMilliseconds';
    section.content.appendChild(delayedRegistration.area);


    let list = createListArea();
    section.content.appendChild(list.area);

    let listItemEnabled = new Map();
    let listItemToId = new Map();
    let idToListItem = new Map();
    let checkListEnabled = () => {
      toggleClass(section.title, 'enabled', delayedRegistration.input.value > 0 || Array.from(listItemEnabled.values()).some(value => value));
    };
    starters.createDisposable(() => {
      checkListEnabled();
      return [
        new EventListener(rootItemLabel, 'input', checkListEnabled),
        new EventListener(delayedRegistration.input, 'input', checkListEnabled),
      ];
    });
    let setItemEnabled = (item, isEnabled) => {
      listItemEnabled.set(item, isEnabled);
      checkListEnabled();
    };
    list.onCheckDrop.addListener((itemObj) => {
      if (Array.from(listItemEnabled.keys()).includes(itemObj)) {
        return true;
      }
      return false;
    });

    let saveOrder = () => {
      Settings.set('tstContextMenuOrder', list.items.map(item => listItemToId.get(item)));
    };
    let loadOrder = () => {
      let orderIds = settings.tstContextMenuOrder;
      for (let id of orderIds) {
        let item = idToListItem.get(id);
        if (item) {
          list.addItem(item);
        }
      }
    };
    starters.createDisposable(() => {
      loadOrder();
      return new EventListener(list.onArrayChanged, ((list, itemObj, newIndex) => {
        if (!newIndex && newIndex !== 0) {
          console.log('Error: context menu order item removed!');
          return;
        }
        saveOrder();
      }));
    });

    let createContextMenuItemSection = ({
      id,
      title,
      enabledKey,
      enabledMessage,
      fallback_lastSelected_key,
      fallback_ignoreHidden_key,
      customLabelKey,
    }) => {
      let listItem = list.createItem(sectionAnimationInfo);
      listItemToId.set(listItem, id);
      idToListItem.set(id, listItem);

      let section = listItem.section;
      section.content.classList.add('standardFormat');
      section.title.classList.add('enablable');
      section.content.classList.add('contextMenuItemArea');

      let header = document.createElement('div');
      header.classList.add('center');
      header.classList.add(messagePrefix + title);
      section.title.appendChild(header);

      let enabledCheckbox = createCheckBox(enabledKey, enabledMessage);
      let check = () => {
        let enabled = enabledCheckbox.checkbox.checked;
        toggleClass(section.title, 'enabled', enabled);
        toggleClass(section.content, 'enabled', enabled);
        setItemEnabled(listItem, enabled);
      };
      starters.createDisposable(() => {
        check();
        return new EventListener(enabledCheckbox.checkbox, 'input', (e) => check());
      });
      section.content.appendChild(enabledCheckbox.area);

      section.content.appendChild(document.createElement('br'));


      let fallbackOptions = document.createElement('div');
      fallbackOptions.classList.add('area');
      fallbackOptions.classList.add('enabled');
      section.content.appendChild(fallbackOptions);

      let fallbackToLastSelected = createCheckBox(fallback_lastSelected_key, 'options_fallbackToLastSelected');
      fallbackOptions.appendChild(fallbackToLastSelected.area);

      fallbackOptions.appendChild(document.createElement('br'));

      let ignoreHiddenTabs = createCheckBox(fallback_ignoreHidden_key, 'options_ignoreHiddenTabs');
      fallbackOptions.appendChild(ignoreHiddenTabs.area);


      section.content.appendChild(document.createElement('br'));


      let customLabelDescription = document.createElement('label');
      customLabelDescription.classList.add(messagePrefix + 'options_contextMenu_customLabel');
      section.content.appendChild(customLabelDescription);

      let customLabel = document.createElement('input');
      customLabel.type = 'text';
      customLabel.id = customLabelKey;
      section.content.appendChild(customLabel);
    };

    let unloadTab = createContextMenuItemSection({
      id: tstContextMenuItemIds.unloadTab,
      title: 'options_unloadInTSTContextMenu_Title',
      enabledKey: 'unloadInTSTContextMenu',
      enabledMessage: 'options_unloadInTSTContextMenu',
      fallback_lastSelected_key: 'unloadInTSTContextMenu_fallbackToLastSelected',
      fallback_ignoreHidden_key: 'unloadInTSTContextMenu_ignoreHiddenTabs',
      customLabelKey: 'unloadInTSTContextMenu_CustomLabel',
    });

    let unloadTree = createContextMenuItemSection({
      id: tstContextMenuItemIds.unloadTree,
      title: 'options_unloadTreeInTSTContextMenu_Title',
      enabledKey: 'unloadTreeInTSTContextMenu',
      enabledMessage: 'options_unloadTreeInTSTContextMenu',
      fallback_lastSelected_key: 'unloadTreeInTSTContextMenu_fallbackToLastSelected',
      fallback_ignoreHidden_key: 'unloadTreeInTSTContextMenu_ignoreHiddenTabs',
      customLabelKey: 'unloadTreeInTSTContextMenu_CustomLabel',
    });

  } catch (error) {
    console.log('Error: failed to create context menu area!\nError:\n', error, '\nStack Trace:\n', error.stack);
  }

  // #endregion Context Menu Item


  // #region Commands

  {
    let section = createCollapsableArea(sectionAnimationInfo);
    section.area.classList.add('standardFormat');
    section.title.classList.add('center');
    section.title.classList.add('enablable');
    document.body.appendChild(section.area);

    let header = document.createElement('div');
    header.classList.add(messagePrefix + 'options_Commands_Title');
    section.title.appendChild(header);

    section.content.classList.add('commandsContentArea');


    let information = document.createElement('div');
    information.classList.add(messagePrefix + 'options_Commands_Info');
    section.content.appendChild(information);


    section.content.appendChild(document.createElement('br'));


    let commandsArea = document.createElement('div');
    commandsArea.classList.add('commandsArea');
    section.content.appendChild(commandsArea);


    var allCommands = [];
    let checkCommands = () => {
      let enabled = allCommands.some(command => command.shortcut);
      toggleClass(section.title, 'enabled', enabled);
    };


    let commandInfos = {
      'unload-tab': {
        description: 'options_Commands_UnloadTab',
        createContent: () => {
          let area = document.createElement('div');

          let fallbackToLastSelected = createCheckBox('command_unloadTab_fallbackToLastSelected', 'options_fallbackToLastSelected');
          area.appendChild(fallbackToLastSelected.area);

          area.appendChild(document.createElement('br'));

          let ignoreHiddenTabs = createCheckBox('command_unloadTab_ignoreHiddenTabs', 'options_ignoreHiddenTabs');
          area.appendChild(ignoreHiddenTabs.area);

          return area;
        },
      },
      'unload-tree': {
        description: 'options_Commands_UnloadTree',
        createContent: () => {
          let area = document.createElement('div');

          let fallbackToLastSelected = createCheckBox('command_unloadTree_fallbackToLastSelected', 'options_fallbackToLastSelected');
          area.appendChild(fallbackToLastSelected.area);

          area.appendChild(document.createElement('br'));

          let ignoreHiddenTabs = createCheckBox('command_unloadTree_ignoreHiddenTabs', 'options_ignoreHiddenTabs');
          area.appendChild(ignoreHiddenTabs.area);

          return area;
        },
      },
    };


    let platformInfo = browser.runtime.getPlatformInfo().then(({ os, arch }) => {
      return {
        isMac: os.toLowerCase() === 'mac',
      };
    });

    let keyLookup = {
      ',': 'Comma',
      '.': 'Period',
      ' ': 'Space',
      // Home, End, PageUp, PageDown, Space, Insert, Delete, Up, Down, Left, Right
    };

    let fixKey = (key) => {
      key = key.charAt(0).toUpperCase() + key.toString().slice(1);
      if (key.startsWith('Arrow')) {
        key = key.slice(5);
      }
      let fixedKey = keyLookup[key];
      if (fixedKey) {
        key = fixedKey;
      }
      return key;
    };

    let createShortcutArea = async (command) => {
      let { isMac = false } = await platformInfo;
      let commandInfo = commandInfos[command.name] || {};


      let commandSection = createCollapsableArea(sectionAnimationInfo);
      commandSection.area.classList.add('standardFormat');
      commandSection.title.classList.add('center');
      commandSection.title.classList.add('enablable');
      commandsArea.appendChild(commandSection.area);


      if (commandInfo.createContent) {
        commandSection.content.appendChild(commandInfo.createContent());
      }


      let area = document.createElement('div');
      area.classList.add('commandArea');
      commandSection.title.appendChild(area);

      let inputsArea = document.createElement('div');
      inputsArea.classList.add('inputArea');
      inputsArea.classList.add('preventOpen');
      area.appendChild(inputsArea);

      let resetButton = document.createElement('button');
      resetButton.classList.add(messagePrefix + 'options_Commands_ResetButton');
      inputsArea.appendChild(resetButton);

      let promptButton = document.createElement('button');
      promptButton.classList.add(messagePrefix + 'options_Commands_PromptButton');
      inputsArea.appendChild(promptButton);

      let inputField = document.createElement('input');
      inputField.type = "text";
      inputField.readOnly = true;
      inputsArea.appendChild(inputField);

      let description = document.createElement('label');
      if (commandInfo.description) {
        description.classList.add(messagePrefix + commandInfo.description);
      } else {
        description.textContent = command.name;
      }
      area.appendChild(description);


      inputField.value = command.shortcut;


      let checkCommand = () => {
        toggleClass(commandSection.title, 'enabled', command.shortcut);
      };
      checkCommand();


      let updateShortcut = async () => {
        let [afterUpdate,] = (await browser.commands.getAll()).filter(com => com.name === command.name);
        if (afterUpdate) {
          Object.assign(command, afterUpdate);
        }
        inputField.value = command.shortcut;

        checkCommand();
        checkCommands();
      };
      starters.createDisposable(() => {
        updateShortcut();
      });

      resetButton.addEventListener('click', async (e) => {
        await browser.commands.reset(command.name);
        updateShortcut();
      });

      promptButton.addEventListener('click', async (e) => {
        let value = prompt(browser.i18n.getMessage('options_Commands_PromptButton_Description'), command.shortcut || '');

        await browser.commands.update({
          name: command.name,
          shortcut: value,
        });

        updateShortcut();
      });

      inputField.addEventListener('keypress', async (e) => {
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
      for (let command of commands) {
        await createShortcutArea(command);
      }

      setTextMessages(section.content);
      allCommands = commands;
      starters.createDisposable(() => {
        checkCommands();
      });

      if (starters.isStarted) {
        starters.stop();
        starters.start();
      }
    });
  }

  // #endregion Commands


  // #region Tab Hiding

  {
    let section = createCollapsableArea(sectionAnimationInfo);
    section.area.classList.add('standardFormat');
    section.title.classList.add('center');
    section.title.classList.add('enablable');
    section.content.classList.add('tabHideArea');
    document.body.appendChild(section.area);

    let header = document.createElement('div');
    header.classList.add(messagePrefix + 'options_TabHide_Header');
    section.title.appendChild(header);


    let hideTabsArea = document.createElement('div');
    hideTabsArea.classList.add('area');
    section.content.appendChild(hideTabsArea);

    let enableCheckbox = createCheckBox('tabHide_HideUnloadedTabs', 'options_TabHide_HideUnloadedTabs');
    hideTabsArea.appendChild(enableCheckbox.area);

    hideTabsArea.appendChild(document.createElement('br'));
    hideTabsArea.appendChild(document.createElement('br'));

    let info = document.createElement('div');
    info.classList.add('message');
    info.textContent = browser.i18n.getMessage('options_TabHide_Info', ['options_ignoreHiddenTabs', 'options_TabHide_ShowHiddenTabsInTST'].map(messageName => browser.i18n.getMessage(messageName)));
    hideTabsArea.appendChild(info);


    section.content.appendChild(document.createElement('br'));


    let showHiddenInTSTCheckbox = createCheckBox('tabHide_ShowHiddenTabsInTST', 'options_TabHide_ShowHiddenTabsInTST');
    section.content.appendChild(showHiddenInTSTCheckbox.area);


    starters.createDisposable(() => {
      let check = () => {
        let enabled = enableCheckbox.checkbox.checked || showHiddenInTSTCheckbox.checkbox.checked;
        let needAPI = enableCheckbox.checkbox.checked && !permissionsArea.checkControllerAvailable(permissionsArea.tabHidePermissionController);
        toggleClass(section.title, 'enabled', enabled);
        toggleClass(section.title, 'error', needAPI);
        toggleClass(section.content, 'enabled', enabled);
      };
      let disposables = [
        new EventListener(enableCheckbox.checkbox, 'input', (e) => check()),
        new EventListener(showHiddenInTSTCheckbox.checkbox, 'input', (e) => check()),
        new EventListener(permissionsArea.onControllerValueChanged, (controller) => {
          if (permissionsArea.tabHidePermissionController === controller) {
            check();
          }
        }),
      ];
      check();
      return disposables;
    });
  }

  // #endregion Tab Hiding


  // #region Tab Restore Fix

  {
    let section = createCollapsableArea(sectionAnimationInfo);
    section.area.classList.add('standardFormat');
    section.title.classList.add('center');
    section.title.classList.add('enablable');
    document.body.appendChild(section.area);


    let header = document.createElement('div');
    header.classList.add(messagePrefix + 'options_TabRestoreFix_Header');
    section.title.appendChild(header);



    let reloadBrokenTabsArea = document.createElement('div');
    reloadBrokenTabsArea.classList.add('area');
    section.content.appendChild(reloadBrokenTabsArea);


    let reloadBrokenTabs = createCheckBox('fixTabRestore_reloadBrokenTabs', 'options_TabRestoreFix_reloadBrokenTabs');
    reloadBrokenTabsArea.appendChild(reloadBrokenTabs.area);


    section.content.appendChild(document.createElement('br'));
    section.content.appendChild(document.createElement('br'));


    let ensureLoadArea = document.createElement('div');
    ensureLoadArea.classList.add('ensureCorrectLoad');
    ensureLoadArea.classList.add('area');
    section.content.appendChild(ensureLoadArea);


    let waitForUrl = createNumberInput('options_TabRestoreFix_waitForUrlInMilliseconds', -1, true);
    waitForUrl.input.id = 'fixTabRestore_waitForUrlInMilliseconds';
    ensureLoadArea.appendChild(waitForUrl.area);


    ensureLoadArea.appendChild(document.createElement('br'));
    ensureLoadArea.appendChild(document.createElement('br'));


    let fixIncorrectLoadArea = document.createElement('div');
    fixIncorrectLoadArea.classList.add('area');
    ensureLoadArea.appendChild(fixIncorrectLoadArea);


    let waitForIncorrectLoad = createNumberInput('options_TabRestoreFix_waitForIncorrectLoad', -1, true);
    waitForIncorrectLoad.input.id = 'fixTabRestore_waitForIncorrectLoad';
    fixIncorrectLoadArea.appendChild(waitForIncorrectLoad.area);


    fixIncorrectLoadArea.appendChild(document.createElement('br'));
    fixIncorrectLoadArea.appendChild(document.createElement('br'));


    let fixIncorrectLoadAfter = createNumberInput('options_TabRestoreFix_fixIncorrectLoadAfter', -1, true);
    fixIncorrectLoadAfter.input.id = 'fixTabRestore_fixIncorrectLoadAfter';
    fixIncorrectLoadArea.appendChild(fixIncorrectLoadAfter.area);




    section.content.appendChild(document.createElement('br'));
    section.content.appendChild(document.createElement('br'));


    let permissionWarning = document.createElement('div');
    permissionWarning.classList.add(messagePrefix + 'options_TabRestoreFix_permissionWarning');
    section.content.appendChild(permissionWarning);




    let check = () => {
      let ensureLoadEnabled = waitForUrl.input.value >= 0;
      let enabled = ensureLoadEnabled || reloadBrokenTabs.checkbox.checked;
      toggleClass(section.title, 'enabled', enabled);
      toggleClass(ensureLoadArea, 'enabled', ensureLoadEnabled);
      toggleClass(fixIncorrectLoadAfter.area, 'disabled', ensureLoadEnabled && waitForIncorrectLoad.input.value < 0);
      toggleClass(section.title, 'error', enabled && !permissionsArea.checkControllerAvailable(permissionsArea.tabsPermissionController));
    };
    starters.createDisposable(() => {
      check();
      return [
        new EventListener(waitForUrl.input, 'input', check),
        new EventListener(waitForIncorrectLoad.input, 'input', check),
        new EventListener(reloadBrokenTabs.checkbox, 'input', check),
        new EventListener(permissionsArea.onControllerValueChanged, (controller) => {
          if (permissionsArea.tabsPermissionController === controller) {
            check();
          }
        }),
      ];
    });
  }

  // #endregion Tab Restore Fix


  // #region Tree Style Tab Style

  {
    let section = createCollapsableArea(sectionAnimationInfo);
    section.area.classList.add('standardFormat');
    section.title.classList.add('center');
    section.title.classList.add('enablable');
    section.content.classList.add('treeStyleTabStyleArea');
    document.body.appendChild(section.area);

    let header = document.createElement('div');
    header.classList.add(messagePrefix + 'options_TreeStyleTabStyle_Header');
    section.title.appendChild(header);

    let label = document.createElement('label');
    label.classList.add('styleLabel');
    label.classList.add(messagePrefix + 'options_TreeStyleTabStyle_Info');
    section.content.appendChild(label);

    section.content.appendChild(document.createElement('br'));

    let currentStyle = document.createElement('textarea');
    currentStyle.classList.add('styleTextarea');
    currentStyle.rows = 15;
    currentStyle.readOnly = true;
    section.content.appendChild(currentStyle);


    let updateStyle = (newStyle = null) => {
      if (!newStyle) {
        newStyle = '';
      }
      if (currentStyle.value === newStyle) {
        return;
      }
      currentStyle.value = newStyle;

      toggleClass(section.title, 'enabled', newStyle && newStyle.trim() !== '');
    };
    starters.createDisposable(() => {
      let changed = false;
      let listener = new EventListener(pagePort.getEvent(messageTypes.styleChanged), (oldStyle, newStyle) => {
        updateStyle(newStyle);
        changed = true;
      });
      listener.onClose.addListener(() => {
        let changed = true;
      });

      browser.runtime.sendMessage({ type: messageTypes.getActiveStyle }).then((currentStyle) => {
        if (!changed) {
          updateStyle(currentStyle);
        }
      });

      return listener;
    });
  }

  // #endregion Tree Style Tab Style


  // #region Permissions

  {
    let optionalPermissionsArea = createCollapsableArea(sectionAnimationInfo);
    optionalPermissionsArea.area.classList.add('standardFormat');
    optionalPermissionsArea.title.classList.add('center');
    optionalPermissionsArea.title.classList.add('enablable');
    optionalPermissionsArea.content.classList.add('optionalPermissionArea');
    document.body.appendChild(optionalPermissionsArea.area);

    let header = document.createElement('div');
    header.classList.add(messagePrefix + 'options_OptionalPermissions_Header');
    optionalPermissionsArea.title.appendChild(header);

    permissionsArea = createPermissionsArea({
      requestFailedCallback: async (permission) => {
        let currentTab = await browser.tabs.getCurrent();
        browser.tabs.create({
          windowId: currentTab.windowId,
          url: browser.runtime.getURL('resources/permissions.html'),
          active: true,
          index: currentTab.index + 1,
          openerTabId: currentTab.id
        });
      },
      portConnection: pagePort,
    });
    optionalPermissionsArea.content.appendChild(permissionsArea.area);
    permissionsArea.onHasAnyValueChanged.addListener(() => {
      toggleClass(optionalPermissionsArea.title, 'enabled', permissionsArea.hasAnyPermissions);
      toggleClass(optionalPermissionsArea.title, 'error', permissionsArea.hasAnyError);
    });
  }

  // #endregion Permissions


  // #region Other Options

  {
    let section = createCollapsableArea(sectionAnimationInfo);
    section.area.classList.add('standardFormat');
    section.title.classList.add('center');
    section.title.classList.add('enablable');
    document.body.appendChild(section.area);

    let header = document.createElement('div');
    header.classList.add(messagePrefix + 'options_OtherSettings_Header');
    section.title.appendChild(header);

    let area = document.createElement('div');
    area.classList.add('otherSettingsArea');
    section.content.appendChild(area);

    let dimUnloadedCheckbox = createCheckBox('dimUnloadedTabs', 'options_dimUnloadedTabs');
    area.appendChild(dimUnloadedCheckbox.area);


    area.appendChild(document.createElement('br'));
    area.appendChild(document.createElement('br'));


    let unloadAgain = createNumberInput('options_unloadAgainAfterDelay', -1, true);
    unloadAgain.input.id = 'unloadAgainAfterDelay';
    area.appendChild(unloadAgain.area);


    area.appendChild(document.createElement('br'));


    let unloadViaAutoTabDiscard = createCheckBox('unloadViaAutoTabDiscard', '');
    {
      let { label } = unloadViaAutoTabDiscard;

      let prefix = document.createElement('text');
      prefix.classList.add(messagePrefix + 'options_unloadViaAutoTabDiscard_Prefix');
      label.appendChild(prefix);

      let url = document.createElement('a');
      url.classList.add(messagePrefix + 'options_unloadViaAutoTabDiscard_Name');
      url.href = browser.i18n.getMessage('options_unloadViaAutoTabDiscard_URL');
      label.appendChild(url);

      let suffix = document.createElement('text');
      suffix.classList.add(messagePrefix + 'options_unloadViaAutoTabDiscard_Suffix');
      label.appendChild(suffix);
    }
    area.appendChild(unloadViaAutoTabDiscard.area);


    area.appendChild(document.createElement('br'));
    area.appendChild(document.createElement('br'));


    let disableOptionAnimations = createCheckBox('disableOptionsPageAnimations', 'options_disableOptionsPageAnimations');
    area.appendChild(disableOptionAnimations.area);


    let checkSection = () => {
      toggleClass(section.title, 'enabled', dimUnloadedCheckbox.checkbox.checked || unloadAgain.input.value >= 0 || disableOptionAnimations.checkbox.checked || unloadViaAutoTabDiscard.checkbox.checked);
    };
    starters.createDisposable((delayed) => {
      checkSection();
      return [
        new EventListener(dimUnloadedCheckbox.checkbox, 'input', checkSection),
        new EventListener(unloadAgain.input, 'input', checkSection),
        new EventListener(disableOptionAnimations.checkbox, 'input', checkSection),
        new EventListener(unloadViaAutoTabDiscard.checkbox, 'input', checkSection),
      ];
    });
  }

  // #endregion Other Options


  // #region Reset Button

  {
    let area = document.createElement('div');
    document.body.appendChild(area);

    let resetButton = document.createElement('button');
    resetButton.classList.add('resetSettingsButton');
    resetButton.classList.add(messagePrefix + 'options_ResetSettings_Button');
    area.appendChild(resetButton);


    resetButton.addEventListener('click', async (e) => {
      let ok = confirm(browser.i18n.getMessage('options_ResetSettings_Prompt'));
      if (!ok) {
        return;
      }

      // Reset commands:
      await Promise.all((await browser.commands.getAll()).map(command => browser.commands.reset(command.name)));

      // Clear settings:
      await Settings.clear();

      // Reload settings:
      starters.stop();
      starters.start();
    });
  }

  // #endregion Reset Button


  setTextMessages();
  await settingsTracker.start;
  starters.start();
}


initiatePage();
