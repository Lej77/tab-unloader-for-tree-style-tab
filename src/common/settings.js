import {
    createObjectFromKeys,
    deepCopyCompare
} from '../common/utilities.js';

import {
    EventListener,
    EventManager,
    PassthroughEventManager,
} from '../common/events.js';


/** @import { EventSubscriber } from '../common/events.js' */

/** All valid storage area names. */
const validStorageAreas = /** @type {const} */ (['sync', 'local', 'managed', 'session']);

/**
 * @typedef { (typeof validStorageAreas)[number] } StorageArea The name of a storage area.
 */
null;

/**
 * Information about the change for a single key in a storage object.
 *
 * @template T The value for a specific object key. If the key was added or
 * removed in this update then one of `oldValue` or `newValue` might be missing.
 * @typedef { { oldValue: T, newValue?: T } | {oldValue?: T, newValue: T } } SingleChange
 */
null;

/**
 * Changes that have been applied to an object. Each key whose value has been
 * changed will be set to an object that contains the previous value in
 * `oldValue` and the new value in `newValue`, note that either of those might
 * not exist if the key was just added or if it was just removed.
 *
 * @template T
 * @typedef { { [P in keyof T]?: SingleChange<T[P]> } } Changes
 */
null;


let gOnSettingsChanged = null;

/**
 * Get an `EventSubscriber` for a global `PassthroughEventManager` that subscribes to `browser.storage.onChanged`.
 *
 * @export
 * @template {Object} T
 * @returns {EventSubscriber<[Changes<T>, StorageArea]>} A subscriber to a `PassthroughEventManager`.
 */
export function getOnSettingsChanged() {
    if (!gOnSettingsChanged) {
        gOnSettingsChanged = new PassthroughEventManager(browser.storage.onChanged);
    }
    return gOnSettingsChanged.subscriber;
}

/**
 * @template T
// @ts-ignore
 * @typedef { T extends Function ? (function(): T) : (T | function(): T) } Lazy Take a value either directly or via a callback.
 */

/**
 * Keeps a settings object up to date and notifies of any changes.
 *
 * @class SettingsTracker
 * @template T
 */
export class SettingsTracker {

    // eslint-disable-next-line valid-jsdoc
    /**
     * Creates an instance of SettingsTracker.
     *
     * @param {Object} [Configuration] Determines how settings are tracked.
     * @param {null | StorageArea} [Configuration.storageArea] The storage area to track. Defaults to `local`.
     * @param {null | function(Changes<T>): any} [Configuration.callback] Callback that should be subscribed to the `onChanged` event.
     * @param {boolean} [Configuration.fallbackToDefault] Determines if default values should be used for deleted keys.
     * @param {Lazy<T> | null} [Configuration.defaultValues] An object with default values for some keys or a function that returns such an object. Ignored if `fallbackToDefault` is `false`.
     * @param {(string|number)[]} [Configuration.trackedPath] If this is not an empty array then the settings are stored in only a part of the main storage object and this "JSON path" specifies what object to track.
     * @memberof SettingsTracker
     */
    constructor({ storageArea = null, callback = null, fallbackToDefault = true, defaultValues = null, trackedPath = [] } = {}) {
        if (!storageArea || typeof storageArea !== "string") {
            storageArea = "local";
        } else if (!validStorageAreas.includes(storageArea)) {
            throw new Error(`Invalid browse storage area: "${storageArea}", expected one of: ${validStorageAreas.join(', ')}`);
        }

        if (!defaultValues || (typeof defaultValues !== 'object' && typeof defaultValues !== 'function')) {
            defaultValues = null;
        }


        this._changedProperties = {};
        this._storageArea = storageArea;
        /** @type {Lazy<T> | null} */
        this._defaultValues = defaultValues;
        this._trackedPath = trackedPath;

        /** @type {EventManager<[Changes<T>, StorageArea], any, never>} */
        this._onChange = new EventManager();
        /** @type {EventListener<[Changes<T>, StorageArea], void>} */
        this._changeListener = null;


        this.fallbackToDefault = fallbackToDefault;

        /**
         * This object will be modified based on changes notified via events so that it is always up to date with the latest changes.
         * @type {Readonly<T>}
         */
        this.settings = this._initialValues();

        this._onChange.addListener(callback);
        this._changeListener = SettingsTracker.createChangeEventListener(this._handleChange.bind(this));

        /** A promise that will be completed once the initial settings have been loaded. */
        this.start = this._start();
    }

