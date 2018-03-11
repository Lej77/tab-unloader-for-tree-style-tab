
const kTST_ID = 'treestyletab@piro.sakura.ne.jp';



async function unloadTab(tab) {
  try {
    // Get latest info:
    tab = await browser.tabs.get(tab.id);
    // Select another tab if tab is selected:
    if (tab.active) {
      let closestTab = await findClosestLoadedTab(tab);
      if (!closestTab) {
        return;
      }
      await browser.tabs.update(closestTab.id, { active: true });
    }
    // Unload tab:
    await browser.tabs.discard(tab.id);
  } catch (error) {
    console.log('Failed to unload tab!' + '\n' + error);
  }
}



async function findClosestLoadedTab(tab) {
  // (prioritize higher indexes)
  let tabs = await browser.tabs.query({ windowId: tab.windowId });
  if (tabs.length <= 1) {
    return null;
  }
  let indexActive = tabs.indexOf(tabs.filter(tab => tab.active)[0]);

  for (let iii = 1; iii < tabs.length; iii++) {
    let before = indexActive - iii;
    let after = indexActive + iii;
    let beforeInRange = before >= 0;
    let afterInRange = after < tabs.length;
    if (!beforeInRange && !afterInRange) {
      break;
    }
    if (afterInRange && !tabs[after].discarded) {
      return tabs[after];
    }
    if (beforeInRange && !tabs[before].discarded) {
      return tabs[before];
    }
  }

  if (indexActive + 1 < tabs.length) {
    return tabs[indexActive + 1];
  }
  if (indexActive - 1 >= 0) {
    return tabs[indexActive - 1];
  }

  return null;
}



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
  constructor(data, time, events) {
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
    }

    op.trackDisposables([
      new Timeout(() => {
        setDragged(false);
      }, onDragTimeout),
      new EventListener(events.onDrag, (message, eventTime) => {
        // This event is fired after 500 milliseconds if the tab is not dragged.
        if (op.done) {
          return;
        }
        if (!eventTime) {
          eventTime = Date.now();
        }
        let duration = eventTime - time;

        if (duration > onDragTimeout) {
          return;
        }
        setDragged(true);
      }),
      new EventListener(events.onTabUp, (message, eventTime) => {
        setDragged(data.onDragMouseUpTrigger);
      })
    ]);
  }
}



class DoubleClickMonitor extends Monitor {
  constructor(data, time, events) {
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
    }


    op.trackDisposables([
      new EventListener(events.onTabDown, (message, eventTime) => {
        setDoubleClick(true);
        return true;
      }),
      new Timeout(() => {
        setDoubleClick(false);
      }, doubleClickTimeout),
    ]);
  }
}



class ClickDurationMonitor extends Monitor {
  constructor(data, time, events) {
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
    }


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



class MouseButtonManager {
  constructor(mouseClickCombo) {
    let combo = mouseClickCombo;
    let info = combo.info;
    this.combo = mouseClickCombo;

    let eventManagers = {};
    let events = {}
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

    let createMonitors = (time) => {
      let data = combo.data;
      if (!time) {
        time = Date.now();
      }
      let col = new MonitorCollection([
        new ClickDurationMonitor(data, time, events),
        new DoubleClickMonitor(data, time, events),
      ]);
      if (info.button === 0) {
        col.monitors.push(new DragMonitor(data, time, events))
      }
      return col;
    };

    let checkRegister = (message) => {
      return combo.test(message.ctrlKey, message.shiftKey, message.altKey, message.metaKey);
    }

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
    let onMouseDown = (message) => {
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
        let unloaded = message.tab.discarded;
        let registerUnloaded = info.applyToUnloadedTabs;
        if (info.allowForAll) {
          registerUnloaded = combo.applyToUnloadedTabs;
        }
        if (Boolean(unloaded) !== Boolean(registerUnloaded)) {
          return false;
        }
      }

      let monitorCol = createMonitors(time);
      let allowedPromise = Promise.resolve(monitorCol.allow);
      allowedPromise.then((allowUnload) => {
        monitorCol.cancel();
        if (allowUnload) {
          if (!info.dontUnload) {
            unloadTab(message.tab);
          }
        }
      });
      if (!monitorCol.done && combo.dontPreventTSTAction && !info.allwaysPreventTSTAction) {
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
    }
    this.onDrag = (message) => {
      let time = Date.now();
      return checkAny(eventManagers.onDrag.fire(message, time));
    };
  }
}



class TSTState {
  constructor() {
    Object.assign(this, {
      listeningTypes: ['ready'],
      contextMenuItems: [],
      style: null,
    });
  }

