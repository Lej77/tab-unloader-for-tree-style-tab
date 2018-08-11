
// #region Constants

// #region Tree Style Tab

const kTST_ID = 'treestyletab@piro.sakura.ne.jp';
const tstAPI = Object.freeze({
  REGISTER_SELF: 'register-self',
  UNREGISTER_SELF: 'unregister-self',
  PING: 'ping',
  NOTIFY_READY: 'ready',
  NOTIFY_SHUTDOWN: 'shutdown', // defined but not notified for now.
  NOTIFY_TAB_CLICKED: 'tab-clicked', // for backward compatibility
  NOTIFY_TAB_MOUSEDOWN: 'tab-mousedown',
  NOTIFY_TAB_MOUSEUP: 'tab-mouseup',
  NOTIFY_TABBAR_CLICKED: 'tabbar-clicked', // for backward compatibility
  NOTIFY_TABBAR_MOUSEDOWN: 'tabbar-mousedown',
  NOTIFY_TABBAR_MOUSEUP: 'tabbar-mouseup',
  NOTIFY_TAB_DRAGREADY: 'tab-dragready',
  NOTIFY_TAB_DRAGCANCEL: 'tab-dragcancel',
  NOTIFY_TAB_DRAGSTART: 'tab-dragstart',
  NOTIFY_TAB_DRAGENTER: 'tab-dragenter',
  NOTIFY_TAB_DRAGEXIT: 'tab-dragexit',
  NOTIFY_TAB_DRAGEND: 'tab-dragend',
  NOTIFY_TRY_MOVE_FOCUS_FROM_CLOSING_CURRENT_TAB: 'try-move-focus-from-closing-current-tab',
  GET_TREE: 'get-tree',
  ATTACH: 'attach',
  DETACH: 'detach',
  INDENT: 'indent',
  DEMOTE: 'demote',
  OUTDENT: 'outdent',
  PROMOTE: 'promote',
  MOVE_UP: 'move-up',
  MOVE_DOWN: 'move-down',
  FOCUS: 'focus',
  DUPLICATE: 'duplicate',
  GROUP_TABS: '${options.markerTabClass}s',
  GET_TREE_STRUCTURE: 'get-tree-structure',
  SET_TREE_STRUCTURE: 'set-tree-structure',
  COLLAPSE_TREE: 'collapse-tree',
  EXPAND_TREE: 'expand-tree',
  ADD_TAB_STATE: 'add-tab-state',
  REMOVE_TAB_STATE: 'remove-tab-state',
  SCROLL: 'scroll',
  SCROLL_LOCK: 'scroll-lock',
  SCROLL_UNLOCK: 'scroll-unlock',
  NOTIFY_SCROLLED: 'scrolled',
  BLOCK_GROUPING: 'block-grouping',
  UNBLOCK_GROUPING: 'unblock-grouping',
});

// #endregion Tree Style Tab


const kATD_ID = '{c2c003ee-bd69-42a2-b0e9-6f34222cb046}';


const messagePrefix = 'message_';

const tstContextMenuItemIds = Object.freeze({
  unloadTab: 'unload-tab',
  unloadTree: 'unload-tree',
});
const messageTypes = Object.freeze({
  updateTabHide: 'updateTabHide',
  tabHideAPIChanged: 'tabHideAPIChanged',
  permissionsChanged: 'permissionsChanged',
  styleChanged: 'styleChanged',
  getActiveStyle: 'getActiveStyle',
});
const defaultValues = Object.freeze({
  get Settings() {
    let createComboData = (data) => {
      return Object.assign(MouseClickCombo.getDefaultValues(), data);
    };
    return {
      isEnabled: true,

      unloadOnLeftClick: createComboData({
        enabled: true,
        alt: true,
        meta: true,
      }),
      unloadOnMiddleClick: createComboData({
        enabled: true,

        anyKeyMode: false,

        maxTimeout: 0,
        minTimeout: 0,

        dontPreventTSTAction: true,
      }),
      unloadOnRightClick: createComboData({
        enabled: true,
        ctrl: true,
        shift: true,
        alt: true,
        meta: true,
      }),
      selectOnLeftClick: createComboData({
        enabled: true,

        maxTimeout: 0,

        alt: true,
        meta: true,

        doubleClickOnly: false,

        onDragEnabled: false,
        onDragCancel: true,
        onDragMouseUpTrigger: true,

        applyToAllTabs: true,
        applyToUnloadedTabs: true,
      }),
      closeOnMiddleClick: createComboData({
        enabled: true,

        anyKeyMode: false,

        maxTimeout: 0,
        minTimeout: 0,

        doubleClickEnabled: true,
        doubleClickOnly: false,

        applyToAllTabs: false,
        applyToUnloadedTabs: false,
      }),

      tabHide_HideUnloadedTabs: false,
      tabHide_ShowHiddenTabsInTST: false,


      fixTabRestore_waitForUrlInMilliseconds: 500,
      fixTabRestore_waitForIncorrectLoad: 500,
      fixTabRestore_fixIncorrectLoadAfter: 500,


      fixTabRestore_reloadBrokenTabs: false,
      fixTabRestore_reloadBrokenTabs_private: false,

      fixTabRestore_reloadBrokenTabs_quickUnload: true,
      fixTabRestore_reloadBrokenTabs_private_quickUnload: true,


      command_unloadTab_fallbackToLastSelected: false,
      command_unloadTab_ignoreHiddenTabs: false,

      command_unloadTree_fallbackToLastSelected: false,
      command_unloadTree_ignoreHiddenTabs: false,


      unloadInTSTContextMenu: true,
      unloadInTSTContextMenu_CustomLabel: '',
      unloadInTSTContextMenu_fallbackToLastSelected: false,
      unloadInTSTContextMenu_ignoreHiddenTabs: false,

      unloadTreeInTSTContextMenu: false,
      unloadTreeInTSTContextMenu_CustomLabel: '',
      unloadTreeInTSTContextMenu_fallbackToLastSelected: false,
      unloadTreeInTSTContextMenu_ignoreHiddenTabs: false,

      tstContextMenu_CustomRootLabel: '',
      tstContextMenuOrder: [
        tstContextMenuItemIds.unloadTab,
        tstContextMenuItemIds.unloadTree
      ],

      delayedTSTRegistrationTimeInMilliseconds: 4000,


      dimUnloadedTabs: true,

      unloadAgainAfterDelay: -1,
      unloadViaAutoTabDiscard: false,

      disableOptionsPageAnimations: false,
    };
  },
  get MouseClickCombo() {
    return {
      enabled: false,

      anyKeyMode: true,          // If true then at least one of the selected keys must be pressed (but not all). If there are no selected keys then allways unload tabs on click.
      ctrl: false,
      shift: false,
      alt: false,
      meta: false,

      maxTimeout: 500,            // Maximum time between mouse-down and mouse-up events to trigger tab unload. Prevents unload operation if tab is long pressed or being dragged.
      minTimeout: 0,              // Minium time between mouse-down and mouse-up events to trigger tab unload. Allows for long pressing tabs to unload them.

      doubleClickEnabled: false,  // If true then special behavior will be implemented for double clicks.
      doubleClickOnly: true,      // If true then only double clicks will unload tabs; otherwise double clicks will cancel the unload operation from the first click.
      doubleClickTimeout: 500,    // Maximum time between mouse-down events to be recognized as a double click.

      onDragEnabled: false,        // Wait for drag events before discarding tab.
      onDragCancel: false,         // If true then tab will not be unloaded if drag events occured; otherwise tab will only be unloaded if drag events occured.
      onDragMouseUpTrigger: false, // If true then if a mouse up event is registered before the timeout it counts as a drag event.
      onDragTimeout: 500,          // Time in milliseconds to wait for drag events before unloading tab.

      dontPreventTSTAction: false,    // Don't prevent Tree Style Tab's default action while waiting to decide if the tab should be unloaded.
      applyToAllTabs: false,          // Apply click on both loaded and unloaded tabs.
      applyToUnloadedTabs: false,     // Apply click on unloaded tabs instead of loaded tabs.

      fallbackToLastSelected: false,  // If the tab that should be unloaded is active then the selection of the tab that is activated instead is affected by this option. If true then the last selected tab is used, otherwise the closest tab is used.
      ignoreHiddenTabs: false,        // If the tab that should be unloaded is active then another tab will be selected. If this option is true then all hidden tabs will be ignored when looking for another tab.
    };
  },
  get MouseClickComboCollection() {
    let standardMessages = {

    };
    let getStandardMessages = () => {
      return Object.assign({}, standardMessages);
    };
    let getStandardInfo = () => {
      let obj = {
        get allowDragDrop() {
          return obj.button === 0;
        },
      };
      return obj;
    };
    let createInfo = (obj) => {
      let info = Object.assign(getStandardInfo(), obj);
      info.messages = Object.assign(getStandardMessages(), info.messages);
      return info;
    };
    return new MouseClickComboCollection([
      new MouseClickCombo(createInfo({
        button: 0,
        settingKey: 'unloadOnLeftClick',
        messages: {
          enable: 'options_unloadOnLeftClick',
        },
      })),
      new MouseClickCombo(createInfo({
        button: 1,
        settingKey: 'unloadOnMiddleClick',
        messages: {
          enable: 'options_unloadOnMiddleClick',
        },
      })),
      new MouseClickCombo(createInfo({
        button: 2,
        settingKey: 'unloadOnRightClick',
        messages: {
          enable: 'options_unloadOnRightClick',
        },
      })),
      new MouseClickCombo(createInfo({
        button: 0,
        settingKey: 'selectOnLeftClick',
        messages: {
          enable: 'options_selectOnLeftClick',
        },

        dontUnload: true,
        allwaysPreventTSTAction: true,
        applyToUnloadedTabs: true,
        allowForAll: true,
      })),
      new MouseClickCombo(createInfo({
        button: 1,
        settingKey: 'closeOnMiddleClick',
        messages: {
          enable: 'options_closeOnMiddleClick',
        },

        dontUnload: true,
        allwaysPreventTSTAction: true,
        applyToUnloadedTabs: true,
        allowForAll: true,
      })),
    ]);
  },
});

// #endregion Constants


// #region Utilities

async function delay(timeInMilliseconds) {
  return await new Promise((resolve, reject) => timeInMilliseconds < 0 ? resolve() : setTimeout(resolve, timeInMilliseconds));
}

/**
 * A delay that will be canceled if a disposable collection is disposed.
 * 
 * @param {number} timeInMilliseconds Time in milliseconds to wait.
 * @param {DisposableCollection} [disposables=null] Disposables collection to bind delay to.
 * @returns {boolean} True if successful. False if canceled.
 */
async function boundDelay(timeInMilliseconds, disposables = null) {
  if (!disposables) {
    await delay(timeInMilliseconds);
    return true;
  }
  return new Promise((resolve, reject) => {
    try {
      let timeout = new Timeout(() => {
        resolve(true);
      }, timeInMilliseconds);
      timeout.onDisposed.addListener(() => {
        resolve(false);
      });
      if (disposables) {
        disposables.trackDisposables(timeout);
      }
    } catch (error) {
      reject(error);
    }
  });
}

let createObjectFromKeys = function (
  keys,                   // array of strings.
  values,                 // object, or array of objects.
  defaultValue = null     // object.
) {
  if (keys && Array.isArray(keys)) {
    let data = {};
    let valueIsArray = Array.isArray(values);
    for (let i = 0; i < keys.length; i++) {
      if (typeof keys[i] === 'string')
        data[keys[i]] = valueIsArray ? (i < values.length ? values[i] : defaultValue) : values;
    }
    return data;
  } else {
    return keys;
  }
};

let defineProperty = (obj, propertyName, get, set) => {
  let getSet = {};
  if (get) {
    getSet.get = get;
  }
  if (set) {
    getSet.set = set;
  }
  Object.defineProperty(obj, propertyName, getSet);
};

let accessDataObjectWithProperties = (accessObject, dataObject) => {
  let onChangeManager = new EventManager();
  let propKeys = Object.keys(dataObject);

  for (let key of propKeys) {
    defineProperty(accessObject, key,
      function () {
        return dataObject[key];
      },
      function (value) {
        if (dataObject[key] === value) {
          return;
        }
        let old = dataObject[key];
        dataObject[key] = value;
        onChangeManager.fire(key, old, value);
      }
    );
  }
  return onChangeManager.subscriber;
};

let checkAny = (array) => {
  array = array.filter(value => value);
  if (array.length === 0) {
    return false;
  }

  let promiseWrapper = new PromiseWrapper();

  let promises = 0;
  let waitForValue = async (value) => {
    try {
      value = await value;
      if (value) {
        promiseWrapper.resolve(value);
      }
    } finally {
      promises--;

      if (promises <= 0) {
        promiseWrapper.resolve(false);
      }
    }
  };

  promises++;
  for (let value of array) {
    promises++;
    waitForValue(value);
  }
  promises--;

  if (promises <= 0) {
    promiseWrapper.resolve(false);
  }
  return promiseWrapper.getValue();
};

/**
 * Copy an object by serializing and then deserializing it with JSON.
 * 
 * @param {Object} value Object to copy.
 * @returns {Object} A copy of the provided object.
 */
let deepCopy = (value) => {
  if (!value) {
    return value;
  }
  if (typeof value === 'string') {
    return value;
  }
  let jsonCopy = JSON.parse(JSON.stringify(value));
  return jsonCopy;
};

/**
 * Compare two object by serializing them to JSON.
 * 
 * @param {Object} a The first object.
 * @param {Object} b The second object.
 * @returns {boolean} If they are equal
 */
