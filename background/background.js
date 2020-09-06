
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


// #region Tab Operations

async function unloadTabs({ tabs, fallbackOptions = {}, discardAgainAfterDelay = -1, disposables = null, useAutoTabDiscard = false } = {}) {
    try {
        tabs = await tabs;
        if (!tabs) {
            return;
        }
        if (!Array.isArray(tabs)) {
            tabs = [tabs];
        }
        // Get latest info:
        tabs = await getLatestTabs(tabs);
        if (tabs.length === 0) {
            return;
        }

        // Select another tab if a tab is selected:
        await ensureTabsArentActive(tabs, fallbackOptions);

        // Unload tabs:
        const discard = async () => {
            if (useAutoTabDiscard) {
                try {
                    await Promise.all(tabs.map(async (tab) => {
                        await browser.runtime.sendMessage(kATD_ID, {
                            method: 'discard',
                            query: {
                                windowId: tab.windowId,
                                index: tab.index
                            } // a query object that is passed to chrome.tabs.query
                        });
                    }));
                } catch (error) {
                    console.error('Failed to unload tab via Auto Tab Discard extension.\nError:', error);
                }
            } else {
                await browser.tabs.discard(tabs.map(tab => tab.id));
            }
        };
        await discard();

        if (discardAgainAfterDelay >= 0) {
            await boundDelay(discardAgainAfterDelay, disposables);
            await discard();
        }
    } catch (error) {
        console.error('Failed to unload tab' + (tabs && Array.isArray(tabs) && tabs.length > 1 ? '(s)' : '') + '!\n', error);
    }
}


