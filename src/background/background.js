
import {
    kATD_ID,
    MouseClickComboCollection,
    messageTypes,
    tstContextMenuItemIds,
    settings,
    settingsTracker,
} from '../common/common.js';

import {
    EventListener,
    EventManager,
} from '../common/events.js';

import {
    defineProperty,
} from '../common/utilities.js';

import {
    delay,
    boundDelay,
    checkAny,
    Timeout,
    waitForAll,
} from '../common/delays.js';

import {
    DisposableCollection,
} from '../common/disposables.js';

import {
    PortManager,
} from '../common/connections.js';

import {
    ContextMenuItemCollection,
} from '../common/context-menu.js';

import {
    getSelectedTabs,
} from '../common/selected-tabs.js';

import {
    PrivatePermissionDetector,
} from '../common/private-permission-detector.js';

import {
    TabRestoreFixer,
} from '../common/incorrect-unload-state-workaround.js';

import {
    TabHideManager,
} from '../common/hide-unloaded-tabs.js';

import {
    TSTState,
    TSTManager,
} from '../tree-style-tab/register.js';

import {
    MonitorCollection,
    ClickDurationMonitor,
    DoubleClickMonitor,
    DragMonitor,
} from '../background/event-conditions.js';

import {
    getTreeTabs
} from '../tree-style-tab/utilities.js';

import {
    TSTPrivacyPermissionChecker
} from '../tree-style-tab/check-privacy-permissions.js';

import {
    SettingsTracker
} from '../common/settings.js';


/**
 * @typedef {import('../common/utilities').KeysWithSuffix<T, Suffix>} KeysWithSuffix
 * @template {{}} T
 * @template {string} Suffix
 */
/**
 * @typedef {import('../common/utilities').BrowserTab} BrowserTab
 */


// #region Tab Operations

/** Tracks what tabs we are currently attempting to unload.
 *
 * Keys are tab ids (note that these are strings, since that is the only thing
 * that objects support) and values are numbers that specify how many unload
 * operations are in progress for the specified tab id (these should always be
 * integers larger than 0).
 *
 * This is needed since selecting a tab (making a tab active) while we are
 * unloading it can cause the whole browser window to become unresponsive due to
 * a Firefox bug.
 *
 * Inspired by code in "Auto Tab Discard":
 * https://github.com/rNeomy/auto-tab-discard/blob/2c5527fce288439d44d5b0909656d719da1e81b6/background.js#L116-L117
 *
 * Also see the issue that was filed for "Auto Tab Discard":
 * https://github.com/rNeomy/auto-tab-discard/issues/248
 */
const unloadsInProgress = {};
/** Tracks tabs that are in the progress of being selected.
 *
 * Key is a tab id and the value is the time it was activated in ms.
 * @type {{ [tabId: string]: number }}
 */
const activationsInProgress = {};

/** Notify that we will soon activate a tab.
 *
 * @template T
 * @param {number} tabId Id of the tab that will become active.
 * @param {() => Promise<T>} fn Callback that will activate the tab.
 * @returns {Promise<T>} The value from the callback.
 */
async function notifyTabActivation(tabId, fn) {
    activationsInProgress[tabId] = Date.now() + 2000;
    try {
        return await fn();
    } finally {
        const completedTime = Date.now()
        activationsInProgress[tabId] = completedTime;
        delay(2000).then(() => {
            if (activationsInProgress[tabId] === completedTime) {
                delete activationsInProgress[tabId];
            }
        }).catch(err => {
            console.error(`Failed to forget that tab with id ${tabId} was being selected: `, err);
        });
    }
}
/** Check if we are currently activating a specific tab.
 *
 * @param {number} tabId Id of a tab.
 * @param {number} sinceTime Ignore tabs that were activated before this time.
 * @return {boolean} `true` if the tab is becoming active.
 */
function isActivatingTabId(tabId, sinceTime) {
    const value = activationsInProgress[tabId];
    return Boolean(value) && value >= sinceTime;
}

/**
 *
 * @template T
 * @param {() => Promise<T>} fn Preform the action that will unload the tabs.
 * @param {Object} Options Extra options.
 * @param {number[]} Options.tabIds Ids of tabs that are in the process of being unloaded.
 * @param {number} [Options.unlockDelayInMs] Delay to wait before forgetting that we are unloading the tabs.
 * @return {Promise<T>} The return value from the `fn` callback.
 */
async function withInProgressUnloads(fn, { tabIds, unlockDelayInMs = 1000 }) {
    for (const tabId of tabIds) {
        unloadsInProgress[tabId] = (unloadsInProgress[tabId] || 0) + 1;
    }
    try {
        return await fn();
    } finally {
        // Wait a little while to ensure that the tabs has been marked as
        // unloaded before we remove them from `unloadsInProgress`:
        delay(unlockDelayInMs).then(() => {
            for (const tabId of tabIds) {
                const newValue = (unloadsInProgress[tabId] || 1) - 1;
                if (newValue === 0) {
                    // No unloads in progress for this tab, so we don't need to
                    // keep track of it anymore:
                    delete unloadsInProgress[tabId];
                } else {
                    unloadsInProgress[tabId] = newValue;
                }
            }
        }).catch(err => {
            console.error(`Failed to forget that tab was unloading: `, err);
        });
    }
}

/**
 * Unload some tabs.
 *
 * @param {Object} Params Parameters
 * @param {BrowserTab | BrowserTab[]} [Params.tabs] Tabs to unload.
 * @param {Parameters<typeof ensureTabsArentActive>[1]} [Params.fallbackOptions] Options for what tab should be selected if the current tab is being unloaded.
 * @param {number} [Params.discardAgainAfterDelay] Unload again after a delay to ensure the tab is properly unloaded.
 * @param {null | import('../common/disposables.js').DisposableCollection<import('../common/disposables.js').IDisposable>} [Params.disposables] This collection should be disposed if timeout settings are invalidated.
 * @param {boolean} [Params.useAutoTabDiscard] Unload tabs via Auto Tab Discard.
 * @return {Promise<void>} Resolves when the tabs have been unloaded.
 */