    /** Determine the default values to use when storage is unmodified/empty.
     *
     * @returns {T} the initial settings.
     */
    _initialValues() {
        return this.fallbackToDefault && this._defaultValues ? Object.assign({}, (typeof this._defaultValues === 'function' ? this._defaultValues() : this._defaultValues)) : /** @type {any}*/ ({});
    }

    /**
     * Update the wrapped settings to reflect the provided changes and then notify listeners.
     *
     * @param {Changes<T>} changes Changes that has occurred in the tracked storage.
     * @param {StorageArea} areaName The name of the storage that was changed.
     * @memberof SettingsTracker
     */
    _handleChange(changes, areaName) {
        if (areaName !== this._storageArea) {
            return;
        }

        if (this._trackedPath.length > 0) {
            // update changes to only reflect changes in the tracked path:

            /** @type {SingleChange<any>} */
            const topKeyChange = changes[this._trackedPath[0]];
            if (!topKeyChange) {
                return; // the tracked key was not changed.
            }

            // Navigate to the tracked object:
            let before = topKeyChange.oldValue;
            let after = topKeyChange.newValue;

            for (let i = 1; i < this._trackedPath.length; i++) {
                before = before && before[this._trackedPath[i]];
                after = after && after[this._trackedPath[i]];
            }
            if (!before || typeof before !== 'object') before = {};
            if (!after || typeof after !== 'object') after = {};

            // Build a new change object for the tracked object:
            /** @type {Changes<{ [key: string]: any }>} */
            const scopedChanges = {};

            /** @type {Set<string>} */
            const changedKeys = new Set();
            Object.keys(before).forEach(key => changedKeys.add(key));
            Object.keys(after).forEach(key => changedKeys.add(key));

            for (const key of changedKeys) {
                if ((key in before) && (key in after)) {
                    const oldValue = before[key];
                    const newValue = after[key];
                    if (!deepCopyCompare(oldValue, newValue)) {
                        // Only emit change if the values are different
                        scopedChanges[key] = { oldValue, newValue };
                    }
                } else if (key in before) {
                    scopedChanges[key] = { oldValue: before[key] };
                } else if (key in after) {
                    scopedChanges[key] = { newValue: after[key] };
                }
            }

            if (Object.keys(scopedChanges).length === 0) {
                return; // no changes to tracked object.
            }

            changes = scopedChanges;
        }

        const entries = Object.entries(changes);
        if (this._changedProperties) {
            for (const [key,] of entries) {
                this._changedProperties[key] = true;
            }
        }

        /** If values are removed and fallback to their default values then the
         *  provided changes won't reflect the changes to the tracked settings
         *  so we copy the change data and update it. (We don't want to modify
         *  it in place since there could be other event listeners which would
         *  be surprised by that) */
        let clonedChanges = null;

        let defaultSettings;
        for (const [key, value] of entries) {
            if ('newValue' in value) {
                if (
                    // Changed from no data
                    !('oldValue' in value) &&
                    // When no data implies using fallback values
                    this.fallbackToDefault &&
                    // And this key was actually using a fallback value:
                    (key in this.settings)
                ) {
                    // Changed from default value, so fix event data:
                    if (!clonedChanges) clonedChanges = Object.assign({}, changes);

                    if (this.settings[key] === value.newValue) {
                        // The old fallback value is the same as our new explicit value:
                        delete clonedChanges[key];
                    } else {
                        const newChange = Object.assign({}, value);
                        newChange.oldValue = this.settings[key];
                        clonedChanges[key] = newChange;
                    }
                }
                this.settings[key] = value.newValue;
            } else {
                if (this.fallbackToDefault && !defaultSettings) {
                    defaultSettings = typeof this._defaultValues === 'function' ? this._defaultValues() : this._defaultValues;
                }
                if (this.fallbackToDefault && (key in defaultSettings)) {
                    const defaultValue = defaultSettings[key];
                    this.settings[key] = defaultValue;

                    // Fix event data:
                    if (!clonedChanges) clonedChanges = Object.assign({}, changes);

                    if (!('oldValue' in value) || value.oldValue === defaultValue) {
                        // Were already using default value (so actually no change):
                        delete clonedChanges[key];
                    } else {
                        const newChange = Object.assign({}, value);
                        newChange.newValue = defaultValue;
                        clonedChanges[key] = newChange;
                    }
                } else {
                    delete this.settings[key];
                }
            }
        }

        // If falling back to defaults values then change the event data to reflect that.
        if (clonedChanges) {
            changes = clonedChanges;
        }

        this._onChange.fire(changes, areaName);
    }

