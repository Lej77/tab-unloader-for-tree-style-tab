
import {
    accessDataObjectWithProperties,
} from '../common/events.js';


/**
 * Some info that describes how a context menu item should be built.
 *
 * Must fulfil at least one of the following:
 * - Have an id.
 * - Have a title
 * - Have `isDefault` set to `true`.
 *
 * @typedef {Object} ContextMenuBuilder
 * @property {number | string} [Info.id] (default: a unique id) start with a `-` character for item to become a separator.
 * @property {string} [Info.title] (default: will get from i18n API using `contextMenu_${id}`.)
 * @property {string[]} [Info.contexts] (default: will get from default context.)
 * @property {boolean} [Info.enabled=true] (default: true) If `false` this item will be ignored.
 * @property {boolean} [Info.isDefault=false] (default: false) Will apply this item's properties to the default values.
 * @property {boolean} [Info.isRootItem=false] (default: false) If there are more root items than the specified `maxRootItems` (default: 1) then this item will be the parent of all of those root items. Otherwise this item will be ignored.
 */
null;

/**
 * @typedef {Object} ContextMenuItemData Data about a context menu item.
 * @property {number | string} [Data.id] The unique ID to assign to this item. Mandatory for event pages. Cannot be the same as another ID for this extension.
 * @property {string} [Data.title] The text to be displayed in the item. Mandatory unless type is "separator".
 * @property {string} [Data.type] The type of menu item: "normal", "checkbox", "radio", "separator". Defaults to "normal".
 * @property {string[]} [Data.contexts] Array of contexts in which this menu item will appear.
 * @property {number | string} [Data.parentId] The ID of a parent menu item; this makes the item a child of a previously added item.
 * @property {string[]} [Data.documentUrlPatterns] Lets you restrict the item to apply only to documents whose URL matches one of the given match patterns. This applies to frames as well.
 */
null;


/**
 * Info about a context menu item. Any changes can be observed via the `onChange` event.
 *
 * @export
 * @class ContextMenuItem
 */
export class ContextMenuItem {
    constructor({ id = null, title = '', parentId = null, contexts = [], documentUrlPatterns = null, isSeparator = false }) {
        /** @type {ContextMenuItemData} */
        this._data = {
            id: id,
            title: title || '',
            type: isSeparator ? 'separator' : 'normal',
            contexts: contexts || [],
            parentId: parentId,
            documentUrlPatterns: documentUrlPatterns,
        };
        const accessor = {};
        this._accessor = accessor;
        this.onChange = accessDataObjectWithProperties(accessor, this._data);
    }

    clone() {
        return new ContextMenuItem(this.data());
    }

    get isSeparator() {
        return this._data.type === 'separator';
    }

    /**
     * Get a proxy object that can read and modify context menu data. Any values set to it will be notified via the `onChange` event.
     *
     * @returns {ContextMenuItemData} An object that can be used to read and modify the context menu item's data.
     * @memberof ContextMenuItem
     */
    proxy() {
        return this._accessor;
    }

    /**
     * Get an object that only holds the context menu item's data. This should be used when you want to use the data with a WebExtensions API.
     *
     * @returns {ContextMenuItemData} A copy of the context menu item's data.
     * @memberof ContextMenuItem
     */
    data() {
        const copy = Object.assign({}, this._data);
        for (const key of Object.keys(copy)) {
            if (copy[key] === undefined || copy[key] === null) {
                delete copy[key];
            }
        }
        return copy;
    }

    /**
     * Compare two context menu item objects and determine if they have the same data.
     *
     * @static
     * @param {ContextMenuItem | null} aObj The first item.
     * @param {ContextMenuItem | null} bObj The second item.
     * @returns {boolean} `true` if the two items have the same data; otherwise `false`.
     * @memberof ContextMenuItem
     */
    static isEqual(aObj, bObj) {
        if (aObj === bObj) {
            return true;
        }
        if (!aObj && !bObj) {
            return true;
        }
        if (!aObj || !bObj) {
            return false;
        }
        const a = aObj.proxy();
        const b = bObj.proxy();


        for (const context of a.contexts) {
            if (!b.contexts.includes(context)) {
                return false;
            }
        }
        for (const context of b.contexts) {
            if (!a.contexts.includes(context)) {
                return false;
            }
        }


        if (
            a.id !== b.id ||
            a.title !== b.title ||
            a.type !== b.type ||
            a.parentId !== b.parentId ||
            a.documentUrlPatterns !== b.documentUrlPatterns
        ) {
            return false;
        }

        return true;
    }
}

export class ContextMenuItemCollection {

    constructor({ items = null } = {}) {
        /** @type {ContextMenuItem[]} */
        this._items = [];
        this.addContextMenuItems(items);
    }

    /**
     * Deep copy this collection and all of its context menu items' data.
     *
     * @returns {ContextMenuItemCollection} The new collection that doesn't share any data with the current one.
     * @memberof ContextMenuItemCollection
     */
    clone() {
        return new ContextMenuItemCollection({ items: this._items.map(item => item.clone()) });
    }


