
import {
    tstContextMenuItemIds,
    messageTypes,
    MouseClickComboCollection,
    settings,
    settingsTracker,
    quickLoadSetting,
} from '../common/common.js';

import {
    SettingsTracker,
} from '../common/settings.js';

import {
    PortConnection,
} from '../common/connections.js';

import {
    DisposableCreators,
} from '../common/disposables.js';

import {
    EventListener,
    EventManager,
} from '../common/events.js';

import {
    delay,
} from '../common/delays.js';

import {
    createMouseClickArea,
    createPermissionsArea,
    createPrivacyPermissionArea,
} from '../ui/common.js';

import {
    toggleClass,
    messagePrefix,
    setTextMessages,
} from '../ui/utilities.js';

import {
    createNumberInput,
    createCheckBox,
} from '../ui/basic-components.js';

import {
    createStatusIndicator,
} from '../ui/status-indicator.js';

import {
    bindElementIdsToSettings,
} from '../ui/bind-settings.js';

import {
    AnimationInfo,
    createCollapsableArea,
} from '../ui/collapsable.js';

import {
    createListArea,
} from '../ui/list.js';

import {
    createShortcutsArea,
} from '../ui/shortcuts.js';


/**
 * @typedef {import('../common/utilities').KeysWithSuffix<T, Suffix>} KeysWithSuffix
 * @template {{}} T
 * @template {string} Suffix
 */


quickLoadSetting('disableOptionsPageDarkTheme')
    .then(disableDarkTheme => {
        if (disableDarkTheme) {
            document.documentElement.classList.remove('support-dark-theme');
        }
    })
    .catch(error => console.error('Failed to disable dark theme support on options page.', error));

{
    let embedded = true;
    try {
        embedded = new URLSearchParams(window.location.search).get('embedded') != 'false';
    } catch (error) {
        console.error('Failed to get page query params.\nError: ', error);
    }
    if (embedded) {
        document.documentElement.classList.add('embeddedInExtensionPage');
    }
}


/** DANGEROUS, allows i18n messages to inject HTML. Should be used sparingly to
 * make it harder for translators to sneak in malicious code. */
const messageAsHtml = 'message-as-html';


