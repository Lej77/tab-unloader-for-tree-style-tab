'use strict';


/**
 * A tab object returned by the WebExtension API.
 *
 * The type `tabs.Tab` contains information about a tab. This provides access to information about what content is in the tab, how large the content is, what special states or restrictions are in effect, and so forth.
 *
 * @typedef {Object} BrowserTab
 * @property {boolean} Info.active Whether the tab is active in its window. This may be true even if the tab's window is not currently focused. 
 *
 *  The active tab is usually the selected one. However, on Firefox for Android, extension popups open in a new tab. When this popup tab is selected, the active tab will instead be the one in which the popup opened.
 * @property {boolean} Info.attention Indicates whether the tab is drawing attention. For example, when the tab displays a modal dialog, attention will be true.
 * @property {boolean} Info.audible If the tab is not muted: whether the tab is producing sound. If the tab is muted: whether the tab would be producing sound, if it were not muted.
 * @property {string} [Info.cookieStoreId] The cookie store of the tab. If different tabs can have different cookie stores (for example, to support contextual identity), you can pass this as the storeId option into various methods of the cookies API, to set and get cookies associated with this tab's cookie store. Only present if the extension has the "cookies" permission.
 * @property {boolean} Info.discarded Whether the tab is discarded. A discarded tab is one whose content has been unloaded from memory, but is still visible in the tab strip. Its content gets reloaded the next time it's activated.
 * @property {string} [Info.favIconUrl] The URL of the tab's favicon. Only present if the extension has the "tabs" permission. It may also be an empty string if the tab is loading.
 * @property {number} Info.height The height of the tab in pixels.
 * @property {boolean} Info.hidden Whether the tab is hidden.
 * @property {boolean} Info.highlighted Whether the tab is highlighted. An active tab is always highlighted, but some browsers may allow additional tabs to be highlighted, for example by clicking them while holding Ctrl or ⌘ Command keys.
 *
 *  Firefox for Android doesn't support highlighting multiple tabs, and Firefox desktop requires the browser.tabs.multiselect preference.
 * @property {number} Info.id The tab's ID. Tab IDs are unique within a browser session. The tab ID may also be set to tabs.TAB_ID_NONE for browser windows that don't host content tabs (for example, devtools windows).
 * @property {number} Info.incognito Whether the tab is in a private browsing window.
 * @property {number} Info.index The zero-based index of the tab within its window.
 * @property {boolean} Info.isArticle True if the tab can be rendered in Reader Mode, false otherwise.
 * @property {boolean} Info.isInReaderMode True if the tab is currently being rendered in Reader Mode, false otherwise.
 * @property {number} Info.lastAccessed Time at which the tab was last accessed, in milliseconds since the epoch.
 * @property {Object} Info.mutedInfo The current muted state for the tab and the reason for the last state change.
 * @property {number} [Info.openerTabId] The ID of the tab that opened this tab, if any. This property is only present if the opener tab still exists.
 * @property {boolean} Info.pinned Whether the tab is pinned.
 * @property {boolean} Info.selected Whether the tab is selected.
 * @property {string} Info.sessionId The session ID used to uniquely identify a Tab obtained from the sessions API.
 * @property {string} Info.status Either loading or complete.
 * @property {number} Info.successorId The ID of the tab's successor.
 * @property {string} [Info.title] The title of the tab. Only present if the extension has the "tabs" permission.
 * @property {string} [Info.url] The URL of the document that the tab is displaying. Only present if the extension has the "tabs" permission.
 * @property {number} Info.width The width of the tab in pixels.
 * @property {number} Info.windowId The ID of the window that hosts this tab.
 */
null;

/**
 * A window object returned by the WebExtension API.
 *
 * The type `windows.Window` contains information about a browser window.
 *
 * @typedef {Object} BrowserWindow
 * @property {boolean} Info.alwaysOnTop Whether the window is set to be always on top.
 * @property {boolean} Info.focused Whether the window is currently the focused window.
 * @property {number} Info.height The height of the window, including the frame, in pixels.
 * @property {number} Info.id The ID of the window. Window IDs are unique within a browser session.
 * @property {boolean} Info.incognito Whether the window is incognito (private).
 * @property {number} Info.left The offset of the window from the left edge of the screen in pixels.
 * @property {string} Info.state A `windows.WindowState` value representing the state of this browser window — maximized, minimized, etc.
 * @property {BrowserTab[]} Info.tabs Array of `tabs.Tab` objects representing the current tabs in the window.
 * @property {string} Info.title The title of the browser window. Requires "tabs" permission. Read only.
 * @property {number} Info.top The offset of the window from the top edge of the screen in pixels.
 * @property {string} Info.type A `windows.WindowType` value representing the type of browser window this is — normal browser window, popup, etc.
 * @property {number} Info.width The width of the window, including the frame, in pixels.
 */