    /**
     * Get a context menu item that has a specific id.
     *
     * @param {number | string} menuItemId An id for a context menu item.
     * @returns {null | ContextMenuItem} A context menu item that has the specified id.
     * @memberof ContextMenuItemCollection
     */
    getContextMenuItem(menuItemId) {
        const applicable = this._items.filter(item => item.proxy().id === menuItemId);
        if (applicable.length > 0) {
            return applicable[0];
        } else {
            return null;
        }
    }
    getRootContextMenuItems() {
        return this._items.filter((item) => !item.proxy().parentId && item.proxy().parentId !== 0);
    }


    /**
     * Add some new context menu items to the collection.
     *
     * @param {null | ContextMenuItem | ContextMenuItem[]} items Items to add to the collection.
     * @memberof ContextMenuItemCollection
     */
    addContextMenuItems(items) {
        if (!items) {
            return;
        }
        if (!Array.isArray(items)) {
            items = [items];
        }
        this.removeContextMenuItems(items.map(item => item.proxy().id));
        for (const item of items) {
            this._items.push(item);
        }
    }
    /**
     * Insert some context menu items at a specific index.
     *
     * @param {number} index The index that the items should be insert at. If less then 0 then correct to 0 and if equal to or larger than the current length then the items are appended.
     * @param {null | ContextMenuItem | ContextMenuItem[]} items Items to add to the collection.
     * @memberof ContextMenuItemCollection
     */
    insertContextMenuItems(index, items) {
        if (!items) {
            return;
        }
        if (!Array.isArray(items)) {
            items = [items];
        }
        if (index < 0) {
            index = 0;
        }

        if (index >= this._items.length) {
            this.addContextMenuItems(items);
        } else {
            this.removeContextMenuItems(items.map(item => item.proxy().id));
            this._items.splice(index, 0, ...items);
        }
    }

    /**
     * Remove some menu items.
     *
     * @param {(number | string) | (number | string)[]} menuItemIds Ids of the items that should be removed.
     * @memberof ContextMenuItemCollection
     */
    removeContextMenuItems(menuItemIds) {
        if (!Array.isArray(menuItemIds)) {
            menuItemIds = [menuItemIds];
        }
        this._items = this._items.filter((item) => !(/** @type {(number | string)[]} */(menuItemIds)).includes(item.proxy().id));
    }
    /**
     * Clear the collection.
     *
     * @memberof ContextMenuItemCollection
     */
    removeAllContextMenuItems() {
        this._items = [];
    }


    /**
     * Ensure parents have indexes that are lower than any of their children. This can be useful since the WebExtensions APIs require that parent items are defined before their child items.
     *
     * @returns {this} The current object, to allow for method chaining.
     * @memberof ContextMenuItemCollection
     */
    sortParentsFirst() {
        // Build lookup:
        const idToItem = {};
        /** @type { { [parentId: string]: (string | number)[] } } */
        const parentIdToChildrenIds = {};
        const rootIds = [];
        for (const item of this._items) {
            const proxy = item.proxy();
            idToItem[proxy.id] = item;
            if (proxy.parentId) {
                let array = parentIdToChildrenIds[proxy.parentId];
                if (!array) {
                    array = [proxy.id];
                    parentIdToChildrenIds[proxy.parentId] = array;
                } else {
                    array.push(proxy.id);
                }
            } else {
                rootIds.push(proxy.id);
            }
        }

        // Sort items:
        const previousIds = new Set();
        /**
         * Hoist the item and all of its parents. This ensures that the item and its parents are located before the item at the specified index.
         *
         * @param {number} beforeIndex The index of the item that the items should be placed before.
         * @param {ContextMenuItem} item The item that should be hoisted.
         * @returns {number} The new index of the item that was previously at the `beforeIndex`.
         */
        const hoistItem = (beforeIndex, item) => {
            if (!item) {
                return beforeIndex;
            }

            if (item.proxy().parentId) {
                beforeIndex = hoistItem(beforeIndex, idToItem[item.proxy().parentId]);
            }

            let offset = 0;
            const siblings = item.proxy().parentId ? parentIdToChildrenIds[item.proxy().parentId] : rootIds;
            if (siblings) {
                const siblingIds = siblings.map(item => item.id);
                let siblingIndex = 0;
                while (true) {
                    if (siblingIndex >= siblingIds.length) {
                        break;
                    }
                    if (previousIds.has(siblingIds[siblingIndex])) {
                        siblingIndex++;
                    } else {
                        break;
                    }
                }
                if (siblingIndex < siblingIds.length) {
                    let siblingId = siblingIds[siblingIndex];
                    for (let jjj = beforeIndex; jjj < this._items.length; jjj++) {
                        const item2 = this._items[jjj];
                        if (siblingId === item2.proxy().id) {
                            // Move to before child item:
                            this._items.splice(jjj, 1);
                            this._items.splice(beforeIndex, 0, item2);
                            offset++;

                            previousIds.add(item2.proxy().id);

                            if (item2.proxy().id === item.proxy().id) {
                                // Has hoisted wanted item (we can skip the rest):
                                break;
                            }

                            // Get id of next sibling:
                            siblingIndex++;
                            if (siblingIndex >= siblingIds.length) {
                                break;
                            }
                            siblingId = siblingIds[siblingIndex];
                        }
                    }
                }
            } else {
                // Should not occur since we never hoist root items:
                previousIds.add(item.proxy().id);
            }
            return beforeIndex + offset;
        };
        for (let iii = 0; iii < this._items.length; iii++) {
            const item = this._items[iii];
            const proxy = item.proxy();
            if (proxy.id) {
                // Have seen this item's id:
                previousIds.add(proxy.id);
            }
            if (!proxy.parentId) {
                // Is root item:
                continue;
            }
            if (previousIds.has(proxy.parentId)) {
                // Is before this item:
                continue;
            }

            // Hoist the parent item (and all of its parents):
            iii = hoistItem(iii, idToItem[proxy.parentId]);
        }

        return this;
    }


