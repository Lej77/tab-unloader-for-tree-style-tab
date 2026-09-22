/**
 * @module
 *
 * This module implements syncing between different setting namespaces. Useful
 * to ensure that the data in the `local` namespace matches the `sync` namespace
 * and that any changes to `local` values are reflected in the `sync` namespace.
 */

import { DisposableCollection } from "./disposables";
import { EventListener } from "./events";
import { deepCopyCompare } from "./utilities";


/** @import { Changes, SettingsTracker } from "./settings" */
/** @import { IDisposable } from "./disposables" */


/**
 * Ensures multiple `SettingsTracker` instances mirror each other and contain the same data.
 *
 * @template T
 */
export class SettingsSynchronizer {
    /** @type {SettingsTracker<T>} */
    #source;
    /** @type {SettingsTracker<T>} */
    #target;
    #allowTargetChanges = false;
    /** @type {string[] | null} */
    #allowedProperties = null;
    /** @type {string[] | null} */
    #disallowedProperties = null;

    /** @type {DisposableCollection<IDisposable>} */
    #disposables;
    #initialState;

    /**
     *
     * @param {Object} options
     * @param {SettingsTracker<T>} options.source This is the more trusted settings tracker. This will only ever be modified at setup time and only if `initialState` is set to `copy-target`,
     * @param {SettingsTracker<T>} options.target The tracker that will be updated to reflect the source. On settings changes this will be updated to reflect the source unless `allowTargetChanges` is true in which case both trackers are treated the same.
     * @param {string[] | null} options.allowedProperties The keys that will be synced.
     * @param {string[] | null} options.disallowedProperties The keys that will NEVER be synced.
     * @param {boolean} options.allowTargetChanges If `true` then changes
     * notified by the `target` tracker will be written to the source; otherwise
     * any changes to the target will be reverted to match the source.
     * @param {'copy-source' | 'copy-target' | undefined} options.initialState Specify if the settings should be imported from the target before synchronizing or if they should be exported from the source.
     */
    constructor({ source, target, allowedProperties, allowTargetChanges, initialState }) {
        this.#source = source;
        this.#target = target;
        this.#allowedProperties = allowedProperties;
        this.#allowTargetChanges = allowTargetChanges;
        this.#initialState = initialState;

        this.#disposables = new DisposableCollection([
            new EventListener(this.#source.onDisposed(), () => this.dispose()),
            new EventListener(this.#target.onDisposed(), () => this.dispose()),
        ]);

        this.start = this.#start();
    }

    async #start() {
        await this.#source.start;
        await this.#target.start;

        if (this.#initialState) {
            /** @type {SettingsTracker} */
            let from;
            /** @type {SettingsTracker} */
            let to;
            switch (this.#initialState) {
                case 'copy-source': {
                    from = this.#source;
                    to = this.#target;
                } break;
                case 'copy-target': {
                    from = this.#target;
                    to = this.#source;
                } break;
                default: {
                    /** @type {never} */
                    const _exhaustive = this.#initialState;
                } break;
            }
            const toApply = {};
            for (const key of Object.keys(to.settings)) {
                toApply[key] = undefined;
            }
            for (const key of Object.keys(from.settings)) {
                toApply[key] = from.settings[key];
            }
            for (const key of Object.keys(toApply)) {
                if (
                    // Has allowlist and not in it:
                    (this.#allowedProperties && !this.#allowedProperties.includes(key)) ||
                    // Has blocklist and is in it:
                    (this.#disallowedProperties && this.#disallowedProperties.includes(key)) ||
                    // No change:
                    deepCopyCompare(toApply[key], to.settings[key])
                ) {
                    delete toApply[key];
                }
            }
            // TODO: don't treat undefined and removed key-value pairs the same.
            await to.set(toApply, { applyImmediatelyOnSuccess: true, removeWhenUndefined: true });
        }

        if (this.isDisposed) return;

        this.#disposables.trackDisposables([
            new EventListener(this.#source.onChange, this.#onSourceChange.bind(this)),
            new EventListener(this.#target.onChange, this.#onTargetChange.bind(this)),
        ]);
    }

    /** Handle changes to "source" storage.
     * @param {Changes<T>} changes
     */
    #onSourceChange(changes) {
        const applyToTarget = {};
        for (const key of Object.keys(changes)) {
            if (
                // Has allowlist and not in it:
                (this.#allowedProperties && !this.#allowedProperties.includes(key)) ||
                // Has blocklist and is in it:
                (this.#disallowedProperties && this.#disallowedProperties.includes(key))
            ) {
                continue;
            }
            const change = changes[/** @type {keyof T} */ (key)];
            if (!('newValue' in change)) {
                // remove a key:
                if (this.#target.settings[key] !== undefined) {
                    applyToTarget[key] = undefined;
                }
            } else if (!(key in this.#target.settings) || this.#target.settings[key] !== change.newValue) {
                applyToTarget[key] = change.newValue;
            }
        }
        // TODO: don't treat undefined and removed key-value pairs the same.
        this.#target.set(applyToTarget, { removeWhenUndefined: true });
    }
    /** Handle changes to "target" storage.
     * @param {Changes<T>} changes
     */
    #onTargetChange(changes) {
        const applyToSource = {};
        const applyToTarget = {};
        for (const key of Object.keys(changes)) {
            if (
                // Has allowlist and not in it:
                (this.#allowedProperties && !this.#allowedProperties.includes(key)) ||
                // Has blocklist and is in it:
                (this.#disallowedProperties && this.#disallowedProperties.includes(key))
            ) {
                continue;
            }
            const change = changes[/** @type {keyof T} */ (key)];
            if (!('newValue' in change) && !(key in this.#source.settings)) {
                // removed in both target and source
            } else if (!(key in this.#source.settings)) {
                // was removed in source but not in target.
                if (this.#allowTargetChanges) {
                    applyToSource[key] = change.newValue;
                } else {
                    if (change.newValue !== undefined) {
                        applyToTarget[key] = undefined;
                    }
                }
            } else if (!('newValue' in change)) {
                // tried to remove key that exists in source
                if (this.#allowTargetChanges) {
                    if (this.#source.settings[key] !== undefined) {
                        applyToSource[key] = undefined;
                    }
                } else {
                    applyToTarget[key] = this.#source.settings[key];
                }
            } else {
                // exists in both target and source
                if (change.newValue !== this.#source.settings[key]) {
                    if (this.#allowTargetChanges) {
                        applyToSource[key] = change.newValue;
                    } else {
                        applyToTarget[key] = this.#source.settings[key];
                    }
                }
            }
        }
        // TODO: don't treat undefined and removed key-value pairs the same.
        this.#source.set(applyToSource, { removeWhenUndefined: true });
        this.#target.set(applyToTarget, { removeWhenUndefined: true });
    }

    dispose() {
        this.#disposables.dispose();
    }

    get isDisposed() {
        return this.#disposables.isDisposed;
    }
}