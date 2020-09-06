
import {
    SettingsTracker,
} from '../common/settings.js';

import {
    EventManager,
} from '../common/events.js';

import {
    defineProperty,
} from '../common/utilities.js';


// #region Constants

/** The id of the `Auto Tab Discard` extension. This can be used to send messages to that extension. */
export const kATD_ID = '{c2c003ee-bd69-42a2-b0e9-6f34222cb046}';


/** The ids of the context menu item that are added to Tree Style Tab's sidebar.  */
export const tstContextMenuItemIds = Object.freeze({
    unloadTab: 'unload-tab',
    unloadTree: 'unload-tree',
});
/** The values that the `type` property can have for this extension's internal messages. */
export const messageTypes = Object.freeze({
    updateTabHide: 'updateTabHide',
    tabHideAPIChanged: 'tabHideAPIChanged',
    permissionsChanged: 'permissionsChanged',
    styleChanged: 'styleChanged',
    getActiveStyle: 'getActiveStyle',
});
export const defaultValues = Object.freeze({
    get Settings() {
        const createComboData = (data) => {
            return Object.assign(MouseClickCombo.getDefaultValues(), data);
        };
        return {
            isEnabled: true,

            unloadOnLeftClick: createComboData({
                enabled: true,
                alt: true,
                meta: true,
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


            command_unloadTab_useSelectedTabs: false,
            command_unloadTab_fallbackToLastSelected: false,
            command_unloadTab_ignoreHiddenTabs: false,
            command_unloadTab_wrapAround: false,

            command_unloadTree_fallbackToLastSelected: false,
            command_unloadTree_ignoreHiddenTabs: false,
            command_unloadTree_wrapAround: false,

            command_selectPreviousTab_ignoreHiddenTabs: false,
            command_selectPreviousTab_wrapAround: true,

            command_selectNextTab_ignoreHiddenTabs: false,
            command_selectNextTab_wrapAround: true,


            unloadInTSTContextMenu: true,
            unloadInTSTContextMenu_CustomLabel: '',
            unloadInTSTContextMenu_useSelectedTabs: true,
            unloadInTSTContextMenu_fallbackToLastSelected: false,
            unloadInTSTContextMenu_ignoreHiddenTabs: false,
            unloadInTSTContextMenu_wrapAround: false,

            unloadTreeInTSTContextMenu: false,
            unloadTreeInTSTContextMenu_CustomLabel: '',
            unloadTreeInTSTContextMenu_fallbackToLastSelected: false,
            unloadTreeInTSTContextMenu_ignoreHiddenTabs: false,
            unloadTreeInTSTContextMenu_wrapAround: false,

            contextMenu_in_tab_bar: true,
            tstContextMenu_CustomRootLabel: '',
            tstContextMenuOrder: [
                tstContextMenuItemIds.unloadTab,
                tstContextMenuItemIds.unloadTree
            ],

            delayedTSTRegistrationTimeInMilliseconds: 4000,


            dimUnloadedTabs: true,

            unloadAgainAfterDelay: -1,
            unloadViaAutoTabDiscard: false,

            disableOptionsPageAnimations: false,
            disableOptionsPageDarkTheme: false,
        };
    },
    get MouseClickCombo() {
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
        };
    },
    get MouseClickComboCollection() {
        let standardMessages = {

        };
        let getStandardMessages = () => {
            return Object.assign({}, standardMessages);
        };
        let getStandardInfo = () => {
            let obj = {
                get allowDragDrop() {
                    return obj.button === 0;
                },
            };
            return obj;
        };
        let createInfo = (obj) => {
            let info = Object.assign(getStandardInfo(), obj);
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

export class MouseClickCombo {
    constructor(info = {}) {
        const onChangeManager = new EventManager();
        this.onChange = onChangeManager.subscriber;


        const props = MouseClickCombo.getDefaultValues();
        defineProperty(this, 'data',
            function () {
                return Object.assign({}, props);
            }
        );
        const propKeys = Object.keys(props);

        for (const key of propKeys) {
            defineProperty(this, key,
                function () {
                    return props[key];
                },
                function (value) {
                    if (props[key] === value) {
                        return;
                    }
                    props[key] = value;
                    onChangeManager.fire(key, value);
                }
            );
        }


        this.info = info;


        this.update = (newData) => {
            for (const key of Object.keys(newData)) {
                if (propKeys.includes(key)) {
                    this[key] = newData[key];
                }
            }
        };


        this.test = (ctrl, shift, alt, meta) => {
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
        };
    }

    static getDefaultValues() {
        return defaultValues.MouseClickCombo;
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
 * @returns {Promise<(ReturnType<typeof getDefaultSettings>[K])>} The value for the loaded setting.
 */
export function quickLoadSetting(key) {
    // @ts-ignore
    return SettingsTracker.get(key, defaultValues.Settings[key]);
}

// #endregion Settings