async function initiatePage() {
    let starters = new DisposableCreators();
    let pagePort = new PortConnection();
    let permissionsArea;
    let onPermissionControllerChange = new EventManager();


    starters.createDisposable(() => {
        return bindElementIdsToSettings(settings, {
            handleInputEvent: ({ key, value, element }) => {
                if (element.type === 'number') {
                    value = parseInt(value);
                    if (isNaN(value))
                        return;
                }
                browser.storage.local.set({ [key]: value });
            },
            onSettingsChanged: settingsTracker.onChange,
            newValuePattern: true,
        });
    });


    // #region Animation

    const sectionAnimationInfo = new AnimationInfo();
    {
        starters.createDisposable(() => {
            const animationUpdate = () => {
                try {
                    if (settings.disableOptionsPageAnimations) {
                        sectionAnimationInfo.update({ reset: true });
                    } else {
                        sectionAnimationInfo.update({ standard: true });
                    }
                } catch (error) { }
            };
            const listener = new EventListener(settingsTracker.onChange, (changes) => {
                if (changes.disableOptionsPageAnimations) {
                    animationUpdate();
                }
            });
            animationUpdate();
            return listener;
        });
    }

    // #endregion Animation


    // #region Link to separate option page

    {
        const area = document.createElement('p');
        document.body.appendChild(area);

        const link = document.createElement('a');
        link.classList.add(messagePrefix + 'options_openInSeparateTab');
        link.id = 'topLinkToOptionsPage';
        link.target = "_blank";
        link.href = browser.runtime.getURL(browser.runtime.getManifest().options_ui.page + '?embedded=false');
        area.appendChild(link);
    }

    // #endregion Link to separate option page


    // #region Enable/Disable Extension

    {
        const wrapperArea = document.createElement('div');
        document.body.appendChild(wrapperArea);

        let enableArea = document.createElement('div');
        enableArea.classList.add('extensionToggleArea');
        wrapperArea.appendChild(enableArea);

        let disableButton = document.createElement('button');
        disableButton.classList.add(messagePrefix + 'options_extensionToggle_DisableButton');
        enableArea.appendChild(disableButton);

        let indicator = createStatusIndicator({
            headerMessage: 'options_extensionToggle_Status_Header',
            enabledMessage: 'options_extensionToggle_Status_Enabled',
            disabledMessage: 'options_extensionToggle_Status_Disabled',
        });
        enableArea.appendChild(indicator.area);

        let enableButton = document.createElement('button');
        enableButton.classList.add(messagePrefix + 'options_extensionToggle_EnableButton');
        enableArea.appendChild(enableButton);


        starters.createDisposable(() => {
            let check = () => {
                indicator.isEnabled = settings.isEnabled;
            };
            let listeners = [
                new EventListener(settingsTracker.onChange, (changes, areaName) => {
                    if (changes.isEnabled) {
                        check();
                    }
                }),
                new EventListener(disableButton, 'click', () => SettingsTracker.set('isEnabled', false)),
                new EventListener(enableButton, 'click', () => SettingsTracker.set('isEnabled', true)),
            ];
            check();
            return listeners;
        });
    }

    // #endregion Enable/Disable Extension


    // #region Mouse Events

    {
        const mouseAreas = MouseClickComboCollection.createStandard().combos.map(combo => createMouseClickArea(combo, sectionAnimationInfo));

        const mouseEventCategory = document.createElement('fieldset');
        mouseEventCategory.classList.add('mouseEventsCategory');
        mouseEventCategory.classList.add('category');
        document.body.appendChild(mouseEventCategory);

        const legend = document.createElement('legend');
        legend.classList.add(messagePrefix + 'options_category_mouseEvents_Title');
        mouseEventCategory.appendChild(legend);

        const explanation = document.createElement('label');
        explanation.classList.add(messagePrefix + 'options_category_mouseEvents_Explanation');
        mouseEventCategory.appendChild(explanation);

        mouseEventCategory.appendChild(document.createElement('br'));
        mouseEventCategory.appendChild(document.createElement('br'));

        for (const mouseArea of mouseAreas) {
            mouseEventCategory.appendChild(mouseArea.area);
        }
        starters.createDisposable(() => {
            const listeners = [];
            for (const area of mouseAreas) {
                const obj = area.combo;
                const key = area.settingKey;

                // Apply settings data to document:
                obj.update(settings[key]);
                area.settingsLoaded.fire();

                // Track document changes and save to settings:
                listeners.push(new EventListener(obj.onChange, () => {
                    SettingsTracker.set(key, obj.data);
                }));
            }
            return listeners;
        });
    }

    // #endregion Mouse Events


    const commandsCategory = document.createElement('fieldset');
    commandsCategory.classList.add('commandsCategory');
    commandsCategory.classList.add('category');
    document.body.appendChild(commandsCategory);
    {
        const legend = document.createElement('legend');
        legend.classList.add(messagePrefix + 'options_category_commands_Title');
        commandsCategory.appendChild(legend);
    }


    // #region Context Menu Item

    try {
        const section = createCollapsableArea(sectionAnimationInfo);
        section.area.classList.add('standardFormat');
        section.title.classList.add('center');
        section.title.classList.add('enablable');
        commandsCategory.appendChild(section.area);

        const header = document.createElement('div');
        header.classList.add(messagePrefix + 'options_contextMenuItems_Title');
        section.title.appendChild(header);


        const rootItemLabel_Description = document.createElement('label');
        rootItemLabel_Description.classList.add(messagePrefix + 'options_tstContextMenu_CustomRootLabel');
        section.content.appendChild(rootItemLabel_Description);

        const rootItemLabel = document.createElement('input');
        rootItemLabel.type = 'text';
        rootItemLabel.id = 'tstContextMenu_CustomRootLabel';
        rootItemLabel.placeholder = browser.i18n.getMessage('contextMenu_rootItemTitle');
        section.content.appendChild(rootItemLabel);


        section.content.appendChild(document.createElement('br'));
        section.content.appendChild(document.createElement('br'));


        const delayedRegistration = createNumberInput('options_unloadInTSTContextMenu_DelayedRegistration', 0, false);
        delayedRegistration.input.id = 'delayedTSTRegistrationTimeInMilliseconds';
        section.content.appendChild(delayedRegistration.area);


        section.content.appendChild(document.createElement('br'));


        const tabbarCheckbox = createCheckBox('contextMenu_in_tab_bar', 'options_contextMenu_in_tab_bar');
        section.content.appendChild(tabbarCheckbox.area);


        section.content.appendChild(document.createElement('br'));
        section.content.appendChild(document.createElement('br'));


        const list = createListArea();
        section.content.appendChild(list.area);

        let listItemEnabled = new Map();
        let listItemToId = new Map();
        let idToListItem = new Map();
        const checkListEnabled = () => {
            toggleClass(section.title, 'enabled', parseInt(delayedRegistration.input.value) > 0 || Array.from(listItemEnabled.values()).some(value => value));
        };
        starters.createDisposable(() => {
            checkListEnabled();
            return [
                new EventListener(rootItemLabel, 'input', checkListEnabled),
                new EventListener(delayedRegistration.input, 'input', checkListEnabled),
            ];
        });
        const setItemEnabled = (item, isEnabled) => {
            listItemEnabled.set(item, isEnabled);
            checkListEnabled();
        };
        list.onCheckDrop.addListener((itemObj) => {
            if (Array.from(listItemEnabled.keys()).includes(itemObj)) {
                return true;
            }
            return false;
        });

        const saveOrder = () => {
            SettingsTracker.set('tstContextMenuOrder', list.items.map(item => listItemToId.get(item)));
        };
        const loadOrder = () => {
            const orderIds = settings.tstContextMenuOrder;
            for (const id of orderIds) {
                const item = idToListItem.get(id);
                if (item) {
                    list.addItem(item);
                }
            }
        };
        starters.createDisposable(() => {
            loadOrder();
            return new EventListener(list.onArrayChanged, ((list, itemObj, newIndex) => {
                if (!newIndex && newIndex !== 0) {
                    console.log('Error: context menu order item removed!');
                    return;
                }
                saveOrder();
            }));
        });

        // eslint-disable-next-line valid-jsdoc
        /**
         * Create a section that configures a context menu item.
         *
         * @param {Object} Param Parameters
         * @param {string} Param.id The id of the context menu item.
         * @param {string} Param.title The i18n message id for the section's title.
         * @param {keyof settings} Param.enabledKey The setting key that enables this item.
         * @param {string} Param.enabledMessage The i18n message id for the `enable` checkbox.
         * @param {null | keyof settings} [Param.useSelectedTabs_key] The setting key for the `use selected tabs` checkbox.
         * @param {string} [Param.useSelectedTabs_message] The i18n message id for the `use selected tabs` checkbox.
         * @param {null | keyof settings} [Param.notActiveTab_key] The setting key for the `not active tab` checkbox.
         * @param {null | keyof settings} [Param.unloadRootTabIf_NoDescendants_key] The setting key for the `unload root tab if there are no descendants` checkbox.
         * @param {null | keyof settings} [Param.unloadRootTabIf_UnloadedDescendants_key] The setting key for the `unload root tab if there are only unloaded descendants` checkbox.
         * @param {null | keyof settings} [Param.ignorePinnedTabs_key] The setting key for the `ignore pinned tabs` checkbox.
         * @param {string} [Param.ignorePinnedTabs_message] The i18n message id for the `ignore pinned tabs` checkbox.
         * @param {keyof settings} Param.fallback_lastSelected_key A settings key for this option.
         * @param {keyof settings} Param.fallback_ignoreHidden_key A settings key for this option.
         * @param {keyof settings} Param.fallback_wrapAround_key A settings key for this option.
         * @param {keyof settings} Param.customLabelKey A settings key for this option.
         * @param {string} Param.defaultCustomLabelMessage The i18n message id for the placeholder text to show inside the custom label input.
         */
        const createContextMenuItemSection = ({
            id,
            title,
            enabledKey,
            enabledMessage,
            useSelectedTabs_key = null,
            useSelectedTabs_message = null,
            notActiveTab_key = null,
            unloadRootTabIf_NoDescendants_key = null,
            unloadRootTabIf_UnloadedDescendants_key = null,
            ignorePinnedTabs_key = null,
            ignorePinnedTabs_message = null,
            fallback_lastSelected_key,
            fallback_ignoreHidden_key,
            fallback_wrapAround_key,
            customLabelKey,
            defaultCustomLabelMessage,
        }) => {
            const listItem = list.createItem(sectionAnimationInfo);
            listItemToId.set(listItem, id);
            idToListItem.set(id, listItem);

            const section = listItem.section;
            section.content.classList.add('standardFormat');
            section.title.classList.add('enablable');
            section.content.classList.add('contextMenuItemArea');

            const header = document.createElement('div');
            header.classList.add('center');
            header.classList.add(messagePrefix + title);
            section.title.appendChild(header);

            const enabledCheckbox = createCheckBox(enabledKey, enabledMessage);
            const check = () => {
                let enabled = enabledCheckbox.checkbox.checked;
                toggleClass(section.title, 'enabled', enabled);
                toggleClass(section.content, 'enabled', enabled);
                setItemEnabled(listItem, enabled);
            };
            starters.createDisposable(() => {
                check();
                return new EventListener(enabledCheckbox.checkbox, 'input', (e) => check());
            });
            section.content.appendChild(enabledCheckbox.area);

            section.content.appendChild(document.createElement('br'));


            const effectOptions = document.createElement('div');
            effectOptions.classList.add('area');
            effectOptions.classList.add('enabled');
            section.content.appendChild(effectOptions);


            let hasEffectOptions = false;

            if (useSelectedTabs_key) {
                hasEffectOptions = true;

                const useSelected = createCheckBox(useSelectedTabs_key, useSelectedTabs_message);
                effectOptions.appendChild(useSelected.area);
            }
            if (ignorePinnedTabs_key) {
                if (hasEffectOptions) {
                    effectOptions.appendChild(document.createElement('br'));
                }
                hasEffectOptions = true;

                const ignorePinned = createCheckBox(ignorePinnedTabs_key, ignorePinnedTabs_message);
                effectOptions.appendChild(ignorePinned.area);
            }
            if (unloadRootTabIf_NoDescendants_key) {
                if (hasEffectOptions) {
                    effectOptions.appendChild(document.createElement('br'));
                    if (unloadRootTabIf_UnloadedDescendants_key) {
                        effectOptions.appendChild(document.createElement('br'));
                    }
                }
                hasEffectOptions = true;

                const noDescendants = createCheckBox(unloadRootTabIf_NoDescendants_key, 'options_unloadTreeDescendants_unloadRootTabIf_NoDescendants');
                effectOptions.appendChild(noDescendants.area);

                if (unloadRootTabIf_UnloadedDescendants_key) {
                    effectOptions.appendChild(document.createElement('br'));

                    const unloadedDescendants = createCheckBox(unloadRootTabIf_UnloadedDescendants_key, 'options_unloadTreeDescendants_unloadRootTabIf_UnloadedDescendants');
                    effectOptions.appendChild(unloadedDescendants.area);

                    const check = () => {
                        const enabled = noDescendants.checkbox.checked;
                        toggleClass(unloadedDescendants.area, 'disabled', !enabled);
                    };
                    starters.createDisposable(() => {
                        check();
                        return new EventListener(noDescendants.checkbox, 'input', () => check());
                    });

                    effectOptions.appendChild(document.createElement('br'));
                }
            }
            if (notActiveTab_key) {
                if (hasEffectOptions) {
                    effectOptions.appendChild(document.createElement('br'));
                }
                hasEffectOptions = true;

                const notActiveTab = createCheckBox(notActiveTab_key, 'options_notActiveTab');
                effectOptions.appendChild(notActiveTab.area);
            }

            if (hasEffectOptions) {
                effectOptions.appendChild(document.createElement('br'));
                effectOptions.appendChild(document.createElement('br'));
            }


            const fallbackToLastSelected = createCheckBox(fallback_lastSelected_key, 'options_fallbackToLastSelected');
            effectOptions.appendChild(fallbackToLastSelected.area);

            effectOptions.appendChild(document.createElement('br'));

            const ignoreHiddenTabs = createCheckBox(fallback_ignoreHidden_key, 'options_ignoreHiddenTabs');
            effectOptions.appendChild(ignoreHiddenTabs.area);

            effectOptions.appendChild(document.createElement('br'));

            const wrapAround = createCheckBox(fallback_wrapAround_key, 'options_wrapAround');
            effectOptions.appendChild(wrapAround.area);


            section.content.appendChild(document.createElement('br'));


            const customLabelDescription = document.createElement('label');
            customLabelDescription.classList.add(messagePrefix + 'options_contextMenu_customLabel');
            section.content.appendChild(customLabelDescription);

            const customLabel = document.createElement('input');
            customLabel.type = 'text';
            customLabel.id = customLabelKey;
            if (defaultCustomLabelMessage) {
                customLabel.placeholder = browser.i18n.getMessage(defaultCustomLabelMessage);
            }
            section.content.appendChild(customLabel);
        };

        const unloadTab = createContextMenuItemSection({
            id: tstContextMenuItemIds.unloadTab,
            title: 'options_unloadInTSTContextMenu_Title',

            enabledKey: 'unloadInTSTContextMenu',
            enabledMessage: 'options_unloadInTSTContextMenu',

            useSelectedTabs_key: 'unloadInTSTContextMenu_useSelectedTabs',
            useSelectedTabs_message: 'options_useSelectedTabs',

            fallback_lastSelected_key: 'unloadInTSTContextMenu_fallbackToLastSelected',
            fallback_ignoreHidden_key: 'unloadInTSTContextMenu_ignoreHiddenTabs',
            fallback_wrapAround_key: 'unloadInTSTContextMenu_wrapAround',

            customLabelKey: 'unloadInTSTContextMenu_CustomLabel',
            defaultCustomLabelMessage: 'contextMenu_unloadTab',
        });

        const unloadTree = createContextMenuItemSection({
            id: tstContextMenuItemIds.unloadTree,
            title: 'options_unloadTreeInTSTContextMenu_Title',

            enabledKey: 'unloadTreeInTSTContextMenu',
            enabledMessage: 'options_unloadTreeInTSTContextMenu',

            notActiveTab_key: 'unloadTreeInTSTContextMenu_notActiveTab',

            fallback_lastSelected_key: 'unloadTreeInTSTContextMenu_fallbackToLastSelected',
            fallback_ignoreHidden_key: 'unloadTreeInTSTContextMenu_ignoreHiddenTabs',
            fallback_wrapAround_key: 'unloadTreeInTSTContextMenu_wrapAround',

            customLabelKey: 'unloadTreeInTSTContextMenu_CustomLabel',
            defaultCustomLabelMessage: 'contextMenu_unloadTree',
        });

        const unloadTreeDescendants = createContextMenuItemSection({
            id: tstContextMenuItemIds.unloadTreeDescendants,
            title: 'options_unloadTreeDescendantsInTSTContextMenu_Title',

            enabledKey: 'unloadTreeDescendantsInTSTContextMenu',
            enabledMessage: 'options_unloadTreeDescendantsInTSTContextMenu',

            notActiveTab_key: 'unloadTreeDescendantsInTSTContextMenu_notActiveTab',
            unloadRootTabIf_NoDescendants_key: 'unloadTreeDescendantsInTSTContextMenu_unloadRootTabIf_NoDescendants',
            unloadRootTabIf_UnloadedDescendants_key: 'unloadTreeDescendantsInTSTContextMenu_unloadRootTabIf_UnloadedDescendants',

            fallback_lastSelected_key: 'unloadTreeDescendantsInTSTContextMenu_fallbackToLastSelected',
            fallback_ignoreHidden_key: 'unloadTreeDescendantsInTSTContextMenu_ignoreHiddenTabs',
            fallback_wrapAround_key: 'unloadTreeDescendantsInTSTContextMenu_wrapAround',

            customLabelKey: 'unloadTreeDescendantsInTSTContextMenu_CustomLabel',
            defaultCustomLabelMessage: 'contextMenu_unloadTreeDescendants',
        });

        const unloadOther = createContextMenuItemSection({
            id: tstContextMenuItemIds.unloadOther,
            title: 'options_unloadOtherInTSTContextMenu_Title',

            enabledKey: 'unloadOtherInTSTContextMenu',
            enabledMessage: 'options_unloadOtherInTSTContextMenu',

            useSelectedTabs_key: 'unloadOtherInTSTContextMenu_ignoreSelectedTabs',
            useSelectedTabs_message: 'options_unloadOthers_ignoreSelectedTabs',

            ignorePinnedTabs_key: 'unloadOtherInTSTContextMenu_ignorePinnedTabs',
            ignorePinnedTabs_message: 'options_unloadOthers_ignorePinnedTabs',

            fallback_lastSelected_key: 'unloadOtherInTSTContextMenu_fallbackToLastSelected',
            fallback_ignoreHidden_key: 'unloadOtherInTSTContextMenu_ignoreHiddenTabs',
            fallback_wrapAround_key: 'unloadOtherInTSTContextMenu_wrapAround',

            customLabelKey: 'unloadOtherInTSTContextMenu_CustomLabel',
            defaultCustomLabelMessage: 'contextMenu_unloadOther',
        });

    } catch (error) {
        console.log('Error: failed to create context menu area!\nError:\n', error, '\nStack Trace:\n', error.stack);
    }

    // #endregion Context Menu Item


    // #region Commands


    {
        // eslint-disable-next-line valid-jsdoc
        /**
         * Create UI elements for fallback options.
         *
         * @param {Object} Params Keyword parameters.
         * @param {HTMLElement} Params.area The div node to append the new UI elements to.
         * @param { KeysWithSuffix<typeof settings, 'fallbackToLastSelected'> } Params.settingPrefix The settings keys for the fallback options should all share this prefix.
         */
        const createFallbackOptions = ({ area, settingPrefix }) => {
            const fallbackToLastSelected = createCheckBox(settingPrefix + 'fallbackToLastSelected', 'options_fallbackToLastSelected');
            area.appendChild(fallbackToLastSelected.area);

            area.appendChild(document.createElement('br'));

            const ignoreHiddenTabs = createCheckBox(settingPrefix + 'ignoreHiddenTabs', 'options_ignoreHiddenTabs');
            area.appendChild(ignoreHiddenTabs.area);

            area.appendChild(document.createElement('br'));

            const wrapAround = createCheckBox(settingPrefix + 'wrapAround', 'options_wrapAround');
            area.appendChild(wrapAround.area);
        };


        const shortcutsInfo = createShortcutsArea({
            sectionAnimation: sectionAnimationInfo,

            commandInfos: {
                'unload-tab': {
                    description: 'options_Commands_UnloadTab',
                    createContent: () => {
                        const area = document.createElement('div');

                        const useSelectedTabs = createCheckBox('command_unloadTab_useSelectedTabs', 'options_useSelectedTabs');
                        area.appendChild(useSelectedTabs.area);

                        area.appendChild(document.createElement('br'));
                        area.appendChild(document.createElement('br'));

                        createFallbackOptions({ area, settingPrefix: 'command_unloadTab_' });

                        return area;
                    },
                },
                'unload-tree': {
                    description: 'options_Commands_UnloadTree',
                    createContent: () => {
                        const area = document.createElement('div');

                        createFallbackOptions({ area, settingPrefix: 'command_unloadTree_' });

                        return area;
                    },
                },
                'unload-tree-descendants': {
                    description: 'options_Commands_UnloadTreeDescendants',
                    createContent: () => {
                        const area = document.createElement('div');

                        const unloadRootIfNoDescendants = createCheckBox('command_unloadTreeDescendants_unloadRootTabIf_NoDescendants', 'options_unloadTreeDescendants_unloadRootTabIf_NoDescendants');
                        area.appendChild(unloadRootIfNoDescendants.area);

                        area.appendChild(document.createElement('br'));

                        const unloadRootIfUnloadedDescendants = createCheckBox('command_unloadTreeDescendants_unloadRootTabIf_UnloadedDescendants', 'options_unloadTreeDescendants_unloadRootTabIf_UnloadedDescendants');
                        area.appendChild(unloadRootIfUnloadedDescendants.area);

                        area.appendChild(document.createElement('br'));
                        area.appendChild(document.createElement('br'));

                        createFallbackOptions({ area, settingPrefix: 'command_unloadTreeDescendants_' });


                        const check = () => {
                            const enabled = unloadRootIfNoDescendants.checkbox.checked;
                            toggleClass(unloadRootIfUnloadedDescendants.area, 'disabled', !enabled);
                        };
                        starters.createDisposable(() => {
                            check();
                            return new EventListener(unloadRootIfNoDescendants.checkbox, 'input', (e) => check());
                        });

                        return area;
                    },
                },
                'unload-other': {
                    description: 'options_Commands_UnloadOther',
                    createContent: () => {
                        const area = document.createElement('div');

                        const ignoreSelectedTabs = createCheckBox('command_unloadOther_ignoreSelectedTabs', 'options_unloadOthers_ignoreSelectedTabs');
                        area.appendChild(ignoreSelectedTabs.area);

                        area.appendChild(document.createElement('br'));

                        const ignorePinnedTabs = createCheckBox('command_unloadOther_ignorePinnedTabs', 'options_unloadOthers_ignorePinnedTabs');
                        area.appendChild(ignorePinnedTabs.area);

                        area.appendChild(document.createElement('br'));
                        area.appendChild(document.createElement('br'));


                        createFallbackOptions({ area, settingPrefix: 'command_unloadOther_' });

                        return area;
                    },
                },
                'select-previous-tab': {
                    description: 'options_Commands_SelectPreviousTab',
                    createContent: () => {
                        const area = document.createElement('div');

                        const ignoreHiddenTabs = createCheckBox('command_selectPreviousTab_ignoreHiddenTabs', 'options_select_IgnoreHiddenTabs');
                        area.appendChild(ignoreHiddenTabs.area);

                        area.appendChild(document.createElement('br'));

                        const wrapAround = createCheckBox('command_selectPreviousTab_wrapAround', 'options_wrapAround');
                        area.appendChild(wrapAround.area);

                        return area;
                    },
                },
                'select-next-tab': {
                    description: 'options_Commands_SelectNextTab',
                    createContent: () => {
                        const area = document.createElement('div');

                        const ignoreHiddenTabs = createCheckBox('command_selectNextTab_ignoreHiddenTabs', 'options_select_IgnoreHiddenTabs');
                        area.appendChild(ignoreHiddenTabs.area);

                        area.appendChild(document.createElement('br'));

                        const wrapAround = createCheckBox('command_selectNextTab_wrapAround', 'options_wrapAround');
                        area.appendChild(wrapAround.area);

                        return area;
                    },
                },

                'toggle-tab-hide-setting': {
                    description: 'options_Commands_ToggleTabHideSetting',
                    createContent() {
                        const info = document.createElement('p');
                        const tabHideSectionHeader = browser.i18n.getMessage('options_TabHide_Header');
                        info.textContent = browser.i18n.getMessage('options_Commands_ToggleTabHideSetting_Description', tabHideSectionHeader);
                        return info;
                    },
                },
            },

            headerMessage: 'options_Commands_Title',
            infoMessage: 'options_Commands_Info',

            resetButtonMessage: 'options_Commands_ResetButton',
            promptButtonMessage: 'options_Commands_PromptButton',
        });
        starters.createDisposable(() => {
            shortcutsInfo.update();
        });
        commandsCategory.appendChild(shortcutsInfo.area);
    }

    // #endregion Commands




    // #region Tab Hiding

    {
        let section = createCollapsableArea(sectionAnimationInfo);
        section.area.classList.add('standardFormat');
        section.title.classList.add('center');
        section.title.classList.add('enablable');
        section.content.classList.add('tabHideArea');
        document.body.appendChild(section.area);

        let header = document.createElement('div');
        header.classList.add(messagePrefix + 'options_TabHide_Header');
        section.title.appendChild(header);


        let hideTabsArea = document.createElement('div');
        hideTabsArea.classList.add('area');
        section.content.appendChild(hideTabsArea);

        let enableCheckbox = createCheckBox('tabHide_HideUnloadedTabs', 'options_TabHide_HideUnloadedTabs');
        hideTabsArea.appendChild(enableCheckbox.area);

        hideTabsArea.appendChild(document.createElement('br'));
        hideTabsArea.appendChild(document.createElement('br'));


        const moreOptionArea = document.createElement('div');
        moreOptionArea.classList.add('area');
        hideTabsArea.appendChild(moreOptionArea);

        const suppressTSTHiddenClass = createCheckBox('tabHide_SuppressTSTHiddenClass', 'options_TabHide_SuppressTSTHiddenClass');
        moreOptionArea.appendChild(suppressTSTHiddenClass.area);


        hideTabsArea.appendChild(document.createElement('br'));

        let info = document.createElement('div');
        info.classList.add('message');
        info.textContent = browser.i18n.getMessage('options_TabHide_Info', ['options_ignoreHiddenTabs', 'options_TabHide_ShowHiddenTabsInTST'].map(messageName => browser.i18n.getMessage(messageName)));
        hideTabsArea.appendChild(info);


        section.content.appendChild(document.createElement('br'));


        const showHiddenInTSTArea = document.createElement('div');
        showHiddenInTSTArea.classList.add('area');
        section.content.appendChild(showHiddenInTSTArea);

        let showHiddenInTSTCheckbox = createCheckBox('tabHide_ShowHiddenTabsInTST', 'options_TabHide_ShowHiddenTabsInTST');
        showHiddenInTSTArea.appendChild(showHiddenInTSTCheckbox.area);

        const showHiddenInTSTInfo = document.createElement('p');
        showHiddenInTSTInfo.classList.add(messagePrefix + 'options_TabHide_ShowHiddenTabsInTST_MoreInfo');
        showHiddenInTSTArea.appendChild(showHiddenInTSTInfo);

        starters.createDisposable(() => {
            let check = () => {
                let enabled = enableCheckbox.checkbox.checked || showHiddenInTSTCheckbox.checkbox.checked;
                let needAPI = enableCheckbox.checkbox.checked && !permissionsArea.checkControllerAvailable(permissionsArea.tabHidePermissionController);
                toggleClass(section.title, 'enabled', enabled);
                toggleClass(section.title, 'error', needAPI);
                toggleClass(section.content, 'enabled', enabled);
                toggleClass(moreOptionArea, 'disabled', !enableCheckbox.checkbox.checked);
            };
            let disposables = [
                new EventListener(enableCheckbox.checkbox, 'input', (e) => check()),
                new EventListener(showHiddenInTSTCheckbox.checkbox, 'input', (e) => check()),
                new EventListener(permissionsArea.onControllerValueChanged, (controller) => {
                    if (permissionsArea.tabHidePermissionController === controller) {
                        check();
                    }
                }),
                new EventListener(settingsTracker.onChange, (changes) => {
                    if (changes.tabHide_HideUnloadedTabs) {
                        // This option can be toggle using keyboard shortcuts, so we check changes from elsewhere:
                        check();
                    }
                })
            ];
            check();
            return disposables;
        });
    }

    // #endregion Tab Hiding


    // #region Tab Restore Fix

    {
        const section = createCollapsableArea(sectionAnimationInfo);
        section.area.classList.add('standardFormat');
        section.title.classList.add('center');
        section.title.classList.add('enablable');
        document.body.appendChild(section.area);


        const header = document.createElement('div');
        header.classList.add(messagePrefix + 'options_TabRestoreFix_Header');
        section.title.appendChild(header);



        const deprecatedWarning = document.createElement('div');
        deprecatedWarning.classList.add(messagePrefix + 'options_TabRestoreFix_deprecatedWarning');
        section.content.appendChild(deprecatedWarning);

        section.content.appendChild(document.createElement('br'));



        const reloadBrokenTabsArea = document.createElement('div');
        reloadBrokenTabsArea.classList.add('area');
        section.content.appendChild(reloadBrokenTabsArea);

        const reloadBrokenTabs_info = document.createElement('div');
        reloadBrokenTabs_info.classList.add(messagePrefix + 'options_TabRestoreFix_reloadBrokenTabs');
        reloadBrokenTabsArea.appendChild(reloadBrokenTabs_info);


        reloadBrokenTabsArea.appendChild(document.createElement('br'));

        const reloadBrokenTabs_Normal = createCheckBox('fixTabRestore_reloadBrokenTabs', 'options_TabRestoreFix_reloadBrokenTabs_Normal');
        reloadBrokenTabsArea.appendChild(reloadBrokenTabs_Normal.area);
        reloadBrokenTabsArea.appendChild(document.createElement('br'));

        const reloadBrokenTabs_Private = createCheckBox('fixTabRestore_reloadBrokenTabs_private', 'options_TabRestoreFix_reloadBrokenTabs_Private');
        reloadBrokenTabsArea.appendChild(reloadBrokenTabs_Private.area);
        reloadBrokenTabsArea.appendChild(document.createElement('br'));


        reloadBrokenTabsArea.appendChild(document.createElement('br'));


        const quickUnloadArea = document.createElement('div');
        quickUnloadArea.classList.add('area');
        reloadBrokenTabsArea.appendChild(quickUnloadArea);

        const quickUnload_info = document.createElement('div');
        quickUnload_info.classList.add(messagePrefix + 'options_TabRestoreFix_reloadBrokenTabs_QuickUnload');
        quickUnloadArea.appendChild(quickUnload_info);


        quickUnloadArea.appendChild(document.createElement('br'));

        const quickUnload_Normal = createCheckBox('fixTabRestore_reloadBrokenTabs_quickUnload', 'options_TabRestoreFix_reloadBrokenTabs_QuickUnload_Normal');
        quickUnloadArea.appendChild(quickUnload_Normal.area);
        quickUnloadArea.appendChild(document.createElement('br'));

        const quickUnload_Private = createCheckBox('fixTabRestore_reloadBrokenTabs_private_quickUnload', 'options_TabRestoreFix_reloadBrokenTabs_QuickUnload_Private');
        quickUnloadArea.appendChild(quickUnload_Private.area);
        quickUnloadArea.appendChild(document.createElement('br'));





        section.content.appendChild(document.createElement('br'));
        section.content.appendChild(document.createElement('br'));


        const ensureLoadArea = document.createElement('div');
        ensureLoadArea.classList.add('ensureCorrectLoad');
        ensureLoadArea.classList.add('area');
        section.content.appendChild(ensureLoadArea);


        const waitForUrl = createNumberInput('options_TabRestoreFix_waitForUrlInMilliseconds', -1, true);
        waitForUrl.input.id = 'fixTabRestore_waitForUrlInMilliseconds';
        ensureLoadArea.appendChild(waitForUrl.area);


        ensureLoadArea.appendChild(document.createElement('br'));
        ensureLoadArea.appendChild(document.createElement('br'));


        const fixIncorrectLoadArea = document.createElement('div');
        fixIncorrectLoadArea.classList.add('area');
        ensureLoadArea.appendChild(fixIncorrectLoadArea);


        const waitForIncorrectLoad = createNumberInput('options_TabRestoreFix_waitForIncorrectLoad', -1, true);
        waitForIncorrectLoad.input.id = 'fixTabRestore_waitForIncorrectLoad';
        fixIncorrectLoadArea.appendChild(waitForIncorrectLoad.area);


        fixIncorrectLoadArea.appendChild(document.createElement('br'));
        fixIncorrectLoadArea.appendChild(document.createElement('br'));


        const fixIncorrectLoadAfter = createNumberInput('options_TabRestoreFix_fixIncorrectLoadAfter', -1, true);
        fixIncorrectLoadAfter.input.id = 'fixTabRestore_fixIncorrectLoadAfter';
        fixIncorrectLoadArea.appendChild(fixIncorrectLoadAfter.area);




        section.content.appendChild(document.createElement('br'));
        section.content.appendChild(document.createElement('br'));


        const permissionWarning = document.createElement('div');
        permissionWarning.classList.add(messagePrefix + 'options_TabRestoreFix_permissionWarning');
        section.content.appendChild(permissionWarning);



        section.content.appendChild(document.createElement('br'));
        section.content.appendChild(document.createElement('br'));



        const unloadAgain = createNumberInput('html-options_TabRestoreFix_unloadAgainAfterDelay', -1, true);
        unloadAgain.input.id = 'unloadAgainAfterDelay';
        unloadAgain.text.classList.add(messageAsHtml);
        section.content.appendChild(unloadAgain.area);


        const check = () => {
            const ensureLoadEnabled = parseInt(waitForUrl.input.value) >= 0;
            const enabled = ensureLoadEnabled || reloadBrokenTabs_Normal.checkbox.checked || reloadBrokenTabs_Private.checkbox.checked;
            toggleClass(section.title, 'enabled', enabled || parseInt(unloadAgain.input.value) >= 0);
            toggleClass(ensureLoadArea, 'enabled', ensureLoadEnabled);
            toggleClass(section.title, 'error', enabled && !permissionsArea.checkControllerAvailable(permissionsArea.tabsPermissionController));

            toggleClass(fixIncorrectLoadAfter.area, 'disabled', ensureLoadEnabled && parseInt(waitForIncorrectLoad.input.value) < 0);

            toggleClass(quickUnloadArea, 'disabled', !reloadBrokenTabs_Normal.checkbox.checked && !reloadBrokenTabs_Private.checkbox.checked);
            toggleClass(quickUnload_Normal.area, 'disabled', !reloadBrokenTabs_Normal.checkbox.checked);
            toggleClass(quickUnload_Private.area, 'disabled', !reloadBrokenTabs_Private.checkbox.checked);
        };
        starters.createDisposable(() => {
            check();
            return [
                new EventListener(waitForUrl.input, 'input', check),
                new EventListener(waitForIncorrectLoad.input, 'input', check),
                new EventListener(reloadBrokenTabs_Normal.checkbox, 'input', check),
                new EventListener(reloadBrokenTabs_Private.checkbox, 'input', check),
                new EventListener(unloadAgain.input, 'input', check),
                new EventListener(permissionsArea.onControllerValueChanged, (controller) => {
                    if (permissionsArea.tabsPermissionController === controller) {
                        check();
                    }
                }),
            ];
        });
    }

    // #endregion Tab Restore Fix


    // #region Tree Style Tab Style

    {
        const section = createCollapsableArea(sectionAnimationInfo);
        section.area.classList.add('standardFormat');
        section.title.classList.add('center');
        section.title.classList.add('enablable');
        section.content.classList.add('treeStyleTabStyleArea');
        document.body.appendChild(section.area);

        const header = document.createElement('div');
        header.classList.add(messagePrefix + 'options_TreeStyleTabStyle_Header');
        section.title.appendChild(header);


        const dimUnloadedCheckbox = createCheckBox('dimUnloadedTabs', 'options_dimUnloadedTabs');
        section.content.appendChild(dimUnloadedCheckbox.area);

        section.content.appendChild(document.createElement('br'));
        section.content.appendChild(document.createElement('br'));

        const label = document.createElement('label');
        label.classList.add('styleLabel');
        label.classList.add(messagePrefix + 'options_TreeStyleTabStyle_Info');
        section.content.appendChild(label);

        section.content.appendChild(document.createElement('br'));

        const currentStyle = document.createElement('textarea');
        currentStyle.classList.add('styleTextarea');
        currentStyle.rows = 15;
        currentStyle.readOnly = true;
        section.content.appendChild(currentStyle);


        const updateStyle = (newStyle = null) => {
            if (!newStyle) {
                newStyle = '';
            }
            if (currentStyle.value === newStyle) {
                return;
            }
            currentStyle.value = newStyle;

            toggleClass(section.title, 'enabled', newStyle && newStyle.trim() !== '');
        };
        starters.createDisposable(() => {
            let changed = false;
            let listener = new EventListener(pagePort.getEvent(messageTypes.styleChanged), (oldStyle, newStyle) => {
                updateStyle(newStyle);
                changed = true;
            });
            listener.onDisposed.addListener(() => {
                changed = true;
            });

            browser.runtime.sendMessage({ type: messageTypes.getActiveStyle }).then((currentStyle) => {
                if (!changed) {
                    updateStyle(currentStyle);
                }
            });

            return listener;
        });
    }

    // #endregion Tree Style Tab Style




    // #region Permissions

    const permissionsCategory = document.createElement('fieldset');
    permissionsCategory.classList.add('permissionsCategory');
    permissionsCategory.classList.add('category');
    document.body.appendChild(permissionsCategory);
    {
        const legend = document.createElement('legend');
        legend.classList.add(messagePrefix + 'options_category_permissions_Title');
        permissionsCategory.appendChild(legend);
    }

    {
        const optionalPermissionsArea = createCollapsableArea(sectionAnimationInfo);
        optionalPermissionsArea.area.classList.add('standardFormat');
        optionalPermissionsArea.title.classList.add('center');
        optionalPermissionsArea.title.classList.add('enablable');
        optionalPermissionsArea.content.classList.add('optionalPermissionArea');
        permissionsCategory.appendChild(optionalPermissionsArea.area);

        const header = document.createElement('div');
        header.classList.add(messagePrefix + 'options_OptionalPermissions_Header');
        optionalPermissionsArea.title.appendChild(header);

        permissionsArea = createPermissionsArea({
            sectionAnimationInfo,
            requestFailedCallback: async (permission) => {
                const currentTab = await browser.tabs.getCurrent();
                browser.tabs.create({
                    windowId: currentTab.windowId,
                    url: browser.runtime.getURL('resources/permissions.html'),
                    active: true,
                    index: currentTab.index + 1,
                    openerTabId: currentTab.id
                });
            },
            portConnection: pagePort,
        });
        optionalPermissionsArea.content.appendChild(permissionsArea.area);

        permissionsArea.onHasAnyValueChanged.addListener(() => {
            toggleClass(optionalPermissionsArea.title, 'enabled', permissionsArea.hasAnyPermissions);
            toggleClass(optionalPermissionsArea.title, 'error', permissionsArea.hasAnyError);
        });
    }

    {
        const privacyArea = createPrivacyPermissionArea({ portConnection: pagePort, sectionAnimationInfo });
        permissionsCategory.appendChild(privacyArea.area);
    }

    // #endregion Permissions


    // #region Other Options

    {
        const section = createCollapsableArea(sectionAnimationInfo);
        section.area.classList.add('standardFormat');
        section.title.classList.add('center');
        section.title.classList.add('enablable');
        document.body.appendChild(section.area);

        const header = document.createElement('div');
        header.classList.add(messagePrefix + 'options_OtherSettings_Header');
        section.title.appendChild(header);

        const area = document.createElement('div');
        area.classList.add('otherSettingsArea');
        section.content.appendChild(area);


        const unloadViaAutoTabDiscard = createCheckBox('unloadViaAutoTabDiscard', 'html-options_unloadViaAutoTabDiscard');
        unloadViaAutoTabDiscard.label.classList.add(messageAsHtml);
        area.appendChild(unloadViaAutoTabDiscard.area);


        area.appendChild(document.createElement('br'));
        area.appendChild(document.createElement('br'));


        const disableOptionAnimations = createCheckBox('disableOptionsPageAnimations', 'options_disableOptionsPageAnimations');
        area.appendChild(disableOptionAnimations.area);


        area.appendChild(document.createElement('br'));
        area.appendChild(document.createElement('br'));


        const disableOptionsDarkTheme = createCheckBox('disableOptionsPageDarkTheme', 'options_disableOptionsPageDarkTheme');
        area.appendChild(disableOptionsDarkTheme.area);

        settingsTracker.onChange.addListener(changes => {
            if (changes.disableOptionsPageDarkTheme) {
                toggleClass(document.documentElement, 'support-dark-theme', !settings.disableOptionsPageDarkTheme);
            }
        });


        const checkSection = () => {
            toggleClass(section.title, 'enabled', disableOptionAnimations.checkbox.checked || unloadViaAutoTabDiscard.checkbox.checked || disableOptionsDarkTheme.checkbox.checked);
        };
        starters.createDisposable((delayed) => {
            checkSection();
            return [
                new EventListener(disableOptionAnimations.checkbox, 'input', checkSection),
                new EventListener(disableOptionsDarkTheme.checkbox, 'input', checkSection),
                new EventListener(unloadViaAutoTabDiscard.checkbox, 'input', checkSection),
            ];
        });
    }

    // #endregion Other Options


    // #region Reset Button

    {
        let area = document.createElement('div');
        document.body.appendChild(area);

        let resetButton = document.createElement('button');
        resetButton.classList.add('resetSettingsButton');
        resetButton.classList.add(messagePrefix + 'options_ResetSettings_Button');
        area.appendChild(resetButton);


        resetButton.addEventListener('click', async (e) => {
            let ok = confirm(browser.i18n.getMessage('options_ResetSettings_Prompt'));
            if (!ok) {
                return;
            }

            // Reset commands:
            await Promise.all((await browser.commands.getAll()).map(command => browser.commands.reset(command.name)));

            // Clear settings:
            await SettingsTracker.clear();

            // Wait for settings to be updated:
            await delay(250);

            // Reload settings:
            starters.stop();
            starters.start();
        });
    }

    // #endregion Reset Button


    setTextMessages(null, { specialHtmlClass: messageAsHtml, });
    await settingsTracker.start;
    starters.start();
}


initiatePage();