    getIds() {
        return this.items.map(item => item.proxy().id);
    }

    /**
     * Get a new unique id that isn't the same as the id of any item that is currently in the collection.
     *
     * @returns {string} A unique context menu item id.
     * @memberof ContextMenuItemCollection
     */
    getUniqueId() {
        let uniqueId = 0;
        const ids = this.getIds();
        while (ids.includes(uniqueId + '')) {
            uniqueId++;
        }
        return uniqueId + '';
    }


    /**
     * Get the data for each context menu item. The data can be used to register the context menu items.
     *
     * @readonly
     * @memberof ContextMenuItemCollection
     */
    get data() {
        return this._items.map(item => item.data());
    }

    get items() {
        return this._items.slice();
    }

    get length() {
        return this._items.length;
    }

    /**
     * Determine if two context menu collections contains the same items.
     *
     * @static
     * @param {ContextMenuItemCollection | null} a The first collection.
     * @param {ContextMenuItemCollection | null} b The second collection.
     * @returns {boolean} Returns `true` if the first collection is the same as the second; otherwise returns `false`.
     * @memberof ContextMenuItemCollection
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

        // eslint-disable-next-line no-underscore-dangle
        if (a._items.length !== b._items.length) {
            return false;
        }
        // eslint-disable-next-line no-underscore-dangle
        for (let iii = 0; iii < a._items.length; iii++) {
            // eslint-disable-next-line no-underscore-dangle
            const aItem = a._items[iii];
            // eslint-disable-next-line no-underscore-dangle
            const bItem = b._items[iii];
            if (!ContextMenuItem.isEqual(aItem, bItem)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Create a collection from an array of objects that describe each context menu item.
     *
     * A builder can have the following properties:
     * id: [optional] (default: a unique id) start with - to become a separator.
     * title: [optional] (default: will get from i18n API using `contextMenu_${id}`.)
     * contexts: [optional] (default: will get from default context.)
     * enabled: [optional] (default: true) If false this item will be ignored.
     * isDefault: [optional] (default: false) Will apply this item's properties to the default values.
     * isRootItem: [optional] (default: false) If there are more than 1 root item then this item will be the parent of all of those root items. Otherwise this item will be ignored.
     *
     * Must have either an id or a title.
     * Or
     * isDefault is true.
     *
     * @param {ContextMenuBuilder[]} builders An array of objects that describe context menu items.
     * @param {Object} Options Configure how the builders are used.
     * @param {number} [Options.maxRootItems] Max number of root items that are allowed.
     * @param {Object} [Options.defaultValues] Default values to use for each builder. Currently only the 'contexts' property is supported.
     * @returns {ContextMenuItemCollection} A collection of context menu items.
     * @memberof ContextMenuItemCollection
     */
    static fromBuilders(builders, { maxRootItems = 1, defaultValues = {} } = {}) {

        const collection = new ContextMenuItemCollection();

        for (const contextMenuItem of builders) {
            let { id, title = null, contexts = null, enabled = true, isDefault = false, isRootItem = false } = typeof contextMenuItem === 'string' ? { id: contextMenuItem } : contextMenuItem;
            if (!enabled) {
                continue;
            }
            if (isDefault) {
                Object.assign(defaultValues, contextMenuItem);
                continue;
            }

            const details = {
                contexts: contexts || defaultValues.contexts,
            };
            if (typeof id === 'string' && id.startsWith('-')) {
                Object.assign(details, {
                    type: 'separator',
                });
            } else {
                Object.assign(details, {
                    id: (!id && id !== 0 ? collection.getUniqueId() : id) + '',
                    title: title || browser.i18n.getMessage(`contextMenu_${id}`),
                });
            }

            if (isRootItem) {
                // If there are too many root items then gather them all under this item:
                const rootItems = collection.getRootContextMenuItems().filter(item => item.proxy().id != details.id);
                if (rootItems.length <= maxRootItems) {
                    // Not too many root items => ignore this builder:
                    continue;
                }
                for (const item of rootItems) {
                    item.proxy().parentId = details.id;
                }
            }

            collection.addContextMenuItems(new ContextMenuItem(details));
        }
        return collection;
    }

}
