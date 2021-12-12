
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

    let mouseAreas = MouseClickComboCollection.createStandard().combos.map(combo => createMouseClickArea(combo, sectionAnimationInfo));
    for (let mouseArea of mouseAreas) {
        document.body.appendChild(mouseArea.area);
    }
    starters.createDisposable(() => {
        let listeners = [];
        for (let area of mouseAreas) {
            let obj = area.combo;
            let key = area.settingKey;

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

    // #endregion Mouse Events


    // #region Context Menu Item

    try {
        let section = createCollapsableArea(sectionAnimationInfo);
        section.area.classList.add('standardFormat');
        section.title.classList.add('center');
        section.title.classList.add('enablable');
        document.body.appendChild(section.area);

        let header = document.createElement('div');
        header.classList.add(messagePrefix + 'options_contextMenuItems_Title');
        section.title.appendChild(header);


        let rootItemLabel_Description = document.createElement('label');
        rootItemLabel_Description.classList.add(messagePrefix + 'options_tstContextMenu_CustomRootLabel');
        section.content.appendChild(rootItemLabel_Description);

        let rootItemLabel = document.createElement('input');
        rootItemLabel.type = 'text';
        rootItemLabel.id = 'tstContextMenu_CustomRootLabel';
        section.content.appendChild(rootItemLabel);


        section.content.appendChild(document.createElement('br'));
        section.content.appendChild(document.createElement('br'));


        let delayedRegistration = createNumberInput('options_unloadInTSTContextMenu_DelayedRegistration', 0, false);
        delayedRegistration.input.id = 'delayedTSTRegistrationTimeInMilliseconds';
        section.content.appendChild(delayedRegistration.area);


        section.content.appendChild(document.createElement('br'));


        let tabbarCheckbox = createCheckBox('contextMenu_in_tab_bar', 'options_contextMenu_in_tab_bar');
        section.content.appendChild(tabbarCheckbox.area);


        section.content.appendChild(document.createElement('br'));
        section.content.appendChild(document.createElement('br'));


        let list = createListArea();
        section.content.appendChild(list.area);

        let listItemEnabled = new Map();
        let listItemToId = new Map();
        let idToListItem = new Map();
        let checkListEnabled = () => {
            toggleClass(section.title, 'enabled', delayedRegistration.input.value > 0 || Array.from(listItemEnabled.values()).some(value => value));
        };
        starters.createDisposable(() => {
            checkListEnabled();
            return [
                new EventListener(rootItemLabel, 'input', checkListEnabled),
                new EventListener(delayedRegistration.input, 'input', checkListEnabled),
            ];
        });
        let setItemEnabled = (item, isEnabled) => {
            listItemEnabled.set(item, isEnabled);
            checkListEnabled();
        };
        list.onCheckDrop.addListener((itemObj) => {
            if (Array.from(listItemEnabled.keys()).includes(itemObj)) {
                return true;
            }
            return false;
        });

        let saveOrder = () => {
            SettingsTracker.set('tstContextMenuOrder', list.items.map(item => listItemToId.get(item)));
        };
        let loadOrder = () => {
            let orderIds = settings.tstContextMenuOrder;
            for (let id of orderIds) {
                let item = idToListItem.get(id);
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

        const createContextMenuItemSection = ({
            id,
            title,
            enabledKey,
            enabledMessage,
            useSelectedTabs_key = null,
            useSelectedTabs_message,
            ignorePinnedTabs_key = null,
            ignorePinnedTabs_message,
            fallback_lastSelected_key,
            fallback_ignoreHidden_key,
            fallback_wrapAround_key,
            customLabelKey,
        }) => {
            let listItem = list.createItem(sectionAnimationInfo);
            listItemToId.set(listItem, id);
            idToListItem.set(id, listItem);

            let section = listItem.section;
            section.content.classList.add('standardFormat');
            section.title.classList.add('enablable');
            section.content.classList.add('contextMenuItemArea');

            let header = document.createElement('div');
            header.classList.add('center');
            header.classList.add(messagePrefix + title);
            section.title.appendChild(header);

            let enabledCheckbox = createCheckBox(enabledKey, enabledMessage);
            let check = () => {
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


            let fallbackOptions = document.createElement('div');
            fallbackOptions.classList.add('area');
            fallbackOptions.classList.add('enabled');
            section.content.appendChild(fallbackOptions);


            if (useSelectedTabs_key) {
                let useSelected = createCheckBox(useSelectedTabs_key, useSelectedTabs_message);
                fallbackOptions.appendChild(useSelected.area);
                if (ignorePinnedTabs_key) {
                    fallbackOptions.appendChild(document.createElement('br'));

                    let ignorePinned = createCheckBox(ignorePinnedTabs_key, ignorePinnedTabs_message);
                    fallbackOptions.appendChild(ignorePinned.area);
                }

                fallbackOptions.appendChild(document.createElement('br'));
                fallbackOptions.appendChild(document.createElement('br'));
            }


            let fallbackToLastSelected = createCheckBox(fallback_lastSelected_key, 'options_fallbackToLastSelected');
            fallbackOptions.appendChild(fallbackToLastSelected.area);

            fallbackOptions.appendChild(document.createElement('br'));

            let ignoreHiddenTabs = createCheckBox(fallback_ignoreHidden_key, 'options_ignoreHiddenTabs');
            fallbackOptions.appendChild(ignoreHiddenTabs.area);

            fallbackOptions.appendChild(document.createElement('br'));

            const wrapAround = createCheckBox(fallback_wrapAround_key, 'options_wrapAround');
            fallbackOptions.appendChild(wrapAround.area);


            section.content.appendChild(document.createElement('br'));


            let customLabelDescription = document.createElement('label');
            customLabelDescription.classList.add(messagePrefix + 'options_contextMenu_customLabel');
            section.content.appendChild(customLabelDescription);

            let customLabel = document.createElement('input');
            customLabel.type = 'text';
            customLabel.id = customLabelKey;
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
        });

        const unloadTree = createContextMenuItemSection({
            id: tstContextMenuItemIds.unloadTree,
            title: 'options_unloadTreeInTSTContextMenu_Title',

            enabledKey: 'unloadTreeInTSTContextMenu',
            enabledMessage: 'options_unloadTreeInTSTContextMenu',

            fallback_lastSelected_key: 'unloadTreeInTSTContextMenu_fallbackToLastSelected',
            fallback_ignoreHidden_key: 'unloadTreeInTSTContextMenu_ignoreHiddenTabs',
            fallback_wrapAround_key: 'unloadTreeInTSTContextMenu_wrapAround',

            customLabelKey: 'unloadTreeInTSTContextMenu_CustomLabel',
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
        });

    } catch (error) {
        console.log('Error: failed to create context menu area!\nError:\n', error, '\nStack Trace:\n', error.stack);
    }

    // #endregion Context Menu Item


    // #region Commands


    {
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


                        const fallbackToLastSelected = createCheckBox('command_unloadTab_fallbackToLastSelected', 'options_fallbackToLastSelected');
                        area.appendChild(fallbackToLastSelected.area);

                        area.appendChild(document.createElement('br'));

                        const ignoreHiddenTabs = createCheckBox('command_unloadTab_ignoreHiddenTabs', 'options_ignoreHiddenTabs');
                        area.appendChild(ignoreHiddenTabs.area);

                        area.appendChild(document.createElement('br'));

                        const wrapAround = createCheckBox('command_unloadTab_wrapAround', 'options_wrapAround');
                        area.appendChild(wrapAround.area);

                        return area;
                    },
                },
                'unload-tree': {
                    description: 'options_Commands_UnloadTree',
                    createContent: () => {
                        const area = document.createElement('div');

                        const fallbackToLastSelected = createCheckBox('command_unloadTree_fallbackToLastSelected', 'options_fallbackToLastSelected');
                        area.appendChild(fallbackToLastSelected.area);

                        area.appendChild(document.createElement('br'));

                        const ignoreHiddenTabs = createCheckBox('command_unloadTree_ignoreHiddenTabs', 'options_ignoreHiddenTabs');
                        area.appendChild(ignoreHiddenTabs.area);

                        area.appendChild(document.createElement('br'));

                        const wrapAround = createCheckBox('command_unloadTree_wrapAround', 'options_wrapAround');
                        area.appendChild(wrapAround.area);

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


                        const fallbackToLastSelected = createCheckBox('command_unloadOther_fallbackToLastSelected', 'options_fallbackToLastSelected');
                        area.appendChild(fallbackToLastSelected.area);

                        area.appendChild(document.createElement('br'));

                        const ignoreHiddenTabs = createCheckBox('command_unloadOther_ignoreHiddenTabs', 'options_ignoreHiddenTabs');
                        area.appendChild(ignoreHiddenTabs.area);

                        area.appendChild(document.createElement('br'));

                        const wrapAround = createCheckBox('command_unloadOther_wrapAround', 'options_wrapAround');
                        area.appendChild(wrapAround.area);

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
            },

            headerMessage: 'options_Commands_Title',
            infoMessage: 'options_Commands_Info',

            resetButtonMessage: 'options_Commands_ResetButton',
            promptButtonMessage: 'options_Commands_PromptButton',
        });
        starters.createDisposable(() => {
            shortcutsInfo.update();
        });
        document.body.appendChild(shortcutsInfo.area);
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


        let showHiddenInTSTCheckbox = createCheckBox('tabHide_ShowHiddenTabsInTST', 'options_TabHide_ShowHiddenTabsInTST');
        section.content.appendChild(showHiddenInTSTCheckbox.area);


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
            ];
            check();
            return disposables;
        });
    }

    // #endregion Tab Hiding


    // #region Tab Restore Fix

    {
        let section = createCollapsableArea(sectionAnimationInfo);
        section.area.classList.add('standardFormat');
        section.title.classList.add('center');
        section.title.classList.add('enablable');
        document.body.appendChild(section.area);


        let header = document.createElement('div');
        header.classList.add(messagePrefix + 'options_TabRestoreFix_Header');
        section.title.appendChild(header);



        let deprecatedWarning = document.createElement('div');
        deprecatedWarning.classList.add(messagePrefix + 'options_TabRestoreFix_deprecatedWarning');
        section.content.appendChild(deprecatedWarning);

        section.content.appendChild(document.createElement('br'));



        let reloadBrokenTabsArea = document.createElement('div');
        reloadBrokenTabsArea.classList.add('area');
        section.content.appendChild(reloadBrokenTabsArea);

        let reloadBrokenTabs_info = document.createElement('div');
        reloadBrokenTabs_info.classList.add(messagePrefix + 'options_TabRestoreFix_reloadBrokenTabs');
        reloadBrokenTabsArea.appendChild(reloadBrokenTabs_info);


        reloadBrokenTabsArea.appendChild(document.createElement('br'));

        let reloadBrokenTabs_Normal = createCheckBox('fixTabRestore_reloadBrokenTabs', 'options_TabRestoreFix_reloadBrokenTabs_Normal');
        reloadBrokenTabsArea.appendChild(reloadBrokenTabs_Normal.area);
        reloadBrokenTabsArea.appendChild(document.createElement('br'));

        let reloadBrokenTabs_Private = createCheckBox('fixTabRestore_reloadBrokenTabs_private', 'options_TabRestoreFix_reloadBrokenTabs_Private');
        reloadBrokenTabsArea.appendChild(reloadBrokenTabs_Private.area);
        reloadBrokenTabsArea.appendChild(document.createElement('br'));


        reloadBrokenTabsArea.appendChild(document.createElement('br'));


        let quickUnloadArea = document.createElement('div');
        quickUnloadArea.classList.add('area');
        reloadBrokenTabsArea.appendChild(quickUnloadArea);

        let quickUnload_info = document.createElement('div');
        quickUnload_info.classList.add(messagePrefix + 'options_TabRestoreFix_reloadBrokenTabs_QuickUnload');
        quickUnloadArea.appendChild(quickUnload_info);


        quickUnloadArea.appendChild(document.createElement('br'));

        let quickUnload_Normal = createCheckBox('fixTabRestore_reloadBrokenTabs_quickUnload', 'options_TabRestoreFix_reloadBrokenTabs_QuickUnload_Normal');
        quickUnloadArea.appendChild(quickUnload_Normal.area);
        quickUnloadArea.appendChild(document.createElement('br'));

        let quickUnload_Private = createCheckBox('fixTabRestore_reloadBrokenTabs_private_quickUnload', 'options_TabRestoreFix_reloadBrokenTabs_QuickUnload_Private');
        quickUnloadArea.appendChild(quickUnload_Private.area);
        quickUnloadArea.appendChild(document.createElement('br'));





        section.content.appendChild(document.createElement('br'));
        section.content.appendChild(document.createElement('br'));


        let ensureLoadArea = document.createElement('div');
        ensureLoadArea.classList.add('ensureCorrectLoad');
        ensureLoadArea.classList.add('area');
        section.content.appendChild(ensureLoadArea);


        let waitForUrl = createNumberInput('options_TabRestoreFix_waitForUrlInMilliseconds', -1, true);
        waitForUrl.input.id = 'fixTabRestore_waitForUrlInMilliseconds';
        ensureLoadArea.appendChild(waitForUrl.area);


        ensureLoadArea.appendChild(document.createElement('br'));
        ensureLoadArea.appendChild(document.createElement('br'));


        let fixIncorrectLoadArea = document.createElement('div');
        fixIncorrectLoadArea.classList.add('area');
        ensureLoadArea.appendChild(fixIncorrectLoadArea);


        let waitForIncorrectLoad = createNumberInput('options_TabRestoreFix_waitForIncorrectLoad', -1, true);
        waitForIncorrectLoad.input.id = 'fixTabRestore_waitForIncorrectLoad';
        fixIncorrectLoadArea.appendChild(waitForIncorrectLoad.area);


        fixIncorrectLoadArea.appendChild(document.createElement('br'));
        fixIncorrectLoadArea.appendChild(document.createElement('br'));


        let fixIncorrectLoadAfter = createNumberInput('options_TabRestoreFix_fixIncorrectLoadAfter', -1, true);
        fixIncorrectLoadAfter.input.id = 'fixTabRestore_fixIncorrectLoadAfter';
        fixIncorrectLoadArea.appendChild(fixIncorrectLoadAfter.area);




        section.content.appendChild(document.createElement('br'));
        section.content.appendChild(document.createElement('br'));


        let permissionWarning = document.createElement('div');
        permissionWarning.classList.add(messagePrefix + 'options_TabRestoreFix_permissionWarning');
        section.content.appendChild(permissionWarning);




        let check = () => {
            let ensureLoadEnabled = waitForUrl.input.value >= 0;
            let enabled = ensureLoadEnabled || reloadBrokenTabs_Normal.checkbox.checked || reloadBrokenTabs_Private.checkbox.checked;
            toggleClass(section.title, 'enabled', enabled);
            toggleClass(ensureLoadArea, 'enabled', ensureLoadEnabled);
            toggleClass(section.title, 'error', enabled && !permissionsArea.checkControllerAvailable(permissionsArea.tabsPermissionController));

            toggleClass(fixIncorrectLoadAfter.area, 'disabled', ensureLoadEnabled && waitForIncorrectLoad.input.value < 0);

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

    {
        const optionalPermissionsArea = createCollapsableArea(sectionAnimationInfo);
        optionalPermissionsArea.area.classList.add('standardFormat');
        optionalPermissionsArea.title.classList.add('center');
        optionalPermissionsArea.title.classList.add('enablable');
        optionalPermissionsArea.content.classList.add('optionalPermissionArea');
        document.body.appendChild(optionalPermissionsArea.area);

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
        document.body.appendChild(privacyArea.area);
    }

    // #endregion Permissions


    // #region Other Options

    {
        let section = createCollapsableArea(sectionAnimationInfo);
        section.area.classList.add('standardFormat');
        section.title.classList.add('center');
        section.title.classList.add('enablable');
        document.body.appendChild(section.area);

        let header = document.createElement('div');
        header.classList.add(messagePrefix + 'options_OtherSettings_Header');
        section.title.appendChild(header);

        let area = document.createElement('div');
        area.classList.add('otherSettingsArea');
        section.content.appendChild(area);


        let unloadAgain = createNumberInput('options_unloadAgainAfterDelay', -1, true);
        unloadAgain.input.id = 'unloadAgainAfterDelay';
        area.appendChild(unloadAgain.area);


        area.appendChild(document.createElement('br'));


        let unloadViaAutoTabDiscard = createCheckBox('unloadViaAutoTabDiscard', '');
        {
            let { label } = unloadViaAutoTabDiscard;

            let prefix = document.createElement('text');
            prefix.classList.add(messagePrefix + 'options_unloadViaAutoTabDiscard_Prefix');
            label.appendChild(prefix);

            let url = document.createElement('a');
            url.classList.add(messagePrefix + 'options_unloadViaAutoTabDiscard_Name');
            url.href = browser.i18n.getMessage('options_unloadViaAutoTabDiscard_URL');
            label.appendChild(url);

            let suffix = document.createElement('text');
            suffix.classList.add(messagePrefix + 'options_unloadViaAutoTabDiscard_Suffix');
            label.appendChild(suffix);
        }
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
            toggleClass(section.title, 'enabled', unloadAgain.input.value >= 0 || disableOptionAnimations.checkbox.checked || unloadViaAutoTabDiscard.checkbox.checked || disableOptionsDarkTheme.checkbox.checked);
        };
        starters.createDisposable((delayed) => {
            checkSection();
            return [
                new EventListener(unloadAgain.input, 'input', checkSection),
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


    setTextMessages();
    await settingsTracker.start;
    starters.start();
}


initiatePage();
