
const kTST_ID = 'treestyletab@piro.sakura.ne.jp';



async function unloadTab(tab) {
  if (tab.active) {
    let closestTab = await findClosestLoadedTab(tab);
    if (!closestTab) {
      return;
    }
    await browser.tabs.update(closestTab.id, { active: true });
  }
  await browser.tabs.discard(tab.id);
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



class TSTState {
  constructor() {
    Object.assign(this, {
      listeningTypes: [],
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
  // Settings:
  let leftClick = new MouseClickCombo();
  let middleClick = new MouseClickCombo();
  let rightClick = new MouseClickCombo();
  let updateClickCombos = (changes) => {
    if (changes.unloadOnLeftClick) {
      leftClick.update(settings.unloadOnLeftClick);
    }
    if (changes.unloadOnMiddleClick) {
      middleClick.update(settings.unloadOnMiddleClick);
    }
    if (changes.unloadOnRightClick) {
      rightClick.update(settings.unloadOnRightClick);
    }
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


  // Handle input:
  let handleTabUnload = null;
  var onMouseUp = (message) => {
    if (handleTabUnload) {
      handleTabUnload('up');
    }
  };
  var onMouseDown = (message) => {
    if (handleTabUnload) {
      let doubleClick = handleTabUnload('down');
      if (doubleClick) {
        return true;
      }
    }
    if (message.tab.discarded) {
      return false;
    }

    // Get button handler:
    let combo;
    switch (message.button) {
      case 0:
        combo = leftClick;
        break;
      case 1:
        combo = middleClick;
        break;
      case 2:
        combo = rightClick;
        break;
    }
    if (!combo) {
      return false;
    }
    if (!combo.test(message.ctrlKey, message.shiftKey, message.altKey, message.metaKey)) {
      return false;
    }


    let maxTime = parseInt(combo.maxTimeout);
    let minTime = parseInt(combo.minTimeout);
    let hasMaxTime = maxTime && maxTime > 0;
    let hasMinTime = minTime && minTime > 0;

    let doubleClickEnabled = combo.doubleClickEnabled;
    let doubleClickOnly = combo.doubleClickOnly;
    let doubleClickTimeout = parseInt(combo.doubleClickTimeout);
    let hasDoubleClickTimeout = doubleClickTimeout && doubleClickTimeout > 0;
    doubleClickEnabled = doubleClickEnabled && hasDoubleClickTimeout;
    if (doubleClickEnabled && hasMinTime && minTime > doubleClickTimeout) {
      // Mouse up event must fire before double click => if mouse up must be longer than time between mouse down event then it can't happen:
      if (!doubleClickOnly) {
        // Disable prevent on double click:
        doubleClickEnabled = false;
      } else {
        // Double click can't occur that fast:
        return false;
      }
    }

    if (!hasMaxTime && !hasMinTime && !doubleClickEnabled) {
      unloadTab(message.tab);
      return true;
    } else {
      return new Promise((resolve, reject) => {
        try {
          // Unload tab only if mouse down time is less then a certain time:
          let mouseDownTime = Date.now();
          let mouseUpTime;
          let timeoutId = null;

          // Create callback to be called on timeout or mouse-up event:
          let callback = (activationType) => {
            try {
              if (doubleClickEnabled && activationType === 'up') {
                mouseUpTime = Date.now();
                return true;
              }

              // Prevent double activation:
              handleTabUnload = null;
              if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }

              // Check if operation should be canceled:
              let time = Date.now();
              if (!mouseUpTime) {
                mouseUpTime = time;
              }
              let clickDuration = mouseUpTime - mouseDownTime;
              let totalDuration = time - mouseDownTime;

              let checkIfSuccess = () => {
                if (hasMinTime && clickDuration < minTime) {
                  return false;
                }
                if (hasMaxTime && clickDuration > maxTime) {
                  return false;
                }
                if (doubleClickEnabled) {
                  let checkForDoubleClick = () => {
                    if (activationType !== 'down') {
                      return false;
                    }
                    if (totalDuration > doubleClickTimeout) {
                      return false;
                    }
                    return true;
                  }
                  let isDoubleClick = checkForDoubleClick();
                  if (!doubleClickOnly && isDoubleClick) {
                    return false;
                  }
                  if (doubleClickOnly && !isDoubleClick) {
                    return false;
                  }
                }
                return true;
              };

              // Unload tab or allow TST to execute its operation:
              if (checkIfSuccess()) {
                unloadTab(message.tab);
                resolve(true);
              } else {
                resolve(false);
              }
            } catch (error) {
              reject(error);
            }
            return doubleClickEnabled;
          }
          handleTabUnload = callback;

          // Resolve Promise as quickly as possible:
          let timeoutTime = -1;
          if (hasMaxTime) {
            // Max time limit passed => Reject
            timeoutTime = maxTime + 10;
          } else if (hasMinTime) {
            // Over min time => Accept
            timeoutTime = minTime + 10;
          }
          if (doubleClickEnabled) {
            if (!hasMaxTime) {
              // Over max double click time => No double click
              timeoutTime = doubleClickTimeout;
            }
          }
          if (timeoutTime > 0) {
            let timeoutCallback = () => {
              if (handleTabUnload === callback) {
                callback('timeout');
              }
            };
            timeoutId = setTimeout(() => {
              timeoutId = null;
              if (doubleClickEnabled && timeoutTime !== doubleClickTimeout && mouseUpTime) {
                // Max mouse up wait period passed and mouseUpEvent has fired => wait for double click timeout
                let timeLeft = doubleClickTimeout - timeoutTime;
                if (timeLeft > 0) {
                  timeoutId = setTimeout(() => {
                    timeoutId = null;
                    timeoutCallback();
                  }, timeLeft);
                  return;
                }
              }
              timeoutCallback();
            }, timeoutTime);
          }

        } catch (error) {
          reject(error);
        }
      });
    }
  };

  var onMenuItemClick = (info, tab) => {
    switch (info.menuItemId) {
      case 'unload-tab':
        unloadTab(tab);
        break;
    }
  };


  // Handle TST configuration:
  var getTSTState = () => {
    let state = new TSTState();
    if (leftClick.enabled || middleClick.enabled || rightClick.enabled) {
      state.addListeningTypes(TSTState.getClickListeningTypes());
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
  let lastMouseDownValue = false;
  let tstMessageListener = new EventListener(tstManager.onMessage, (message) => {
    switch (message.type) {
      case 'tab-clicked':
      case 'tab-mousedown': {
        let preventAction = onMouseDown(message);
        lastMouseDownValue = Promise.resolve(preventAction);
        return lastMouseDownValue;
      } break;

      case 'tab-mouseup': {
        let preventAction = onMouseUp(message);
        return preventAction || lastMouseDownValue;
      } break;

      case 'fake-contextMenu-click': {
        onMenuItemClick(message.info, message.tab);
      } break;
    }
  });
}



start();