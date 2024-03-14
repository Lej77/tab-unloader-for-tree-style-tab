
import {
    SettingsTracker,
} from '../common/settings.js';

import {
    EventManager,
} from '../common/events.js';

import {
    defineProperty,
    prefixObjectKeys,
} from '../common/utilities.js';


// #region Constants

/** The id of the `Auto Tab Discard` extension. This can be used to send messages to that extension. */
export const kATD_ID = '{c2c003ee-bd69-42a2-b0e9-6f34222cb046}';


/** The ids of the context menu item that are added to Tree Style Tab's sidebar.  */
export const tstContextMenuItemIds = Object.freeze({
    unloadTab: 'unload-tab',
    unloadTree: 'unload-tree',
    unloadTreeDescendants: 'unload-tree-descendants',
    unloadOther: 'unload-other',
});
/** The values that the `type` property can have for this extension's internal messages. */
export const messageTypes = Object.freeze({
    updateTabHide: 'updateTabHide',
    tabHideAPIChanged: 'tabHideAPIChanged',
    permissionsChanged: 'permissionsChanged',
    styleChanged: 'styleChanged',
    getActiveStyle: 'getActiveStyle',
    privacyPermissionChanged: 'privacyPermissionChanged',
    privacyPermission: 'privacyPermission',
});
export const defaultValues = Object.freeze({
    get Settings() {

        // eslint-disable-next-line valid-jsdoc
        /** Create mouse click combination options.
         *
         * @param {Partial<ReturnType<MouseClickCombo.getDefaultValues>>} data Keys that should differ from their default values.
         * @returns {ReturnType<MouseClickCombo.getDefaultValues>} The options for this mouse button.
         */
        const createComboData = (data) => {
            return Object.assign(MouseClickCombo.getDefaultValues(), data);
        };


        /** Options for what tab to select when the active tab is being
         * unloaded. */
        const commonFallbackOptions = {
            /** Instead of closest, select the most recent tab. */
            fallbackToLastSelected: false,
            /** Never select hidden tabs. */
            ignoreHiddenTabs: false,
            /** Closest to the end might be at the beginning. */
            wrapAround: false,
        };


        const unloadTreeDescendantsCommandOptions = {
            /** Unload the root tab if it doesn't have any child tabs at all. */
            unloadRootTabIf_NoDescendants: false,
            /** Unload the root tab if all descendants are already unloaded. */
            unloadRootTabIf_UnloadedDescendants: false,
        };

        const unloadOtherCommandOptions = {
            /** If this is `false` then only the current tab won't be unloaded; otherwise all selected tabs would be left in their current state. */
            ignoreSelectedTabs: true,
            ignorePinnedTabs: true,
        };

        const selectCommandOptions = {
            ignoreHiddenTabs: false,
            wrapAround: true,
        };


        return {
            isEnabled: true,

            unloadOnLeftClick: createComboData({
                enabled: true,
                alt: true,
                meta: true,

                onDragModern_PreventDragAndDrop: true,
            }),
            unloadOnMiddleClick: createComboData({
                enabled: true,

                anyKeyMode: false,

                maxTimeout: 0,
                minTimeout: 0,

                dontPreventTSTAction: true,
            }),
            unloadOnRightClick: createComboData({
                enabled: true,
                ctrl: true,
                shift: true,
                alt: true,
                meta: true,
            }),
            selectOnLeftClick: createComboData({
                enabled: true,

                maxTimeout: 0,

                alt: true,
                meta: true,

                doubleClickOnly: false,

                onDragEnabled: false,
                onDragCancel: true,
                onDragMouseUpTrigger: true,

                applyToAllTabs: true,
                applyToUnloadedTabs: true,
            }),
            closeOnMiddleClick: createComboData({
                enabled: true,

                anyKeyMode: false,

                maxTimeout: 0,
                minTimeout: 0,

                doubleClickEnabled: true,
                doubleClickOnly: false,

                applyToAllTabs: false,
                applyToUnloadedTabs: false,
            }),


            tabHide_HideUnloadedTabs: false,
            tabHide_SuppressTSTHiddenClass: true,
            tabHide_ShowHiddenTabsInTST: false,


            fixTabRestore_waitForUrlInMilliseconds: -1,
            fixTabRestore_waitForIncorrectLoad: 500,
            fixTabRestore_fixIncorrectLoadAfter: 500,


            fixTabRestore_reloadBrokenTabs: false,
            fixTabRestore_reloadBrokenTabs_private: false,

            fixTabRestore_reloadBrokenTabs_quickUnload: false,
            fixTabRestore_reloadBrokenTabs_private_quickUnload: false,


            // #region Commands

            ...prefixObjectKeys('command_unloadTab_', {
                useSelectedTabs: false,
                ...commonFallbackOptions,
            }),

            ...prefixObjectKeys('command_unloadTree_', {
                ...commonFallbackOptions,
            }),

            ...prefixObjectKeys('command_unloadTreeDescendants_', {
                ...unloadTreeDescendantsCommandOptions,
                ...commonFallbackOptions,
            }),

            ...prefixObjectKeys('command_unloadOther_', {
                ...unloadOtherCommandOptions,
                ...commonFallbackOptions,
            }),

            ...prefixObjectKeys('command_selectPreviousTab_', {
                ...selectCommandOptions,
            }),

            ...prefixObjectKeys('command_selectNextTab_', {
                ...selectCommandOptions,
            }),

            // #endregion Commands


            // #region Context Menu

            unloadInTSTContextMenu: true,
            ...prefixObjectKeys('unloadInTSTContextMenu_', {
                CustomLabel: '',
                useSelectedTabs: true,
                ...commonFallbackOptions,
            }),

            unloadTreeInTSTContextMenu: false,
            ...prefixObjectKeys('unloadTreeInTSTContextMenu_', {
                CustomLabel: '',
                notActiveTab: false,
                ...commonFallbackOptions,
            }),

            unloadTreeDescendantsInTSTContextMenu: false,
            ...prefixObjectKeys('unloadTreeDescendantsInTSTContextMenu_', {
                CustomLabel: '',
                notActiveTab: false,
                ...unloadTreeDescendantsCommandOptions,
                ...commonFallbackOptions,
            }),

            unloadOtherInTSTContextMenu: false,
            ...prefixObjectKeys('unloadOtherInTSTContextMenu_', {
                CustomLabel: '',
                ...unloadOtherCommandOptions,
                ...commonFallbackOptions,
            }),

            contextMenu_in_tab_bar: true,
            tstContextMenu_CustomRootLabel: '',
            tstContextMenuOrder: [
                tstContextMenuItemIds.unloadTab,
                tstContextMenuItemIds.unloadTree,
                tstContextMenuItemIds.unloadTreeDescendants,
                tstContextMenuItemIds.unloadOther,
            ],

            delayedTSTRegistrationTimeInMilliseconds: 4000,

            // #endregion Context Menu


            dimUnloadedTabs: true,

            warnAboutMisconfiguredPrivacySettings: true,

            unloadAgainAfterDelay: -1,
            unloadViaAutoTabDiscard: false,

            disableOptionsPageAnimations: false,
            disableOptionsPageDarkTheme: false,
        };
    },
    get MouseClickCombo() {
        return MouseClickCombo.getDefaultValues();
    },
    get MouseClickComboCollection() {
        const standardMessages = {

        };
        const getStandardMessages = () => {
            return Object.assign({}, standardMessages);
        };
        const getStandardInfo = () => {
            const obj = {
                get allowDragDrop() {
                    return obj.button === 0;
                },
            };
            return obj;
        };

        // eslint-disable-next-line valid-jsdoc
        /**
         * Create info for a mouse click "combo".
         *
         * @template T
         * @param {T} obj Extra info.
         */
        const createInfo = (obj) => {
            const info = Object.assign(getStandardInfo(), obj);
            info.messages = Object.assign(getStandardMessages(), info.messages);
            return info;
        };
        return new MouseClickComboCollection([
            new MouseClickCombo(createInfo({
                button: 0,
                settingKey: 'unloadOnLeftClick',
                messages: {
                    enable: 'options_unloadOnLeftClick',
                },
            })),
            new MouseClickCombo(createInfo({
                button: 1,
                settingKey: 'unloadOnMiddleClick',
                messages: {
                    enable: 'options_unloadOnMiddleClick',
                },
            })),
            new MouseClickCombo(createInfo({
                button: 2,
                settingKey: 'unloadOnRightClick',
                messages: {
                    enable: 'options_unloadOnRightClick',
                },
            })),
            new MouseClickCombo(createInfo({
                button: 0,
                settingKey: 'selectOnLeftClick',
                messages: {
                    enable: 'options_selectOnLeftClick',
                },

                dontUnload: true,
                allwaysPreventTSTAction: true,
                applyToUnloadedTabs: true,
                allowForAll: true,
            })),
            new MouseClickCombo(createInfo({
                button: 1,
                settingKey: 'closeOnMiddleClick',
                messages: {
                    enable: 'options_closeOnMiddleClick',
                },

                dontUnload: true,
                allwaysPreventTSTAction: true,
                applyToUnloadedTabs: true,
                allowForAll: true,
            })),
        ]);
    },
});