async function unloadTabs({ tabs = [], fallbackOptions = {}, discardAgainAfterDelay = -1, disposables = null, useAutoTabDiscard = false } = {}) {
    try {
        tabs = await tabs;
        if (!tabs) {
            return;
        }
        if (!Array.isArray(tabs)) {
            tabs = [tabs];
        }

        const noticedActivationsBefore = Date.now() - 10;
        tabs = await getLatestTabs(tabs); // Get latest info.
        tabs = tabs.filter(t => !isActivatingTabId(t.id, noticedActivationsBefore)); // Can't unload while activating tab
        if (tabs.length === 0) {
            return;
        }

        const tabIds = tabs.map(tab => tab.id);

        await withInProgressUnloads(async () => {
            // Select another tab if a tab is selected:
            await ensureTabsArentActive(tabs, fallbackOptions);

            // Unload tabs:
            const discard = async () => {
                if (useAutoTabDiscard) {
                    try {
                        await Promise.all((/**@type {BrowserTab[]}*/(tabs)).map(async (tab) => {
                            if (isActivatingTabId(tab.id, noticedActivationsBefore)) return;
                            const discardedTabIds = await browser.runtime.sendMessage(kATD_ID, {
                                method: 'discard',
                                query: {
                                    windowId: tab.windowId,
                                    index: tab.index,
                                }, // a query object that is passed to chrome.tabs.query
                            });
                            const success = Array.isArray(discardedTabIds) && discardedTabIds.includes(tab.id);
                            if (!success) {
                                // This will run for tabs such as `about:newtab` since Auto Tab Discard will only unload
                                // tabs that start with `http` or `ftp`, see:
                                // https://github.com/rNeomy/auto-tab-discard/blob/5388d50d2cfc948af4b6efcd5fd385c7c3af359c/background.js#L260-L261
                                //
                                // This will also happen if we try to unload a private tab when Auto Tab Discard doesn't
                                // have access to private windows (since the query we send then returns no tabs).
                                try {
                                    if (isActivatingTabId(tab.id, noticedActivationsBefore)) return;
                                    await browser.tabs.discard(tab.id);
                                } catch (error) {
                                    console.error('Failed to unload tab that the Auto Tab Discard extension choose not to unload. Tab info:', tab);
                                }
                            }
                        }));
                    } catch (error) {
                        console.error('Failed to unload tab via Auto Tab Discard extension.\nError:', error);
                    }
                } else {
                    await browser.tabs.discard(tabIds.filter(id => !isActivatingTabId(id, noticedActivationsBefore)));
                }
            };
            await discard();

            if (discardAgainAfterDelay >= 0) {
                await boundDelay(discardAgainAfterDelay, disposables);
                await discard();
            }
        }, { tabIds, });
    } catch (error) {
        console.error('Failed to unload tab' + (tabs && Array.isArray(tabs) && tabs.length > 1 ? '(s)' : '') + '!\n', error);
    }
}


/**
 * Update tab object(s) information. (Gets latest information directly from
 * browser to ensure we aren't using possibly corrupted data from TST.)
 *
 * @param {BrowserTab | BrowserTab[]} tabs Tab(s) to update.
 * @returns {Promise<BrowserTab[]>} Updated tab(s).
 */
async function getLatestTabs(tabs) {
    if (!tabs) {
        return;
    }
    if (!Array.isArray(tabs)) {
        tabs = [tabs];
    }
    if (tabs.length === 0) {
        return tabs;
    }
    // Get latest info:
    tabs = tabs.map(tab => browser.tabs.get(tab.id));
    for (let iii = 0; iii < tabs.length; iii++) {
        try {
            tabs[iii] = await tabs[iii];
        } catch (error) {
            // Tab might have been closed.
            tabs[iii] = null;
        }
    }
    tabs = tabs.filter(tab => tab);
    return tabs;
}


/**
 * Ensure that some tabs aren't active.
 *
 * @param {BrowserTab | BrowserTab[]} tabs The tabs that shouldn't be active.
 * @param {Object} Params Configure what tab is selected instead.
 * @param {boolean} [Params.fallbackToLastSelectedTab] If a tab is active then this determines the preference to use when selecting another tab. If true then the tab with highest lastAccessed value will be selected. If false the closest tab to the active tab will be selected.
 * @param {boolean} [Params.ignoreHiddenTabs] If a tab is active then this determines the preference to use when selecting another tab. If true then all hidden tabs will be ignored when searching for another tab.
 * @param {boolean} [Params.checkBeforeActiveTab] Allowed to select a tab before (to the left of) the currently active tab.
 * @param {boolean} [Params.checkAfterActiveTab] Allowed to select a tab after (to the right of) the currently active tab.
 * @param {boolean} [Params.wrapAround] If `true` then after reaching the end of the tab list a cursor/scan will continue from the start of the tab list and the same would happen when scanning past the start of the tab list.
 * @returns {Promise<boolean>} Indicates if the operations was successful. If `true` then none of the provided tabs are selected.
 */
async function ensureTabsArentActive(tabs, { fallbackToLastSelectedTab = false, ignoreHiddenTabs = false, checkBeforeActiveTab = true, checkAfterActiveTab = true, wrapAround = false } = {}) {
    if (!tabs) {
        return true;
    }
    if (!Array.isArray(tabs)) {
        tabs = [tabs];
    }
    const activeTabs = tabs.filter(tab => tab.active);
    if (activeTabs.length === 0) {
        return true;
    }

    /** @type {null | BrowserTab} */
    let closestTab = null;
    const queryDetails = { windowId: activeTabs[0].windowId };
    if (ignoreHiddenTabs) {
        queryDetails.hidden = false;
    }
    const allTabs = await browser.tabs.query(queryDetails);

    const ignoredTabIds = new Set(tabs.map(t => t.id));
    // Do NOT try to select any tabs that are in the process of being unloaded:
    for (const key of Object.keys(unloadsInProgress)) {
        ignoredTabIds.add(parseInt(key));
    }

    if (fallbackToLastSelectedTab) {
        closestTab = findLastFocusedLoadedTab(allTabs, ignoredTabIds);
    } else {
        closestTab = findClosestTab({
            tab: activeTabs[0],
            searchTabs: allTabs,
            checkTab: t => !t.discarded && !ignoredTabIds.has(t.id),
            checkBeforeActiveTab,
            checkAfterActiveTab,
            wrapAround,
        });
        if (!closestTab) {
            // There are no loaded tabs that can be selected. So just select the closest tab that isn't being unloaded:
            closestTab = findClosestTab({
                tab: activeTabs[0],
                searchTabs: allTabs,
                checkTab: t => !ignoredTabIds.has(t.id),
                checkBeforeActiveTab,
                checkAfterActiveTab,
                wrapAround,
            });
        }
    }
    if (closestTab) {
        await notifyTabActivation(
            closestTab.id,
            () => browser.tabs.update(closestTab.id, { active: true })
        );
        return true;
    }
    return false;
}


