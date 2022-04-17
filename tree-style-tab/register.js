
import {
    ContextMenuItem,
    ContextMenuItemCollection,
} from '../common/context-menu.js';

import {
    EventManager,
    EventListener,
} from '../common/events.js';

import {
    RequestManager,
} from '../common/delays.js';

import {
    kTST_ID,
    unregisterFromTST,
} from '../tree-style-tab/utilities.js';

import {
    createTSTContextMenuItem,
    removeAllTSTContextMenuItems,
} from '../tree-style-tab/context-menu.js';


/**
 * Information about Tree Style Tab Permissions. Only available for TST 3.0.12 or later.
 * @typedef {Object} TreeStyleTabPermissions
 * @property {string[]} grantedPermissions Currently granted permissions.
 * @property {boolean} privateWindowAllowed A boolean, indicating allowed (or not) to be notified messages from private windows.
 */
null;

/**
 * Registration details for Tree Style Tab.
 *
 * @export
 * @class TSTState
 */
export class TSTState {
    constructor() {
        this.listeningTypes = [
            'ready',
            'wait-for-shutdown',
        ];
        this.contextMenuItems = new ContextMenuItemCollection();
        this.rootContextMenuItemTitle = '';
        this.style = '';
    }

    /**
     * Determine if two Tree Style Tab's states are equal.
     *
     * @static
     * @param {null | TSTState} a The first state.
     * @param {null | TSTState} b The second state.
     * @returns {boolean} Returns `true` if the first state is the same as the second; otherwise returns `false`.
     * @memberof TSTState
     */
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
    /**
     * Determine if two Tree Style Tab's states are listening to the same events.
     *
     * @static
     * @param {null | TSTState} a The first state.
     * @param {null | TSTState} b The second state.
     * @returns {boolean} Returns `true` if the first state listens to the same events as the second; otherwise returns `false`.
     * @memberof TSTState
     */
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
    /**
     * Determine if two Tree Style Tab's states have the same context menu items.
     *
     * @static
     * @param {null | TSTState} a The first state.
     * @param {null | TSTState} b The second state.
     * @returns {boolean} Returns `true` if the first state has the same context menu items as the second; otherwise returns `false`.
     * @memberof TSTState
     */
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
            const rootItems = a.contextMenuItems.getRootContextMenuItems();
            if (rootItems.length > 1 && a.rootContextMenuItemTitle !== b.rootContextMenuItemTitle) {
                return false;
            }
        }
    }
    /**
     * Determine if two Tree Style Tab's states apply the same custom styles.
     *
     * @static
     * @param {null | TSTState} a The first state.
     * @param {null | TSTState} b The second state.
     * @returns {boolean} Returns `true` if the first state would apply the same custom style as the second; otherwise returns `false`.
     * @memberof TSTState
     */
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

    /**
     * Deep copy this state.
     *
     * @returns {TSTState} A deep copy of this state.
     * @memberof TSTState
     */
    clone() {
        const clone = new TSTState();
        clone.addListeningTypes(this.listeningTypes);
        clone.contextMenuItems = this.contextMenuItems.clone();
        clone.rootContextMenuItemTitle = this.rootContextMenuItemTitle;
        clone.style = this.style;
        return clone;
    }

    /**
     * Add the names of some events that Tree Style Tab should notify this extension
     * about.
     *
     * @param {string | string[]} listeningTypes Names of event types.
     * @memberof TSTState
     */
    addListeningTypes(listeningTypes) {
        if (!Array.isArray(listeningTypes)) {
            listeningTypes = [listeningTypes];
        }
        for (const type of listeningTypes) {
            if (!this.listeningTypes.includes(type)) {
                this.listeningTypes.push(type);
            }
        }
    }


    /**
     * `true` if this state applies a custom CSS style.
     *
     * @readonly
     * @memberof TSTState
     */
    get hasStyle() {
        return this.style && this.style.trim() !== '';
    }

    static getTabbarClickListeningTypes() {
        return [
            'tabbar-clicked',
            'tabbar-mousedown',
            'tabbar-mouseup',
        ];
    }
    static getClickListeningTypes() {
        return [
            // 'tab-clicked',   // Same as 'tab-mousedown'?
            'tab-mousedown',
            'tab-mouseup',
        ];
    }
    /**
     * Get the names of Tree Style Tab event types that listen to its undocumented custom drag selection feature that is used by Multiple Tab Handler.
     *
     * In Tree Style Tab v2.7.8 and later you must send a `{ type: "start-custom-drag", windowId }` message for this events to start. In earlier versions
     * they would start automatically after about 400ms (this was customizable in Tree Style Tab's hidden developer section with more settings).
     *
     * In Tree Style Tab v2.7.8 and later listening to the `tab-dragready` event type causes Tree Style Tab to auto switch into the `long press` drag selection
     * mode that prevents drag and drop.
     *
     * @static
     * @returns {string[]} Event type names.
     * @memberof TSTState
     */
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
    /**
     * Get the names of Tree Style Tab event types that listen to drag and drop in the sidebar. (Available in TST 2.7.8 and later):
     *
     * @static
     * @returns {string[]} event type names.
     * @memberof TSTState
     */
    static getNativeDragListeningTypes() {
        return [
            // available in TST 2.7.8 and later
            'native-tab-dragstart',
        ];
    }

    /**
     * Get the names for events that tell Tree Style Tab to detect when this extension
     * is unloaded/disabled.
     *
     * @static
     * @returns {string[]} event type names.
     * @memberof TSTState
     */
    static getWaitForShutdownListeningTypes() {
        return ['wait-for-shutdown'];
    }
}