/**
 * Update tab object(s) information.
 *
 * @param {Object|Array} tabs Tab(s) to update.
 * @returns {Promise<Array>} Updated tab(s).
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
 * @param {Object|Array} tabs The tabs that shouldn't be active.
 * @param {Object} Params Configure what tab is selected instead.
 * @param {boolean} [Params.fallbackToLastSelectedTab] If a tab is active then this determines the preference to use when selecting another tab. If true then the tab with highest lastAccessed value will be selected. If false the closest tab to the active tab will be selected.
 * @param {boolean} [Params.ignoreHiddenTabs] If a tab is active then this determines the preference to use when selecting another tab. If true then all hidden tabs will be ignored when searching for another tab.
 * @param {boolean} [Params.checkBeforeActiveTab] Allowed to select a tab before (to the left of) the currently active tab.
 * @param {boolean} [Params.checkAfterActiveTab] Allowed to select a tab after (to the right of) the currently active tab.
 * @returns {Promise<boolean>} Indicates if the operations was successful. If true then none of the provided tabs are selected.
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

    let closestTab;
    const queryDetails = { windowId: activeTabs[0].windowId };
    if (ignoreHiddenTabs) {
        queryDetails.hidden = false;
    }
    const allTabs = await browser.tabs.query(queryDetails);
    if (fallbackToLastSelectedTab) {
        closestTab = await findLastFocusedLoadedTab(allTabs, tabs);
    } else {
        const ignoredTabIds = tabs.map(t => t.id);
        closestTab = await findClosestTab({
            tab: activeTabs[0],
            searchTabs: allTabs,
            checkTab: t => !t.discarded && !ignoredTabIds.includes(t.id),
            checkBeforeActiveTab,
            checkAfterActiveTab,
            wrapAround,
        });
        if (!closestTab) {
            // There are no loaded tabs that can be selected. So just select the closest tab that isn't being unloaded:
            closestTab = await findClosestTab({
                tab: activeTabs[0],
                searchTabs: allTabs,
                checkTab: t => !ignoredTabIds.includes(t.id),
                checkBeforeActiveTab,
                checkAfterActiveTab,
                wrapAround,
            });
        }
    }
    if (closestTab) {
        await browser.tabs.update(closestTab.id, { active: true });
        return true;
    }
    return false;
}


async function findClosestTab({ tab, searchTabs, checkTab, checkBeforeActiveTab = true, checkAfterActiveTab = true, wrapAround = false }) {
    // (prioritize higher indexes)
    const tabs = searchTabs;
    if (tabs.length <= 1) {
        return null;
    }
    let indexActive = tabs.map(t => t.id).indexOf(tab.id);
    if (indexActive < 0) {
        indexActive = tab.index;
    }

    const checkRange = (index) => {
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


async function findLastFocusedLoadedTab(searchTabs, ignoredTabs = []) {
    const tabs = searchTabs;
    if (tabs.length <= 1) {
        return null;
    }
    const ignoredTabIds = ignoredTabs.map(t => t.id);

    tabs.sort((a, b) => b.lastAccessed - a.lastAccessed);
    let lastFocusedNotLoaded = null;
    for (const focusedTab of tabs) {
        if (!ignoredTabIds.includes(focusedTab.id)) {
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



class MouseButtonManager {
    constructor({ mouseClickCombo, getUnloadInfo = null }) {
        let combo = mouseClickCombo;
        let info = combo.info;
        this.combo = mouseClickCombo;

        defineProperty(this, 'getUnloadInfo', () => getUnloadInfo, (value) => { getUnloadInfo = value; });

        const eventManagers = {};
        const events = {};
        const eventNames = [
            'onTabDown',
            'onTabUp',
            'onDrag',
        ];
        for (const eventName of eventNames) {
            const manager = new EventManager();
            eventManagers[eventName] = manager;
            events[eventName] = manager.subscriber;
        }

        const createMonitors = (time, message) => {
            let data = combo.data;
            if (!time) {
                time = Date.now();
            }
            let monitorData = { data, time, events, message };
            let col = new MonitorCollection([
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
            if (!applyToAll) {
                const unloaded = await message.tab.discarded;
                let registerUnloaded = info.applyToUnloadedTabs;
                if (info.allowForAll) {
                    registerUnloaded = combo.applyToUnloadedTabs;
                }
                if (Boolean(unloaded) !== Boolean(registerUnloaded)) {
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
                                affectedTabs = await getTreeTabs(affectedTabs);
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
            let value = onMouseDown(message);
            lastMouseDownValue = value;
            return value;
        };
        this.onDrag = (message) => {
            let time = Date.now();
            return checkAny(eventManagers.onDrag.fire(message, time));
        };
    }
}



async function start() {

    // #region Browser Version

    let browserInfo = {};
    let majorBrowserVersion = 57;
    try {
        browserInfo = await browser.runtime.getBrowserInfo();
        majorBrowserVersion = browserInfo.version.split('.')[0];
    } catch (error) { }

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

    // #endregion Settings


    // #region Detect Private Permission

    const privatePermission = new PrivatePermissionDetector();

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
    const managerCallback = (index, callback) => {
        if (!callback || typeof callback !== 'function') {
            return false;
        }
        const all = !index && index !== 0;
        if (all) {
            const returned = [];
            for (let manager of mouseButtonManagers) {
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
                        fallbackOptions: {
                            fallbackToLastSelectedTab: settings.unloadInTSTContextMenu_fallbackToLastSelected,
                            ignoreHiddenTabs: settings.unloadInTSTContextMenu_ignoreHiddenTabs,
                            wrapAround: settings.unloadInTSTContextMenu_wrapAround,
                        }
                    }
                ));
            } break;
            case tstContextMenuItemIds.unloadTree: {
                const treeTabs = await getTreeTabs(tab.id);
                await unloadTabs(Object.assign(
                    getUnloadInfo(),
                    {
                        tabs: treeTabs,
                        fallbackOptions: {
                            fallbackToLastSelectedTab: settings.unloadTreeInTSTContextMenu_fallbackToLastSelected,
                            ignoreHiddenTabs: settings.unloadTreeInTSTContextMenu_ignoreHiddenTabs,
                            wrapAround: settings.unloadTreeInTSTContextMenu_wrapAround,
                        }
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
                        fallbackOptions: {
                            fallbackToLastSelectedTab: settings.command_unloadTab_fallbackToLastSelected,
                            ignoreHiddenTabs: settings.command_unloadTab_ignoreHiddenTabs,
                            wrapAround: settings.command_unloadTab_wrapAround,
                        }
                    }
                ));
            } break;

            case 'unload-tree': {
                const treeTabs = await getTreeTabs(activeTab.id);
                await unloadTabs(Object.assign(
                    getUnloadInfo(),
                    {
                        tabs: treeTabs,
                        fallbackOptions: {
                            fallbackToLastSelectedTab: settings.command_unloadTree_fallbackToLastSelected,
                            ignoreHiddenTabs: settings.command_unloadTree_ignoreHiddenTabs,
                            wrapAround: settings.command_unloadTree_wrapAround,
                        }
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
                state.addListeningTypes(['tab-dragready', 'tab-dragstart']);
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


    const tstMessageListener = new EventListener(tstManager.onMessage, (message) => {
        if (!settings.isEnabled) {
            return;
        }
        if (message.tab) {
            if (message.tab.incognito && !privatePermission.hasPermission) {
                // Extension isn't granted permission to access private windows.
                console.warn('Can\'t handle tab in private window because Firefox haven\'t granted the extension access to private windows.');
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
                return checkAny(managerCallback(null, (manager) => manager.onMouseDown(message)));
            } break;

            case 'tab-mouseup': {
                return checkAny(managerCallback(null, (manager) => manager.onMouseUp(message)));
            } break;

            case 'tab-dragready':
            case 'tab-dragcancel':
            case 'tab-dragstart':
            case 'tab-dragenter':
            case 'tab-dragexit':
            case 'tab-dragend': {
                return checkAny(managerCallback(null, (manager) => manager.onDrag(message)));
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
    let checkTabFixing = async () => {
        let waiting = lastTabFixCheck;
        await waiting;
        if (waiting === lastTabFixCheck || !lastTabFixCheck) {
            lastTabFixCheck = (async () => {
                let hasPermission = await TabRestoreFixer.checkPermission();
                let reloadBrokenTabs = settings.fixTabRestore_reloadBrokenTabs || settings.fixTabRestore_reloadBrokenTabs_private;
                let wanted = settings.isEnabled && (settings.fixTabRestore_waitForUrlInMilliseconds >= 0 || (reloadBrokenTabs && hasPermission));

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

    var portManager = new PortManager();
    portManager.onMessage.addListener(async (message, sender, disposables) => {
        if (!message.type) {
            return;
        }
        switch (message.type) {
            case messageTypes.permissionsChanged: {
                portManager.fireEvent(messageTypes.permissionsChanged, [message.permission, message.value]);
                checkTabHiding();
                checkTabFixing();
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
            } break;
        }
    });
    const notifyStyle = (oldStyle, newStyle) => {
        portManager.fireEvent(messageTypes.styleChanged, [oldStyle, newStyle]);
    };
    onTSTStyleChanged.addListener(notifyStyle);
    notifyStyle('', wantedTSTStyle);

    // #endregion Messaging

}


start();