// #endregion Constants



// #region Mouse Click Combinations

export class MouseClickComboCollection {
    constructor(array) {
        this.combos = array;
    }

    update(changes, settings) {
        const changedKeys = Object.keys(changes);
        for (const combo of this.combos) {
            const key = combo.info.settingKey;
            if (key && changedKeys.includes(key)) {
                combo.update(settings[key]);
            }
        }
    }

    static createStandard() {
        return defaultValues.MouseClickComboCollection;
    }
}

/** @typedef {typeof defaultValues.MouseClickCombo & MouseClickCombo} MouseClickComboWithProps */

/**
 * Mouse click combination info.
 *
 * @export
 * @class MouseClickCombo
 */
export class MouseClickCombo {
    constructor(info = {}) {
        /** @type {EventManager<[keyof typeof defaultValues.MouseClickCombo, any]>} */
        this._onChangeManager = new EventManager();
        /** Changes to the wrapped data. */
        this.onChange = this._onChangeManager.subscriber;

        this._props = MouseClickCombo.getDefaultValues();
        this._propKeys = Object.keys(this._props);

        for (const key of this._propKeys) {
            defineProperty(this, key,
                function () {
                    return this._props[key];
                },
                (value) => {
                    this._updateKey(key, value);
                }
            );
        }


        /** @type { { [key: string]: any } } Extra info about this mouse click combo. */
        this.info = info;
    }