/** Find the closest "allowed" tab to a specified starting tab. Prioritizes
 * higher indexes if there are two allowed tabs at the same distance.
 *
 * @param {Object} Params
 * @param {BrowserTab} Params.tab The tab to start the search at.
 * @param {BrowserTab[]} Params.searchTabs The tabs to search through. Should include the starting tab.
 * @param {(tab: BrowserTab) => boolean} Params.checkTab Check if a tab is allowed.
 * @param {boolean} [Params.checkBeforeActiveTab] Search before the start tab.
 * @param {boolean} [Params.checkAfterActiveTab] Search after the start tab.
 * @param {boolean} [Params.wrapAround] If the end or start the `searchTabs` list is reached then continue from the other end of it (until we reach the start `tab` again).
 * @return {null | BrowserTab} The closest "allowed" tab or `null` if no such tab was found.
 */
function findClosestTab({ tab, searchTabs, checkTab, checkBeforeActiveTab = true, checkAfterActiveTab = true, wrapAround = false }) {
    // (prioritize higher indexes)
    const tabs = searchTabs;
    if (tabs.length <= 1) {
        return null;
    }
    let indexActive = tabs.map(t => t.id).indexOf(tab.id);
    if (indexActive < 0) {
        indexActive = tab.index;
    }

    const checkRange = (/** @type {number} */ index) => {
        return 0 <= index && index < tabs.length;
    };

    for (let iii = 1; iii < tabs.length; iii++) {
        let before = indexActive - iii;
        let after = indexActive + iii;
        if (wrapAround) {
            // Note: the loop will end when `iii` is the same as `tabs.length`.
            before = (before + tabs.length) % tabs.length;
            after = (after + tabs.length) % tabs.length;
        }
        const beforeInRange = checkBeforeActiveTab && checkRange(before);
        const afterInRange = checkAfterActiveTab && checkRange(after);
        if (!beforeInRange && !afterInRange) {
            break;
        }
        if (afterInRange && checkTab(tabs[after])) {
            return tabs[after];
        }
        if (beforeInRange && checkTab(tabs[before])) {
            return tabs[before];
        }
    }

    return null;
}


/** Find the tab that was last focused. Prefers loaded tabs if there are any
 * such tabs in the `searchTabs`.
 *
 * @param {BrowserTab[]} searchTabs Tabs to search through.
 * @param {Set<number>} [ignoredTabIds=new Set()] Tab ids to ignore.
 * @return {null | BrowserTab} The last focused tab or `null` if no
 * such tab could be found.
 */
function findLastFocusedLoadedTab(searchTabs, ignoredTabIds = new Set()) {
    const tabs = searchTabs;
    if (tabs.length <= 1) {
        return null;
    }

    tabs.sort((a, b) => b.lastAccessed - a.lastAccessed);
    let lastFocusedNotLoaded = null;
    for (const focusedTab of tabs) {
        if (focusedTab.discarded && lastFocusedNotLoaded) continue;

        if (!ignoredTabIds.has(focusedTab.id)) {
            if (!focusedTab.discarded) {
                return focusedTab;
            }
            if (!lastFocusedNotLoaded) {
                lastFocusedNotLoaded = focusedTab;
            }
        }
    }
    return lastFocusedNotLoaded;
}

// #endregion Tab Operations


/** @typedef { { [P in 'onTabDown' | 'onTabUp' | 'onDrag' | 'onNativeDrag']: EventManager<[any, number]> } } MouseButtonManagerEventManagers */

/** @typedef { { [P in 'onTabDown' | 'onTabUp' | 'onDrag' | 'onNativeDrag']: import('../common/events').EventSubscriber<[any, number]> } } MouseButtonManagerEvents */