null;

/**
 * Get all keys in an object that ends with a specific suffix.
 *
 * @typedef { keyof { [P in keyof T as P extends `${infer Prefix}${Suffix}` ? Prefix : never]: false } } KeysWithSuffix
 * @template {{}} T
 * @template {string} Suffix
 */

/**
 * Get a promise and its resolve and reject functions.
 *
 * @export
 * @template T
 * @returns {Promise<{promise: Promise<T>, resolve: function(T): void, reject: function(any): void}>} An object that wraps a promise and its resolve and reject functions.
 */
export async function getPromiseWithResolve() {
  let aPromise;
  let aReject;
  let aResolve;
  await new Promise((resolve, reject) => {
    try {
      aPromise = new Promise((resolvePromise, rejectPromise) => {
        aResolve = resolvePromise;
        aReject = rejectPromise;
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
  return {
    promise: aPromise,

    resolve: aResolve,
    reject: aReject,
  };
}

/**
 * Create an object from an array of keys and an array of values or a default value.
 *
 * @export
 * @param {string[] | any} keys An array of keys that will be set for the returned object. If not an array this will be returned.
 * @param {null | Object[]} values Array of values to set for each key. If shorter then key array then the rest are set to the default value.
 * @param {any} [defaultValue=null] If values array is to short then fallback to this value for the rest of the keys.
 * @returns {any | Object} An object that has all keys set from the keys array. If `keys` wasn't an array then its value is returned instead.
 */
export function createObjectFromKeys(keys, values, defaultValue = null) {
  if (keys && Array.isArray(keys)) {
    const data = {};
    const valueIsArray = Array.isArray(values);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (typeof key === 'string')
        data[key] = (valueIsArray && i < values.length) ? values[i] : defaultValue;
    }
    return data;
  } else {
    return keys;
  }
}

/**
 * Helper method that calls `Object.defineProperty` to add a getter and setter to an object.
 *
 * @export
 * @template T
 * @param {Object} obj The object to add a getter and setter to.
 * @param {PropertyKey} propertyName The name of the property that should be added.
 * @param {null | function(): T} get The getter for the property
 * @param {null | function(T): void} [set] The setter for the property.
 */
export function defineProperty(obj, propertyName, get, set) {
  let getSet = {};
  if (get)
    getSet.get = get;
  if (set)
    getSet.set = set;
  Object.defineProperty(obj, propertyName, getSet);
}

/**
 * Copy an object by serializing and then deserializing it with JSON.
 *
 * @template T
 * @param {T} value Value to copy.
 * @returns {T} A copy of the provided value.
 */
export function deepCopy(value) {
  if (!value) {
    return value;
  }
  switch (typeof value) {
    case 'string':
    case "boolean":
    case "bigint":
    case "function":
    case "number":
    case "undefined":
      return value;

    default:
      return JSON.parse(JSON.stringify(value));
  }
}

/**
 * Compare two object by serializing them to JSON. Can also handle other types of values.
 *
 * @param {Object} a The first object.
 * @param {Object} b The second object.
 * @returns {boolean} `true` if they are equal; otherwise `false`.
 */
export function deepCopyCompare(a, b) {
  if (a === b) return true;
  // The only way the two values can be equal after the above check is if they are both objects.

  // `null` counts as an `object` so remove that possibility:
  if (!a || !b) return false;

  // Check so that both values are objects:
  if (typeof a !== 'object') return false;
  if (typeof b !== 'object') return false;

  // Compare both objects via JSON serialization:
  return JSON.stringify(a) === JSON.stringify(b);
}

// eslint-disable-next-line valid-jsdoc
/** Prefix all keys in an existing object with a specified string.
 *
 * @template {string} K
 * @template {{}} T
 * @param {K} prefix The prefix to add for all keys.
 * @param {T} object The object whose keys should be prefixed.
 * @returns { { [P in keyof T as `${K}${P}`]: T[P]; } } An object with settings that share a prefix.
 */
export function prefixObjectKeys(prefix, object) {
  /** @type {any} */
  const obj = {};
  for (const [key, value] of Object.entries(object)) {
    obj[prefix + key] = value;
  }
  return obj;
}