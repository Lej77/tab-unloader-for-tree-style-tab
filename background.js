
// #region Tab Operations

async function unloadTabs(tabs, fallbackOptions = {}) {
  try {
    if (!tabs) {
      return;
    }
    if (!Array.isArray(tabs)) {
      tabs = [tabs];
    }
    // Get latest info:
    tabs = await getLatestTabs(tabs);
    if (tabs.length === 0) {
      return;
    }

    // Select another tab if a tab is selected:
    await ensureTabsArentActive(tabs, fallbackOptions);

    // Unload tabs:
    await browser.tabs.discard(tabs.map(tab => tab.id));
  } catch (error) {
    console.log('Failed to unload tab' + (tabs && Array.isArray(tabs) && tabs.length > 1 ? '(s)' : '') + '!\n', error);
  }
}


/**
 * Update tab object(s) information.
 * 
 * @param {Object|Array} tabs Tab(s) to update.
 * @returns {Array} Updated tab(s).
 */
async function getLatestTabs(tabs) {
  if (!tabs) {
    return;
  }
  if (!Array.isArray(tabs)) {
    tabs = [tabs];
  }
  if (tabs.length === 0) {
    return tabs;
  }
  // Get latest info:
  tabs = tabs.map(tab => browser.tabs.get(tab.id));
  for (let iii = 0; iii < tabs.length; iii++) {
    try {
      tabs[iii] = await tabs[iii];
    } catch (error) {
      // Tab might have been closed.
      tabs[iii] = null;
    }
  }
  tabs = tabs.filter(tab => tab);
  return tabs;
}


/**
 * Ensure that some tabs aren't active.
 * 
 * @param {Object|Array} tabs The tabs that shouldn't be active.
 * @param {boolean} fallbackToLastSelectedTab If a tab is active then this determines the preference to use when selecting anohter tab. If true then the tab with highest lastAccessed value will be selected. If false the closest tab to the active tab will be selected.
 * @param {boolean} ignoreHiddenTabs If a tab is active then this determines the preference to use when selecting anohter tab. If true then all hidden tabs will be ignored when searching for another tab.
 * @returns {boolean} Indicates if the operations was successful. If true then none of the provided tabs are selected.
 */
async function ensureTabsArentActive(tabs, { fallbackToLastSelectedTab = false, ignoreHiddenTabs = false } = {}) {
  if (!tabs) {
    return true;
  }
  if (!Array.isArray(tabs)) {
    tabs = [tabs];
  }
  let activeTabs = tabs.filter(tab => tab.active);
  if (activeTabs.length === 0) {
    return true;
  }

  let closestTab;
  let queryDetails = { windowId: activeTabs[0].windowId };
  if (ignoreHiddenTabs) {
    queryDetails.hidden = false;
  }
  let allTabs = await browser.tabs.query(queryDetails);
  if (fallbackToLastSelectedTab) {
    closestTab = await findLastFocusedLoadedTab(allTabs, tabs);
  } else {
    closestTab = await findClosestLoadedTab(activeTabs[0], allTabs, tabs);
  }
  if (closestTab) {
    await browser.tabs.update(closestTab.id, { active: true });
    return true;
  }
  return false;
}


async function findClosestLoadedTab(tab, searchTabs, ignoredTabs = []) {
  // (prioritize higher indexes)
  let tabs = searchTabs;
  if (tabs.length <= 1) {
    return null;
  }
  let indexActive = tabs.map(t => t.id).indexOf(tab.id);
  if (indexActive < 0) {
    indexActive = tab.index;
  }
  let ignoredTabIds = ignoredTabs.map(t => t.id);

  for (let iii = 1; iii < tabs.length; iii++) {
    let before = indexActive - iii;
    let after = indexActive + iii;
    let checkRange = (index) => {
      return 0 <= index && index < tabs.length;
    };
    let beforeInRange = checkRange(before);
    let afterInRange = checkRange(after);
    if (!beforeInRange && !afterInRange) {
      break;
    }
    let checkTab = (t) => {
      return !t.discarded && !ignoredTabIds.includes(t.id);
    };
    if (afterInRange && checkTab(tabs[after])) {
      return tabs[after];
    }
    if (beforeInRange && checkTab(tabs[before])) {
      return tabs[before];
    }
  }

  if (indexActive + 1 < tabs.length) {
    let t = tabs[indexActive + 1];
    if (!ignoredTabIds.includes(t.id)) {
      return t;
    }
  }
  if (indexActive - 1 >= 0) {
    let t = tabs[indexActive - 1];
    if (!ignoredTabIds.includes(t.id)) {
      return t;
    }
  }

  return null;
}