  static isEqual(a, b) {
    if (a === b) {
      return true;
    }
    if (!a && !b) {
      return true;
    }
    if (!a || !b) {
      return false;
    }

    if (a.style !== b.style) {
      return false;
    }

    if (!TSTState.isListeningTypesEqual(a, b)) {
      return false;
    }

    if (!TSTState.isContextMenuItemsEqual(a, b)) {
      return false;
    }
    return true;
  }
  static isListeningTypesEqual(a, b) {
    if (a === b) {
      return true;
    }
    if (!a && !b) {
      return true;
    }
    if (!a || !b) {
      return false;
    }

    if (a.listeningTypes.length !== b.listeningTypes.length) {
      return false;
    }
    for (let aLisType of a.listeningTypes) {
      if (!b.listeningTypes.includes(aLisType)) {
        return false;
      }
    }
    return true;
  }
  static isContextMenuItemsEqual(a, b) {
    if (a === b) {
      return true;
    }
    if (!a && !b) {
      return true;
    }
    if (!a || !b) {
      return false;
    }

    if (a.contextMenuItems.length !== b.contextMenuItems.length) {
      return false;
    }
    for (let iii = 0; iii < a.contextMenuItems.length; iii++) {
      let aItem = a.contextMenuItems[iii];
      let bItem = b.contextMenuItems[iii];
      if (aItem === bItem) {
        continue;
      }
      if (aItem.context || bItem.context) {
        if (
          !aItem.context || !bItem.context ||
          aItem.context.includes('tabs') !== bItem.context.includes('tabs')
        ) {
          return false;
        }
      }
      if (
        aItem.documentUrlPatterns !== bItem.documentUrlPatterns ||
        aItem.id !== bItem.id ||
        aItem.parentId !== bItem.parentId ||
        aItem.title !== bItem.title ||
        aItem.type !== bItem.type
      ) {
        return false;
      }
    }
    return true;
  }

  addListeningTypes(listeningTypes) {
    if (!Array.isArray(listeningTypes)) {
      listeningTypes = [listeningTypes];
    }
    for (let type of listeningTypes) {
      if (!this.listeningTypes.includes(type)) {
        this.listeningTypes.push(type);
      }
    }
  }

  getContextMenuItem(menuItemId) {
    let applicable = this.contextMenuItems.filter(item => item.id === menuItemId);
    if (applicable.length > 0) {
      return applicable[0];
    } else {
      return null;
    }
  }
  addContextMenuItems(items) {
    if (!Array.isArray(items)) {
      items = [items];
    }
    this.removeContextMenuItems(items.map(item => item.id));
    for (let item of items) {
      this.contextMenuItems.push(item);
    }
  }
  removeContextMenuItems(menuItemIds) {
    if (!Array.isArray(menuItemIds)) {
      menuItemIds = [menuItemIds];
    }
    this.contextMenuItems = this.contextMenuItems.filter((item) => !menuItemIds.includes(item.id));
  }
  removeAllContextMenuItems() {
    this.contextMenuItems = [];
  }

  static getClickListeningTypes() {
    return [
      // 'tab-clicked',   // Same as 'tab-mousedown'?
      'tab-mousedown',
      'tab-mouseup',
    ];
  }
  static getDragListeningTypes() {
    return [
      'tab-dragready',
      'tab-dragcancel',
      'tab-dragstart',
      'tab-dragenter',
      'tab-dragexit',
      'tab-dragend',
    ];
  }
  static getUnloadTabContextMenuItem() {
    return {
      id: 'unload-tab',
      title: browser.i18n.getMessage('contextMenu_unloadTab'),
      type: 'normal',
      contexts: ['tab'],
    };
  }
  static getDimUnloadedTabsStyle() {
    return [
      '.tab.discarded {',
      '  opacity: 0.75;',
      '}'
    ].join('\n');
  }
}



class TSTManager {
  constructor(state) {
    let messageEventManager = new EventManager();
    this.onMessage = messageEventManager.subscriber;

    let messageExternalListener = new EventListener(browser.runtime.onMessageExternal, (message, sender) => {
      try {
        if (sender.id === kTST_ID) {
          if (message.type === 'ready') {
            invalidateTST(true); // passive registration for secondary (or after) startup
          } else {
            let returned = messageEventManager.fire(message);
            let value;
            for (let ret of returned) {
              if (ret !== undefined) {
                value = ret;
                break;
              }
            }
            return value;
          }
        }
      } catch (error) {
        console.log('Error on message handling!' + '\n' + error);
      }
    });


    if (!state) {
      state = new TSTState();
    }
    this.state = state;
    let currentState = new TSTState();


    let blockTimeoutId = null;
    let blockTimeInMilliseconds = 1000;
    let invalidated = false;

    var block = () => {
      clearBlock();
      blockTimeoutId = setTimeout(function () {
        blockTimeoutId = null;
        if (invalidated) {
          invalidateTST();
        }
      }, blockTimeInMilliseconds);
    }
    var clearBlock = () => {
      if (blockTimeoutId) {
        clearTimeout(blockTimeoutId);
        blockTimeoutId = null;
      }
    }


    var invalidateTST = async (stateReset = false) => {
      if (stateReset) {
        currentState = new TSTState();
      }
      if (blockTimeoutId !== null) {
        invalidated = true;
        return;
      }
      block();
      invalidated = false;

      if (!TSTState.isEqual(currentState, this.state)) {
        let newState = Object.assign(new TSTState(), this.state);

        if (newState.style || newState.listeningTypes.length > 0 || newState.contextMenuItems.length > 0) {
          let styleChange = currentState.style !== newState.style;
          // Remove old style:
          if (currentState.style && styleChange) {
            await TSTManager.unregisterFromTST();
          }
          // Update listening types and/or register new style:
          let success = true;
          if (styleChange || !TSTState.isListeningTypesEqual(currentState, newState)) {
            success = await TSTManager.registerToTST(newState.listeningTypes, newState.style);
          }
          if (!success) {
            newState = new TSTState();
          } else {
            // Update context menu items:
            await TSTManager.removeAllTSTContextMenuItems();
            if (newState.contextMenuItems.length > 0) {
              for (let item of newState.contextMenuItems) {
                await TSTManager.createTSTContextMenuItem(item);
              }
            }
          }
        } else {
          // Unregister:
          await TSTManager.removeAllTSTContextMenuItems();
          await TSTManager.unregisterFromTST();
        }

        currentState = newState;
      } else {
        clearBlock();
        if (invalidated) {
          invalidateTST();
        }
      }
    }
    this.invalidateTST = invalidateTST;


    // Attempt to register to TST:
    invalidateTST();
  }


