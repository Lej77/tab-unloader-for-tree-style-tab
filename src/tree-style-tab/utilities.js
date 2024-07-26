'use strict';


/**
 * Info about the current tab selection.
 *
 * @typedef {import('../common/utilities.js').BrowserTab & TSTTabExtension} TSTTab
 *
 * @typedef {Object} TSTTabExtension
 * @property {string[]} Info.states An array of class names applied to the tab.
 *
 * Here is a list of major classes appeared in states:
    - active: Same to tabs.Tab.active.
    - audible: Same to tabs.Tab.audible.
    - collapsed: The tab is in a collapsed subtree. The tab is invisible.
    - complete: Same to tabs.Tab.status == "complete".
    - discarded: Same to tabs.Tab.discarded.
    - incognito: Same to tabs.Tab.incognito.
    - loading: Same to tabs.Tab.status == "loading".
    - muted: Same to tabs.Tab.mutedInfo.muted.
    - pinned: Same to tabs.Tab.pinned.
    - subtree-collapsed: The tab has any child, and its subtree is collapsed. All child tabs are invisible.
    - group-tab: A special class on a dummy tab for grouping.

 * @property {number} Info.indent The indent level of the tab (integer). It is 0 for top level tabs. (Note: this property is available on Tree Style Tab 2.4.8 and later.)
 * @property {TSTTab[]} Info.children An array of child tabs with same format (extended tabs.Tab) recursively.
 * @property {number[]} Info.ancestorTabIds An array of ancestor tabs' tabs.Tab.id (integer). (Note: this property is available on Tree Style Tab 2.4.17 and later.)
 *
 */
null;

export let kTST_ID = 'treestyletab@piro.sakura.ne.jp';

/**
 * Ping Tree Style Tab to see if it is currently installed and enabled.
 *
 * @export
 * @returns {Promise<boolean>} True if Tree Style Tab is available; otherwise false.
 */
export async function pingTST() {
    try {
        await browser.runtime.sendMessage(kTST_ID, { type: 'ping' });
    } catch (error) { return false; }
    return true;
}

/** Get the Tree Style Tab version. Only available for TST 4.0 and later. Otherwise returns `null`.
 *
 * @export
 * @return {Promise<null | string>} The TST version if available.
 */
export async function getTstVersion() {
    try {
        return (await browser.runtime.sendMessage(kTST_ID, { type: 'get-version' })) || null;
    } catch (error) {
        return null;
    }
}

// eslint-disable-next-line valid-jsdoc
/**
 * Get tabs from Tree Style Tab. These tabs will include tree information.
 *
 * @template {number | number[] } T
 * @param {T} tabIds Can be a single integer id or multiple ids in an array.
 *
// @ts-ignore
 * @returns {Promise<T extends number ? TSTTab : TSTTab[]>} A tab or if `tabIds` was an array then this is an array of tabs.
 */
export async function getTSTTabs(tabIds) {
    const details = {
        type: 'get-tree',
    };
    if (Array.isArray(tabIds)) {
        details.tabs = tabIds;
    } else {
        details.tab = tabIds;
    }
    return browser.runtime.sendMessage(kTST_ID, details);
}

/**
 * Get all tabs in a window from Tree Style Tab. These tabs will include tree information.
 *
 * @export
 * @param {number} windowId The id for the window to get tabs from.
 * @param {boolean} flatArray If `true` then each tab is in the original array. Otherwise only root tabs occur in the array and the other tabs are only accessible through the tabs' children properties.
 * @returns {Promise<TSTTab[]>} All tabs from a certain window.
 */
export async function getTabsFromTST(windowId, flatArray = false) {
    let message = {
        type: 'get-tree',
        window: windowId,
    };
    if (flatArray) {
        message.tabs = '*';
    }
    return await browser.runtime.sendMessage(kTST_ID, message);
}

/**
 * Get the full trees (tabs and all their descendants) for some tab ids.
 *
 * @export
 * @param {number | number[]} tabIds Id or an array of ids for tabs that might have child tabs.
 * @returns {Promise<TSTTab[]>} The specified tabs and descendants of those tabs.
 */
export async function getTreeTabs(tabIds) {
    let tstTabs = await getTSTTabs(tabIds);
    const treeTabs = [];
    if (!Array.isArray(tstTabs)) {
        tstTabs = [tstTabs];
    }
    for (const tab of tstTabs) {
        const descendants = getDescendantsFromTSTTab(tab);
        treeTabs.push(tab);
        treeTabs.push(...descendants);
    }
    return treeTabs;
}

/**
 * Get all descendants from a TST tab.
 *
 * @export
 * @param {TSTTab} tstTab A tab with extra info provided by Tree Style Tab.
 * @returns {TSTTab[]} All descendants of the provided tab.
 */
export function getDescendantsFromTSTTab(tstTab) {
    const all = [tstTab];
    for (let iii = 0; iii < all.length; iii++) {
        const tab = all[iii];
        if (tab.children) {
            all.push(...tab.children);
        }
    }
    // Remove the provided tab:
    all.splice(0, 1);
    return all;
}

/**
 * Unregister from Tree Style Tab.
 *
 * @export
 * @returns {Promise<boolean>} True if un-registration was successful; otherwise false.
 */
export async function unregisterFromTST() {
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