async function findLastFocusedLoadedTab(searchTabs, ignoredTabs = []) {
  let tabs = searchTabs;
  if (tabs.length <= 1) {
    return null;
  }
  let ignoredTabIds = ignoredTabs.map(t => t.id);

  tabs.sort((a, b) => b.lastAccessed - a.lastAccessed);
  let lastFocusedNotLoaded = null;
  for (let focusedTab of tabs) {
    if (!ignoredTabIds.includes(focusedTab.id)) {
      if (!focusedTab.discarded) {
        return focusedTab;
      }
      if (!lastFocusedNotLoaded) {
        lastFocusedNotLoaded = focusedTab;
      }
    }
  }
  return lastFocusedNotLoaded;
}

// #endregion Tab Operations


// #region Event Conditions

class Monitor {
  constructor() {
    this.operationManager = new OperationManager();
  }

  cancel() {
    this.operationManager.value = false;
  }

  get done() {
    return this.operationManager.done;
  }
  get allow() {
    return this.operationManager.value;
  }
}



class MonitorCollection {
  constructor(monitors) {
    this.monitors = monitors;
  }

  cancel() {
    for (let monitor of this.monitors) {
      monitor.cancel();
    }
  }

  get done() {
    return Boolean(this.monitors.filter(monitor => !monitor.done).length === 0);
  }
  get allow() {
    let blocked = checkAny(this.monitors.map(monitor => Promise.resolve(monitor.allow).then(allowed => !allowed)));
    return Promise.resolve(blocked).then(block => !block);
  }
}



class DragMonitor extends Monitor {
  constructor({ data, time, events }) {
    super();
    var op = this.operationManager;

    // this.allow.then((value) => console.log('DragMonitor: ' + value));

    let onDragEnabled = data.onDragEnabled;
    let onDragCancel = data.onDragCancel;
    let onDragOnly = !onDragCancel;
    let onDragTimeout = data.onDragTimeout;
    let hasOnDragTimeout = onDragTimeout && onDragTimeout > 0;
    onDragEnabled = onDragEnabled && hasOnDragTimeout;

    let setDragged = (dragged) => {
      op.resolve(dragged ? !onDragCancel : !onDragOnly);
    };

    if (!onDragEnabled) {
      op.resolve(true);
      return;
    } else if (!hasOnDragTimeout) {
      op.resolve(false);
      return;
    }

    op.trackDisposables([
      new Timeout(() => {
        setDragged(false);
      }, onDragTimeout),
      new EventListener(events.onDrag, (eventMessage, eventTime) => {
        // This event is fired after 400 milliseconds if the tab is not dragged.
        setDragged(true);
      }),
      new EventListener(events.onTabUp, (eventMessage, eventTime) => {
        setDragged(data.onDragMouseUpTrigger);
      }),
      new EventListener(events.onTabDown, (eventMessage, eventTime) => {
        setDragged(false);
      }),
    ]);
  }
}



class DoubleClickMonitor extends Monitor {
  constructor({ data, time, events, message }) {
    super();
    var op = this.operationManager;

    // this.allow.then((value) => console.log('DoubleClickMonitor: ' + value));

    let doubleClickEnabled = data.doubleClickEnabled;
    let doubleClickOnly = data.doubleClickOnly;
    let doubleClickToPrevent = !doubleClickOnly;
    let doubleClickTimeout = parseInt(data.doubleClickTimeout);
    let hasDoubleClickTimeout = doubleClickTimeout && doubleClickTimeout > 0;
    doubleClickEnabled = doubleClickEnabled && hasDoubleClickTimeout;


    if (!doubleClickEnabled) {
      op.resolve(true);
      return;
    }


    let setDoubleClick = (doubleClick) => {
      if (doubleClickToPrevent && doubleClick) {
        op.resolve(false);
      }
      if (doubleClickOnly && !doubleClick) {
        op.resolve(false);
      }
      op.resolve(true);
    };


    op.trackDisposables([
      new EventListener(events.onTabDown, (eventMessage, eventTime) => {
        setDoubleClick(eventMessage.tab.id === message.tab.id);
        return true;
      }),
      new Timeout(() => {
        setDoubleClick(false);
      }, doubleClickTimeout),
    ]);
  }
}