  static async registerToTST(listeningTypes = [], style = null) {
    try {
      let message = {
        type: 'register-self',
        name: browser.runtime.id,
        listeningTypes: listeningTypes,
      };
      if (style && typeof style === "string") {
        message.style = style;
      }
      await browser.runtime.sendMessage(kTST_ID, message);
    }
    catch (e) {
      // TST is not available
      return false;
    }
    return true;
  }

  static async unregisterFromTST() {
    try {
      await browser.runtime.sendMessage(kTST_ID, {
        type: 'unregister-self'
      });
    }
    catch (e) {
      // TST is not available
      return false;
    }
    return true;
  }


  static async createTSTContextMenuItem(item) {
    try {
      await browser.runtime.sendMessage(kTST_ID, {
        type: 'fake-contextMenu-create',
        params: item,
      });
    } catch (error) {
      return false;
    }
    return true;
  }

  static async removeAllTSTContextMenuItems() {
    try {
      await browser.runtime.sendMessage(kTST_ID, {
        type: 'fake-contextMenu-remove-all'
      });
    } catch (error) {
      return false;
    }
    return true;
  }
}



async function start() {

  // #region Settings

  let mouseClickCombos = MouseClickComboCollection.createStandard();
  let updateClickCombos = (changes) => {
    mouseClickCombos.update(changes, settings);
  }

  var hasStarted = false;
  var settingsTracker = new SettingsTracker(null, (changes, storageArea) => {
    if (!hasStarted) {
      return;
    }
    updateClickCombos(changes);

    if (invalidateTST) {
      invalidateTST();
    }
  });
  var settings = settingsTracker.settings;
  await settingsTracker.start;
  hasStarted = true;
  updateClickCombos(settings);

  // #endregion Settings


  // #region Handle input

  let mouseButtonManagers = mouseClickCombos.combos.map(combo => new MouseButtonManager(combo));
  let getButtonManager = (index) => {
    if (index < 0 || mouseButtonManagers.length <= index) {
      return null;
    }
    return mouseButtonManagers[index];
  }
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
  }

  var onMenuItemClick = (info, tab) => {
    switch (info.menuItemId) {
      case 'unload-tab':
        unloadTab(tab);
        break;
    }
  };

  // #endregion Handle input


  // #region Handle TST configuration

  var getTSTState = () => {
    let state = new TSTState();
    if (checkAny(mouseClickCombos.combos.map(combo => combo.enabled))) {
      state.addListeningTypes(TSTState.getClickListeningTypes());
      if (checkAny(mouseClickCombos.combos.map(combo => combo.enabled && combo.onDragEnabled && combo.info.button === 0))) {
        state.addListeningTypes(TSTState.getDragListeningTypes());
      }
    }
    if (settings.unloadInTSTContextMenu) {
      state.addContextMenuItems(TSTState.getUnloadTabContextMenuItem());
    }
    if (settings.dimUnloadedTabs) {
      state.style = TSTState.getDimUnloadedTabsStyle();
    }
    return state;
  }
  var invalidateTST = () => {
    tstManager.state = getTSTState();
    tstManager.invalidateTST();
  }


  // Set up TST and listen for messages:
  let tstManager = new TSTManager(getTSTState());
  let tstMessageListener = new EventListener(tstManager.onMessage, (message) => {
    switch (message.type) {
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
}



start();