class MouseButtonManager {
    constructor({ mouseClickCombo, getUnloadInfo = null }) {
        /** @type {import('../common/common').MouseClickComboWithProps} */
        let combo = mouseClickCombo;
        let info = combo.info;
        this.combo = combo;

        defineProperty(this, 'getUnloadInfo', () => getUnloadInfo, (value) => { getUnloadInfo = value; });

        /** @type {MouseButtonManagerEventManagers} */
        const eventManagers = /** @type {any} */ ({});
        /** @type {MouseButtonManagerEvents} */
        const events = /** @type {any} */ ({});
        const eventNames = [
            'onTabDown',
            'onTabUp',
            'onDrag',
            'onNativeDrag',
        ];
        for (const eventName of eventNames) {
            const manager = new EventManager();
            eventManagers[eventName] = manager;
            events[eventName] = manager.subscriber;
        }

        const createMonitors = (time, mouseDownMessage) => {
            const data = combo.data;
            if (!time) {
                time = Date.now();
            }
            const monitorData = { data, time, events, message: mouseDownMessage };
            const col = new MonitorCollection([
                new ClickDurationMonitor(monitorData),
                new DoubleClickMonitor(monitorData),
            ]);
            if (info.button === 0) {
                col.monitors.push(new DragMonitor(monitorData));
            }
            return col;
        };

        const checkRegister = (message) => {
            return combo.test(message.ctrlKey, message.shiftKey, message.altKey, message.metaKey);
        };

        let lastMouseDownValue;
        this.onMouseUp = (message) => {
            if (message.button !== info.button) {
                return;
            }
            let time;
            const register = checkRegister(message);

            if (register) {
                time = Date.now();
                let preventClick = checkAny(eventManagers.onTabUp.fire(message, time));

                if (preventClick) {
                    return true;
                }
            }
            return lastMouseDownValue;
        };
        const onMouseDown = async (message) => {
            let time;
            const register = checkRegister(message);

            if (register) {
                time = Date.now();
                const preventClick = checkAny(eventManagers.onTabDown.fire(message, time));

                if (preventClick) {
                    return true;
                }
            }

            if (!register) {
                return false;
            }
            const applyToAll = combo.applyToAllTabs && info.allowForAll;
            if (!applyToAll && !combo.applyToTstTree) {
                // TODO: can't apply to only loaded or unloaded tabs if applying to a Tree Style Tab Tree since we currently can't determine that.

                // Only apply to unloaded or loaded tabs, not for both kinds of tabs:
                const unloaded = await message.tab.discarded;
                let registerUnloaded = info.applyToUnloadedTabs;
                if (info.allowForAll) {
                    registerUnloaded = combo.applyToUnloadedTabs;
                }
                if (Boolean(unloaded) !== Boolean(registerUnloaded)) {
                    // Tab is already in the wanted state.
                    return false;
                }
            }

            const monitorCol = createMonitors(time, message);
            const allowedPromise = Promise.resolve(monitorCol.allow);
            allowedPromise.then(async (allowUnload) => {
                monitorCol.cancel();
                if (allowUnload) {
                    if (!info.dontUnload) {
                        let affectedTabs = message.tab;
                        if (combo.applyToTstTree) {
                            try {
                                let treeTabs = await getTreeTabs(message.tab.id);
                                if (combo.applyToTstTree_notRoot) {
                                    // Don't unload the first tab:
                                    const firstTab = treeTabs.shift();
                                    // ...unless certain conditions are met:
                                    if (combo.applyToTstTree_notRoot_unloadRootTabIf_NoDescendants) {
                                        if (
                                            treeTabs.length === 0 || (
                                                combo.applyToTstTree_notRoot_unloadRootTabIf_UnloadedDescendants &&
                                                treeTabs.every(tab => tab.discarded)
                                            )
                                        ) {
                                            treeTabs.unshift(firstTab);
                                        }
                                    }
                                }
                                if (combo.applyToTstTree_notActiveTab) {
                                    treeTabs = treeTabs.filter(tab => !tab.active);
                                }
                                affectedTabs = treeTabs;
                            } catch (error) {
                                console.error('Failed to get Tree Style Tab tree that should be unloaded.\nTab: ', affectedTabs, '\nError: ', error);
                            }
                        }
                        unloadTabs(Object.assign(
                            getUnloadInfo ? getUnloadInfo() || {} : {},
                            {
                                tabs: affectedTabs,
                                fallbackOptions: {
                                    fallbackToLastSelectedTab: combo.fallbackToLastSelected,
                                    ignoreHiddenTabs: combo.ignoreHiddenTabs,
                                    wrapAround: combo.wrapAround,
                                }
                            }
                        ));
                    }
                }
            });
            if ((info.button !== 0 || !monitorCol.done) && combo.dontPreventTSTAction && !info.allwaysPreventTSTAction) {
                return false;
            } else {
                return allowedPromise;
            }
        };
        this.onMouseDown = (message) => {
            if (message.button !== info.button) {
                return;
            }
            const value = onMouseDown(message);
            lastMouseDownValue = value;
            return value;
        };
        this.onDrag = (message) => {
            const time = Date.now();
            return checkAny(eventManagers.onDrag.fire(message, time));
        };
        this.onNativeDrag = (message) => {
            const time = Date.now();
            return checkAny(eventManagers.onNativeDrag.fire(message, time));
        };
    }
}



