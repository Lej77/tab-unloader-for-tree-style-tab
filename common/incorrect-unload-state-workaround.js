
import {
    EventListener,
    EventManager,
} from '../common/events.js';

import {
    DisposableCollection,
} from '../common/disposables.js';

import {
    getTSTTabs,
} from '../tree-style-tab/utilities.js';


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
export class TabRestoreFixer {

    constructor() {
        this._isDisposed = false;
        this._onDisposed = new EventManager();


        this._disposables = new DisposableCollection();
        this._onActivatedListener = null;
        this._onUpdatedListener = null;
        this._onCreatedListener = null;
        this._onRemovedListener = null;

        this._onTabFixedListener = null;


        this._browserInfo = browser.runtime.getBrowserInfo();

        /** Key: tabId, Value: {tab, timeoutId, discardTime, addedAtStart, lastFixReason} */
        this._tabInfoLookup = {};
        /** Key: tabId, Value: {tab, loading, fixed, redirected, blankComplete} */
        this._reloadInfoLookup = {};
        /** Key: tabId, Value: true */
        this._cachedFixedLookup = {};


        /** Can be true, false */
        this._reloadBrokenTabs = false;
        /** (tab) => true/false. WARNING: do not modify the (tab) object. */
        this._filterTabsToFix = null;
        /** Can be true, false, (tab) => true/false. WARNING: do not modify the (tab) object. */
        this._allowQuickDiscard = false;

        this._waitForUrlInMilliseconds = -1;
        this._waitForIncorrectLoad = -1;
        this._fixIncorrectLoadAfter = -1;


        /** Args: TabRestoreFixer, tabId */
        this._onTabFixed = new EventManager();
    }


    // #region Private Functions

    async _checkListeners() {
        const { version } = await this._browserInfo;
        const [majorVersion,] = version.split('.');

        for (const listenerInfo of [
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
            const [value, key, event, callback, extraParameter,] = listenerInfo;
            if (value && !this.isDisposed) {
                if (!this[key]) {
                    let listener = new EventListener(event, callback, extraParameter);
                    this[key] = listener;
                    this._disposables.trackDisposables(listener);
                }
            } else {
                if (this[key]) {
                    this._disposables.untrackDisposables(this[key]);
                    this[key].dispose();
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
                let tstTabs = await getTSTTabs(tabs.map(tab => tab.id));
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
                                const tstTab = await getTSTTabs(tab.id);
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