    _updateKey(key, value) {
        if (this._props[key] === value) {
            return;
        }
        this._props[key] = value;
        this._onChangeManager.fire(key, value);
    }

    get data() {
        return Object.assign({}, this._props);
    }

    // eslint-disable-next-line valid-jsdoc
    /**
     * Update the wrapped mouse click data.
     *
     * @param {Partial<typeof defaultValues.MouseClickCombo>} newData The data to update.
     * @memberof MouseClickCombo
     */
    update(newData) {
        for (const key of Object.keys(newData)) {
            if (this._propKeys.includes(key)) {
                this._updateKey(key, newData[key]);
            }
        }
    }
    /**
     * Check if a mouse click with a certain key combination would be allowed.
     *
     * @param {boolean} ctrl The `ctrl` key is pressed.
     * @param {boolean} shift The `shift` key is pressed.
     * @param {boolean} alt The `alt` key is pressed.
     * @param {boolean} meta The `meta` key is pressed.
     * @returns {boolean} This mouse click should not be ignored.
     * @memberof MouseClickCombo
     */
    test(ctrl, shift, alt, meta) {
        const props = this._props;

        if (!props.enabled) {
            return false;
        }

        if (props.anyKeyMode) {
            return (
                ctrl && props.ctrl ||
                shift && props.shift ||
                alt && props.alt ||
                meta && props.meta ||
                (!props.ctrl && !props.shift && !props.alt && !props.meta)
            );
        } else {
            return (
                ctrl == props.ctrl &&
                shift == props.shift &&
                alt == props.alt &&
                meta == props.meta
            );
        }
    }