let deepCopyCompare = (a, b) => {
  if (a === b) {
    return true;
  }
  if (!a && !b) {
    return a === b;
  }
  if (!a || !b) {
    return false;
  }
  let aString = typeof a === 'string';
  let bString = typeof b === 'string';
  if (aString && bString) {
    return a === b;
  } else if (aString || bString) {
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
};

// #endregion Utilities


// #region Settings

/**
 * The extension's settings.
 * 
 * @class Settings
 */
class Settings {
  constructor() {
    Object.assign(this, Settings.getDefaultValues());
  }

  static getDefaultValues() {
    return defaultValues.Settings;
  }


  // #region Manage storage

  static async get(
    key,                    // string, array of string, or object (property names are keys and values are set values).
    defaultValue = null     // object, or array of objects. Ignored if key is an object (not string).
  ) {
    if (typeof key === "string") {
      return (await browser.storage.local.get({ [key]: defaultValue }))[key];
    } else {
      let data = createObjectFromKeys(key, defaultValue);
      return await browser.storage.local.get(data);
    }
  }
  static async set(
    key,            // string, array of string, or object (property names are keys and values are set values).
    value = null    // object, or array of objects. Ignored if key is an object (not string).
  ) {
    if (typeof key === "string") {
      return await browser.storage.local.set({
        [key]: value
      });
    } else {
      let data = createObjectFromKeys(key, value);
      return await browser.storage.local.set(data);
    }
  }
  static async remove(
    key     // string, or array of strings.
  ) {
    return browser.storage.local.remove(key);
  }
  static async clear() {
    return browser.storage.local.clear();
  }

  // #endregion Manage storage


  /**
   * Create an event listener for storage changes.
   * 
   * @static
   * @param {any} callback (changes, areaName) Function that will be called when this event occurs. The function will be passed the following arguments:
   * changes:    object. Object describing the change. This contains one property for each key that changed. The name of the property is the name of the key that changed, and its value is a storage.StorageChange object describing the change to that item.
   * areaName:   string. The name of the storage area ("sync", "local" or "managed") to which the changes were made.
   * @returns {EventListener} An event listener for browser.storage.onChanged.
   * @memberof Settings
   */
  static createChangeEventListener(callback) {
    return new EventListener(browser.storage.onChanged, callback);
  }
}


/**
 * Keeps a settings object up to date and notifies of any changes.
 * 
 * @class SettingsTracker
 */
class SettingsTracker {
  constructor(storageArea = null, callback = null, fallbackToDefault = true) {
    if (!storageArea || typeof storageArea !== "string") {
      storageArea = "local";
    }

    defineProperty(this, 'fallbackToDefault', () => fallbackToDefault, (value) => { fallbackToDefault = value; });

    var onChange = new EventManager();
    this.onChange = onChange.subscriber;
    onChange.addListener(callback);

    this.settings = new Settings();

    let changedProperties = [];
    let changeListener = Settings.createChangeEventListener((changes, areaName) => {
      if (areaName === storageArea) {
        let keys = Object.keys(changes);
        if (changedProperties) {
          changedProperties.push.apply(keys.filter((change) => !changedProperties.includes(change)));
        }
        let defaultSettings;
        let defaultSettingsKeys;
        for (let key of keys) {
          if (Object.keys(changes[key]).includes('newValue')) {
            this.settings[key] = changes[key].newValue;
          } else {
            if (fallbackToDefault && (!defaultSettings || !defaultSettingsKeys)) {
              defaultSettings = Settings.getDefaultValues();
              defaultSettingsKeys = Object.keys(defaultSettings);
            }
            if (fallbackToDefault && defaultSettingsKeys.includes(key)) {
              this.settings[key] = defaultSettings[key];
            } else {
              delete this.settings[key];
            }
          }
        }
        onChange.fire(changes, areaName);
      }
    });
    let start = async () => {
      let allSettings = await Settings.get(null);
      for (let key of Object.keys(allSettings)) {
        if (!changedProperties.includes(key)) {
          this.settings[key] = allSettings[key];
        }
      }
      changedProperties = null;
    };

    this.start = start();
    this.stop = () => {
      changeListener.close();
    };
  }
}

// #endregion Settings


// #region Events

/**
 * Listens to an event.
 * 
 * @class EventListener
 */
class EventListener {

  /**
   * Creates an instance of EventListener.
   * @param {any} DOMElementOrEventObject If DOM event: the DOM object to listen on. Otherwise: the event object to add a listener to.
   * @param {any} eventNameOrCallback If DOM event: the name of the event. Otherwise: callback.
   * @param {any} callbackOrExtraParameters If DOM event: callback. Otherwise: optional extra paramater for the add listener function.
   * @memberof EventListener
   */
  constructor(DOMElementOrEventObject, eventNameOrCallback, callbackOrExtraParameters = null) {
    Object.assign(this, {
      _onClose: null,
    });

    if (typeof eventNameOrCallback === 'string' && typeof callbackOrExtraParameters === 'function') {
      this._DOMElement = DOMElementOrEventObject;
      this._event = eventNameOrCallback;
      this._callback = callbackOrExtraParameters;
    } else {
      this._event = DOMElementOrEventObject;
      this._callback = eventNameOrCallback;
      this._extraParameter = callbackOrExtraParameters;
    }

    if (this._DOMElement) {
      this._DOMElement.addEventListener(this._event, this._callback);
    } else {
      if (this._extraParameter) {
        this._event.addListener(this._callback, this._extraParameter);
      } else {
        this._event.addListener(this._callback);
      }
    }
  }

  close() {
    if (this._callback) {
      if (this._DOMElement) {
        this._DOMElement.removeEventListener(this._event, this._callback);
      } else {
        this._event.removeListener(this._callback);
      }
      this._callback = null;
      if (this._onClose) {
        this._onClose.fire(this);
      }
    }
  }

  get isDisposed() {
    return !Boolean(this._callback);
  }
  get isActive() {
    if (this._DOMElement) {
      return !this.isDisposed;
    } else {
      return this._event.hasListener(this._callback);
    }
  }

  get onClose() {
    if (!this._onClose) {
      this._onClose = new EventManager();
    }
    return this._onClose.subscriber;
  }
}


/**
 * Keeps track of listeners for an event.
 * 
 * @class EventSubscriber
 */
class EventSubscriber {
  constructor(changeCallback = null) {
    this._listeners = [];
    if (changeCallback && typeof changeCallback === 'function') {
      this._changeCallback = changeCallback;
    }
  }

  addListener(listener) {
    if (!listener || typeof listener !== 'function') {
      return;
    }
    if (this._listeners.includes(listener)) {
      return;
    }
    this._listeners.push(listener);
    if (this._changeCallback) {
      this._changeCallback(this, listener, true);
    }
  }
  removeListener(listener) {
    let removed = false;
    while (true) {
      let index = this._listeners.indexOf(listener);
      if (index < 0) {
        break;
      }
      removed = true;
      this._listeners.splice(index, 1);
    }
    if (this._changeCallback && removed) {
      this._changeCallback(this, listener, false);
    }
  }
  hasListener(listener) {
    return this._listeners.includes(listener);
  }
}


/**
 * Advanced features for an event subscriber such as calling all listeners.
 * 
 * @class EventManager
 * @extends {EventSubscriber}
 */
class EventManager extends EventSubscriber {
  constructor() {
    super();
    this._changeCallback = this._handleChange.bind(this);
  }

  _handleChange() {
    if (this._onChange) {
      this._onChange.fire.apply(this._onChange, Array.from(arguments));
    }
  }

  fire() {
    let returned = [];
    if (this._listeners.length > 0) {
      let args = Array.from(arguments);
      for (let listener of this._listeners.slice()) {
        try {
          returned.push(listener.apply(null, args));
        } catch (error) {
          console.log('Error during event handling!\n', error, '\nStack Trace:\n', error.stack);
        }
      }
    }
    return returned;
  }

  get listeners() {
    return this._listeners.slice();
  }
  set listeners(value) {
    this._listeners = value;
    if (this._onChange) {
      this._onChange.fire(this);
    }
  }

  get listenersLength() {
    return this._listeners.length;
  }

  /**
   * An event that is triggered when the event listeners are changed. Args: manager, listener [optional], added [optional]
   * 
   * @readonly
   * @memberof EventManager
   */
  get onChanged() {
    if (!this._onChange) {
      this._onChange = new EventManager();
    }
    return this._onChange;
  }

  /**
   * 
   * 
   * @returns {EventSubscriber} A event subscriber that is connected to this manager.
   * @readonly
   * @memberof EventManager
   */
  get subscriber() {
    if (!this._subscriber) {
      this._subscriber = new EventSubscriber(this._changeCallback);
      defineProperty(this._subscriber, '_listeners', () => this._listeners, (value) => { this._listeners = value; });
    }
    return this._subscriber;
  }

  /**
   * Create an event that passes on data from another event.
   * 
   * @static
   * @param {EventSubscriber} originalEvent The original event.
   * @param {Function} [returnModifier=null] Allows modifying the returned values. The first arg is the an array of the listeners returned value. The array returned by this function will be used instead. If a false value is returned it will be used as return value.
   * @param {Function} [argumentModifier=null] Modify the arguments passed to the listeners. The first arg is an array of the args that will be used. The array returned by this function will be used instead. If a false value is returned then the listeners will not be called.
   * @returns {EventSubscriber} The modified event.
   * @memberof EventManager
   */
  static createPassthroughEventManager(originalEvent, returnModifier = null, argumentModifier = null) {
    var checkIfFunction = (test) => test && typeof test === 'function';
    var hasReturnMod = checkIfFunction(returnModifier);
    var hasArgMod = checkIfFunction(argumentModifier);

    var originalEventListener = null;
    var passthroughEventManager = new EventManager();

    var start = () => {
      if (!originalEventListener) {
        originalEventListener = new EventListener(originalEvent, function () {
          let args = Array.from(arguments);
          if (hasArgMod) {
            args = argumentModifier(args);
            if (!args || !Array.isArray(args)) {
              return;
            }
          }
          let returned = passthroughEventManager.fire.apply(passthroughEventManager, args);
          if (hasReturnMod) {
            returned = returnModifier(returned);
            if (!returned || !Array.isArray(returned)) {
              return returned;
            }
          }
          if (returned.length === 0) {
            return;
          }
          if (returned.length === 1) {
            if (hasReturnMod) {
              return returnModifier(returned[0]);
            }
            return returned[0];
          }
          let firstNotUndefined;
          for (let value of returned) {
            if (value) {
              return value;
            }
            if (firstNotUndefined === undefined && value !== undefined) {
              firstNotUndefined = value;
            }
          }
          return firstNotUndefined;
        });
      }
    };
    var stop = () => {
      if (originalEventListener) {
        originalEventListener.close();
        originalEventListener = null;
      }
    };

    passthroughEventManager.onChanged.addListener(() => {
      if (passthroughEventManager.listenersLength === 0) {
        stop();
      } else {
        start();
      }
    });

    return passthroughEventManager;
  }
}

// #endregion Events


// #region Delays

/**
 * Allows synchronous access to a Promise's resolve and reject functions.
 * 
 * @class PromiseWrapper
 */
class PromiseWrapper {

  /**
   * Creates an instance of PromiseWrapper.
   * @param {boolean} [createPromise=true] Determines if a promise should be created immediately.
   * @memberof PromiseWrapper
   */
  constructor(createPromise = true) {
    Object.assign(this, {
      _resolve: null,
      _reject: null,
      _value: null,
      _isError: false,
      _set: false,
      _promise: null,
    });

    if (createPromise) {
      this.createPromise();
    }
  }


  resolve(value) {
    this.setValue(value, false);
  }

  reject(error) {
    this.setValue(error, true);
  }

  setValue(value, isError = false) {
    if (this._set) {
      return;
    }
    this._set = true;
    this._isError = isError;
    this._value = value;

    if (isError) {
      if (this._reject) {
        this._reject(value);
      }
    } else {
      if (this._resolve) {
        this._resolve(value);
      }
    }
  }

  createPromise() {
    if (this.isPromiseCreated) {
      return;
    }
    this._promise = new Promise((resolve, reject) => {
      if (this._set) {
        if (this._isError) {
          reject(this._value);
        } else {
          resolve(this._value);
        }
      }
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  /**
   * Returns a promise if it is available or if it is the only way to provide the results.
   * 
   * @returns {any} Either a promise that will be resolved to the correct value or the value that the promise would have been resolved to.
   * @memberof PromiseWrapper
   */
  getValue() {
    if (this.isPromiseCreated || !this.done || this.isError) {
      return this.promise;
    }
    return this.value;
  }

  get promise() {
    this.createPromise();
    return this._promise;
  }

  get isPromiseCreated() {
    return Boolean(this._promise);
  }

  /**
   * Indicates if the promise has a value, that is to say has been resolved or rejected.
   * 
   * @readonly
   * @memberof PromiseWrapper
   */
  get done() {
    return Boolean(this._set);
  }

  /**
   * Indicates if the promise was rejected.
   * 
   * @readonly
   * @memberof PromiseWrapper
   */
  get isError() {
    return Boolean(this._isError);
  }

  /**
   * The value that the promise was resolved or rejected with.
   * 
   * @readonly
   * @memberof PromiseWrapper
   */
  get value() {
    return this._value;
  }

}


/**
 * Tracks disposables and disposes of them when a promise is resolved.
 * 
 * @class OperationManager
 */
class OperationManager {
  constructor() {
    var promiseWrapper = new PromiseWrapper(false);
    let disposableCollection = new DisposableCollection();

    let setValue = (value, isError = false) => {
      if (isError) {
        promiseWrapper.reject(value);
      } else {
        promiseWrapper.resolve(value);
      }
      disposableCollection.dispose();
    };

    this.trackDisposables = (disposables) => disposableCollection.trackDisposables(disposables);

    defineProperty(this, 'done', () => promiseWrapper.done);

    defineProperty(this, 'value',
      () => promiseWrapper.getValue(),
      (value) => setValue(value)
    );

    this.resolve = (value) => setValue(value);
    this.reject = (value) => setValue(value, true);
  }
}


/**
 * Wrap a setTimeout call and keep track of the timeoutId.
 * 
 * @class Timeout
 */
class Timeout {

  constructor(callback, timeInMilliseconds) {
    Object.assign(this, {
      _isDisposed: false,
      _onDisposed: new EventManager(),

      _timeoutId: null,
      _callback: callback,

      _timeInMilliseconds: timeInMilliseconds,
    });
    this._start();
  }

  _start() {
    if (this._callback && typeof this._callback === 'function') {
      this._timeoutId = setTimeout(() => {
        this._timeoutId = null;
        try {
          this._callback();
        } finally {
          this.dispose();
        }
      }, this._timeInMilliseconds);
    }
  }


  // #region Dispose

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    if (this._timeoutId !== null) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
    this._onDisposed.fire(this);
  }
  get isDisposed() {
    return this._isDisposed;
  }
  get onDisposed() {
    return this._onDisposed.subscriber;
  }

  close() {
    this.dispose();
  }
  get isClosed() {
    return this.isDisposed;
  }
  get onClosed() {
    return this.onDisposed;
  }

  stop() {
    this.dispose();
  }
  get isStoped() {
    return this.isDisposed;
  }
  get onStop() {
    return this.onDisposed;
  }
  get onStoped() {
    return this.onDisposed;
  }

  get isActive() {
    return Boolean(this._timeoutId !== null);
  }

  // #endregion Dispose

  get promise() {
    return new Promise((resolve, reject) => {
      if (this.isDisposed) {
        resolve();
      } else {
        this.onDisposed.addListener(resolve);
      }
    });
  }

  get callback() {
    return this._callback;
  }

}


/**
 * Ensure a callback isn't called too often.
 * 
 * @class RequestManager
 */
class RequestManager {

  constructor(callback = null, blockTimeInMilliseconds = 1000, simultaneousUpdates = false) {
    Object.assign(this, {
      _isDisposed: false,
      _onDisposed: new EventManager(),

      _onUpdate: new EventManager(),

      _blockTimeout: null,
      _invalidated: false,
      _lastArgs: [],
      _confirmPromiseWrapper: new PromiseWrapper(),

      _simultaneousUpdates: simultaneousUpdates,
      _updates: 0,

      blockTimeInMilliseconds: blockTimeInMilliseconds,
    });

    this._onUpdate.addListener(callback);
  }

  /**
   * Block all updates.
   * 
   * @param {any} [overrideTime=null] The time to block the updates in milliseconds. If false the default time will be used.
   * @returns {Timeout} A Timeout object that will be closed when the block has expired.
   * @memberof RequestManager
   */
  block(overrideTime = null) {
    if (this._blockTimeout) {
      this._blockTimeout.stop();
    }
    if (this.isDisposed) {
      return;
    }
    let time;
    if (overrideTime || overrideTime === 0) {
      time = overrideTime;
    } else if (typeof this.blockTimeInMilliseconds === 'function') {
      time = this.blockTimeInMilliseconds();
    } else {
      time = this.blockTimeInMilliseconds;
    }
    this._blockTimeout = new Timeout(() => this.unblock(), time);
    return this._blockTimeout;
  }

  /**
   * Unblock and update if invalidated.
   * 
   * @memberof RequestManager
   */
  unblock() {
    if (this._blockTimeout) {
      this._blockTimeout.stop();
    }
    if (this.isInvalidated) {
      this._update();
    }
  }

  /**
   * Unblock and update. Forces an update now and block after it.
   * 
   * @memberof RequestManager
   */
  async forceUpdate() {
    this._lastArgs = Array.from(arguments);
    await this._update(true);
  }

  async _update(external = false) {
    if (this.isDisposed) {
      return;
    }
    if (!this._simultaneousUpdates && this.updateInProgress) {
      // Unblocked but last update has yet to complete.
      this._invalidated = true;
      if (external) {
        await this._confirmPromiseWrapper.getValue();
      }
      return;
    }

    let b = this.block();
    this._invalidated = false;

    let args = this._lastArgs;
    this._lastArgs = [];

    let affectedConfirmPromise = this._confirmPromiseWrapper;
    this._confirmPromiseWrapper = new PromiseWrapper();
    this._confirmPromiseWrapper.promise.then((value) => affectedConfirmPromise.resolve(value));

    let releaseBlock = false;
    try {
      this._updates++;
      releaseBlock = await checkAny(this._onUpdate.fire.apply(this._onUpdate, args));

      if (releaseBlock && b === this._blockTimeout) {
        this.unblock();
      }
    } finally {
      this._updates--;
      affectedConfirmPromise.resolve(true);
      if (!this.isBlocked && this.isInvalidated) {
        if (this._simultaneousUpdates || !this.updateInProgress) {
          this._update();
        }
      }
    }
  }

  /**
   * Update after block is released.
   * 
   * @returns {boolean} True if update was successful.
   * @memberof RequestManager
   */
  async invalidate() {
    if (this.isDisposed) {
      return false;
    }
    this._invalidated = true;
    this._lastArgs = Array.from(arguments);
    let updatePromise = this._confirmPromiseWrapper.getValue();
    if (!this.isBlocked) {
      this._update();
    }
    return updatePromise;
  }


  get isBlocked() {
    return this._blockTimeout && this._blockTimeout.isActive;
  }

  get updateInProgress() {
    return this._updates > 0;
  }

  get lastArgs() {
    return this._lastArgs;
  }

  get isInvalidated() {
    return this._invalidated;
  }

  get onUpdate() {
    return this._onUpdate.subscriber;
  }


  // #region Dispose

  /**
   * Unblock and prevent further updates.
   * 
   * @memberof RequestManager
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;

    this._confirmPromiseWrapper.resolve(false);
    this.unblock();

    this._onDisposed.fire(this);
  }

  get isDisposed() {
    return this._isDisposed;
  }
  get onDisposed() {
    return this._onDisposed.subscriber;
  }

  // #endregion Dispose

}


/**
 * Delay events and handle them later.
 * 
 * @class EventQueue
 */
class EventQueue {
  constructor() {
    Object.assign(this, {
      _isDisposed: false,

      queuedEvents: [],
      unsafeToContinue: false,
    });
  }

  /**
   * Handle an event. The callback might be delayed.
   * 
   * @param {Function} callback Function to call when the event should be handled. First arg is a Boolean that is true if the callback was delayed.
   * @param {boolean} [safeToDelay=false] Indicates if it is safe to delay the event handler.
   * @memberof EventQueue
   */
  handleEvent(callback, safeToDelay = false) {
    if (this.queuedEvents) {
      this.queuedEvents.push(callback);
      if (!safeToDelay) {
        this.unsafeToContinue = true;
      }
    } else if (!this.isDisposed) {
      callback(false);
    }
  }
  handleQueuedEvents(dontDelayFutureEvents = false) {
    while (!this.isDisposed && this.queuedEvents && this.queuedEvents.length > 0) {
      this.queuedEvents[0](true);
      this.queuedEvents.splice(0, 1);
    }
    if (dontDelayFutureEvents) {
      this.isDelayingEvents = false;
    }
  }
  resetEventQueue() {
    if (this.queuedEvents) {
      this.queuedEvents = [];
    }
    this.unsafeToContinue = false;
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.queuedEvents = [];
    this.unsafeToContinue = false;
  }

  get isDelayingEvents() {
    return Boolean(this.queuedEvents);
  }
  set isDelayingEvents(value) {
    value = Boolean(value);
    if (this.isDelayingEvents === value) {
      return;
    }

    this.queuedEvents = value ? [] : null;
    this.unsafeToContinue = false;
  }

  get isDisposed() {
    return this._isDisposed;
  }
}

// #endregion Delays


// #region Disposables

/**
 * Track disposables and allow for disposing of them all.
 * 
 * @class DisposableCollection
 */
class DisposableCollection {

  /**
   * Creates an instance of DisposableCollection.
   * @param {Object|Array} initialDisposables Disposable object(s) that will be added to the collection.
   * @memberof DisposableCollection
   */
  constructor(initialDisposables) {
    Object.assign(this, {
      _isDisposed: false,
      _trackedDisposables: [],
      _disposedEvents: new Map(),

      _onDisposed: new EventManager(),
    });

    this.trackDisposables(initialDisposables);
  }

  /**
   * Add a disposable object to the collection. It will be disposed of when the collection is disposed.
   * 
   * @param {Object|Array} disposables The object(s) to add to the collection.
   * @memberof DisposableCollection
   */
  trackDisposables(disposables) {
    if (!disposables) {
      return;
    }
    if (!Array.isArray(disposables)) {
      disposables = [disposables];
    }
    for (let disposable of disposables) {
      if (!disposable) {
        continue;
      }
      if (Array.isArray(disposable)) {
        this.trackDisposables(disposable);
        continue;
      }
      if (this.isDisposed) {
        DisposableCollection.disposeOfObject(disposable);
        continue;
      }
      if (DisposableCollection.checkIfDisposed(disposable)) {
        continue;
      }

      if (!this._trackedDisposables.includes(disposable)) {
        this._trackedDisposables.push(disposable);

        let callback = () => {
          this.untrackDisposables(disposable);
        };
        for (let eventName of DisposableCollection.onDisposedEventNames) {
          let listener = DisposableCollection.subscribeEvent(disposable, eventName, callback);
          if (listener) {
            this._disposedEvents.set(disposable, listener);
          }
        }
      }
    }
  }

  /**
   * Remove an object from the collection. The object will no longer be disposed when the collection is disposed.
   * 
   * @param {Object|Array} disposables The object(s) to remove from the collection.
   * @memberof DisposableCollection
   */
  untrackDisposables(disposables) {
    if (this.isDisposed) {
      return;
    }
    if (!disposables) {
      return;
    }
    if (!Array.isArray(disposables)) {
      disposables = [disposables];
    }
    // trackedDisposables = trackedDisposables.filter(disposable => !disposables.includes(disposable));
    for (let disposable of disposables) {
      if (!disposable) {
        continue;
      }
      if (Array.isArray(disposable)) {
        this.untrackDisposables(disposable);
        continue;
      }
      while (true) {
        let index = this._trackedDisposables.indexOf(disposable);
        if (index < 0) {
          break;
        }
        this._trackedDisposables.splice(index, 1);
      }

      let listener = this._disposedEvents.get(disposable);
      if (listener) {
        listener.close();
        this._disposedEvents.delete(disposable);
      }
    }
  }

  /**
   * The disposable objects tracked by the collection.
   * 
   * @readonly
   * @memberof DisposableCollection
   */
  get array() {
    return this._trackedDisposables.slice();
  }

  /**
   * Dispose of all object in the collection without disposing the collection itself.
   * 
   * @memberof DisposableCollection
   */
  disposeOfAllObjects() {
    let disposables = Array.from(this._trackedDisposables);
    this.untrackDisposables(disposables);
    for (let disposable of disposables) {
      try {
        DisposableCollection.disposeOfObject(disposable);
      } catch (error) {
        console.log('Failed to dispose of object.', '\nObject: ', disposable, '\nError: ', error, '\nStack Trace:\n', error.stack);
      }
    }
  }

  /**
   * Dispose of the collection and all the object tracked by it.
   * 
   * @memberof DisposableCollection
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.disposeOfAllObjects();
    this._trackedDisposables = [];
    this._disposedEvents.clear();
    this._onDisposed.fire(this);
  }


  get isDisposed() {
    return this._isDisposed;
  }

  get onDisposed() {
    return this._onDisposed.subscriber;
  }


  static subscribeEvent(obj, eventName, callback) {
    if (obj[eventName] && obj[eventName].addListener && typeof obj[eventName].addListener === 'function') {
      return new EventListener(obj[eventName], callback);
    }
    return null;
  }
  static callFunction(obj, functionName) {
    if (obj[functionName] && typeof obj[functionName] === 'function') {
      obj[functionName]();
      return true;
    }
    return false;
  }
  static checkIfDisposed(obj) {
    for (let propertyName of DisposableCollection.isDisposedPropertyNames) {
      let inverted = false;
      if (propertyName.startsWith('!')) {
        propertyName = propertyName.substr(1);
        inverted = true;
      }
      let value = obj[propertyName];
      if (value) {
        if (inverted) {
          return false;
        }
        return true;
      }
      if (value !== undefined) {
        break;
      }
    }
    return false;
  }
  static disposeOfObject(obj) {
    for (let disposeFunctionName of DisposableCollection.disposeFunctionNames) {
      if (DisposableCollection.callFunction(obj, disposeFunctionName)) {
        break;
      }
    }
  }
}
Object.assign(DisposableCollection, {
  disposeFunctionNames: [
    'dispose',
    'close',
    'stop',
    'cancel',
  ],
  onDisposedEventNames: [
    'onDisposed',
    'onClosed',
    'onStoped',
    'onCanceled',
    'onDispose',
    'onClose',
    'onStop',
    'onCancel',
  ],
  isDisposedPropertyNames: [
    'isDisposed',
    '!isActive',
  ],
});


/**
 * Delay the creation of disposables.
 * 
 * @class DisposableCreators
 */
class DisposableCreators {

  constructor() {
    Object.assign(this, {
      _isDisposed: false,

      disposableCollection: null,
      disposableCreators: [],
    });
  }

  /**
   * Handle a disposable object returned from a callback.
   * 
   * @param {any} createCallback A callback that returns a disposable object. The first arg is a Boolean that is true if the callback was delayed.
   * @memberof DisposableCreators
   */
  createDisposable(createCallback) {
    if (this.isDisposed || !createCallback || typeof createCallback !== 'function') {
      return;
    }
    this.disposableCreators.push(createCallback);
    if (this.disposableCollection) {
      this.disposableCollection.trackDisposables(createCallback(false));
    }
  }

  /**
   * Call all callbacks to create the disposables.
   * 
   * @memberof DisposableCreators
   */
  start() {
    if (this.isDisposed) {
      return;
    }
    if (!this.disposableCollection) {
      let collection = new DisposableCollection();
      collection.onDisposed.addListener(() => {
        if (this.disposableCollection === collection) {
          this.disposableCollection = null;
        }
      });
      this.disposableCollection = collection;
      collection.trackDisposables(this.disposableCreators.map((callback) => callback(true)));
    }
  }

  /**
   *  Dispose of all tracked disposables.
   * 
   * @memberof DisposableCreators
   */
  stop() {
    if (this.disposableCollection) {
      this.disposableCollection.dispose();
    }
  }

  /**
   * Dispose of all tracked disposables and prevent any more from being created.
   * 
   * @memberof DisposableCreators
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.disposableCreators = [];
    this.disposableCollection = null;
  }

  /**
   * Is delaying the creation of any new disposables for later.
   * 
   * @readonly
   * @memberof DisposableCreators
   */
  get isDelaying() {
    return !this.isStarted;
  }

  /**
   * Creators have been called and any new creaters will be created immediately.
   * 
   * @readonly
   * @memberof DisposableCreators
   */
  get isStarted() {
    return Boolean(this.disposableCollection);
  }

  get isDisposed() {
    return this._isDisposed;
  }
}

// #endregion Disposables


// #region Connections

class PortManager {
  constructor() {
    Object.assign(this, {
      _isDisposed: false,
      _onDisposed: new EventManager(),

      _onMessage: new EventManager(),

      _disposables: new DisposableCollection(),
      _ports: new DisposableCollection(),
    });

    this._disposables.trackDisposables([
      this._ports,
      new EventListener(browser.runtime.onMessage, (message, sender) => this._handleMessage(message, sender)),
      new EventListener(browser.runtime.onConnect, (port) => this._ports.trackDisposables(new PortConnection(port))),
    ]);
  }

  getPortById(portId) {
    for (let port of this.openPorts) {
      if (port.id === portId) {
        return port;
      }
    }
    return null;
  }

  fireEvent(eventName, args = []) {
    for (let port of this.openPorts) {
      port.fireEvent(eventName, args);
    }
  }

  async _handleMessage(message, sender) {
    let port = this.getPortById(message.portId);

    let disposables = new DisposableCollection();
    if (port) {
      port._operations.trackDisposables(disposables);
    }

    let messageReturns = this._onMessage.fire(message, sender, disposables, this);
    let firstDefined;
    for (let value of messageReturns) {
      if (value) {
        firstDefined = value;
        break;
      }
      if (firstDefined === undefined) {
        firstDefined = value;
      }
    }
    try {
      await firstDefined;
    } catch (error) {
      console.log('Error on async runtime message handling\n', error, '\nStack Trace:\n', error.stack);
    }
    disposables.dispose();
    return firstDefined;
  }

  // #region Dispose

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._disposables.dispose();
    this._onDisposed.fire(this);
  }

  get isDisposed() {
    return this._isDisposed;
  }
  get onDisposed() {
    return this._onDisposed.subscriber;
  }

  // #endregion Dispose

  get openPorts() {
    return this._ports.array;
  }
  get onMessage() {
    return this._onMessage.subscriber;
  }
}


class PortConnection {
  constructor(port = null) {
    if (!port) {
      port = browser.runtime.connect({ name: PortConnection.getUniqueId() });
    }

    Object.assign(this, {
      _isDisposed: false,
      _onDisposed: new EventManager(),

      _onPortEvent: new EventManager(),
      _passthroughEventNameLookup: new Map(),
      _subscribedEventNames: [],          // Name of events that will be sent to this port.
      _listeningEventNames: [],           // Name of events that are requested from this port. Message should be sent with data from these events.

      _port: port,
      _operations: new DisposableCollection(),
    });

    // #region Dispose

    if (port.error) {
      this._dispose(true);
      return;
    }
    port.onDisconnect.addListener(() => this._dispose(true));
    this._operations.onDisposed.addListener(() => this.dispose());

    // #endregion Dispose


    port.onMessage.addListener((message) => this._handleMessage(message));
    this._onPortEvent.onChanged.addListener((manager, listener, added) => this._handleSubscribedEventsChanged(listener, added));
  }

  _handleMessage(message) {
    if (!message) {
      return;
    }
    switch (message.type) {
      case PortConnection.messageTypes.eventData: {
        this._onPortEvent.fire(message);
      } break;
      case PortConnection.messageTypes.eventSubscribe: {
        this._listeningEventNames = message.subscribeEventNames;
      } break;
    }
  }

  _handleSubscribedEventsChanged(listener, added) {
    if (this.isDisposed) {
      return;
    }
    let changed = false;
    let subscribed = this._getSubscribedEventNames();
    if (
      subscribed.some(shouldSub => !this._subscribedEventNames.includes(shouldSub)) ||  // Any new event names?
      this._subscribedEventNames.some(subed => !subscribed.includes(subed))             // Any removed event names?
    ) {
      this._subscribedEventNames = subscribed;
      changed = true;
    }
    if (changed) {
      this._port.postMessage({ type: PortConnection.messageTypes.eventSubscribe, subscribeEventNames: this._subscribedEventNames });
    }
  }

  sendMessageBoundToPort(message) {
    message.portId = this.id;
    return browser.runtime.sendMessage(message);
  }

  fireEvent(eventName, args) {
    if (this.isDisposed) {
      return;
    }
    if (this._listeningEventNames.includes(eventName)) {
      this._port.postMessage({ type: PortConnection.messageTypes.eventData, eventName: eventName, eventArgs: args });
    }
  }

  getEvent(eventName) {
    let event = EventManager.createPassthroughEventManager(
      this._onPortEvent,
      (returnedValues) => {
        return false;
      },
      (args) => {
        if (args.length === 0) {
          return false;
        }
        let message = args[0];
        if (message.type !== PortConnection.messageTypes.eventData || message.eventName !== eventName) {
          return false;
        }
        return message.eventArgs || [];
      }
    );
    this._passthroughEventNameLookup.set(event, eventName);
    return event;
  }

  getListeningEventNames() {
    return this._listeningEventNames;
  }
  getSubscribedEventNames() {
    return this._subscribedEventNames;
  }

  _getSubscribedEventNames() {
    return Array.from(this._passthroughEventNameLookup.keys()).filter(event => event.listenersLength > 0).map(event => this._passthroughEventNameLookup.get(event));
  }


  // #region Dispose

  _dispose(portDisconnected = false) {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    if (!portDisconnected) {
      this._port.disconnect();
    }
    this._passthroughEventNameLookup.clear();
    this._subscribedEventNames = [];
    this._listeningEventNames = [];

    this._operations.dispose();
    this._onDisposed.fire(this);
  }
  dispose() {
    this._dispose(false);
  }

  get isDisposed() {
    return this._isDisposed;
  }
  get onDisposed() {
    return this._onDisposed.subscriber;
  }

  // #endregion Dispose


  get id() {
    return this._port.name;
  }

  static getUniqueId() {
    // print random number in base 36
    return 'id-' + Math.random().toString(36).substr(2, 16);
  }
}
Object.assign(PortConnection, {
  messageTypes: Object.freeze({
    eventSubscribe: 'event-subscribe',
    eventData: 'event-data',
  }),
});

// #endregion Connections


// #region Tree Style Tab Management

class ContextMenuItem {
  constructor({ id = null, title = '', parentId = null, contexts = [], documentUrlPatterns = null, isSeparator = false }) {
    let data = {
      id: id,
      title: title || '',
      type: isSeparator ? 'separator' : 'normal',
      contexts: contexts || [],
      parentId: parentId,
      documentUrlPatterns: documentUrlPatterns,
    };
    defineProperty(this, 'data', () => {
      let copy = Object.assign({}, data);
      for (let key of Object.keys(copy)) {
        if (copy[key] === undefined || copy[key] === null) {
          delete copy[key];
        }
      }
      return copy;
    });
    this.onChange = accessDataObjectWithProperties(this, data);
  }

  clone() {
    return new ContextMenuItem(this.data);
  }

  get isSeparator() {
    return this.type === 'separator';
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


    for (let context of a.contexts) {
      if (!b.contexts.includes(context)) {
        return false;
      }
    }
    for (let context of b.contexts) {
      if (!a.contexts.includes(context)) {
        return false;
      }
    }


    if (
      a.id !== b.id ||
      a.title !== b.title ||
      a.type !== b.type ||
      a.parentId !== b.parentId ||
      a.documentUrlPatterns !== b.documentUrlPatterns
    ) {
      return false;
    }

    return true;
  }

}


class ContextMenuItemCollection {

  constructor({ items } = {}) {
    Object.assign(this, {
      _items: [],
    });
    this.addContextMenuItems(items);
  }

  clone() {
    return new ContextMenuItemCollection({ items: this._items.map(item => item.clone()) });
  }


  getContextMenuItem(menuItemId) {
    let applicable = this._items.filter(item => item.id === menuItemId);
    if (applicable.length > 0) {
      return applicable[0];
    } else {
      return null;
    }
  }
  getRootContextMenuItems() {
    return this._items.filter((item) => !item.parentId && item.parentId !== 0);
  }


  addContextMenuItems(items) {
    if (!items) {
      return;
    }
    if (!Array.isArray(items)) {
      items = [items];
    }
    this.removeContextMenuItems(items.map(item => item.id));
    for (let item of items) {
      this._items.push(item);
    }
  }
  insertContextMenuItems(index, items) {
    if (!items) {
      return;
    }
    if (!Array.isArray(items)) {
      items = [items];
    }
    if (index < 0) {
      index = 0;
    }

    if (index >= this._items.length) {
      this.addContextMenuItems(items);
    } else {
      this.removeContextMenuItems(items);
      this._items.splice(index, 0, items);
    }
  }

  removeContextMenuItems(menuItemIds) {
    if (!Array.isArray(menuItemIds)) {
      menuItemIds = [menuItemIds];
    }
    this._items = this._items.filter((item) => !menuItemIds.includes(item.id));
  }
  removeAllContextMenuItems() {
    this._items = [];
  }


  get items() {
    return this._items;
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

    if (a._items.length !== b._items.length) {
      return false;
    }
    for (let iii = 0; iii < a._items.length; iii++) {
      let aItem = a._items[iii];
      let bItem = b._items[iii];
      if (!ContextMenuItem.isEqual(aItem, bItem)) {
        return false;
      }
    }

    return true;
  }
}


class TSTState {
  constructor() {
    Object.assign(this, {
      listeningTypes: [tstAPI.NOTIFY_READY],
      contextMenuItems: new ContextMenuItemCollection(),
      rootContextMenuItemTitle: '',
      style: '',
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

    if (!TSTState.isStyleEqual(a, b)) {
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

    if (!ContextMenuItemCollection.isEqual(a.contextMenuItems, b.contextMenuItems)) {
      return false;
    }

    if (a.contextMenuItems.length > 1) {
      let rootItems = a.getRootContextMenuItems();
      if (rootItems.length > 1 && a.rootContextMenuItemTitle !== b.rootContextMenuItemTitle) {
        return false;
      }
    }
  }
  static isStyleEqual(a, b) {
    if (a === b) {
      return true;
    }
    if (!a && !b) {
      return true;
    }
    if (!a || !b) {
      return false;
    }

    if (a.hasStyle !== b.hasStyle || (a.hasStyle && a.style !== b.style)) {
      return false;
    }
    return true;
  }

  clone() {
    let clone = new TSTState();
    clone.addListeningTypes(this.listeningTypes);
    clone.contextMenuItems = this.contextMenuItems.clone();
    clone.rootContextMenuItemTitle = this.rootContextMenuItemTitle;
    clone.style = this.style;
    return clone;
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


  get hasStyle() {
    return this.style && this.style.trim() !== '';
  }

  static getTabbarClickListeningTypes() {
    return [
      tstAPI.NOTIFY_TABBAR_CLICKED,
      tstAPI.NOTIFY_TABBAR_MOUSEDOWN,
      tstAPI.NOTIFY_TABBAR_MOUSEUP,
    ];
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
}


class TSTManager {

  constructor(state) {
    Object.assign(this, {
      _isDisposed: false,
      _onDisposed: new EventManager(),

      _onMessage: new EventManager(),
      _onRegistrationChanged: new EventManager(),

      _resetData: null,
      _currentState: new TSTState(),
      _wantedState: (state && state instanceof TSTState) ? state : new TSTState(),

      _externalMessageListener: null,
      _registrationUpdater: null,
    });


    this._externalMessageListener = new EventListener(browser.runtime.onMessageExternal, this._handleExternalMessage.bind(this));

    this._registrationUpdater = new RequestManager(this._handleStateUpdate.bind(this), 500, false);


    // Attempt to register to TST:
    this.invalidateTST(true);

    // If this is at browser startup then Tree Style Tab might not be initialized yet. Wait a while and then check so that there hasn't been an error when registering:
    setTimeout(() => this.invalidateTST(), 5000);
    setTimeout(() => this.invalidateTST(), 30000);
  }


  // #region Private functions

  _handleExternalMessage(message, sender) {
    try {
      if (sender.id !== kTST_ID) {
        return;
      }
      let values = this._onMessage.fire(message);
      if (message.type === 'ready') {
        // passive registration for secondary (or after) startup:
        this.invalidateTST(true);
        return Promise.resolve(true);
      } else {
        for (let value of values) {
          if (value !== undefined) {
            return Promise.resolve(value);
          }
        }
      }
    } catch (error) {
      console.log('Error on Tree Style Tab message handling!\n', error, '\nStack Trace:\n', error.stack);
    }
  }

  async _handleStateUpdate() {
    let reset = this._resetData;
    if (this._resetData) {
      this._resetData = false;
    }
    if (!reset || typeof reset !== 'object') {
      reset = {};
    } else {
      let resetTypes = Object.values(TSTManager.resetTypes);
      if (reset.all) {
        for (let type of resetTypes) {
          reset[type] = true;
        }
      }
      reset.any = resetTypes.some(type => reset[type]);
    }

    let changed = !TSTState.isEqual(this._currentState, this._wantedState);

    if (changed || reset.any) {
      let currentState = this._currentState;
      let targetState = this._wantedState ? this._wantedState.clone() : new TSTState();
      let newState = targetState.clone();

      if (targetState.hasStyle || targetState.listeningTypes.length > 0 || targetState.contextMenuItems.length > 0) {
        let styleChange = !TSTState.isStyleEqual(currentState, targetState);
        // Remove old style:
        if (currentState.hasStyle && styleChange || reset[TSTManager.resetTypes.style]) {
          await TSTManager.unregisterFromTST();
        }
        // Update listening types and/or register new style:
        let success = true;
        if (styleChange || !TSTState.isListeningTypesEqual(currentState, targetState) || reset[TSTManager.resetTypes.style] || reset[TSTManager.resetTypes.listeningTypes]) {
          success = await TSTManager.registerToTST(targetState.listeningTypes, targetState.style);
        }
        if (!success) {
          newState = new TSTState();
        } else if (!TSTState.isContextMenuItemsEqual(currentState, targetState) || reset[TSTManager.resetTypes.contextMenu]) {
          if ((currentState.contextMenuItems.items.length > 0) || reset[TSTManager.resetTypes.contextMenu]) {
            // Update context menu items:
            await TSTManager.removeAllTSTContextMenuItems();
          }
          if (targetState.contextMenuItems.items.length > 0) {
            let itemCollection = targetState.contextMenuItems;
            let items = itemCollection.items;
            // Create root item if more than 1 root item:
            let rootItems = itemCollection.getRootContextMenuItems();
            if (rootItems.length > 1 && targetState.rootContextMenuItemTitle) {
              let uniqueId = 1; // Can't be 0 since that is false and doesn't count as a id.
              let ids = items.map(item => item.id);
              while (ids.includes(uniqueId)) {
                uniqueId++;
              }
              let root = new ContextMenuItem({
                id: uniqueId,
                contexts: ['tab'],
                title: targetState.rootContextMenuItemTitle
              });
              items.unshift(root);
              for (let item of rootItems) {
                item.parentId = root.id;
              }
            }
            for (let item of items) {
              await TSTManager.createTSTContextMenuItem(item.data);
            }
          }
        }
      } else {
        // Unregister:
        await TSTManager.removeAllTSTContextMenuItems();
        await TSTManager.unregisterFromTST();
      }

      this._currentState = newState;

      if (this._onRegistrationChanged.listenersLength > 0) {
        let eventObj = {
          get oldState() {
            return currentState;
          },
          get newState() {
            if (!eventObj._newState) {
              eventObj._newState = newState.clone();
            }
            return eventObj._newState;
          }
        };
        this._onRegistrationChanged.fire(eventObj);
      }
    } else {
      return true;
    }
  }

  // #endregion Private functions


  /**
   * Invalidate the current Tree Style Tab registration. The manager will check its registration and change it as needed.
   * 
   * @param {boolean|String|Array} [resetInfo=false] Force an update of certain parts of the registration info. True to force update everything. String value to update one registration type. Array to update several.
   * @memberof TSTManager
   */
  async invalidateTST(resetInfo = false) {
    if (resetInfo) {
      if (!this._resetData) {
        this._resetData = {};
      }
      if (typeof resetInfo === 'string') {
        this._resetData[resetInfo] = true;
      } else if (Array.isArray(resetInfo)) {
        for (let key of resetInfo) {
          this._resetData[key] = true;
        }
      } else {
        this._resetData.all = true;
      }
    }
    await this._registrationUpdater.invalidate();
  }


  // #region State Info

  /**
   * Set new registartion info. Will return after next registration check.
   * 
   * @param {TSTState} value The new registration info.
   * @memberof TSTManager
   */
  async setState(value) {
    this._wantedState = value;
    await this.invalidateTST();
  }

  /**
   * The current target state for the manager. This will be applied at the next update.
   * 
   * @memberof TSTManager
   */
  get state() {
    return this._wantedState;
  }

  set state(value) {
    this.setState(value);
  }

  /**
   * The state that is registered to Tree Style Tab.
   * 
   * @readonly
   * @memberof TSTManager
   */
  get appliedState() {
    return this._currentState.clone();
  }

  // #endregion State Info


  // #region Events

  get onMessage() {
    return this._onMessage.subscriber;
  }


  get onRegistrationChange() {
    return this.onRegistrationChanged;
  }

  /**
   * Sent when the applied registration info is changed. Arg: { newState, oldState }
   * 
   * @readonly
   * @memberof TSTManager
   */
  get onRegistrationChanged() {
    return this._onRegistrationChanged.subscriber;
  }

  // #endregion Events


  // #region Dispose

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;

    this._externalMessageListener.close();
    this._registrationUpdater.dispose();

    this._onDisposed.fire(this);
  }
  get isDisposed() {
    return this._isDisposed;
  }
  get onDisposed() {
    return this._onDisposed.subscriber;
  }

  // #endregion Dispose


  // #region Static

  // #region Registration

  static async registerToTST(listeningTypes = [], style = null) {
    try {
      let message = {
        type: 'register-self',
        name: browser.runtime.getManifest().name,
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

  // #endregion Registration


  // #region Context Menu

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

  // #endregion Context Menu


  // #region Scroll

  static async lockScroll() {
    return await browser.runtime.sendMessage(kTST_ID, {
      type: tstAPI.SCROLL_LOCK
    });
  }

  static async unlockScroll() {
    return await browser.runtime.sendMessage(kTST_ID, {
      type: tstAPI.SCROLL_UNLOCK
    });
  }


  static async scrollToTab(tabId) {
    return await browser.runtime.sendMessage(kTST_ID, {
      type: tstAPI.SCROLL,
      tab: tabId // integer, an ID of a tab
    });
  }

  static async scrollToPos(windowId, pos) {
    return await browser.runtime.sendMessage(kTST_ID, {
      type: tstAPI.SCROLL,
      window: windowId,  // integer, an ID of a window
      position: pos, // integer, an absolute scroll position in pixels
    });
  }

  static async scroll(windowId, delta) {
    return await browser.runtime.sendMessage(kTST_ID, {
      type: tstAPI.SCROLL,
      window: windowId,  // integer, an ID of a window
      delta: delta, // integer, a relative scroll in pixels
    });
  }

  // #endregion Scroll


  // #region Get Tabs

  /**
   * Get tabs from Tree Style Tab. These tabs will include tree information.
   * 
   * @param {number|Array} tabIds Can be a single intiger id or multiple ids in an array.
   * @returns {Object|Array} A tab or an array of tabs.
   */
  static async getTabs(tabIds) {
    let details = {
      type: 'get-tree',
    };
    if (Array.isArray(tabIds)) {
      details.tabs = tabIds;
    } else {
      details.tab = tabIds;
    }
    return browser.runtime.sendMessage(kTST_ID, details);
  }
  static async getWindowTabs(windowId, flatArray = false) {
    // Flat array: each tab is in the original array. If the array isn't flat then only root tabs occur in the array and the other tabs are only accessible through the tabs children property.
    let message = {
      type: 'get-tree',
      window: windowId,
    };
    if (flatArray) {
      message.tabs = '*';
    }
    return await browser.runtime.sendMessage(kTST_ID, message);
  }

  static async getTreeTabs(tabIds) {
    let tstTabs = await TSTManager.getTabs(tabIds);
    let treeTabs = [];
    if (!Array.isArray(tstTabs)) {
      tstTabs = [tstTabs];
    }
    for (let tab of tstTabs) {
      let descendants = TSTManager.getDescendantsFromTSTTab(tab);
      treeTabs.push(tab);
      treeTabs.push(...descendants);
    }
    return treeTabs;
  }

  static getDescendantsFromTSTTab(tstTab) {
    let all = [tstTab];
    for (let iii = 0; iii < all.length; iii++) {
      let tab = all[iii];
      if (tab.children) {
        all.push(...tab.children);
      }
    }
    return all;
  }

  // #endregion Get Tabs


  // #region Group Tab

  static getGroupTabURL(name = null, temporary = undefined, internalId = null) {
    let url = internalId ? 'moz-extension://' + internalId + '/resources/group-tab.html' : 'about:treestyletab-group';
    let firstArg = true;
    let prepareForArg = () => {
      url += firstArg ? '?' : '&';
      firstArg = false;
    };
    if (name && typeof name === 'string') {
      prepareForArg();
      url += 'title=' + encodeURIComponent(name);
    }
    if (temporary !== undefined) {
      prepareForArg();
      url += 'temporary=' + (temporary ? 'true' : 'false');
    }
    return url;
  }

  static getGroupTabInfo(uri) {
    if (!uri || typeof uri !== 'string') {
      return null;
    }
    let removeLength = (string, removeLength) => {
      return string.length <= removeLength ? '' : string.substr(removeLength);
    };

    let internalId = null;

    let legacyURI = 'about:treestyletab-group';
    if (uri.startsWith(legacyURI)) {
      uri = removeLength(uri, legacyURI.length);
    } else {
      let start = 'moz-extension://';
      if (!uri.startsWith(start)) {
        return null;
      }
      uri = removeLength(uri, start.length);

      let separatorIndex = uri.indexOf('/');
      if (separatorIndex < 0) {
        return null;
      }
      internalId = uri.substr(0, separatorIndex);
      uri = removeLength(uri, separatorIndex + 1);

      let location = 'resources/group-tab.html';
      if (!uri.startsWith(location)) {
        return null;
      }
      uri = removeLength(uri, location.length);
    }

    let info = {};

    if (internalId) {
      info.internalId = internalId;
    }

    if (uri.startsWith('?')) {
      uri = removeLength(uri, 1);

      let getInfo = (arg, id, key, handleValue) => {
        if (arg.startsWith(id)) {
          if (!Object.keys(info).includes(key)) {
            let value = removeLength(arg, id.length);
            if (handleValue && typeof handleValue === 'function') {
              value = handleValue(value);
            }
            info[key] = value;
          }
          return true;
        } else {
          return false;
        }
      };
      let tests = [
        (arg) => {
          return getInfo(arg, 'title=', 'name', (value) => {
            return decodeURIComponent(value);
          });
        },
        (arg) => {
          return getInfo(arg, 'temporary=', 'temporary', (value) => {
            value = value.toLowerCase().trim();
            return value === 'true';
          });
        },
      ];
      for (let arg of uri.split('&')) {
        for (let test of tests) {
          if (test(arg)) {
            break;
          }
        }
      }
    }

    return Object.assign({
      name: 'Group',
      temporary: false,
    }, info);
  }

  // #endregion Group Tab

  // #endregion Static

}
TSTManager.resetTypes = Object.freeze({
  style: 'style',
  listeningTypes: 'listeningTypes',
  contextMenu: 'contextMenu',
});


/**
 * Listens to Tree Style Tab events and determines when a tab is being dragged.
 * 
 * @class TSTDragDropListener
 */
class TSTDragDropListener {

  constructor(timeBeforeFirstCheckInMilliseconds = null, timeBetweenChecksInMilliseconds = null) {
    Object.assign(this, {
      _isDisposed: false,
      _onDisposed: new EventManager(),

      _dragCheckTimeout: null,
      _startTime: null,
      _startMessage: null,
      _draggedTabId: null,
      _dragRecognized: false,

      _timeBeforeFirstCheck: 500,
      _timeBetweenChecks: 500,

      _onDrag: new EventManager(),
      _onDrop: new EventManager(),
    });

    if (timeBeforeFirstCheckInMilliseconds || timeBeforeFirstCheckInMilliseconds === 0) {
      this._timeBeforeFirstCheck = timeBeforeFirstCheckInMilliseconds;
    }
    if (timeBetweenChecksInMilliseconds || timeBetweenChecksInMilliseconds === 0) {
      this._timeBetweenChecks = timeBetweenChecksInMilliseconds;
    }

    if (this._timeBeforeFirstCheck > 500) {
      // Must be a drag event after this time since it would have been canceled as a drag event otherwise.
      this._timeBeforeFirstCheck = 500;
    }
  }


  // #region Private Functions

  async _handleDragCheck() {
    if (this.isDisposed) {
      return;
    }
    if (!this.isDragging) {
      if (Date.now() - this._startTime > 500) {
        this._recognizeDrag();
      }
    }
    let hasDraggingClass = await TSTDragDropListener.checkIfDraggingTab(this._draggedTabId);
    if (hasDraggingClass) {
      this._recognizeDrag();
    } else if (this.isDragging) {
      this._cancelDragDrop();
      return;
    }
    this._queueDragCheck(this._timeBetweenChecks);
  }

  _queueDragCheck(timeInMilliseconds) {
    if (this.isDisposed) {
      return;
    }
    if (this._dragCheckTimeout) {
      this._dragCheckTimeout.dispose();
    }
    this._dragCheckTimeout = new Timeout(() => this._handleDragCheck(), timeInMilliseconds);
  }

  _recognizeDrag() {
    if (!this.isPossibleDrag || this.isDragging || this.isDisposed) {
      return;
    }
    this._dragRecognized = true;
    this._onDrag.fire();
  }

  _cancelDragDrop() {
    if (this.isDragging && !this.isDisposed) {
      this._OnDrop.fire();
    }

    if (this._dragCheckTimeout) {
      this._dragCheckTimeout.dispose();
      this._dragCheckTimeout = null;
    }
    this._startMessage = null;
    this._draggedTabId = null;
    this._startTime = null;
    this._dragRecognized = false;
  }

  // #endregion Private Functions


  /**
   * Send Tree Style Tab event info to this listener.
   * 
   * @param {any} message The message with the event info.
   * @param {any} [sender=null] The sender of the message. This will be checked against Tree Style Tab's id.
   * @memberof TSTDragDropListener
   */
  handleTSTEvent(message, sender = null) {
    if (this.isDisposed) {
      return;
    }
    if (!message || !message.type) {
      return;
    }
    switch (message.type) {
      case tstAPI.NOTIFY_TAB_MOUSEDOWN: {
        if (message.button !== 0) {
          break;
        }
        this._recognizeDrag();
        this._cancelDragDrop();

        this._startTime = Date.now();
        this._startMessage = message;
        this._draggedTabId = message.tab.id;
        this._queueDragCheck(this._timeBeforeFirstCheck);
      } break;
      case tstAPI.NOTIFY_TAB_MOUSEUP: {
        if (message.button !== 0) {
          break;
        }
        this._cancelDragDrop();
      } break;
      case tstAPI.NOTIFY_TAB_DRAGREADY: {
        this._cancelDragDrop();
      } break;
    }
  }


  // #region Drag info

  /**
   * Indicates if a drag operation is currently being done.
   * 
   * @readonly
   * @memberof TSTDragDropListener
   */
  get isDragging() {
    return Boolean(this._dragRecognized);
  }
  /**
   * False if a drag operation is not happening. True if a drag operation could be or is underway.
   * 
   * @readonly
   * @memberof TSTDragDropListener
   */
  get isPossibleDrag() {
    return Boolean(this._startTime || this._startMessage);
  }

  /**
   * An event that is sent when a drag and drop operation is confirmed.
   * 
   * @readonly
   * @memberof TSTDragDropListener
   */
  get onDrag() {
    return this._OnDrag.subscriber;
  }
  /**
   * An event that is sent when a drag and drop operation is completed.
   * 
   * @readonly
   * @memberof TSTDragDropListener
   */
  get onDrop() {
    return this._OnDrop.subscriber;
  }

  // #endregion Drag info


  // #region Dispose

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;

    this._cancelDragDrop();

    this._onDisposed.fire(this);
  }
  get isDisposed() {
    return this._isDisposed;
  }
  get onDisposed() {
    return this._onDisposed.subscriber;
  }

  close() {
    this.dispose();
  }
  get isClosed() {
    return this.isDisposed;
  }
  get onClosed() {
    return this.onDisposed;
  }

  // #endregion Dispose


  static async checkIfDraggingTab(tabId) {
    if (!tabId && tabId !== 0) {
      return false;
    }
    try {
      let tstTab = await TSTManager.getTabs(tabId);
      if (tstTab.states.includes('dragging')) {
        return true;
      }
    } catch (error) {
      console.log('Failed to check for drag and drop operation in Tree Style Tab Sidebar\n', error, '\nStack Trace:\n', error.stack);
      return false;
    }
    return false;
  }

  static get TSTListeningTypes() {
    return [
      tstAPI.NOTIFY_TAB_MOUSEDOWN,  // Drag start?
      tstAPI.NOTIFY_TAB_MOUSEUP,    // Not sent if it was a drag drop operation
      tstAPI.NOTIFY_TAB_DRAGREADY,  // If not after 400ms => is drag drop operation
    ];
  }

}

// #endregion Tree Style Tab Management


// #region Mouse Click Combinations

class MouseClickComboCollection {
  constructor(array) {
    this.combos = array;
  }

  update(changes, settings) {
    let changedKeys = Object.keys(changes);
    for (let combo of this.combos) {
      let key = combo.info.settingKey;
      if (key && changedKeys.includes(key)) {
        combo.update(settings[key]);
      }
    }
  }

  static createStandard() {
    return defaultValues.MouseClickComboCollection;
  }
}



class MouseClickCombo {
  constructor(info = {}) {
    let onChangeManager = new EventManager();
    this.onChange = onChangeManager.subscriber;


    let props = MouseClickCombo.getDefaultValues();
    defineProperty(this, 'data',
      function () {
        return Object.assign({}, props);
      }
    );
    let propKeys = Object.keys(props);

    for (let key of propKeys) {
      defineProperty(this, key,
        function () {
          return props[key];
        },
        function (value) {
          if (props[key] === value) {
            return;
          }
          props[key] = value;
          onChangeManager.fire(key, value);
        }
      );
    }


    this.info = info;


    this.update = (newData) => {
      for (let key of Object.keys(newData)) {
        if (propKeys.includes(key)) {
          this[key] = newData[key];
        }
      }
    };


    this.test = (ctrl, shift, alt, meta) => {
      if (!props.enabled) {
        return false;
      }

      if (props.anyKeyMode) {
        return (
          ctrl && props.ctrl ||
          shift && props.shift ||
          alt && props.alt ||
          meta && props.meta ||
          (!props.ctrl && !props.shift && !props.alt && !props.meta)
        );
      } else {
        return (
          ctrl == props.ctrl &&
          shift == props.shift &&
          alt == props.alt &&
          meta == props.meta
        );
      }
    };
  }

  static getDefaultValues() {
    return defaultValues.MouseClickCombo;
  }
}

// #endregion Mouse Click Combinations


/**
 * Handles hiding tabs with the Tab Hiding API.
 * 
 * @class TabHidingManager
 */
class TabHideManager {

  constructor() {
    Object.assign(this, {
      _isDisposed: false,
      _onDisposed: new EventManager(),

      _disposables: new DisposableCollection(),

      _isAPIEnabled: true,
      _onAPIStatusChanged: new EventManager(),

      _apiChecker: new RequestManager(
        async () => {
          if (!this.isAPIEnabled && !this.isDisposed) {
            this.isAPIEnabled = await TabHideManager.checkAPIEnabled();
          }
        },
        1000
      ),
    });

    this.start = Promise.resolve(this._start()).finally(() => { this.start = null; });
  }


  async _start() {
    let { version } = await browser.runtime.getBrowserInfo();
    let [majorVersion,] = version.split('.');

    if (this.isDisposed) {
      return;
    }

    this._disposables.trackDisposables([
      new EventListener(browser.tabs.onUpdated,
        (tabId, changeInfo, tab) => {
          if (changeInfo.discarded !== undefined) {
            this._changeHideState(tabId, changeInfo.discarded);
          }
          if (changeInfo.hidden !== undefined && !this.isAPIEnabled) {
            this._apiChecker.invalidate();
          }
        },
        majorVersion >= 61 ? {
          properties: [
            'discarded',
            'hidden',
          ]
        } : null),
      new EventListener(browser.tabs.onCreated, (tab) => {
        if (tab.discarded) {
          this._changeHideState(tab.id, true);
        }
      }),
      new EventListener(this.onAPIStatusChanged, () => {
        if (this.isAPIEnabled) {
          this.updateAllHideStates();
        }
      }),
    ]);

    this.updateAllHideStates();
  }


  async _changeHideState(tabId, hide) {
    if (this.isDisposed) {
      return;
    }
    if (!this.isAPIEnabled) {
      this._apiChecker.invalidate();
      return;
    }
    if (!tabId && tabId !== 0) {
      return;
    }
    try {
      if (hide) {
        await browser.tabs.hide(tabId);
      } else {
        await browser.tabs.show(tabId);
      }
    } catch (error) {
      this.isAPIEnabled = false;
    }
  }


  async updateAllHideStates() {
    if (this.isDisposed) {
      return false;
    }
    if (!this.isAPIEnabled) {
      this._apiChecker.invalidate();
      return false;
    }
    try {
      let allTabs = await browser.tabs.query({});
      await this._changeHideState(allTabs.filter(t => !t.discarded).map(t => t.id), false);
      await this._changeHideState(allTabs.filter(t => t.discarded).map(t => t.id), true);
      return true;
    } catch (error) {
      this._apiChecker.invalidate();
    }
    return false;
  }


  // #region Dispose

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;

    this._disposables.dispose();

    this._onDisposed.fire(this);
  }

  get isDisposed() {
    return this._isDisposed;
  }
  get onDisposed() {
    return this._onDisposed.subscriber;
  }

  // #endregion Dispose


  // #region API Status

  get isAPIEnabled() {
    return Boolean(this._isAPIEnabled);
  }
  set isAPIEnabled(value) {
    value = Boolean(value);
    if (value === this.isAPIEnabled) {
      return;
    }
    this._isAPIEnabled = value;
    if (!this.isDisposed) {
      this._onAPIStatusChanged.fire(value);
    }
  }

  get onAPIStatusChanged() {
    return this._onAPIStatusChanged.subscriber;
  }

  // #endregion API Status


  // #region Static Functions

  static async checkPermission() {
    try {
      return await browser.permissions.contains({ permissions: ['tabHide'] });
    } catch (error) {
      return false;
    }
  }

  static async checkAPIEnabled() {
    try {
      await browser.tabs.hide([]);
      return true;
    } catch (error) { }
    return false;
  }

  static async showAllTabs() {
    try {
      let allTabs = await browser.tabs.query({});
      await browser.tabs.show(allTabs.map(t => t.id));
      return true;
    } catch (error) { }
    return false;
  }

  // #endregion Static Functions

}


class TabMonitor {
  constructor() {

    // #region Private Properties

    let windows = [];
    let windowLookup = {};          // Key: windowId    Value: window
    let tabLookup = {};             // Key: tabId       Value: tab
    let activeTabLookup = {};       // Key: windowId    Value: tab
    let tempWindowLookup = {};      // Key: windowId    Value: window
    let focusedWindow = null;
    let listeners;

    // #endregion Private Properties


    // #region Public Functions and Properties

    // #region Window and tab information

    defineProperty(this, 'windows', () => windows);
    defineProperty(this, 'focusedWindow', () => focusedWindow);
    defineProperty(this, 'tabs', () => {
      let tabs = [];
      let sortedWindows = windows.slice();
      sortedWindows.sort((a, b) => a.id - b.id);
      for (let window of sortedWindows) {
        tabs.push.apply(tabs, window.tabs);
      }
      return tabs;
    });

    this.getWindowById = (windowId) => {
      return windowLookup[windowId];
    };
    this.getTabById = (tabId) => {
      return tabLookup[tabId];
    };
    this.getActiveTabForWindow = (windowId) => {
      return activeTabLookup[windowId];
    };
    this.checkIfWindowIsTemporary = (windowId) => {
      return tempWindowLookup[windowId];
    };

    // #endregion Window and tab information


    // #region Dispose

    defineProperty(this, 'isDisposed', () => Boolean(!listeners || listeners.isDisposed));

    this.dispose = () => {
      if (listeners) {
        listeners.dispose();
      }
    };

    // #endregion Dispose

    // #endregion Public Functions and Properties


    // #region Events

    let events = {
      onTabUpdated: new EventManager(),           // (tab, changeInfo)
      onTabActivated: new EventManager(),         // (tab, windowId)

      onTabCreated: new EventManager(),           // (tab)
      onTabRemoved: new EventManager(),           // (tab, window)

      onTabMoved: new EventManager(),             // (tab, { oldWindow, oldPosition })

      onWindowCreated: new EventManager(),        // (window)
      onWindowRemoved: new EventManager(),        // (window)
      onWindowFocusChanged: new EventManager(),   // (window, oldWindow)


      onDisposed: new EventManager(),
    };

    for (let key of Object.keys(events)) {
      this[key] = events[key].subscriber;
    }

    // #endregion Events


    // #region Private Functions

    // #region Helper Functions

    let clearData = () => {
      windows.splice(0, windows.length);
      Object.keys(windowLookup).forEach(key => delete windowLookup[key]);
      Object.keys(tabLookup).forEach(key => delete tabLookup[key]);
      Object.keys(activeTabLookup).forEach(key => delete activeTabLookup[key]);
      Object.keys(tempWindowLookup).forEach(key => delete tempWindowLookup[key]);
    };
    let setActiveTab = (newActiveTab, windowId = null) => {
      if (!windowId && windowId !== 0) {
        if (newActiveTab) {
          windowId = newActiveTab.windowId;
        } else {
          return;
        }
      }
      if (!windowLookup[windowId]) {
        return;
      }
      let oldActive = activeTabLookup[windowId];
      if (oldActive === newActiveTab) {
        return;
      }
      if (oldActive) {
        oldActive.active = false;
      }
      activeTabLookup[windowId] = newActiveTab;
      if (newActiveTab) {
        newActiveTab.active = true;
        newActiveTab.lastAccessed = Date.now();
      }
      events.onTabActivated.fire(newActiveTab, windowId);
    };
    let setFocusedWindow = (window) => {
      if (window === focusedWindow) {
        return;
      }
      let oldFocus = focusedWindow;
      if (focusedWindow) {
        focusedWindow.focused = false;
      }
      focusedWindow = window;
      if (window) {
        window.focused = true;
      }

      events.onWindowFocusChanged.fire(window, oldFocus);
    };
    let createTempWindow = (windowId, incognito = undefined) => {
      let tempWindow = { id: windowId, tabs: [] };
      if (incognito !== undefined) {
        tempWindow.incognito = incognito;
      }
      windows.push(tempWindow);
      windowLookup[windowId] = tempWindow;
      tempWindowLookup[windowId] = tempWindow;
      return tempWindow;
    };
    let removeTabFromWindow = (tab, index = null, aWindow = null) => {
      if (!tab) {
        return;
      }
      if (!aWindow) {
        aWindow = windowLookup[tab.windowId];
      }
      if (!aWindow) {
        return;
      }
      if ((!index && index !== 0) || index < 0 || index >= aWindow.tabs.length || aWindow.tabs[index] !== tab) {
        index = aWindow.tabs.indexOf(tab);
      }
      if (index >= 0) {
        aWindow.tabs.splice(index, 1);
      }
      if (tab.active) {
        if (tab === activeTabLookup[aWindow.id]) {
          setActiveTab(null, aWindow.id);
        }
        tab.active = false;
      }
      return index;
    };

    // #endregion Helper Functions


    let start = async () => {
      let queuedEvents = [];
      let unsafeToContinue = false;
      let handleEvent = (callback, safeToDelay = false) => {
        if (queuedEvents) {
          queuedEvents.push(callback);
          if (!safeToDelay) {
            unsafeToContinue = true;
          }
        } else {
          callback(false);
        }
      };
      let currentListeners = new DisposableCollection([
        new EventListener(browser.tabs.onUpdated, (tabId, changeInfo, tab) => handleEvent((delayed) => {
          let aTab = tabLookup[tabId];
          if (aTab) {
            Object.assign(aTab, changeInfo);
          }

          events.onTabUpdated.fire(aTab, changeInfo);
        }), true),
        new EventListener(browser.tabs.onActivated, ({ tabId, windowId }) => handleEvent((delayed) => {
          setActiveTab(tabLookup[tabId]);
        }), true),


        new EventListener(browser.tabs.onCreated, (tab) => handleEvent((delayed) => {
          if (delayed && tabLookup[tab.id]) {
            return;
          }
          let aWindow = windowLookup[tab.windowId];
          if (!aWindow) {
            aWindow = createTempWindow(tab.windowId, tab.incognito);
          }
          aWindow.tabs.splice(tab.index, 0, tab);
          tabLookup[tab.id] = tab;
          if (tab.active) {
            setActiveTab(tab);
          }

          events.onTabCreated.fire(tab);
        })),
        new EventListener(browser.tabs.onRemoved, (tabId, { windowId, isWindowClosing }) => handleEvent((delayed) => {
          if (delayed && !tabLookup[tabId]) {
            return;
          }
          let aWindow = windowLookup[windowId];
          let aTab = tabLookup[tabId];
          if (aWindow && aTab) {
            let index = removeTabFromWindow(aTab, null, aWindow);
            aTab.index = index;
            if (aTab.active) {
              setActiveTab(null, windowId);
            }
          }
          delete tabLookup[tabId];

          events.onTabRemoved.fire(aTab, aWindow);
        })),


        new EventListener(browser.tabs.onAttached, (tabId, { newWindowId, newPosition }) => handleEvent((delayed) => {
          let aTab = tabLookup[tabId];
          if (delayed && aTab.windowId === newWindowId) {
            return;
          }

          let aWindow = windowLookup[newWindowId];
          if (!aWindow) {
            aWindow = createTempWindow(aTab.windowId, aTab.incognito);
          }
          aWindow.tabs.splice(newPosition, 0, aTab);
          let oldWindowId = aTab.windowId;
          let oldIndex = aTab.index;
          aTab.windowId = newWindowId;
          aTab.index = newPosition;

          if (events.onTabMoved.listenersLength > 0) {
            events.onTabMoved.fire(aTab, { oldWindow: windowLookup[oldWindowId], oldPosition: oldIndex });
          }
        })),
        new EventListener(browser.tabs.onDetached, (tabId, { oldWindowId, oldPosition }) => handleEvent((delayed) => {
          let aTab = tabLookup[tabId];
          if (aTab.windowId === oldWindowId) {
            let aWindow = windowLookup[oldWindowId];
            if (aWindow) {
              oldPosition = removeTabFromWindow(aTab, oldPosition);
            }
            aTab.windowId = null;
            aTab.index = oldPosition;

            events.onTabMoved.fire(aTab, { oldWindow: aWindow, oldPosition: oldPosition });
          }
        })),

        new EventListener(browser.tabs.onMoved, (tabId, { windowId, fromIndex, toIndex }) => handleEvent((delayed) => {
          let aTab = tabLookup[tabId];
          if (!aTab || aTab.windowId !== windowId) {
            return;
          }
          let aWindow = windowLookup[windowId];
          if (aWindow) {
            fromIndex = removeTabFromWindow(aTab, fromIndex, aWindow);
            aWindow.tabs.splice(toIndex, 0, aTab);
            aTab.index = toIndex;

            events.onTabMoved.fire(aTab, { oldWindow: aWindow, oldPosition: fromIndex });
          }
        })),


        new EventListener(browser.windows.onCreated, (window) => handleEvent((delayed) => {
          let aWindow = windowLookup[window.id];
          if (aWindow) {
            window.tabs = aWindow.tabs || [];
            Object.assign(aWindow, window);
            delete tempWindowLookup[window.id];
          } else {
            window.tabs = [];
            windows.push(window);
            windowLookup[window.id] = window;
          }
          if (window.focused) {
            setFocusedWindow(aWindow || window);
          }

          events.onWindowCreated.fire(aWindow || window);
        }, true)),
        new EventListener(browser.windows.onRemoved, (windowId) => handleEvent((delayed) => {
          let aWindow = windowLookup[windowId];
          if (aWindow) {
            let index = windows.indexOf(aWindow);
            if (index >= 0) {
              windows.splice(index, 1);
            }
          }
          delete windowLookup[windowId];
          delete tempWindowLookup[windowId];
          delete activeTabLookup[windowId];
          if (focusedWindow === aWindow) {
            setFocusedWindow(null);
          }

          events.onWindowRemoved.fire(aWindow);
        }, true)),


        new EventListener(browser.windows.onFocusChanged, (windowId) => handleEvent((delayed) => {
          if (windowId === browser.windows.WINDOW_ID_NONE) {
            setFocusedWindow(null);
            return;
          }
          let aWindow = windowLookup[windowId];
          if (!aWindow) {
            aWindow = createTempWindow(windowId);
          }
          let index = windows.indexOf(aWindow);
          if (index !== 0) {
            if (index >= 0) {
              windows.splice(index, 1);
            }
            windows.splice(0, 0, aWindow);
          }
          setFocusedWindow(aWindow);
        }, true)),
      ]);
      currentListeners.onDisposed.addListener(() => {
        if (listeners === currentListeners) {
          listeners = null;
          clearData();

          events.onDisposed.fire();
        }
      });
      if (listeners) {
        listeners.dispose();
      }
      listeners = currentListeners;

      let allWindows;
      do {
        unsafeToContinue = false;
        queuedEvents = [];
        allWindows = await browser.windows.getAll({ populate: true });
      } while (unsafeToContinue);

      if (listeners === currentListeners) {
        clearData();
        windows.push.apply(windows, allWindows);
        for (let window of allWindows) {
          windowLookup[window.id] = window;
          for (let tab of window.tabs) {
            tabLookup[tab.id] = tab;
            if (tab.active) {
              activeTabLookup[window.id] = tab;
            }
          }
        }
        while (queuedEvents.length > 0) {
          if (listeners !== currentListeners) {
            break;
          }
          queuedEvents[0](true);
          queuedEvents.splice(0, 1);
        }
        queuedEvents = null;
      }
    };

    // #endregion Private Functions


    this.start = start();
  }
}


/**
 * Sometimes a tab fails to be restored. This class will fix this.
 * 
 * 
 * Fixes:
 * 
 * Tab not restored correctly after extension discards it:
 * https://bugzilla.mozilla.org/show_bug.cgi?id=1464992
 * 
 * Tab has discarded=false when not loaded.
 * https://bugzilla.mozilla.org/show_bug.cgi?id=1465558
 * 
 * 
 * @class TabRestoreFixer
 */
class TabRestoreFixer {

  constructor() {
    Object.assign(this, {
      _isDisposed: false,
      _onDisposed: new EventManager(),


      _disposables: new DisposableCollection(),
      _onActivatedListener: null,
      _onUpdatedListener: null,
      _onCreatedListener: null,
      _onRemovedListener: null,

      _onTabFixedListener: null,


      _browserInfo: browser.runtime.getBrowserInfo(),


      _tabInfoLookup: {},     // Key: tabId, Value: {tab, timeoutId, discardTime, addedAtStart, lastFixReason}
      _reloadInfoLookup: {},  // Key: tabId, Value: {tab, loading, fixed, redirected, blankComplete}
      _cachedFixedLookup: {}, // Key: tabId, Value: true


      _reloadBrokenTabs: false,  // Can be true, false
      _filterTabsToFix: null,    // (tab) => true/false. WARNING: do not modify the (tab) object.
      _allowQuickDiscard: false, // Can be true, false, (tab) => true/false. WARNING: do not modify the (tab) object.

      _waitForUrlInMilliseconds: -1,
      _waitForIncorrectLoad: -1,
      _fixIncorrectLoadAfter: -1,


      _onTabFixed: new EventManager(),  // Args: TabRestoreFixer, tabId
    });
  }


  // #region Private Functions

  async _checkListeners() {
    let { version } = await this._browserInfo;
    let [majorVersion,] = version.split('.');

    for (let listenerInfo of [
      [
        (this.isWaitingForUrl && this.fixActivatedTabs) || this.reloadBrokenTabs,
        '_onActivatedListener',
        browser.tabs.onActivated,
        this._onActivated.bind(this),
        null,
      ],
      [
        this.isWaitingForUrl || this.reloadBrokenTabs,
        '_onUpdatedListener',
        browser.tabs.onUpdated,
        this._onUpdate.bind(this),
        majorVersion >= 61 ? {
          properties: [
            'discarded',
            'status',
            'favIconUrl', // Need when reloadBrokenTabs === true
            // 'url' always sent (would work without it anyway)
          ]
        } : null,
      ],
      [
        this.useCacheForFixedTabs,
        '_onCreatedListener',
        browser.tabs.onCreated,
        this._onCreated.bind(this),
        null,
      ],
      [
        this.isWaitingForUrl || this.reloadBrokenTabs || this.useCacheForFixedTabs,
        '_onRemovedListener',
        browser.tabs.onRemoved,
        this._onRemoved.bind(this),
        null,
      ],
      [
        this.reloadBrokenTabs || this.useCacheForFixedTabs,
        '_onTabFixedListener',
        this._onTabFixed,
        (tabRestoreFixer, tabId) => {
          if (this.reloadBrokenTabs) {
            let reloadInfo = this._reloadInfoLookup[tabId];
            if (reloadInfo) {
              reloadInfo.redirected = true;
            }
          }
          if (this.useCacheForFixedTabs) {
            delete this._cachedFixedLookup[tabId];
          }
        },
        null,
      ]
    ]) {
      let [value, key, event, callback, extraParameter,] = listenerInfo;
      if (value && !this.isDisposed) {
        if (!this[key]) {
          let listener = new EventListener(event, callback, extraParameter);
          this[key] = listener;
          this._disposables.trackDisposables(listener);
        }
      } else {
        if (this[key]) {
          this._disposables.untrackDisposables(this[key]);
          this[key].close();
          this[key] = null;
        }
      }
    }
  }


  async _addAllDiscarded() {
    if (this.isDisposed) {
      return;
    }
    if (!this._tabInfoLookup) {
      this._tabInfoLookup = {};
    }
    let infoLookup = this._tabInfoLookup;

    let tabs = await browser.tabs.query({});

    let tstTabLookup = null;
    if (!tabs.some(tab => tab.url !== undefined)) {
      tstTabLookup = {};
      try {
        let tstTabs = await TSTManager.getTabs(tabs.map(tab => tab.id));
        for (let tstTab of tstTabs) {
          tstTabLookup[tstTab.id] = tstTab;
        }
      } catch (error) { }
    }

    if (this.isDisposed || infoLookup !== this._tabInfoLookup) {
      return;
    }

    let time = Date.now();
    for (let tab of tabs) {
      if (tstTabLookup && tab.url === undefined) {
        let tstTab = tstTabLookup[tab.id];
        tab = Object.assign(tstTab, tab);
      }

      if (tab.url !== undefined) {
        this._removeTabInfo({ tabId: tab.id });
        this._tabInfoLookup[tab.id] = { tab, discardTime: time, addedAtStart: true };
      }
    }
  }


  _removeTabInfo({ tabId = null, tabInfo = null }) {
    if (!tabInfo && (tabId || tabId === 0)) {
      tabInfo = this._tabInfoLookup[tabId];
    }
    if (tabInfo) {
      this._clearTimeout(tabInfo.timeoutId);
      delete this._tabInfoLookup[tabInfo.tab.id];
    }
  }


  _isTimeoutId(timeoutId) {
    return timeoutId || timeoutId === 0;
  }
  _clearTimeout(timeoutId) {
    if (this._isTimeoutId(timeoutId)) {
      clearTimeout(timeoutId);
    }
  }

  _clearAllTimeouts({ checkReason = null } = {}) {
    for (let tabInfo of Object.values(this._tabInfoLookup)) {
      if (checkReason && !checkReason(tabInfo.lastFixReason)) {
        continue;
      }
      this._clearTimeout(tabInfo.timeoutId);
      tabInfo.timeoutId = null;
    }
  }




  async _fixAfterDelay(tabInfo, { reason = null, checkUrl = false, checkUrl_allowNoUrl = false, cancelCurrent = false, fixDiscardedState = false, infoLookup = null } = {}) {
    if (!tabInfo || !tabInfo.tab) {
      return;
    }
    if (!this.isWaitingForUrl || this.isDisposed) {
      return;
    }

    if (!infoLookup) {
      infoLookup = this._tabInfoLookup;
    }

    if (this._tabInfoLookup !== infoLookup) {
      return;
    }

    if (!cancelCurrent) {
      if (this._isTimeoutId(tabInfo.timeoutId)) {
        return;
      }
    }

    let url = tabInfo.tab.url;
    let tabId = tabInfo.tab.id;

    if (!url || url === 'about:blank') {
      return;
    }


    tabInfo.lastFixReason = reason;

    this._clearTimeout(tabInfo.timeoutId);
    tabInfo.timeoutId = setTimeout(async () => {
      tabInfo.timeoutId = null;

      if (this._tabInfoLookup !== infoLookup || this.isDisposed) {
        return;
      }
      this._removeTabInfo({ tabInfo });


      if (checkUrl) {
        let tab = await browser.tabs.get(tabId);
        if (tab.url !== undefined || !checkUrl_allowNoUrl) {
          if (tab.url !== 'about:blank') {
            return;
          }
        }
      }

      browser.tabs.update(tabId, { url: url });

      this._onTabFixed.fire(this, tabId);
    }, this._waitForUrlInMilliseconds);
  }


  _onActivated({ tabId, windowId }) {
    if (this.isWaitingForUrl && this.fixActivatedTabs) {
      let tabInfo = this._tabInfoLookup[tabId];
      if (tabInfo) {
        this._fixAfterDelay(tabInfo, {
          reason: 'activated',
          cancelCurrent: tabInfo.lastFixReason === 'incorrectLoad',
          checkUrl: tabInfo.addedAtStart,
          checkUrl_allowNoUrl: !tabInfo.addedAtStart,   // If tab wasn't added at start then it will only be in cache if it isn't loaded and in that case it needs to be fixed.
        });
      }
    }
    if (this.reloadBrokenTabs) {
      delete this._reloadInfoLookup[tabId];
    }
  }

  _onCreated(tab) {
    if (this.useCacheForFixedTabs && tab.discarded) {
      this._cachedFixedLookup[tab.id] = true;
    }
  }

  _onRemoved(tabId, { windowId, isWindowClosing }) {
    if (this.isWaitingForUrl) {
      this._removeTabInfo({ tabId });
    }
    if (this.reloadBrokenTabs) {
      delete this._reloadInfoLookup[tabId];
    }
    if (this.useCacheForFixedTabs) {
      delete this._cachedFixedLookup[tabId];
    }
  }

  _onUpdate(tabId, changeInfo, tab) {
    /* Update events on successful restore:
    
        # Discarded = true
          
          # After this point: URL = real value.


        After action to restore tab:        
          
        # favIconUrl = null     (Only sent if restore will be successful)

          # After this point: URL = 'about:blank'.

        # Discarded = false

          # After this point: URL = 'about:blank'.

        # URL = real value.     (Only sent if restore will be successful)

        # URL = 'about:blank'   (Only sent if restore will be successful)

        # URL = real value.     (Only sent if restore will be successful)

    */

    if (this.isDisposed) {
      return;
    }

    if (this.reloadBrokenTabs && tab.url !== undefined) {
      if (changeInfo.discarded !== undefined && changeInfo.discarded) {
        let reload = false;
        let discardImmediately = false;

        let value = this._reloadInfoLookup[tabId];

        if (value && this._isTimeoutId(value.timeoutId)) {
          clearTimeout(value.timeoutId);
          value.timeoutId = null;
        }

        if (value) {
          // Tab is being fixed:
          if (
            !value.loading && (
              value.cantFix || (
                !value.redirected && (
                  (value.fixed && value.discardedImmediately) ||
                  value.correctUrl
                )
              )
            )
          ) {
            // Tab is fixed or can't be fixed:
            delete this._reloadInfoLookup[tabId];
            if (this.useCacheForFixedTabs && !value.cantFix) {
              this._cachedFixedLookup[tabId] = true;
            }

            // Ensure "waitForCorrectURL" fix stores correct URL:
            if (tab.url === 'about:blank') {
              tab.url = value.tab.url;
            }
          } else {
            // Make new attempt to fix tab:
            for (let key of Object.keys(value)) {
              if (key === 'tab') {
                continue;
              }
              delete value[key];
            }
            reload = true;
          }
        } else {
          // Has not attempted to fix tab:
          if (tab.url !== 'about:blank') {
            if (
              (!this.useCacheForFixedTabs || !this._cachedFixedLookup[tabId]) &&
              (!this.filterTabsToFix || this.filterTabsToFix(tab))
            ) {
              value = { tab };
              this._reloadInfoLookup[tabId] = value;

              reload = true;

              if (this._allowQuickDiscard && typeof this._allowQuickDiscard === 'function' ? this._allowQuickDiscard(tab) : this._allowQuickDiscard) {
                discardImmediately = true;
              }
            }
          }
        }

        // Reload tab:
        if (reload) {

          // Set up timeout that will redirect to correct URL:
          let tabInfo = null;
          if (this.isWaitingForUrl) {
            tabInfo = this._tabInfoLookup[tabId];
          }
          if (tabInfo) {
            this._fixAfterDelay(tabInfo, {
              reason: 'reloadFix',
              cancelCurrent: tabInfo.lastFixReason === 'incorrectLoad'
            });
          } else if (value) {
            value.timeoutId = setTimeout(() => {
              value.redirected = true;
              browser.tabs.update(tabId, { url: value.tab.url }).catch((reason) => {
                value.cantFix = true;
                browser.tabs.discard(tabId);
              });
            }, 200);
          }

          // Reload tab:
          browser.tabs.reload(tabId)
            .catch((reason) => {
              if (value) {
                if (this._isTimeoutId(value.timeoutId)) {
                  clearTimeout(value.timeoutId);
                  value.timeoutId = null;
                }
                delete this._reloadInfoLookup[tabId];
              }
            });

        }

        // "Quick discard" test:
        if (discardImmediately) {
          value.discardedImmediately = true;
          browser.tabs.discard(tabId);
        }
      }

      if (changeInfo.favIconUrl !== undefined) {
        let value = this._reloadInfoLookup[tabId];
        if (value && !value.loading) {
          value.fixed = true;
        }
      }

      if (changeInfo.status !== undefined) {
        let value = this._reloadInfoLookup[tabId];
        if (value && this._isTimeoutId(value.timeoutId)) {
          clearTimeout(value.timeoutId);
          value.timeoutId = null;
        }
        if (changeInfo.status === 'complete') {
          if (value) {
            value.loading = false;

            if (tab.url !== 'about:blank' || value.tab.url === tab.url) {
              if (this.useCacheForFixedTabs && !value.redirected) {
                this._cachedFixedLookup[tabId] = true;
              }
              value.correctUrl = true;
            }

            if (value.correctUrl) {
              value.timeoutId = setTimeout(() => {
                browser.tabs.discard(tabId);
              }, 100);
            } else {
              value.timeoutId = setTimeout(() => {
                value.redirected = true;
                browser.tabs.update(tabId, { url: value.tab.url }).catch((reason) => {
                  value.cantFix = true;
                  browser.tabs.discard(tabId);
                });
              }, 100);
            }
          }
        } else {
          if (value) {
            value.loading = true;
          }
        }
      }
    }


    if (this.isWaitingForUrl) {
      let tabInfo = null;
      let infoLookup = this._tabInfoLookup;
      if (changeInfo.discarded !== undefined || changeInfo.url !== undefined || changeInfo.status !== undefined) {
        tabInfo = infoLookup[tabId];
      }
      if (changeInfo.discarded !== undefined) {
        if (changeInfo.discarded) {
          if (tabInfo && tabInfo.lastFixReason !== 'reloadFix') {
            this._clearTimeout(tabInfo.timeoutId);
            tabInfo.timeoutId = null;
          }
          (async () => {
            tab.discarded = true;
            if (!tab.url) {
              // Get tab URL from Tree Style Tab's API:
              try {
                let tstTab = await TSTManager.getTabs(tab.id);
                tab = Object.assign(tstTab, tab); // Use some properties form native tab => Fixes some properties such as index.
              } catch (error) { }
            }
            if (
              this._tabInfoLookup === infoLookup &&
              tab.url && tab.url !== 'about:blank'
            ) {
              this._removeTabInfo({ tabInfo });
              infoLookup[tabId] = { tab, discardTime: Date.now() };
            }
          })();
        } else if (tabInfo) {
          let isIncorrectLoad = false;
          let reloadInfo = this._reloadInfoLookup[tabId];

          if (this.fixActivatedTabs && tabInfo.discardTime && !reloadInfo) {
            /* Timeline when tab is incorrectly marked as loaded:
   
              # Discarded = true
   
              # Discarded = false
   
              With nearly no delay. No events after.
            */
            let timeSinceUnload = Date.now() - tabInfo.discardTime;
            if (timeSinceUnload < this.waitForIncorrectLoad) {
              // Only unloaded for short duration => Tab incorrectly set as loaded? If no url or status changes after this point then yes.

              if (this.fixIncorrectLoad && !this._isTimeoutId(tabInfo.timeoutId)) {
                // Unload again if tab unless tab is being fixed (probably from being activated):
                tabInfo.lastFixReason = 'incorrectLoad';
                tabInfo.timeoutId = setTimeout(async () => {
                  tabInfo.timeoutId = null;

                  if (infoLookup !== this._tabInfoLookup || this.isDisposed) {
                    return;
                  }

                  // Check if tab failed to restore (in that case it has the url 'about:blank' which it didn't have when it was cached before being loaded):
                  if (tabInfo.tab.url) {
                    let aTab = await browser.tabs.get(tabId);
                    if (aTab.url === 'about:blank' && aTab.url !== tabInfo.tab.url) {
                      this._removeTabInfo({ tabId });
                      browser.tabs.update(tabId, { url: tabInfo.tab.url });
                      this._onTabFixed.fire(this, tabId);
                      return;
                    }
                  }

                  // Fix incorrect load:
                  browser.tabs.discard(tabId);
                }, this.fixIncorrectLoadAfter);
              }
              isIncorrectLoad = true;
            }
          }
          if (!isIncorrectLoad) {
            // Ensure tab is loaded correctly:
            this._fixAfterDelay(tabInfo, {
              reason: 'loaded',
              cancelCurrent: tabInfo.lastFixReason === 'incorrectLoad'
            });
          }
        }
      }

      if (changeInfo.url !== undefined || changeInfo.status !== undefined) {
        // Tab is loaded correctly. (no fix needed after this point)
        if (tabInfo) {
          this._removeTabInfo({ tabInfo });
        }
      }
    }
  }

  // #endregion Private Functions

  get useCacheForFixedTabs() {
    return this.reloadBrokenTabs;
  }


  get isWaitingForUrl() {
    return this._waitForUrlInMilliseconds >= 0;
  }

  get waitForUrlInMilliseconds() {
    return this._waitForUrlInMilliseconds;
  }
  set waitForUrlInMilliseconds(value) {
    if (!value && value !== 0) {
      return;
    }
    if (value === this._waitForUrlInMilliseconds) {
      return;
    }
    let wasWaiting = this.isWaitingForUrl;

    this._waitForUrlInMilliseconds = value;

    if (this.isDisposed) {
      return;
    }

    this._clearAllTimeouts({ checkReason: (reason) => reason === 'activated' || reason === 'loaded' });

    if (this.isWaitingForUrl !== wasWaiting) {
      this._clearAllTimeouts();
      let newInfoLookup = {};
      this._tabInfoLookup = newInfoLookup;

      let listenersAddedPromise = Promise.resolve(this._checkListeners());
      if (this.isWaitingForUrl) {
        listenersAddedPromise.then(() => {
          if (newInfoLookup === this._tabInfoLookup) {
            this._addAllDiscarded();
          }
        });
      }
    }
  }


  get fixActivatedTabs() {
    return this.waitForIncorrectLoad >= 0;
  }

  get waitForIncorrectLoad() {
    return this._waitForIncorrectLoad;
  }
  set waitForIncorrectLoad(value) {
    if (!value && value !== 0) {
      return;
    }
    if (value === this.waitForIncorrectLoad) {
      return;
    }
    let wasFixingActivatedTabs = this.fixActivatedTabs;

    this._waitForIncorrectLoad = value;

    if (this.isWaitingForUrl && wasFixingActivatedTabs !== this.fixActivatedTabs) {
      this._checkListeners();
      this._clearAllTimeouts();
    }
  }


  get fixIncorrectLoad() {
    return this.fixIncorrectLoadAfter >= 0;
  }

  get fixIncorrectLoadAfter() {
    return this._fixIncorrectLoadAfter;
  }
  set fixIncorrectLoadAfter(value) {
    if (!value && value !== 0) {
      return;
    }
    if (value === this.fixIncorrectLoadAfter) {
      return;
    }
    this._fixIncorrectLoadAfter = value;

    if (this.isWaitingForUrl) {
      this._clearAllTimeouts({ checkReason: (reason) => reason === 'incorrectLoad' });
    }
  }


  get reloadBrokenTabs() {
    return this._reloadBrokenTabs;
  }
  set reloadBrokenTabs(value) {
    value = Boolean(value);
    if (value === this.reloadBrokenTabs) {
      return;
    }
    this._reloadBrokenTabs = value;

    if (this.isDisposed) {
      return;
    }

    this._checkListeners();
    this._reloadInfoLookup = {};

    let fixedLookup = {};
    this._cachedFixedLookup = fixedLookup;
    if (value) {
      browser.tabs.query({ discarded: true }).then((tabs) => {
        if (fixedLookup !== this._cachedFixedLookup) {
          return;
        }
        for (let tab of tabs) {
          fixedLookup[tab.id] = true;
        }
      });
    }
  }


  get filterTabsToFix() {
    return this._filterTabsToFix;
  }
  set filterTabsToFix(value) {
    this._filterTabsToFix = value && typeof value === 'function' ? value : null;
  }


  get allowQuickDiscard() {
    return this._allowQuickDiscard;
  }
  set allowQuickDiscard(value) {
    this._allowQuickDiscard = value;
  }


  // #region Dispose

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;

    this._disposables.dispose();

    this._checkListeners();
    this._clearAllTimeouts();
    this._tabInfoLookup = {};
    this._reloadInfoLookup = {};

    this._onDisposed.fire(this);
  }

  get isDisposed() {
    return this._isDisposed;
  }
  get onDisposed() {
    return this._onDisposed.subscriber;
  }

  // #endregion Dispose


  // #region Static Functions

  static async checkPermission() {
    try {
      return await browser.permissions.contains({ permissions: ['tabs'] });
    } catch (error) {
      return false;
    }
  }

  // #endregion Static Functions

}