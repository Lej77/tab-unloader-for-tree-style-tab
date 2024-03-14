'use strict';

import {
    createObjectFromKeys
} from '../common/utilities.js';

import {
    EventListener,
    EventManager,
    PassthroughEventManager,
} from '../common/events.js';


/**
 * @typedef {import('../common/events.js').EventSubscriber<T>} EventSubscriber<T>
 * @template T
 */
null;

/**
 * @typedef { "sync" | "local" | "managed" } StorageArea The name of a storage area.
 */

/**
 * Changes that have been applied to an object. Each key whose value has been changed will be set to an object that contains the previous value in `oldValue` and the new value in `newValue`, note that either of those might not exist if the key was just added or if it was just removed.
 *
 * @template T
 * @typedef { { [P in keyof T]?: { oldValue: T[P], newValue?: T[P] } | { oldValue?: T[P], newValue: T[P] } } } Changes
 *
 */
null;


let gOnSettingsChanged = null;

/**
 * Get an `EventSubscriber` for a global `PassthroughEventManager` that subscribes to `browser.storage.onChanged`.
 *
 * @export
 * @returns {EventSubscriber<[Changes<Object>, string]>} A subscriber to a `PassthroughEventManager`.
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
     * @param { Lazy<T> | null } [Configuration.defaultValues] An object with default values for some keys or a function that returns such an object. Ignored if `fallbackToDefault` is `false`.
     * @memberof SettingsTracker
     */
    constructor({ storageArea = null, callback = null, fallbackToDefault = true, defaultValues = null } = {}) {
        if (!storageArea || typeof storageArea !== "string") {
            storageArea = "local";
        }

        if (!defaultValues || (typeof defaultValues !== 'object' && typeof defaultValues !== 'function')) {
            defaultValues = null;
        }


        this._changedProperties = {};
        this._storageArea = storageArea;
        this._defaultValues = defaultValues;

        this._onChange = new EventManager();
        this._changeListener = null;


        this.fallbackToDefault = fallbackToDefault;

        /**
         * This object will be modified based on changes notified via events so that it is always up to date with the latest changes.
         * @type {Readonly<T>}
         */
        this.settings = fallbackToDefault && defaultValues ? Object.assign({}, (typeof defaultValues === 'function' ? defaultValues() : defaultValues)) : {};

        this._onChange.addListener(callback);
        this._changeListener = SettingsTracker.createChangeEventListener(this._handleChange.bind(this));

        /** A promise that will be completed once the initial settings have been loaded. */
        this.start = this._start();
    }

    /**
     * Update the wrapped settings to reflect the provided changes and then notify listeners.
     *
     * @param {Changes<T>} changes Changes that has occurred in the tracked storage.
     * @param {StorageArea} areaName The name of the storage that was changed.
     * @memberof SettingsTracker
     */
    _handleChange(changes, areaName) {
        if (areaName !== this._storageArea)
            return;

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
        for (const [key, value] of Object.entries(allSettings)) {
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
     * @param {function(Changes<T>, StorageArea): any} callback (changes, areaName) Function that will be called when this event occurs. The function will be passed the following arguments:
     * changes:    object. Object describing the change. This contains one property for each key that changed. The name of the property is the name of the key that changed, and its value is a storage.StorageChange object describing the change to that item.
     * areaName:   string. The name of the storage area ("sync", "local" or "managed") to which the changes were made.
     * @returns {EventListener} An event listener for browser.storage.onChanged.
     * @memberof Settings
     */
    static createChangeEventListener(callback) {
        return new EventListener(getOnSettingsChanged(), callback);
    }

    // #endregion static functions
}