/**
 * A manager that handles registrations to Tree Style Tab.
 *
 * @export
 * @class TSTManager
 */
export class TSTManager {

    /**
     * Creates an instance of TSTManager.
     *
     * @param {TSTState} state The state that should be registered to Tree Style Tab.
     * @memberof TSTManager
     */
    constructor(state) {
        this._isDisposed = false;
        this._onDisposed = new EventManager();

        this._onMessage = new EventManager();
        /** @type {EventManager<[{oldState: TSTState, newState: TSTState}]>} */
        this._onRegistrationChanged = new EventManager();
        /** @type {EventManager<[]>} */
        this._onNewRegistrationInfo = new EventManager();
        /** @type {EventManager<[{oldPermissions: TreeStyleTabPermissions, newPermissions: TreeStyleTabPermissions}]>} */
        this._onPermissionsChanged = new EventManager();

        this._resetData = null;
        this._currentState = new TSTState();
        this._wantedState = (state && state instanceof TSTState) ? state : new TSTState();

        /** @type {RegistrationInfo | null} */
        this._latestRegistrationInfo = null;
        /** @type {TreeStyleTabPermissions | null} */
        this._trackedPermissions = null;
        this._isRegistered = false;


        /** @type {RequestManager<[]>} */
        this._registrationUpdater = new RequestManager(this._handleStateUpdate.bind(this), 500, false);

        this._externalMessageListener = new EventListener(browser.runtime.onMessageExternal, this._handleExternalMessage.bind(this));


        /** @type {null | ((shouldUnregister: boolean) => void)} */
        this._lastWaitForShutdownPromiseResolve = null;
        /** @type {EventListener} A listener for an event that will be triggered when the extension is disabled. */
        this._beforeUnloadListener = new EventListener(window, 'beforeunload', () => {
            if (this._lastWaitForShutdownPromiseResolve) {
                this._lastWaitForShutdownPromiseResolve(true);
                this._lastWaitForShutdownPromiseResolve = null;
            }
        });

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
            const values = this._onMessage.fire(message);
            if (message.type === 'ready' || message.type === 'permissions-changed') {
                // 'ready': passive registration for secondary (or after) startup:
                // 'permissions-changed': If your addon injects additional style rules
                //      to TST's sidebar, you may need to re-inject it when permissions
                //      are changed
                if (message.type === 'permissions-changed') {
                    const oldPermissions = this._trackedPermissions;
                    this._trackedPermissions = {
                        grantedPermissions: message.grantedPermissions,
                        privateWindowAllowed: message.privateWindowAllowed,
                    };
                    this._onPermissionsChanged.fire({ oldPermissions: oldPermissions, newPermissions: this._trackedPermissions });
                }
                this.invalidateTST(true);
                return Promise.resolve(true);
            } else if (message.type == 'wait-for-shutdown') {
                return new Promise((resolve, reject) => {
                    try {
                        if (this._lastWaitForShutdownPromiseResolve) {
                            // Don't keep more than 1 promise alive for this event (cancel the previous one):
                            this._lastWaitForShutdownPromiseResolve(false);
                        }
                        this._lastWaitForShutdownPromiseResolve = resolve;
                    } catch (error) {
                        reject(error);
                    }
                });
            } else {
                for (const value of values) {
                    if (value !== undefined) {
                        return Promise.resolve(value);
                    }
                }
            }
        } catch (error) {
            console.error('Error on Tree Style Tab message handling!\n', error, '\nStack Trace:\n', error.stack);
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

        const changed = !TSTState.isEqual(this._currentState, this._wantedState);

        if (changed || reset.any) {
            const currentState = this._currentState;
            const targetState = this._wantedState ? this._wantedState.clone() : new TSTState();
            let newState = targetState.clone();
            let newRegistrationInfo = false;
            const oldPermissions = this._trackedPermissions;

            if (targetState.hasStyle || targetState.listeningTypes.length > 0 || targetState.contextMenuItems.length > 0) {
                const styleChange = !TSTState.isStyleEqual(currentState, targetState);

                // Remove old style:
                if (
                    // The new style might not override the old style:
                    (currentState.hasStyle && styleChange && !targetState.style) ||
                    // Specifically asked to ensure style was fixed:
                    reset[TSTManager.resetTypes.style]
                ) {
                    // This was previously all that was required:
                    await unregisterFromTST();
                    // But newer TST versions also require this:
                    await registerToTST({ style: ' ' });
                }

                // Update listening types and/or register new style:
                let success = true;
                if (styleChange || !TSTState.isListeningTypesEqual(currentState, targetState) || reset[TSTManager.resetTypes.style] || reset[TSTManager.resetTypes.listeningTypes]) {
                    const registrationInfo = await registerToTST({ listeningTypes: targetState.listeningTypes, style: targetState.style });
                    if (typeof registrationInfo === 'object') {
                        this._latestRegistrationInfo = registrationInfo;
                        this._trackedPermissions = registrationInfo;
                        newRegistrationInfo = true;
                    }
                    success = Boolean(registrationInfo);
                }
                this._isRegistered = success;

                if (!success) {
                    newState = new TSTState();
                } else if (!TSTState.isContextMenuItemsEqual(currentState, targetState) || reset[TSTManager.resetTypes.contextMenu]) {
                    if ((currentState.contextMenuItems.items.length > 0) || reset[TSTManager.resetTypes.contextMenu]) {
                        // Update context menu items:
                        await removeAllTSTContextMenuItems();
                    }
                    if (targetState.contextMenuItems.items.length > 0) {
                        const itemCollection = targetState.contextMenuItems;
                        const items = itemCollection.items;
                        // Create root item if more than 1 root item:
                        const rootItems = itemCollection.getRootContextMenuItems();
                        if (rootItems.length > 1 && targetState.rootContextMenuItemTitle) {
                            const root = new ContextMenuItem({
                                id: itemCollection.getUniqueId(),
                                contexts: ['tab'],
                                title: targetState.rootContextMenuItemTitle
                            });
                            items.unshift(root);
                            for (const item of rootItems) {
                                item.proxy().parentId = root.proxy().id;
                            }
                        }
                        for (const item of items) {
                            await createTSTContextMenuItem(item.data());
                        }
                    }
                }
            } else {
                // Unregister:
                await removeAllTSTContextMenuItems();
                await unregisterFromTST();
                this._isRegistered = false;
            }

            this._currentState = newState;

            if (this._onRegistrationChanged.listenersLength > 0) {
                /** @type {TSTState | null} */
                let eventObjCache = null;
                const eventObj = {
                    get oldState() {
                        return currentState;
                    },
                    get newState() {
                        if (!eventObjCache) {
                            eventObjCache = newState.clone();
                        }
                        return eventObjCache;
                    }
                };
                this._onRegistrationChanged.fire(eventObj);
            }
            if (newRegistrationInfo) {
                this._onNewRegistrationInfo.fire();
                this._onPermissionsChanged.fire({ oldPermissions, newPermissions: this._trackedPermissions });
            }
        } else {
            return true;
        }
    }