    async _start() {
        const allSettings = await browser.storage[this._storageArea].get(null);
        let scopedSettings = allSettings;
        for (let i = 0; i < this._trackedPath.length; i++) {
            scopedSettings = scopedSettings[this._trackedPath[i]];
            if (!scopedSettings || typeof scopedSettings !== 'object') {
                // tracked path never existed or was deleted while we were loading:
                this.settings = this._initialValues();
                delete this._changedProperties;
                return;
            }
        }
        for (const [key, value] of Object.entries(scopedSettings)) {
            if (!(key in this._changedProperties)) {
                this.settings[key] = value;
            }
        }
        delete this._changedProperties;
    }

    dispose() {
        this._changeListener.dispose();
    }
    isDisposed() {
        return this._changeListener.isDisposed;
    }
    onDisposed() {
        return this._changeListener.onDisposed;
    }

    get storageArea() {
        return this._storageArea;
    }

    /**
     * `EventListener`s will be notified with (changes, areaName). `areaName` will only be the one that the `SettingsTracker` is monitoring.
     * `changes` is an `Object` where each value is a `{newValue, oldValue}`.
     *
     * @readonly
     * @memberof SettingsTracker
     * @returns {EventSubscriber<[Changes<T>, StorageArea]>} An event subscriber that is notified when the tracked settings are changed.
     */
    get onChange() {
        return this._onChange.subscriber;
    }

    /** Update certain key-value pairs in the tracked settings storage.
     *
     * Note: this does nothing if the storage doesn't support writing, i.e. the
     * "managed" storage.
     *
     * @param {Partial<T>} data Object with keys that should be updated.
     * @param {Object} [options]
     * @param {boolean} [options.applyImmediatelyOnSuccess] Update the tracker before the browser's storage has notified us.
     * @param {boolean} [options.removeWhenUndefined] For key-value pairs where the value is `undefined` the key should be removed instead of updated.
     * @returns {Promise<void>} A promise that resolves when the operation succeeds.
     */
    async set(data, { applyImmediatelyOnSuccess = false, removeWhenUndefined = false } = {}) {
        const storageArea = this.storageArea;
        if (storageArea === 'managed') {
            return;
        }
        if (Object.keys(data).length === 0) {
            return;
        }

        /** @type {null | string[]} */
        let toRemove = null;
        if (this._trackedPath.length > 0) {
            // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/get
            let oldData = await browser.storage[storageArea].get(String(this._trackedPath[0]));
            if (!oldData || typeof oldData !== 'object') {
                oldData = {};
            }
            let prevScoped = oldData;
            for (let i = 0; i < this._trackedPath.length; i++) {
                let next = prevScoped[this._trackedPath[i]];
                if (!next || typeof next !== 'object') {
                    next = {};
                    prevScoped[this._trackedPath[i]] = next;
                }
                prevScoped = next;
            }
            for (const key of Object.keys(data)) {
                if (removeWhenUndefined && data[key] === undefined) {
                    delete prevScoped[key];
                } else {
                    prevScoped[key] = data[key];
                }
            }
            data = oldData;
        } else if (removeWhenUndefined) {
            data = { ...data };
            toRemove = [];
            for (const key of Object.keys(data)) {
                if (data[key] === undefined) {
                    delete data[key];
                    toRemove.push(key);
                }
            }
        }

        if (Object.keys(data).length) {
            // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/set
            switch (storageArea) {
                case 'local': await browser.storage.local.set(data); break;
                case 'session': await browser.storage.session.set(data); break;
                case 'sync': await browser.storage.sync.set(data); break;
                default: {
                    /** @type {never} */
                    const _exhaustive = storageArea;
                } break;
            }

            if (applyImmediatelyOnSuccess) {
                /** @type {Changes<any>} */
                const changes = {};
                for (const key of Object.keys(data)) {
                    /** @type {SingleChange<any>} */
                    const change = { newValue: data[key] };
                    if (key in this.settings) {
                        change.oldValue = this.settings[key];
                        if (deepCopyCompare(change.oldValue, change.newValue)) {
                            continue;
                        }
                    }

                    changes[key] = change;
                    this.settings[key] = data[key];
                }

                if (Object.keys(changes).length) {
                    this._onChange.fire(changes, this.storageArea);
                }
            }
        }

        if (toRemove && toRemove.length) {
            await browser.storage[storageArea].remove(toRemove);

            if (applyImmediatelyOnSuccess) {
                /** @type {Changes<any>} */
                const changes = {};

                let defaultSettings;
                for (const key of toRemove) {
                    if (!(key in this.settings)) {
                        continue;
                    }
                    changes[key] = { oldValue: this.settings[key] };
                    if (this.fallbackToDefault && !defaultSettings) {
                        defaultSettings = typeof this._defaultValues === 'function' ? this._defaultValues() : this._defaultValues;
                    }
                    if (this.fallbackToDefault && (key in defaultSettings)) {
                        const defaultValue = defaultSettings[key];
                        if (!deepCopyCompare(this.settings[key], defaultValue)) {
                            this.settings[key] = defaultValue;
                            changes[key].newValue = defaultValue;
                        } else {
                            delete changes[key];
                        }
                    } else {
                        delete this.settings[key];
                    }
                }
                if (Object.keys(changes).length) {
                    this._onChange.fire(changes, this.storageArea);
                }
            }
        }
    }


