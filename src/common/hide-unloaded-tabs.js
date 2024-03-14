
import {
    EventListener,
    EventManager,
} from '../common/events.js';

import {
    DisposableCollection,
} from '../common/disposables.js';

import {
    RequestManager,
} from '../common/delays.js';

import {
    notifyTabStateToTST,
} from '../tree-style-tab/custom-state.js';


/**
 * Handles hiding tabs with the Tab Hiding API.
 *
 * @class TabHidingManager
 */
export class TabHideManager {

    constructor({ suppressTSTHiddenClass = false } = {}) {
        Object.assign(this, {
            _isDisposed: false,
            _onDisposed: new EventManager(),

            _disposables: new DisposableCollection(),

            _isAPIEnabled: true,
            _onAPIStatusChanged: new EventManager(),

            _suppressTSTHiddenClass: suppressTSTHiddenClass,
            _onSuppressTSTHiddenClassChanged: new EventManager(),

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
            new EventListener(this.onSuppressTSTHiddenClassChanged, () => {
                this.suppressAllTSTHiddenClass();
            }),
        ]);

        this.updateAllHideStates();
    }


    /**
     * Show/Hide some tabs.
     *
     * @param {number|Array<number>} tabId A tab id or an array of tab ids to show/hide.
     * @param {boolean} hide Indicates if the tabs should be hidden.
     * @memberof TabHideManager
     */
    async _changeHideState(tabId, hide) {
        if (this.isDisposed) {
            return;
        }
        if (!this.isAPIEnabled) {
            if (hide && this._suppressTSTHiddenClass) {
                await TabHideManager.changeTSTHiddenClass(tabId);
            }
            this._apiChecker.invalidate();
            return;
        }
        if (!tabId && tabId !== 0) {
            return;
        }
        try {
            if (hide) {
                await browser.tabs.hide(tabId);
                if (this._suppressTSTHiddenClass) {
                    await TabHideManager.changeTSTHiddenClass(tabId);
                }
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


    async suppressAllTSTHiddenClass(windowId = null) {
        await TabHideManager.changeAllTSTHiddenClass(this.suppressTSTHiddenClass, windowId);
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


    // #region Suppress TST Hidden Class

    get suppressTSTHiddenClass() {
        return Boolean(this._suppressTSTHiddenClass);
    }
    set suppressTSTHiddenClass(value) {
        value = Boolean(value);
        if (value === this.suppressTSTHiddenClass) {
            return;
        }
        this._suppressTSTHiddenClass = value;
        if (!this.isDisposed) {
            this._onSuppressTSTHiddenClassChanged.fire(value);
        }
    }

    get onSuppressTSTHiddenClassChanged() {
        return this._onSuppressTSTHiddenClassChanged.subscriber;
    }

    // #endregion Suppress TST Hidden Class


    // #region Static Functions

    /**
     * Add/Remove the 'hidden' class from tabs in Tree Style Tab.
     *
     * @param {number| number[]} tabIds Tab id or array of tab ids.
     * @param {boolean} remove Indicates if the class should be removed.
     * @returns {boolean} True if the class was removed successfully; otherwise false.
     * @memberof TabHideManager
     */
    static async changeTSTHiddenClass(tabIds, remove = true) {
        if (!tabIds && tabIds !== 0) {
            return;
        }

        try {
            await notifyTabStateToTST(tabIds, 'hidden', !remove);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Add/Remove the 'hidden' class from all hidden tabs in Tree Style Tab.
     *
     * @param {boolean} remove Indicates if the class should be removed.
     * @param {number|null} windowId Window to apply changes to. Null to apply to all.
     * @memberof TabHideManager
     */
    static async changeAllTSTHiddenClass(remove, windowId = null) {
        const details = { hidden: true };
        if (windowId || windowId === 0) {
            details.windowId = windowId;
        }
        const hiddenTabs = await browser.tabs.query(details);
        await TabHideManager.changeTSTHiddenClass(hiddenTabs.map(tab => tab.id), remove);
    }

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