'use strict';

/**
 * Info about the current tab selection.
 *
 * @typedef {Object} SelectionInfo
 * @property {import('../common/utilities.js').BrowserTab[]} Info.selected An array of tabs.Tabs which are selected
 * @property {import('../common/utilities.js').BrowserTab[]} [Info.unselected] An array of tabs.Tabs which are not selected.
 */
null;

export const kMTH_ID = 'multipletab@piro.sakura.ne.jp';

/**
 * Get the current selected tabs from Multiple Tab Handler.
 *
 * @export
 * @returns {Promise<SelectionInfo>} Info about current tab selection.
 */
export async function getSelection() {
    /** @type {SelectionInfo} */
    let selection = await browser.runtime.sendMessage(kMTH_ID, {
        type: 'get-tab-selection'
    });
    if (selection && Array.isArray(selection)) {
        // MTH 3.0.x and later returns an array of selected tabs instead of an object.
        return { selected: selection };
    } else {
        if (!selection || typeof selection !== 'object') {
            console.warn(`Multiple Tab Handler returned incorrect value for 'get-tab-selection' message, expected an array or an object.\nMTH returned: ${ selection }`);
            selection = { selected: [] };
        }
        if (!selection.selected || !Array.isArray(selection.selected)) {
            console.warn(`Multiple Tab Handler returned incorrect value for 'get-tab-selection' message, expected an array or an object with a "selected" property that contains an array.\nMTH returned: ${ selection }`);
            selection.selected = [];
        }
        return selection;
    }
}