class ClickDurationMonitor extends Monitor {
  constructor({ data, time, events }) {
    super();
    var op = this.operationManager;

    // this.allow.then((value) => console.log('click duration: ' + value));

    let maxTime = parseInt(data.maxTimeout);
    let minTime = parseInt(data.minTimeout);
    let hasMaxTime = maxTime && maxTime > 0;
    let hasMinTime = minTime && minTime > 0;


    if (!hasMaxTime && !hasMinTime) {
      op.resolve(true);
      return;
    }

    let minTimeout = false;
    let maxTimeout = false;
    let checkIntervall = (released = false) => {
      if (hasMaxTime && maxTimeout) {
        // Duration is longer than max allowed:
        op.resolve(false);
      }
      if (hasMinTime && minTimeout) {
        // Min time reached:
        if (!hasMaxTime || released) {
          // No max time or wait stopped:
          op.resolve(true);
        }
      }
      if (released) {
        if (hasMinTime && !minTimeout) {
          // Min time wasn't reached:
          op.resolve(false);
        } else {
          op.resolve(true);
        }
      }
    };


    op.trackDisposables([
      new EventListener(events.onTabUp, (message, eventTime) => {
        checkIntervall(true);
      }),
    ]);


    if (hasMinTime) {
      op.trackDisposables(new Timeout(() => {
        minTimeout = true;
        checkIntervall();
      }, minTime));
    }
    if (hasMaxTime) {
      op.trackDisposables(new Timeout(() => {
        maxTimeout = true;
        checkIntervall();
      }, maxTime));
    }
  }
}

// #endregion Event Conditions


class MouseButtonManager {
  constructor(mouseClickCombo) {
    let combo = mouseClickCombo;
    let info = combo.info;
    this.combo = mouseClickCombo;

    let eventManagers = {};
    let events = {};
    let eventNames = [
      'onTabDown',
      'onTabUp',
      'onDrag',
    ];
    for (let eventName of eventNames) {
      let manager = new EventManager();
      eventManagers[eventName] = manager;
      events[eventName] = manager.subscriber;
    }

    let createMonitors = (time, message) => {
      let data = combo.data;
      if (!time) {
        time = Date.now();
      }
      let monitorData = { data, time, events, message };
      let col = new MonitorCollection([
        new ClickDurationMonitor(monitorData),
        new DoubleClickMonitor(monitorData),
      ]);
      if (info.button === 0) {
        col.monitors.push(new DragMonitor(monitorData));
      }
      return col;
    };

    let checkRegister = (message) => {
      return combo.test(message.ctrlKey, message.shiftKey, message.altKey, message.metaKey);
    };

    let lastMouseDownValue;
    this.onMouseUp = (message) => {
      if (message.button !== info.button) {
        return;
      }
      let time;
      let register = checkRegister(message);

      if (register) {
        time = Date.now();
        let preventClick = checkAny(eventManagers.onTabUp.fire(message, time));

        if (preventClick) {
          return true;
        }
      }
      return lastMouseDownValue;
    };
    let onMouseDown = async (message) => {
      let time;
      let register = checkRegister(message);

      if (register) {
        time = Date.now();
        let preventClick = checkAny(eventManagers.onTabDown.fire(message, time));

        if (preventClick) {
          return true;
        }
      }

      if (!register) {
        return false;
      }
      let applyToAll = combo.applyToAllTabs && info.allowForAll;
      if (!applyToAll) {
        let unloaded = await message.tab.discarded;
        let registerUnloaded = info.applyToUnloadedTabs;
        if (info.allowForAll) {
          registerUnloaded = combo.applyToUnloadedTabs;
        }
        if (Boolean(unloaded) !== Boolean(registerUnloaded)) {
          return false;
        }
      }

      let monitorCol = createMonitors(time, message);
      let allowedPromise = Promise.resolve(monitorCol.allow);
      allowedPromise.then((allowUnload) => {
        monitorCol.cancel();
        if (allowUnload) {
          if (!info.dontUnload) {
            unloadTabs(message.tab, { fallbackToLastSelectedTab: combo.fallbackToLastSelected, ignoreHiddenTabs: combo.ignoreHiddenTabs });
          }
        }
      });
      if ((info.button !== 0 || !monitorCol.done) && combo.dontPreventTSTAction && !info.allwaysPreventTSTAction) {
        return false;
      } else {
        return allowedPromise;
      }
    };
    this.onMouseDown = (message) => {
      if (message.button !== info.button) {
        return;
      }
      let value = onMouseDown(message);
      lastMouseDownValue = value;
      return value;
    };
    this.onDrag = (message) => {
      let time = Date.now();
      return checkAny(eventManagers.onDrag.fire(message, time));
    };
  }
}