async function start() {
    /** @type {EventManager<[{origins?: string[], permissions?: string[]}, boolean]>} */
    const onPermissionChanged = new EventManager();


    // #region Browser Version

    let browserInfo = {};
    let majorBrowserVersion = 57;
    try {
        browserInfo = await browser.runtime.getBrowserInfo();
        majorBrowserVersion = browserInfo.version.split('.')[0];
    } catch (error) {
        console.error('Failed to detect the current major browser version, falling back to oldest supported backwards compatibility mode: ', error);
    }

    // #endregion Browser Version


    // #region Settings

    const timeDisposables = new DisposableCollection();

    const mouseClickCombos = MouseClickComboCollection.createStandard();
    const updateClickCombos = (changes) => {
        mouseClickCombos.update(changes, settings);
    };

    await settingsTracker.start;
    settingsTracker.onChange.addListener((changes, storageArea) => {
        updateClickCombos(changes);

        if (
            changes.isEnabled ||
            changes.delayedTSTRegistrationTimeInMilliseconds ||
            changes.unloadAgainAfterDelay
        ) {
            timeDisposables.stop();
        }
    });
    updateClickCombos(settings);

    const getUnloadInfo = () => {
        return {
            discardAgainAfterDelay: settings.unloadAgainAfterDelay,
            disposables: settings.unloadAgainAfterDelay > 1000 ? timeDisposables : null,
            useAutoTabDiscard: settings.unloadViaAutoTabDiscard,
        };
    };
    // eslint-disable-next-line valid-jsdoc
    /** Get fallback options info from default setting keys names with a certain prefix.
     *
     * @param {KeysWithSuffix<typeof settings, 'fallbackToLastSelected'>} keyPrefix The prefix for the settings keys related to fallback options.
     */
    const getUnloadFallbackOptions = (keyPrefix) => {
        return {
            fallbackToLastSelectedTab: settings[keyPrefix + 'fallbackToLastSelected'],
            ignoreHiddenTabs: settings[keyPrefix + 'ignoreHiddenTabs'],
            wrapAround: settings[keyPrefix + 'wrapAround'],
        };
    };

    // #endregion Settings


    // #region Detect Private Permission

    const privatePermission = new PrivatePermissionDetector();
    let tstNotifiedAboutPrivateWindow = false;

    // #endregion Detect Private Permission


    // #region Handle input

    const mouseButtonManagers = mouseClickCombos.combos.map(combo => new MouseButtonManager({ mouseClickCombo: combo }));
    for (const manager of mouseButtonManagers) {
        manager.getUnloadInfo = getUnloadInfo;
    }
    const getButtonManager = (index) => {
        if (index < 0 || mouseButtonManagers.length <= index) {
            return null;
        }
        return mouseButtonManagers[index];
    };
    // eslint-disable-next-line valid-jsdoc
    /**
     * Preform some work with each button manager.
     *
     * @template T
     * @param {null | number} index The index of the affected button manager.
     * @param {(manager: MouseButtonManager) => T} callback Queue up work for each affected manager.
     * @returns {false | T | T[]} The queued up work.
     */
    const managerCallback = (index, callback) => {
        if (!callback || typeof callback !== 'function') {
            return false;
        }
        const all = !index && index !== 0;
        if (all) {
            const returned = [];
            for (const manager of mouseButtonManagers) {
                returned.push(callback(manager));
            }
            return returned;
        } else {
            const manager = getButtonManager(index);
            if (!manager) {
                return false;
            } else {
                return callback(manager);
            }
        }
    };

    const onMenuItemClick = async (info, tab) => {
        switch (info.menuItemId) {
            case tstContextMenuItemIds.unloadTab: {
                await unloadTabs(Object.assign(
                    getUnloadInfo(),
                    {
                        tabs: settings.unloadInTSTContextMenu_useSelectedTabs ? getSelectedTabs({ tab: tab, majorBrowserVersion, }) : tab,
                        fallbackOptions: getUnloadFallbackOptions('unloadInTSTContextMenu_'),
                    }
                ));
            } break;

            case tstContextMenuItemIds.unloadTree: {
                let treeTabs = await getTreeTabs(tab.id);
                if (settings.unloadTreeInTSTContextMenu_notActiveTab) {
                    treeTabs = treeTabs.filter(tab => !tab.active);
                }
                await unloadTabs(Object.assign(
                    getUnloadInfo(),
                    {
                        tabs: treeTabs,
                        fallbackOptions: getUnloadFallbackOptions('unloadTreeInTSTContextMenu_'),
                    }
                ));
            } break;

            case tstContextMenuItemIds.unloadTreeDescendants: {
                let treeTabs = await getTreeTabs(tab.id);
                // Don't unload the first tab:
                const firstTab = treeTabs.shift();
                // ...unless certain conditions are met:
                if (settings.unloadTreeDescendantsInTSTContextMenu_unloadRootTabIf_NoDescendants) {
                    if (
                        treeTabs.length === 0 || (
                            settings.unloadTreeDescendantsInTSTContextMenu_unloadRootTabIf_UnloadedDescendants &&
                            treeTabs.every(tab => tab.discarded)
                        )
                    ) {
                        treeTabs.unshift(firstTab);
                    }
                }
                // Might not be allowed to unload the currently active tab:
                if (settings.unloadTreeDescendantsInTSTContextMenu_notActiveTab) {
                    treeTabs = treeTabs.filter(tab => !tab.active);
                }
                await unloadTabs(Object.assign(
                    getUnloadInfo(),
                    {
                        tabs: treeTabs,
                        fallbackOptions: getUnloadFallbackOptions('unloadTreeDescendantsInTSTContextMenu_'),
                    }
                ));
            } break;

            case tstContextMenuItemIds.unloadOther: {
                const selectedTabs = settings.unloadOtherInTSTContextMenu_ignoreSelectedTabs ? await getSelectedTabs({ tab: tab, majorBrowserVersion, }) : [tab];
                const allTabs = await browser.tabs.query({ windowId: tab.windowId });
                await unloadTabs(Object.assign(
                    getUnloadInfo(),
                    {
                        tabs: allTabs.filter(aTab => {
                            if (selectedTabs.some(selected => selected.id === aTab.id)) {
                                return false;
                            }
                            if (settings.unloadOtherInTSTContextMenu_ignorePinnedTabs && aTab.pinned) {
                                return false;
                            }
                            return true;
                        }),
                        fallbackOptions: getUnloadFallbackOptions('unloadOtherInTSTContextMenu_'),
                    }
                ));
            } break;
        }
    };
    browser.menus.onClicked.addListener(onMenuItemClick);

    browser.commands.onCommand.addListener(async function (command) {
        const [activeTab,] = await browser.tabs.query({ active: true, currentWindow: true });
        switch (command) {
            case 'unload-tab': {
                await unloadTabs(Object.assign(
                    getUnloadInfo(),
                    {
                        tabs: settings.command_unloadTab_useSelectedTabs ? getSelectedTabs({ tab: activeTab, majorBrowserVersion, }) : activeTab,
                        fallbackOptions: getUnloadFallbackOptions('command_unloadTab_'),
                    }
                ));
            } break;

            case 'unload-tree': {
                const treeTabs = await getTreeTabs(activeTab.id);
                await unloadTabs(Object.assign(
                    getUnloadInfo(),
                    {
                        tabs: treeTabs,
                        fallbackOptions: getUnloadFallbackOptions('command_unloadTree_'),
                    }
                ));
            } break;

            case 'unload-tree-descendants': {
                const treeTabs = await getTreeTabs(activeTab.id);
                // Don't unload the first tab:
                const firstTab = treeTabs.shift();
                // ...unless certain conditions are met:
                if (settings.command_unloadTreeDescendants_unloadRootTabIf_NoDescendants) {
                    if (
                        treeTabs.length === 0 || (
                            settings.command_unloadTreeDescendants_unloadRootTabIf_UnloadedDescendants &&
                            treeTabs.every(tab => tab.discarded)
                        )
                    ) {
                        treeTabs.unshift(firstTab);
                    }
                }

                await unloadTabs(Object.assign(
                    getUnloadInfo(),
                    {
                        tabs: treeTabs,
                        fallbackOptions: getUnloadFallbackOptions('command_unloadTreeDescendants_'),
                    }
                ));
            } break;

            case 'unload-other': {
                const selectedTabs = settings.command_unloadOther_ignoreSelectedTabs ? await getSelectedTabs({ tab: activeTab, majorBrowserVersion, }) : [activeTab];
                const allTabs = await browser.tabs.query({ windowId: activeTab.windowId });
                await unloadTabs(Object.assign(
                    getUnloadInfo(),
                    {
                        tabs: allTabs.filter(aTab => {
                            if (selectedTabs.some(selected => selected.id === aTab.id)) {
                                return false;
                            }
                            if (settings.command_unloadOther_ignorePinnedTabs && aTab.pinned) {
                                return false;
                            }
                            return true;
                        }),
                        fallbackOptions: getUnloadFallbackOptions('command_unloadOther_'),
                    }
                ));
            } break;

            case 'select-previous-tab': {
                await ensureTabsArentActive(activeTab, {
                    fallbackToLastSelectedTab: false,
                    ignoreHiddenTabs: settings.command_selectPreviousTab_ignoreHiddenTabs,
                    checkAfterActiveTab: false,
                    wrapAround: settings.command_selectPreviousTab_wrapAround,
                });
            } break;

            case 'select-next-tab': {
                await ensureTabsArentActive(activeTab, {
                    fallbackToLastSelectedTab: false,
                    ignoreHiddenTabs: settings.command_selectNextTab_ignoreHiddenTabs,
                    checkBeforeActiveTab: false,
                    wrapAround: settings.command_selectNextTab_wrapAround,
                });
            } break;

            case 'toggle-tab-hide-setting': {
                await SettingsTracker.set('tabHide_HideUnloadedTabs', !settings.tabHide_HideUnloadedTabs);
            } break;
        }
    });

    // #endregion Handle input


    // #region Context Menu

    function getContextMenuItems() {
        // Create items:
        const items = ContextMenuItemCollection.fromBuilders([
            // Unload tab:
            {
                enabled: settings.unloadInTSTContextMenu,
                id: tstContextMenuItemIds.unloadTab,
                contexts: ['tab'],
                title: settings.unloadInTSTContextMenu_CustomLabel || browser.i18n.getMessage('contextMenu_unloadTab')
            },
            // Unload tree:
            {
                enabled: settings.unloadTreeInTSTContextMenu,
                id: tstContextMenuItemIds.unloadTree,
                contexts: ['tab'],
                title: settings.unloadTreeInTSTContextMenu_CustomLabel || browser.i18n.getMessage('contextMenu_unloadTree')
            },
            // Unload tree descendants:
            {
                enabled: settings.unloadTreeDescendantsInTSTContextMenu,
                id: tstContextMenuItemIds.unloadTreeDescendants,
                contexts: ['tab'],
                title: settings.unloadTreeDescendantsInTSTContextMenu_CustomLabel || browser.i18n.getMessage('contextMenu_unloadTreeDescendants')
            },
            // Unload other tabs:
            {
                enabled: settings.unloadOtherInTSTContextMenu,
                id: tstContextMenuItemIds.unloadOther,
                contexts: ['tab'],
                title: settings.unloadOtherInTSTContextMenu_CustomLabel || browser.i18n.getMessage('contextMenu_unloadOther')
            },
            // Dummy root item to customize title:
            {
                contexts: ['tab'],
                title: settings.tstContextMenu_CustomRootLabel || browser.i18n.getMessage('contextMenu_rootItemTitle'),
                isRootItem: true,
            }
        ]);

        // Re-order items based on user preference:
        let contextMenuItems = settings.tstContextMenuOrder;
        if (!contextMenuItems || !Array.isArray(contextMenuItems)) {
            contextMenuItems = [];
        }
        for (const itemId of contextMenuItems) {
            const item = items.getContextMenuItem(itemId);
            if (item) {
                items.addContextMenuItems(item);
            }
        }

        items.sortParentsFirst();

        return items;
    }

    async function updateContextMenu() {
        try {
            await browser.menus.removeAll();

            if (settings.isEnabled && settings.contextMenu_in_tab_bar) {
                for (const details of getContextMenuItems().data) {
                    await browser.menus.create(details);
                }
            }
        } catch (error) {
            return false;
        }
        return true;
    }

    settingsTracker.onChange.addListener(async (changes, storageArea) => {
        if (!settings.isEnabled && !changes.isEnabled) {
            return;
        }
        if (!settings.contextMenu_in_tab_bar && !changes.contextMenu_in_tab_bar) {
            return;
        }
        updateContextMenu();
    });
    updateContextMenu();

    // #endregion Context Menu


    // #region Handle TST configuration

    let wantedTSTStyle = '';
    const onTSTStyleChanged = new EventManager();
    const getTSTStyle = () => {
        let style = '';

        // #region Style

        if (settings.dimUnloadedTabs) {
            style += `
/* ${browser.i18n.getMessage('treeStyleTabStyle_dimUnloadedTabs')} */
.tab.discarded {
  opacity: 0.75;
}

`;
        }
        if (settings.tabHide_ShowHiddenTabsInTST) {
            style += `
/* ${browser.i18n.getMessage('treeStyleTabStyle_showHiddenTabs')} */
.tab.hidden {
  pointer-events: auto !important;
  position: relative !important;
  visibility: visible !important;
}

`;
        }

        // #endregion Style

        return style;
    };

    const getTSTState = () => {
        const style = getTSTStyle();
        if (style !== wantedTSTStyle) {
            const oldStyle = wantedTSTStyle;
            wantedTSTStyle = style;
            onTSTStyleChanged.fire(oldStyle, style);
        }


        const state = new TSTState();
        if (!settings.isEnabled) {
            return state;
        }


        if (mouseClickCombos.combos.some(combo => combo.enabled)) {
            state.addListeningTypes(TSTState.getClickListeningTypes());
            if (mouseClickCombos.combos.some(combo => combo.enabled && combo.onDragEnabled && combo.info.button === 0)) {
                state.addListeningTypes(['tab-dragstart']);
                if (mouseClickCombos.combos.some(combo => combo.enabled && combo.onDragEnabled && combo.info.button === 0 && !combo.onDragModern)) {
                    // Support for legacy drag mode:
                    state.addListeningTypes(['tab-dragready']);
                    // Listening to this event type causes Tree Style Tab to auto switch into the `long press` drag selection mode that prevents drag and drop.
                }
                state.addListeningTypes(TSTState.getNativeDragListeningTypes());
            }
        }

        if (settings.tabHide_HideUnloadedTabs && settings.tabHide_SuppressTSTHiddenClass) {
            state.addListeningTypes('sidebar-show');
        }


        state.contextMenuItems = getContextMenuItems();


        state.style = style;

        return state;
    };


    // Set up TST and listen for messages:

    const tstManager = new TSTManager(getTSTState());

    settingsTracker.onChange.addListener(async (changes, storageArea) => {
        await tstManager.setState(getTSTState());
    });


    let isFirstTSTRegistration = true;
    const delayedRegistration = () => {
        isFirstTSTRegistration = false;
        let time = settings.delayedTSTRegistrationTimeInMilliseconds;
        if (typeof time !== 'number')
            time = parseInt(time);
        if (!time || time <= 0) {
            return;
        }

        timeDisposables.trackDisposables(
            new Timeout(() => {
                tstManager.invalidateTST([TSTManager.resetTypes.listeningTypes, TSTManager.resetTypes.contextMenu]);
                updateContextMenu();
            }, time)
        );
    };
    const tstRegistrationListener = new EventListener(tstManager.onRegistrationChange, (oldState, newState) => {
        if (isFirstTSTRegistration) {
            delayedRegistration();
        }
    });
    delayedRegistration();

    /** Wait for all promises in an array to complete and return the first that
     * was "truthy" or `false` if no such value exists.
     *
     * @param {any} array An array of values that can be promises.
     * @returns {false | Promise<any>} `false` if all values are "falsy" or a
     * promise that awaits on all "truthy" values in the array. */
    const waitForTruthy = (array) => {
        const finalValue = checkAny(array);
        if (!finalValue) return finalValue;
        // Wait for all operations to finish since preventing Tree Style Tab's
        // default action can cause later messages related to the mouse click to
        // not be sent:
        return waitForAll(array).then(() => finalValue);
    };

    const tstMessageListener = new EventListener(tstManager.onMessage, (message) => {
        if (!settings.isEnabled) {
            return;
        }
        if (message.tab) {
            if (message.tab.incognito && !tstNotifiedAboutPrivateWindow) {
                tstNotifiedAboutPrivateWindow = true;
                notifyPrivacyInfo();
            }
            if (message.tab.incognito && !privatePermission.hasPermission) {
                // Extension isn't granted permission to access private windows.
                console.warn('Can\'t handle tab in private window because Firefox hasn\'t granted the extension access to private windows.');
                return;
            }
            const tstDiscarded = message.tab.discarded;
            defineProperty(message.tab, 'discarded', () => {
                return tstDiscarded && !message.tab.active;
            });
        }
        switch (message.type) {
            case 'ready': {
                isFirstTSTRegistration = true;

                if (tabHideManager && settings.tabHide_SuppressTSTHiddenClass) {
                    tabHideManager.suppressAllTSTHiddenClass();
                }
            } break;

            case 'sidebar-show': {
                if (tabHideManager && settings.tabHide_SuppressTSTHiddenClass) {
                    tabHideManager.suppressAllTSTHiddenClass(message.windowId || message.window);
                }
            } break;

            case 'tab-clicked':
            case 'tab-mousedown': {
                return waitForTruthy(managerCallback(null, (manager) => manager.onMouseDown(message)));
            } break;

            case 'tab-mouseup': {
                return waitForTruthy(managerCallback(null, (manager) => manager.onMouseUp(message)));
            } break;

            case 'tab-dragready':
            case 'tab-dragcancel':
            case 'tab-dragstart':
            case 'tab-dragenter':
            case 'tab-dragexit':
            case 'tab-dragend': {
                return waitForTruthy(managerCallback(null, (manager) => manager.onDrag(message)));
            } break;

            case 'native-tab-dragstart': {
                return waitForTruthy(managerCallback(null, (manager) => manager.onNativeDrag(message)));
            } break;

            case 'fake-contextMenu-click': {
                onMenuItemClick(message.info, message.tab);
            } break;
        }
    });

    // #endregion Handle TST configuration


    // #region Tab Hiding

    let tabHideManager = null;

    let lastTabHideCheck = null;
    const checkTabHiding = async () => {
        let check = lastTabHideCheck;
        await check;
        if (lastTabHideCheck === check || !lastTabHideCheck) {
            lastTabHideCheck = (async () => {
                let wanted = settings.tabHide_HideUnloadedTabs && settings.isEnabled;
                let allowed = wanted ? await TabHideManager.checkPermission() : false;
                let apiAccess = allowed ? await TabHideManager.checkAPIEnabled() : false;

                if (tabHideManager) {
                    tabHideManager.isAPIEnabled = apiAccess;
                }
                if (allowed) {
                    if (!tabHideManager) {
                        if (settings.tabHide_ShowHiddenTabsInTST) {
                            // Ensure that hidden tabs are visible in TST before hiding tabs:
                            await tstManager.setState(getTSTState());
                            await delay(250);
                        }

                        if (!tabHideManager) {
                            tabHideManager = new TabHideManager({ suppressTSTHiddenClass: settings.tabHide_SuppressTSTHiddenClass });
                            tabHideManager.onAPIStatusChanged.addListener(() => {
                                if (portManager) {
                                    portManager.fireEvent(messageTypes.tabHideAPIChanged, [tabHideManager.isAPIEnabled]);
                                }
                            });
                        }
                    }
                    if (tabHideManager) {
                        tabHideManager.suppressTSTHiddenClass = settings.tabHide_SuppressTSTHiddenClass;
                    }
                } else {
                    if (tabHideManager) {
                        tabHideManager.dispose();
                        tabHideManager = null;
                        await TabHideManager.showAllTabs();
                        await TabHideManager.changeAllTSTHiddenClass(false);
                        await delay(250);
                    }
                }
            })();
        }
        return lastTabHideCheck;
    };
    settingsTracker.onChange.addListener((changes, storageArea) => {
        if (changes.tabHide_HideUnloadedTabs || changes.isEnabled || changes.tabHide_SuppressTSTHiddenClass) {
            checkTabHiding();
        }
    });
    checkTabHiding();

    // #endregion Tab Hiding


    // #region Tab Restore Fix

    let tabRestoreFixer = null;

    let lastTabFixCheck = null;
    const checkTabFixing = async () => {
        let waiting = lastTabFixCheck;
        await waiting;
        if (waiting === lastTabFixCheck || !lastTabFixCheck) {
            lastTabFixCheck = (async () => {
                const hasPermission = await TabRestoreFixer.checkPermission();
                const reloadBrokenTabs = settings.fixTabRestore_reloadBrokenTabs || settings.fixTabRestore_reloadBrokenTabs_private;
                const wanted = settings.isEnabled && (settings.fixTabRestore_waitForUrlInMilliseconds >= 0 || (reloadBrokenTabs && hasPermission));

                if (wanted) {
                    if (!tabRestoreFixer) {
                        tabRestoreFixer = new TabRestoreFixer();
                    }

                    tabRestoreFixer.waitForUrlInMilliseconds = settings.fixTabRestore_waitForUrlInMilliseconds;
                    tabRestoreFixer.waitForIncorrectLoad = settings.fixTabRestore_waitForIncorrectLoad;
                    tabRestoreFixer.fixIncorrectLoadAfter = settings.fixTabRestore_fixIncorrectLoadAfter;


                    tabRestoreFixer.reloadBrokenTabs = reloadBrokenTabs;
                    tabRestoreFixer.filterTabsToFix = (
                        settings.fixTabRestore_reloadBrokenTabs && settings.fixTabRestore_reloadBrokenTabs_private ?
                            null :
                            (tab) => {
                                if (!tab) {
                                    return false;
                                }
                                if (tab.incognito) {
                                    return settings.fixTabRestore_reloadBrokenTabs_private;
                                } else {
                                    return settings.fixTabRestore_reloadBrokenTabs;
                                }
                            }
                    );

                    tabRestoreFixer.allowQuickDiscard = (tab) => {
                        if (!tab) {
                            return false;
                        }
                        if (tab.incognito) {
                            return settings.fixTabRestore_reloadBrokenTabs_private_quickUnload;
                        } else {
                            return settings.fixTabRestore_reloadBrokenTabs_quickUnload;
                        }
                    };


                } else if (tabRestoreFixer) {
                    tabRestoreFixer.dispose();
                    tabRestoreFixer = null;
                }
            })();
        }
        return lastTabFixCheck;
    };
    settingsTracker.onChange.addListener((changes, storageArea) => {
        if (
            changes.fixTabRestore_waitForUrlInMilliseconds ||
            changes.fixTabRestore_waitForIncorrectLoad ||
            changes.fixTabRestore_fixIncorrectLoadAfter ||
            changes.fixTabRestore_reloadBrokenTabs ||
            changes.fixTabRestore_reloadBrokenTabs_private ||
            changes.fixTabRestore_reloadBrokenTabs_quickUnload ||
            changes.fixTabRestore_reloadBrokenTabs_private_quickUnload ||
            changes.isEnabled
        ) {
            checkTabFixing();
        }
    });
    checkTabFixing();

    // #endregion Tab Restore Fix


    // #region Messaging

    const portManager = new PortManager();
    portManager.onMessage.addListener(async (message, sender, disposables) => {
        if (!message.type) {
            return;
        }
        switch (message.type) {
            case messageTypes.permissionsChanged: {
                onPermissionChanged.fire(message.permission, message.value);
            } break;
            case messageTypes.tabHideAPIChanged: {
                portManager.fireEvent(messageTypes.tabHideAPIChanged, [message.value, sender.tab ? sender.tab.id : null]);
                if (tabHideManager) {
                    tabHideManager.isAPIEnabled = message.value;
                }
            } break;
            case messageTypes.updateTabHide: {
                await checkTabHiding();
                if (tabHideManager && !tabHideManager.isDisposed) {
                    await tabHideManager.updateAllHideStates();
                } else {
                    await TabHideManager.showAllTabs();
                }
            } break;
            case messageTypes.getActiveStyle: {
                return wantedTSTStyle;
            }
            case messageTypes.privacyPermission: {
                return getPrivacyInfo();
            }
        }
    });

    const notifyStyle = (oldStyle, newStyle) => {
        portManager.fireEvent(messageTypes.styleChanged, [oldStyle, newStyle]);
    };
    onTSTStyleChanged.addListener(notifyStyle);
    notifyStyle('', wantedTSTStyle);

    // #endregion Messaging


    // #region Handle misconfigured privacy permissions

    const getPrivacyInfo = () => {
        return TSTPrivacyPermissionChecker.createInfo({ detector: privatePermission, tstNotifiedAboutPrivateWindow, tstManager, });
    };

    const tstPrivacyIssues = new TSTPrivacyPermissionChecker();
    tstPrivacyIssues.onPrivacyInfoChanged.addListener((info) => {
        portManager.fireEvent(messageTypes.privacyPermissionChanged, [info]);
    });
    tstPrivacyIssues.autoUpdatePopup = settings.warnAboutMisconfiguredPrivacySettings;

    settingsTracker.onChange.addListener(changes => {
        if (changes.warnAboutMisconfiguredPrivacySettings) {
            tstPrivacyIssues.autoUpdatePopup = settings.warnAboutMisconfiguredPrivacySettings;
        }
    });

    const notifyPrivacyInfo = () => {
        tstPrivacyIssues.provideInfo(getPrivacyInfo());
    };
    privatePermission.promise.then(() => {
        notifyPrivacyInfo();
    });
    tstManager.onPermissionsChanged.addListener(() => {
        notifyPrivacyInfo();
    });

    // #endregion Handle misconfigured privacy permissions


    // #region Permissions

    onPermissionChanged.addListener((permissions, enabled) => {
        portManager.fireEvent(messageTypes.permissionsChanged, [permissions, enabled]);
        checkTabHiding();
        checkTabFixing();
    });

    try {
        browser.permissions.onAdded.addListener(permissions => onPermissionChanged.fire(permissions, true));
        browser.permissions.onRemoved.addListener(permissions => onPermissionChanged.fire(permissions, false));
    } catch (error) {
        // Not Firefox 77 or later.
    }

    // #endregion Permissions
}


start();
