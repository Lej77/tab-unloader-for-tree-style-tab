'use strict';

import {
    kTST_ID,
    getTabsFromTST,
    getTstVersion,
} from '../tree-style-tab/utilities.js';


/**
 * Clear tab state(s) from all tabs in a Tree Style Tab's sidebar. (This doesn't
 * work correctly on 3.0.12 and later since the states aren't exposed by TST API
 * anymore. Does work on TST 4.0 and later since we can check the version in the
 * API and special case it.)
 *
 * @export
 * @param {number} windowId Id for the affected window.
 * @param {string | string[]} state State string(s) that should be cleared.
 * @param {boolean} [value=false] `true` to add the state(s) to all tabs and
 * `false` to remove the state(s) from all tabs.
 * @returns {Promise<boolean>} `true` if the tab states was successfully updated
 * for all tabs; otherwise `false`.
 */
export async function clearTabStateFromTST(windowId, state, value = false) {
    try {
        let tstTabs = await getTabsFromTST(windowId, true);
        if (!tstTabs)
            return false; // TST not found/ready.

        if (getTstVersion() === null) {
            // Older than TST 4.0 so might support getting custom state
            const affectedStates = Array.isArray(state) ? state : [state];
            tstTabs = tstTabs.filter(tab => tab.states.some(tabState => {
                const hasState = affectedStates.includes(tabState);
                if (value) {
                    // Add state => Only need to update tab if the tab doesn't have a wanted state.
                    return !hasState;
                } else {
                    // Remove state => Only need to update tab if it has an affected state.
                    return hasState;
                }
            }));
        }

        return await notifyTabStateToTST(tstTabs.map(tab => tab.id), state, value);
    } catch (error) {
        console.error('Failed to clear tab state(s) from Tree Style Tab sidebar. \nAffected window id: ', windowId, '\nAffected state(s): ', state, '\nAdd instead of remove state(s): ', value, '\nError:\n', error);
    }
    return false;
}

/**
 * Add or remove a state from tabs in Tree Style Tab's sidebar.
 *
 * @export
 * @param {number | number[]} tabIds Tab ids that are affected.
 * @param {string | string[]} state State string(s). These represent the names of the classes that should be added or removed.
 * @param {boolean} value `true` to add the state(s) and `false` to remove the state(s).
 * @returns {Promise<boolean>} `true` if the tab states was successfully updated for all tabs; otherwise `false`.
 */
export async function notifyTabStateToTST(tabIds, state, value) {
    if (!Array.isArray(tabIds))
        tabIds = [tabIds];
    if (tabIds.length == 0)
        return true;
    tabIds = tabIds.map(id => {
        if (typeof id === 'string') {
            return parseInt(id);
        } else {
            return id;
        }
    });
    try {
        await browser.runtime.sendMessage(kTST_ID, {
            type: value ? 'add-tab-state' : 'remove-tab-state',
            tabs: tabIds,
            state: state,
        });
        return true;
    } catch (error) {
        console.error(`Failed to ${value ? 'add' : 'remove'} state(s) ${value ? 'to' : 'from'} tabs in Tree Style Tab's sidebar.\nAffected tab ids: `, tabIds, '\nAffected tab states: ', state, '\nError:\n', error);
    }
    return false;
}