    // #endregion Private functions


    /**
     * Invalidate the current Tree Style Tab registration. The manager will check its registration and change it as needed.
     *
     * @param {boolean | string | string[]} [resetInfo=false] Force an update of certain parts of the registration info. True to force update everything. String value to update one registration type. Array to update several.
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
                for (const key of resetInfo) {
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
     * Set new registration info. Will return after next registration check.
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


    /**
     * Permissions granted to this extension by Tree Style Tab.
     *
     * @readonly
     * @memberof TSTManager
     */
    get trackedPermissions() {
        return this._trackedPermissions;
    }

    /**
     * The latest information about the Tree Style Tab registration.
     *
     * Note that this can have a value even if we are currently unregistered.
     *
     * @readonly
     * @memberof TSTManager
     */
    get latestRegistrationInfo() {
        return this._latestRegistrationInfo;
    }

    get isRegistered() {
        return this._isRegistered;
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

    /**
     * Notified when `latestRegistrationInfo` is changed.
     *
     * @readonly
     * @memberof TSTManager
     */
    get onNewRegistrationInfo() {
        return this._onNewRegistrationInfo.subscriber;
    }

    /**
     * Notified when `trackedPermissions` is changed.
     *
     * @readonly
     * @memberof TSTManager
     */
    get onPermissionsChanged() {
        return this._onPermissionsChanged.subscriber;
    }

    // #endregion Events


    // #region Dispose

    dispose() {
        if (this.isDisposed) {
            return;
        }
        this._isDisposed = true;

        this._externalMessageListener.dispose();
        this._registrationUpdater.dispose();

        if (this._lastWaitForShutdownPromiseResolve) {
            this._lastWaitForShutdownPromiseResolve(false);
            this._lastWaitForShutdownPromiseResolve = null;
        }
        this._beforeUnloadListener.dispose();

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
TSTManager.resetTypes = Object.freeze({
    /** Ensure the injected style sheet is correctly set. */
    style: (/** @type { 'style' } */ ('style')),
    /** Ensure all the wanted events are being listened to. */
    listeningTypes: (/** @type { 'listeningTypes' } */ ('listeningTypes')),
    /** Ensure all context menu items are correctly registered. */
    contextMenu: (/** @type { 'contextMenu' } */ ('contextMenu')),
});

/**
 * Registration info from Tree Style Tab. Only available for Tree Style Tab version 3.0.12 or later.
 * @typedef {Object} RegistrationInfo
 * @property {string[]} grantedPermissions Currently granted permissions.
 * @property {boolean} privateWindowAllowed A boolean, indicating allowed (or not) to be notified messages from private windows.
 */
null;

/**
 * Register to Tree Style Tab.
 *
 * @export
 * @param {Object} Params Details about this extension's global config for Tree Style Tab.
 * @param {null | string[]} [Params.listeningTypes] Events that should be listened to.
 * @param {null | string} [Params.style] Custom CSS stylesheet that Tree Style Tab should apply to its sidebar page and in later versions also its "group" tabs.
 * @param {null | string} [Params.name] The name of this extension. If not specified then this will be retrieved from the extension's manifest.
 * @returns {Promise<boolean | RegistrationInfo>} An object with information or `true` if the registration was successful; otherwise `false`.
 */
export async function registerToTST({ listeningTypes = [], style = null, name = null } = {}) {
    try {
        const message = {
            type: 'register-self',
            name: name || browser.runtime.getManifest().name,
        };
        if (listeningTypes) {
            message.listeningTypes = listeningTypes;
        }
        if (style && typeof style === "string") {
            message.style = style;
        }
        return (await browser.runtime.sendMessage(kTST_ID, message)) || true;
    }
    catch (e) {
        // TST is not available
        return false;
    }
}
