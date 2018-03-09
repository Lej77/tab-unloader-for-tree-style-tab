
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
    });
  }

  static isEqual(a, b) {
    if (a === b) {
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

    if (a.contextMenuItems.length !== b.contextMenuItems.length) {
      return false;
    }
    for (let aItem of a.contextMenuItems) {
      let bItem = b.getContextMenuItem(aItem.id);
      if (aItem === bItem) {
        continue;
      }
      if (
        aItem.contexts.length !== bItem.contexts.length ||
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
      // 'tab-clicked',
      'tab-mousedown',
      'tab-mouseup',
    ];
  }
  static getUnloadTabContextMenuItem() {
    return {
      id: 'unload-tab',
      title: browser.i18n.getMessage('contextMenu_unloadTab'),
      type: 'normal',
      contexts: ['tab']
    };
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
            invalidateTST(); // passive registration for secondary (or after) startup
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


    var invalidateTST = async () => {
      if (blockTimeoutId !== null) {
        invalidated = true;
        return;
      }
      block();
      invalidated = false;

      if (!TSTState.isEqual(currentState, this.state)) {
        let newState = Object.assign(new TSTState(), this.state);

        if (newState.listeningTypes.length > 0 || newState.contextMenuItems.length > 0) {
          // Update listening types:
          let success = await TSTManager.registerToTST(newState.listeningTypes);
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
    if (changes.unloadOnMiddleClick && false) {
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
      handleTabUnload();
    }
  };
  var onMouseDown = (message) => {
    if (handleTabUnload) {
      handleTabUnload();
    }
    if (message.tab.discarded) {
      return false;
    }
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
    let shouldDiscard = combo.test(message.ctrlKey, message.shiftKey, message.altKey, message.metaKey);
    if (shouldDiscard) {
      if (!combo.timeout || combo.timeout <= 0) {
        unloadTab(message.tab);
      } else {
        // Unload tab only if mouse down time is less then a certain time:
        let mouseDownTime = Date.now();
        let timeoutTime = combo.timeout;
        handleTabUnload = () => {
          handleTabUnload = null;

          let timeSiceMouseDown = Date.now() - mouseDownTime;
          if (timeSiceMouseDown < timeoutTime) {
            unloadTab(message.tab);
          }
        }
      }
    }
    return shouldDiscard;
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
      case 'tab-mousedown':
        let preventAction = onMouseDown(message);
        return Promise.resolve(preventAction);
        break;
      case 'tab-mouseup':
        return onMouseUp(message);
        break;
      case 'fake-contextMenu-click':
        onMenuItemClick(message.info, message.tab);
        break;
    }
  });
}



start();