async function start() {

  // #region Settings

  var timeDisposables = new DisposableCollection();

  let mouseClickCombos = MouseClickComboCollection.createStandard();
  let updateClickCombos = (changes) => {
    mouseClickCombos.update(changes, settings);
  };

  var settingsTracker = new SettingsTracker();
  var settings = settingsTracker.settings;
  await settingsTracker.start;
  settingsTracker.onChange.addListener((changes, storageArea) => {
    updateClickCombos(changes);

    if (changes.delayedTSTRegistrationTimeInMilliseconds || changes.isEnabled) {
      timeDisposables.disposeOfAllObjects();
    }

    if (invalidateTST) {
      invalidateTST();
    }
  });
  updateClickCombos(settings);

  // #endregion Settings


  // #region Handle input

  let mouseButtonManagers = mouseClickCombos.combos.map(combo => new MouseButtonManager(combo));
  let getButtonManager = (index) => {
    if (index < 0 || mouseButtonManagers.length <= index) {
      return null;
    }
    return mouseButtonManagers[index];
  };
  let managerCallback = (index, callback) => {
    if (!callback || typeof callback !== 'function') {
      return false;
    }
    let all = !index && index !== 0;
    if (all) {
      let returned = [];
      for (let manager of mouseButtonManagers) {
        returned.push(callback(manager));
      }
      return returned;
    } else {
      let manager = getButtonManager(index);
      if (!manager) {
        return false;
      } else {
        return callback(manager);
      }
    }
  };

  var onMenuItemClick = (info, tab) => {
    switch (info.menuItemId) {
      case 'unload-tab':
        unloadTabs(tab, { fallbackToLastSelectedTab: settings.unloadInTSTContextMenu_fallbackToLastSelected, ignoreHiddenTabs: settings.unloadInTSTContextMenu_ignoreHiddenTabs });
        break;
    }
  };

  // #endregion Handle input


  // #region Handle TST configuration

  var wantedTSTStyle = '';
  var onTSTStyleChanged = new EventManager();
  var getTSTStyle = () => {
    let style = '';

    // #region Style

    if (settings.dimUnloadedTabs) {
      style += `
/* Dim unloaded tabs */
.tab.discarded {
  opacity: 0.75;
}

`;
    }
    if (settings.tabHide_ShowHiddenTabsInTST) {
      style += `
/* Show hidden tabs */
.tab.hidden {
  pointer-events: auto !important;
  position: relative !important;
  visibility: visible !important;
}

`;
    }

    // #endregion Style

    return style;
  };

  var getTSTState = () => {
    let style = getTSTStyle();
    if (style !== wantedTSTStyle) {
      let oldStyle = wantedTSTStyle;
      wantedTSTStyle = style;
      onTSTStyleChanged.fire(oldStyle, style);
    }

    let state = new TSTState();
    if (!settings.isEnabled) {
      return state;
    }

    if (mouseClickCombos.combos.some(combo => combo.enabled)) {
      state.addListeningTypes(TSTState.getClickListeningTypes());
      if (mouseClickCombos.combos.some(combo => combo.enabled && combo.onDragEnabled && combo.info.button === 0)) {
        state.addListeningTypes([tstAPI.NOTIFY_TAB_DRAGREADY, tstAPI.NOTIFY_TAB_DRAGSTART]);
      }
    }
    if (settings.unloadInTSTContextMenu) {
      state.addContextMenuItems(new ContextMenuItem('unload-tab', browser.i18n.getMessage('contextMenu_unloadTab')));
    }

    state.style = style;

    return state;
  };
  var invalidateTST = async () => {
    await tstManager.setState(getTSTState());
  };


  // Set up TST and listen for messages:

  let tstManager = new TSTManager(getTSTState());


  let isFirstTSTRegistration = true;
  let delayedRegistration = () => {
    isFirstTSTRegistration = false;
    let time = settings.delayedTSTRegistrationTimeInMilliseconds;
    time = parseInt(time);
    if (!time || time <= 0) {
      return;
    }

    timeDisposables.trackDisposables(
      new Timeout(() => tstManager.invalidateTST([TSTManager.resetTypes.listeningTypes, TSTManager.resetTypes.contextMenu]), time)
    );
  };
  let tstRegistrationListener = new EventListener(tstManager.onRegistrationChange, (oldState, newState) => {
    if (isFirstTSTRegistration) {
      delayedRegistration();
    }
  });
  delayedRegistration();


  let tstMessageListener = new EventListener(tstManager.onMessage, (message) => {
    if (!settings.isEnabled) {
      return;
    }
    if (message.tab) {
      let tstDiscarded = message.tab.discarded;
      defineProperty(message.tab, 'discarded', () => {
        return tstDiscarded && !message.tab.active;
      });
    }
    switch (message.type) {
      case 'ready': {
        isFirstTSTRegistration = true;
      } break;

      case 'tab-clicked':
      case 'tab-mousedown': {
        return checkAny(managerCallback(null, (manager) => manager.onMouseDown(message)));
      } break;

      case 'tab-mouseup': {
        return checkAny(managerCallback(null, (manager) => manager.onMouseUp(message)));
      } break;

      case 'tab-dragready':
      case 'tab-dragcancel':
      case 'tab-dragstart':
      case 'tab-dragenter':
      case 'tab-dragexit':
      case 'tab-dragend': {
        return checkAny(managerCallback(null, (manager) => manager.onDrag(message)));
      } break;

      case 'fake-contextMenu-click': {
        onMenuItemClick(message.info, message.tab);
      } break;
    }
  });

  // #endregion Handle TST configuration


  // #region Tab Hiding

  var tabHideManager = null;

  let lastCheck = null;
  let checkTabHiding = async () => {
    while (lastCheck) {
      let check = lastCheck;
      await check;
      if (lastCheck === check) {
        lastCheck = null;
      }
    }
    let check = async () => {
      let wanted = settings.tabHide_HideUnloadedTabs && settings.isEnabled;
      let allowed = wanted ? await TabHideManager.checkPermission() : false;
      let apiAccess = allowed ? await TabHideManager.checkAPIEnabled() : false;

      if (tabHideManager) {
        tabHideManager.isAPIEnabled = apiAccess;
      }
      if (allowed) {
        if (!tabHideManager) {
          if (settings.tabHide_ShowHiddenTabsInTST) {
            // Ensure that hidden tabs are visible in TST before hiding tabs:
            await invalidateTST();
            await delay(250);
          }

          if (!tabHideManager) {
            tabHideManager = new TabHideManager();
            tabHideManager.onAPIStatusChanged.addListener(() => {
              if (portManager) {
                portManager.fireEvent(messageTypes.tabHideAPIChanged, [tabHideManager.isAPIEnabled]);
              }
            });
          }
        }
      } else {
        if (tabHideManager) {
          tabHideManager.dispose();
          tabHideManager = null;
          await TabHideManager.showAllTabs();
          await delay(250);
        }
      }
    };
    let checking = check();
    lastCheck = checking;
    await checking;
    if (checking === lastCheck) {
      lastCheck = null;
    }
  };
  settingsTracker.onChange.addListener((changes, storageArea) => {
    if (changes.tabHide_HideUnloadedTabs || changes.isEnabled) {
      checkTabHiding();
    }
  });
  checkTabHiding();

  // #endregion Tab Hiding


  // #region Messaging

  var portManager = new PortManager();
  portManager.onMessage.addListener(async (message, sender, disposables) => {
    if (!message.type) {
      return;
    }
    switch (message.type) {
      case messageTypes.permissionsChanged: {
        portManager.fireEvent(messageTypes.permissionsChanged, [message.permission, message.value]);
        checkTabHiding();
      } break;
      case messageTypes.tabHideAPIChanged: {
        portManager.fireEvent(messageTypes.tabHideAPIChanged, [message.value, sender.tab ? sender.tab.id : null]);
        if (tabHideManager) {
          tabHideManager.isAPIEnabled = message.value;
        }
      } break;
      case messageTypes.updateTabHide: {
        await checkTabHiding();
        if (tabHideManager && !tabHideManager.isDisposed) {
          await tabHideManager.updateAllHideStates();
        } else {
          await TabHideManager.showAllTabs();
        }
      } break;
      case messageTypes.getActiveStyle: {
        return wantedTSTStyle;
      } break;
    }
  });
  let notifyStyle = (oldStyle, newStyle) => {
    portManager.fireEvent(messageTypes.styleChanged, [oldStyle, newStyle]);
  };
  onTSTStyleChanged.addListener(notifyStyle);
  notifyStyle('', wantedTSTStyle);

  // #endregion Messaging

}


start();