    // #region static functions

    // #region Manage storage


    // eslint-disable-next-line valid-jsdoc
    /**
     * Get values from local storage.
     *
     * @static
     * @template {string | KA[] | { [settingsKey: string]: any } | null} K Type of the key argument that specifies which settings keys to get values for.
     * @template {string} KA Array of settings' keys to get. This will make the compiler actually provide type info about each string in the array. Though we will need to infer the type again to actually gain access to that information.
     * @template D The default value type.
     * @param {K} key The keys to get values for. If an `Object` then get values for all keys and the values in the object correspond to default values. If `null` then return an object with all values.
     *
    // @ts-ignore
     * @param {K extends string | string[] ? D : never} [defaultValue=null] The value to use for keys that aren't set. Ignored if key is an `Object`.
     *
    // @ts-ignore
     * @returns {Promise<K extends string ? D : (K extends (infer KA2)[] ? { [P in KA2]: D } : { [P in keyof K]: K[P] })>} If one key was provided (not in an array) then the value for that key. Otherwise an object with a property for each provided key.
     * @memberof SettingsTracker
     */
    static async get(key, defaultValue = null) {
        if (typeof key === "string") {
            return (await browser.storage.local.get({ [key]: defaultValue }))[key];
        } else {
            const data = createObjectFromKeys(key, null, defaultValue); // returns key if it isn't an array.
            return await browser.storage.local.get(data);
        }
    }

    // eslint-disable-next-line valid-jsdoc
    /**
     * Set local storage values.
     *
     * @static
     * @template {string | string[] | { [settingsKey: string]: any }} K
     * @param {K} key The keys to set values for. If an `Object` then set values for all keys.
     *
    // @ts-ignore
     * @param {K extends string | string[] ? any : never} [value=null] Value to set for all keys. Ignored if `key` is an `Object`.
     * @memberof SettingsTracker
     */
    static async set(key, value = null) {
        if (typeof key === "string") {
            await browser.storage.local.set({
                [key]: value
            });
        } else {
            const data = createObjectFromKeys(key, null, value); // returns key if it isn't an array.
            await browser.storage.local.set(data);
        }
    }

    /**
     * Remove all keys from local storage.
     *
     * @static
     * @param {string | string[]} key Key(s) to remove values for.
     * @memberof SettingsTracker
     */
    static async remove(key) {
        await browser.storage.local.remove(key);
    }

    /**
     * Clear local storage.
     *
     * @static
     * @memberof SettingsTracker
     */
    static async clear() {
        await browser.storage.local.clear();
    }


    // #endregion Manage storage


    /**
     * Create an event listener for storage changes.
     *
     * @static
     * @template T
     * @param {function(Changes<T>, StorageArea): void} callback Callback with
     * the arguments `(changes, areaName)`. This will be called when the event
     * occurs. The function will be passed the following arguments:
     * - `changes` of the type `object`. Object describing the change. This
     *   contains one property for each key that changed. The name of the
     *   property is the name of the key that changed, and its value is a
     *   storage.StorageChange object describing the change to that item.
     * - `areaName` of the type `string`. The name of the storage area ("sync",
     *   "local" or "managed") to which the changes were made.
     * @returns {EventListener<[Changes<T>, StorageArea], void>} An event listener for browser.storage.onChanged.
     * @memberof Settings
     */
    static createChangeEventListener(callback) {
        return new EventListener(getOnSettingsChanged(), callback);
    }

    // #endregion static functions
}