'use strict';

import {
    kTST_ID,
} from '../tree-style-tab/utilities.js';


/**
 * Add a command to Tree Style Tab's context menu.
 *
 * @export
 * @param {Object} item An object with details about the menu item. Formatted the same as `createProperties` that is used with `browser.menus.create` but supports only a subset of the properties.
 * @returns {Promise<boolean>} `true` if the context menu item was added successfully; otherwise `false`.
 */
export async function createTSTContextMenuItem(item) {
    try {
        await browser.runtime.sendMessage(kTST_ID, {
            type: 'fake-contextMenu-create',
            params: item,
        });
    } catch (error) {
        console.error('Failed to add context menu item to Tree Style Tab!.\nContext menu item details:\n', item, '\nError:\n', error);
        return false;
    }
    return true;
}

/**
 * Remove all commands from Tree Style Tab's context menu.
 *
 * @export
 * @returns {Promise<boolean>} `true` if all context menu items was removed successfully; otherwise `false`.
 */
export async function removeAllTSTContextMenuItems() {
    try {
        await browser.runtime.sendMessage(kTST_ID, {
            type: 'fake-contextMenu-remove-all'
        });
    } catch (error) {
        console.error('Failed to remove all context menu items from Tree Style Tab!.\nError:\n', error);
        return false;
    }
    return true;
}