    static getDefaultValues() {
        return {
            enabled: false,

            /** If true then at least one of the selected keys must be pressed (but not all). If there are no selected keys then always unload tabs on click. */
            anyKeyMode: true,
            ctrl: false,
            shift: false,
            alt: false,
            meta: false,

            /** Maximum time between mouse-down and mouse-up events to trigger tab unload. Prevents unload operation if tab is long pressed or being dragged. */
            maxTimeout: 500,
            /** Minium time between mouse-down and mouse-up events to trigger tab unload. Allows for long pressing tabs to unload them. */
            minTimeout: 0,

            /** If true then special behavior will be implemented for double clicks. */
            doubleClickEnabled: false,
            /** If true then only double clicks will unload tabs; otherwise double clicks will cancel the unload operation from the first click. */
            doubleClickOnly: true,
            /** Maximum time between mouse-down events to be recognized as a double click. */
            doubleClickTimeout: 500,

            /** Wait for drag events before discarding tab. */
            onDragEnabled: false,
            /** If true then tab will not be unloaded if drag events occurred; otherwise tab will only be unloaded if drag events occurred. */
            onDragCancel: false,
            /** If true then if a mouse up event is registered before the timeout it counts as a drag event. */
            onDragMouseUpTrigger: false,
            /** Time in milliseconds to wait for drag events before unloading tab. */
            onDragTimeout: 500,
            /** The drag APIs changed in Tree Style Tab v2.7.8. If this is `true` then assume that we are using the more modern versions. Requires Tree Style Tab v2.7.8 and later. */
            onDragModern: true,
            /** The more modern drag APIs allows sending a message to prevent drag and drop of tabs, this setting ensures we send that message. Requires Tree Style Tab v2.7.8 and later. */
            onDragModern_PreventDragAndDrop: false,

            /** Don't prevent Tree Style Tab's default action while waiting to decide if the tab should be unloaded. */
            dontPreventTSTAction: false,
            /** Apply click on both loaded and unloaded tabs. */
            applyToAllTabs: false,
            /** Apply click on unloaded tabs instead of loaded tabs. */
            applyToUnloadedTabs: false,

            /** If the tab that should be unloaded is active then the selection of the tab that is activated instead is affected by this option. If true then the last selected tab is used, otherwise the closest tab is used. */
            fallbackToLastSelected: false,
            /** If the tab that should be unloaded is active then another tab will be selected. If this option is true then all hidden tabs will be ignored when looking for another tab. */
            ignoreHiddenTabs: false,
            /** When searching for the next tab that should be selected wrap around from the start to the end or from the end to the start of the tab list. */
            wrapAround: false,

            /** If this click applies an effect then that effect should be applied to the clicked Tree Style Tab tree instead of only the clicked tab. */
            applyToTstTree: false,
            /** If the click's effect applies to a tree and the active tab is in that tree then don't apply the effect to the active tab. */
            applyToTstTree_notActiveTab: false,
            /** If the click's effect applies to a tree then that effect shouldn't be applied to the tree's root tab (the top most parent tab). */
            applyToTstTree_notRoot: false,
            /** Unload the root tab if it doesn't have any child tabs at all. */
            applyToTstTree_notRoot_unloadRootTabIf_NoDescendants: false,
            /** Unload the root tab if all descendants are already unloaded. */
            applyToTstTree_notRoot_unloadRootTabIf_UnloadedDescendants: false,
        };
    }
}

// #endregion Mouse Click Combinations



// #region Settings

export const settingsTracker = new SettingsTracker({ defaultValues: () => defaultValues.Settings });
export const settings = settingsTracker.settings;

// eslint-disable-next-line valid-jsdoc
/**
 * Load a specific setting as fast as possible.
 *
 * @template {keyof typeof defaultValues.Settings} K
 * @param {K} key The key of the setting that should be loaded.
 * @returns {Promise<((typeof defaultValues.Settings)[K])>} The value for the loaded setting.
 */
export function quickLoadSetting(key) {
    // @ts-ignore
    return SettingsTracker.get(key, defaultValues.Settings[key]);
}

// #endregion Settings

