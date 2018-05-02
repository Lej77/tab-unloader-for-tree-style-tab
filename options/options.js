
async function initiatePage() {
  let settingsTracker = new SettingsTracker();
  let settings = settingsTracker.settings;

  let starters = new DisposableCreators();
  let pagePort = new PortConnection();
  let sectionAnimationInfo = {};


  let isBound = false;
  starters.createDisposable(() => {
    bindElementIdsToSettings(settings, !isBound);
    isBound = true;
  });


  // #region Enable/Disable Extension

  {
    let enableArea = document.createElement('div');
    enableArea.classList.add('extensionToggleArea');
    document.body.appendChild(enableArea);

    let disableButton = document.createElement('button');
    disableButton.classList.add(messagePrefix + 'options_extensionToggle_DisableButton');
    enableArea.appendChild(disableButton);

    let indicator = createStatusIndicator('options_extensionToggle_Status_Header', 'options_extensionToggle_Status_Enabled', 'options_extensionToggle_Status_Disabled');
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

  {
    let section = createCollapsableArea(sectionAnimationInfo);
    section.area.classList.add('standardFormat');
    section.title.classList.add('center');
    section.title.classList.add('enablable');
    section.content.classList.add('contextMenuItemArea');
    document.body.appendChild(section.area);

    let header = document.createElement('div');
    header.classList.add(messagePrefix + 'options_unloadInTSTContextMenu_Title');
    section.title.appendChild(header);

    let unloadWithContextMenuCheckbox = createCheckBox('unloadInTSTContextMenu', 'options_unloadInTSTContextMenu');
    starters.createDisposable(() => {
      let check = () => {
        let enabled = unloadWithContextMenuCheckbox.checkbox.checked;
        toggleClass(section.title, 'enabled', enabled);
        toggleClass(section.content, 'enabled', enabled);
      };
      check();
      return new EventListener(unloadWithContextMenuCheckbox.checkbox, 'input', (e) => check());
    });
    section.content.appendChild(unloadWithContextMenuCheckbox.area);

    section.content.appendChild(document.createElement('br'));


    let fallbackOptions = document.createElement('div');
    fallbackOptions.classList.add('area');
    fallbackOptions.classList.add('enabled');
    section.content.appendChild(fallbackOptions);

    let fallbackToLastSelected = createCheckBox('unloadInTSTContextMenu_fallbackToLastSelected', 'options_fallbackToLastSelected');
    fallbackOptions.appendChild(fallbackToLastSelected.area);

    fallbackOptions.appendChild(document.createElement('br'));

    let ignoreHiddenTabs = createCheckBox('unloadInTSTContextMenu_ignoreHiddenTabs', 'options_ignoreHiddenTabs');
    fallbackOptions.appendChild(ignoreHiddenTabs.area);


    let delayedRegistration = createNumberInput('options_unloadInTSTContextMenu_DelayedRegistration', 0, false);
    delayedRegistration.input.id = 'delayedTSTRegistrationTimeInMilliseconds';
    section.content.appendChild(delayedRegistration.area);
  }

  // #endregion Context Menu Item


  // #region Tab Hiding

  let onTabHidePermissionChange = new EventManager();
  let isTabHideAvailable = false;
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
        let needAPI = enableCheckbox.checkbox.checked && !isTabHideAvailable;
        toggleClass(section.title, 'enabled', enabled);
        toggleClass(section.title, 'error', needAPI);
        toggleClass(section.content, 'enabled', enabled);
      };
      let disposables = [
        new EventListener(enableCheckbox.checkbox, 'input', (e) => check()),
        new EventListener(showHiddenInTSTCheckbox.checkbox, 'input', (e) => check()),
        new EventListener(onTabHidePermissionChange, () => check()),
      ];
      check();
      return disposables;
    });
  }

  // #endregion Tab Hiding


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

    let permissionsArea = createPermissionsArea({
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
    permissionsArea.onControllerValueChanged.addListener((controller) => {
      if (permissionsArea.tabHidePermissionController === controller) {
        isTabHideAvailable = controller.hasPermission && !permissionsArea.checkControllerError(controller);
        onTabHidePermissionChange.fire();
      }
    });
  }

  // #endregion Permissions


  // #region Other Options

  {
    let area = document.createElement('div');
    document.body.appendChild(area);

    let dimUnloadedCheckbox = createCheckBox('dimUnloadedTabs', 'options_dimUnloadedTabs');
    area.appendChild(dimUnloadedCheckbox.area);

    area.appendChild(document.createElement('br'));
    area.appendChild(document.createElement('br'));

    let disableOptionAnimations = createCheckBox('disableOptionsPageAnimations', 'options_disableOptionsPageAnimations');
    area.appendChild(disableOptionAnimations.area);

    area.appendChild(document.createElement('br'));
    area.appendChild(document.createElement('br'));
    area.appendChild(document.createElement('br'));

    let resetButton = document.createElement('button');
    resetButton.classList.add('resetSettingsButton');
    resetButton.classList.add(messagePrefix + 'options_ResetSettings_Button');
    area.appendChild(resetButton);

    resetButton.addEventListener('click', async (e) => {
      let ok = confirm(browser.i18n.getMessage('options_ResetSettings_Prompt'));
      if (!ok) {
        return;
      }

      // Clear settings:
      await Settings.clear();

      // Reload settings:
      starters.stop();
      starters.start();
    });
  }

  // #endregion Other Options


  setTextMessages();
  await settingsTracker.start;
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
  starters.start();
}


initiatePage();
