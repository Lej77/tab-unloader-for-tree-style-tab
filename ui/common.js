
import {
    messageTypes,
    settings,
    settingsTracker,
} from '../common/common.js';

import {
    EventManager,
    EventListener,
} from '../common/events.js';

import {
    PortConnection,
} from '../common/connections.js';

import {
    TabHideManager,
} from '../common/hide-unloaded-tabs.js';

import {
    createOptionalPermissionArea,
} from '../ui/permissions.js';

import {
    createCollapsableArea,
    AnimationInfo,
} from '../ui/collapsable.js';

import {
    messagePrefix,
    toggleClass,
} from '../ui/utilities.js';

import {
    createCheckBox,
    createNumberInput,
} from '../ui/basic-components.js';

import {
    createStatusIndicator,
} from '../ui/status-indicator.js';


/**
 * @typedef {import('../ui/collapsable.js').AnimationDefinition} AnimationDefinition
 */
null;


/**
 * Create an animation and ensure its kept up to date when settings are changed.
 *
 * @param {AnimationDefinition} standardSectionAnimationInfo Standard definition for an animation.
 * @returns {AnimationInfo} A section animation.
 */
function createSectionAnimationInfo(standardSectionAnimationInfo) {
    const sectionAnimationInfo = new AnimationInfo();

    settingsTracker.start.then(() => {
        const animationUpdate = () => {
            try {
                if (settings.disableOptionsPageAnimations) {
                    sectionAnimationInfo.update({ reset: true });
                } else if (!standardSectionAnimationInfo) {
                    sectionAnimationInfo.update({ standard: true });
                } else {
                    sectionAnimationInfo.update(Object.assign({}, standardSectionAnimationInfo));
                }
            } catch (error) { }
        };
        new EventListener(settingsTracker.onChange, (changes) => {
            if (changes.disableOptionsPageAnimations) {
                animationUpdate();
            }
        });
        animationUpdate();
    });

    return sectionAnimationInfo;
}


// eslint-disable-next-line valid-jsdoc
/**
 * Create an area that informs about current privacy permissions configuration.
 *
 * @export
 * @param {Object} Params Parameters
 * @param {PortConnection} [Params.portConnection] Port to use for talking to background page.
 * @param {AnimationInfo} [Params.sectionAnimationInfo] Animation for section.
 * @param {AnimationDefinition} [Params.standardSectionAnimationInfo] Standard info when animation for section isn't provided.
 */
export function createPrivacyPermissionArea({ portConnection, sectionAnimationInfo = null, standardSectionAnimationInfo = null }) {
    if (!portConnection) {
        portConnection = new PortConnection();
    }
    if (!sectionAnimationInfo) {
        sectionAnimationInfo = createSectionAnimationInfo(standardSectionAnimationInfo);
    }

    const onHasErrorChanged = new EventManager();


    const section = createCollapsableArea(sectionAnimationInfo);
    section.area.classList.add('standardFormat');
    section.title.classList.add('center');
    section.title.classList.add('enablable');
    section.content.classList.add('privacyPermissionsArea');
    document.body.appendChild(section.area);

    const header = document.createElement('div');
    header.classList.add(messagePrefix + 'privacyPermissions_Header');
    section.title.appendChild(header);

    const infoText = document.createElement('div');
    infoText.classList.add(messagePrefix + 'privacyPermissions_Info');
    section.content.appendChild(infoText);


    section.content.appendChild(document.createElement('br'));

    const warnAboutMisconfiguration = createCheckBox('warnAboutMisconfiguredPrivacySettings', 'options_warnAboutMisconfiguredPrivacySettings');
    section.content.appendChild(warnAboutMisconfiguration.area);

    section.content.appendChild(document.createElement('br'));


    const statusArea = document.createElement('div');
    statusArea.classList.add('privacyPermissionsStatusArea');
    section.content.appendChild(statusArea);

    const hasPrivacyPermission = createStatusIndicator({
        headerMessage: 'privacyPermissions_hasPrivacyPermission_Header',
        enabledMessage: 'optionalPermissions_Granted',
        disabledMessage: 'optionalPermissions_NotGranted',
        errorMessage: 'privacyPermissions_hasPrivacyPermission_Error',
    });
    statusArea.appendChild(hasPrivacyPermission.area);

    const hasTreeStyleTabPermission = createStatusIndicator({
        headerMessage: 'privacyPermissions_hasTreeStyleTabPrivacyPermission_Header',
        enabledMessage: 'optionalPermissions_Granted',
        disabledMessage: 'optionalPermissions_NotGranted',
        errorMessage: 'privacyPermissions_hasTreeStyleTabPrivacyPermission_Error',
    });
    statusArea.appendChild(hasTreeStyleTabPermission.area);


    // Update UI based on permissions info:

    let latestInfo = null;
    let hasError = false;
    function check() {
        let foundIssue = false;
        if (latestInfo) {
            if (!latestInfo.hasPrivacyPermission && latestInfo.tstNotifiedAboutPrivateWindow) {
                // Not allowed in private windows
                foundIssue = true;
            }
            if (latestInfo.hasPrivacyPermission && latestInfo.tstPermission === false) {
                // Missing tst permission.
                foundIssue = true;
            }

            hasTreeStyleTabPermission.hasError = latestInfo.tstPermission === undefined;
            hasTreeStyleTabPermission.isEnabled = latestInfo.tstPermission === true || latestInfo.tstPermission === null;

            hasPrivacyPermission.isEnabled = latestInfo.hasPrivacyPermission;
            hasPrivacyPermission.hasError = !latestInfo.hasPrivacyPermission && !latestInfo.tstNotifiedAboutPrivateWindow;
        }
        if (foundIssue !== hasError) {
            hasError = foundIssue;
            onHasErrorChanged.fire();
        }
        toggleClass(section.title, 'enabled', hasError || (!latestInfo ? false : (latestInfo.hasPrivacyPermission && (latestInfo.tstPermission === true || latestInfo.tstPermission === null))));
        toggleClass(section.title, 'error', hasError);
    }


    // Get permissions info from background page:

    const permissionsEvent = portConnection.getEvent(messageTypes.privacyPermissionChanged);
    permissionsEvent.addListener(info => {
        latestInfo = info;
        check();
    });
    browser.runtime.sendMessage({ type: messageTypes.privacyPermission })
        .then(info => {
            latestInfo = info;
            check();
        })
        .catch(error => console.error('Failed to get privacy permissions info.\nError: ', error));


    return {
        area: section.area,
        section,
        get hasError() {
            return hasError;
        },
        onHasErrorChanged,
    };
}

// eslint-disable-next-line valid-jsdoc
/**
 * Create an area that controls optional permissions.
 *
 * @export
 * @param {Object} Params Parameters
 * @param {PortConnection} [Params.portConnection] Port to use for talking to background page.
 * @param {(permission: Object) => any} [Params.requestFailedCallback] Gets called if we fail to request a permission. (Mostly for legacy support, older Firefox required user interaction to update permissions but it didn't work on the options page.)
 * @param {AnimationInfo} [Params.sectionAnimationInfo] Animation for section.
 * @param {AnimationDefinition} [Params.standardSectionAnimationInfo] Standard info when animation for section isn't provided.
 */
export function createPermissionsArea({ portConnection, requestFailedCallback, sectionAnimationInfo = null, standardSectionAnimationInfo = null } = {}) {
    const area = document.createElement('div');

    let hasAnyPermissions = false;
    let hasAnyError = false;
    const onHasAnyChanged = new EventManager();
    const onControllerChanged = new EventManager();

    const permissionControllers = [];
    const controllersErrorLookup = new Map();
    if (!portConnection) {
        portConnection = new PortConnection();
    }
    if (!sectionAnimationInfo) {
        sectionAnimationInfo = createSectionAnimationInfo(standardSectionAnimationInfo);
    }
    const pagePermissionChanged = portConnection.getEvent(messageTypes.permissionsChanged);
    const tabHideAPIChanged = portConnection.getEvent(messageTypes.tabHideAPIChanged);


    const areaDetails = {
        requestViaBrowserActionCallback: (permission) => {
            if (requestFailedCallback && typeof requestFailedCallback === 'function') {
                requestFailedCallback(permission);
            }
        },
        permissionChangedCallback: (obj, internalChange = false) => {
            if (internalChange) {
                browser.runtime.sendMessage({ type: messageTypes.permissionsChanged, permission: obj.permission, value: obj.hasPermission });
            }
            const enabledControllers = permissionControllers.filter(controller => controller.hasPermission);
            const newHasAnyPermission = enabledControllers.length > 0;
            const newHasError = enabledControllers.some(c => controllersErrorLookup.get(c));
            if (hasAnyPermissions !== newHasAnyPermission) {
                hasAnyPermissions = newHasAnyPermission;
                onHasAnyChanged.fire();
            }
            if (hasAnyError !== newHasError) {
                hasAnyError = newHasError;
                onHasAnyChanged.fire();
            }
            onControllerChanged.fire(obj);
        },
        onPermissionChanged: pagePermissionChanged,
        sectionAnimationInfo: sectionAnimationInfo,
        browserActionPromptMessage: 'optionalPermissions_BrowserActionPrompt',
    };

    const createPermissionButtonArea = function (permission, titleMessage, explanationMessage) {
        const obj = createOptionalPermissionArea(Object.assign(areaDetails, { permission, titleMessage, explanationMessage }));
        permissionControllers.push(obj);
        area.appendChild(obj.area);
        return obj;
    };

    const hidePermission = createPermissionButtonArea({ permissions: ['tabHide'] }, 'optionalPermissions_TabHide_Title', 'optionalPermissions_TabHide_Explanation');

    const tabsPermission = createPermissionButtonArea({ permissions: ['tabs'] }, 'optionalPermissions_Tabs_Title', 'optionalPermissions_Tabs_Explanation');

    // #region Tab Hide API Enabled

    {
        hidePermission.section.content.appendChild(document.createElement('br'));

        const statusArea = document.createElement('div');
        statusArea.classList.add('tabHideAPIStatusArea');
        hidePermission.section.content.appendChild(statusArea);

        const checkButton = document.createElement('button');
        checkButton.classList.add('checkTabHideAPIStatusButton');
        checkButton.classList.add(messagePrefix + 'optionalPermissions_TabHide_APIEnabled_Check');
        statusArea.appendChild(checkButton);

        const indicator = createStatusIndicator({
            headerMessage: 'optionalPermissions_TabHide_APIEnabled_Header',
            enabledMessage: 'optionalPermissions_TabHide_APIEnabled_Enabled',
            disabledMessage: 'optionalPermissions_TabHide_APIEnabled_Disabled',
            errorMessage: 'optionalPermissions_TabHide_APIEnabled_Error',
        });
        indicator.area.classList.add('tabHideEnabledIndicator');
        statusArea.appendChild(indicator.area);

        let tabHideEnabled = false;
        const checkTabHideEnabled = async (first = false) => {
            let enabled = false;
            if (hidePermission.hasPermission) {
                enabled = await TabHideManager.checkAPIEnabled();
            }
            indicator.hasError = !hidePermission.hasPermission;

            if (tabHideEnabled !== enabled || first) {
                tabHideEnabled = enabled;
                controllersErrorLookup.set(hidePermission, !enabled);
                toggleClass(hidePermission.section.title, 'error', !enabled);
                indicator.isEnabled = enabled;
                areaDetails.permissionChangedCallback(hidePermission);
                browser.runtime.sendMessage({ type: messageTypes.tabHideAPIChanged, value: enabled });
            }
        };
        checkTabHideEnabled(true);
        hidePermission.onClick.addListener(() => checkTabHideEnabled());
        onControllerChanged.addListener(() => checkTabHideEnabled());
        checkButton.addEventListener('click', (e) => checkTabHideEnabled());
        tabHideAPIChanged.addListener((enabled, tabId) => checkTabHideEnabled());
    }

    // #endregion Tab Hide API Enabled


    const obj = {
        area: area,

        tabHidePermissionController: hidePermission,
        tabsPermissionController: tabsPermission,

        checkControllerError: (controller) => Boolean(controllersErrorLookup.get(controller)),
        checkControllerAvailable: (controller) => Boolean(controller && controller.hasPermission && !obj.checkControllerError(controller)),

        onHasAnyValueChanged: onHasAnyChanged.subscriber,
        onControllerValueChanged: onControllerChanged.subscriber,

        get hasAnyPermissions() {
            return hasAnyPermissions;
        },
        get hasAnyError() {
            return hasAnyError;
        },
    };
    return obj;
}


export function createMouseClickArea(combo, sectionAnimationInfo = {}) {

    // #region MouseClickCombo Object

    const obj = combo;
    const info = combo.info;
    const messages = info.messages;

    const settingsLoadedEvent = new EventManager();

    const bindCheckboxToObj = (checkbox, key, callback) => bindElementToObj(checkbox, 'checked', key, callback);
    const bindElementToObj = (element, property, key, callback) => {
        const callbackWrapper = (value) => {
            if (callback && typeof callback === "function") {
                callback(value);
            }
        };
        const listener = new EventListener(settingsLoadedEvent.subscriber, () => {
            element[property] = obj[key];
            callbackWrapper(element[property]);
        });
        element.addEventListener("input", e => {
            obj[key] = e.target[property];
            callbackWrapper(e.target[property]);
        });
        callbackWrapper(element[property]);
    };

    // #endregion MouseClickCombo Object


    const section = createCollapsableArea(sectionAnimationInfo);
    section.area.classList.add('standardFormat');
    section.title.classList.add('center');
    section.title.classList.add('enablable');


    const area = document.createElement('div');
    area.classList.add('mouseClickArea');
    area.classList.add('enabled');
    section.content.appendChild(area);


    const header = document.createElement('div');
    header.classList.add(messagePrefix + messages.enable + '_Title');
    section.title.appendChild(header);


    // #region Mouse Click

    const mouseButton = createCheckBox(null, messages.enable);
    bindCheckboxToObj(mouseButton.checkbox, 'enabled',
        (checked) => {
            toggleClass(area, 'enabled', checked);
            toggleClass(section.title, 'enabled', checked);
        }
    );
    area.appendChild(mouseButton.area);

    // #endregion Mouse Click


    // #region Modifier Keys

    const modArea = document.createElement('div');
    modArea.classList.add('modifierKeysArea');
    modArea.classList.add('area');
    modArea.classList.add('enabled');
    area.appendChild(modArea);


    const modifierKeysInfo = document.createElement('label');
    modifierKeysInfo.classList.add(messagePrefix + 'options_modifierKeysInfo');
    modArea.appendChild(modifierKeysInfo);


    modArea.appendChild(document.createElement('br'));


    const createModifierKey = (mod, message) => {
        const modCheckbox = createCheckBox(null, message);
        bindCheckboxToObj(modCheckbox.checkbox, mod);
        modArea.appendChild(modCheckbox.area);
    };

    const messageModPrefix = 'options_modifierKey_';
    for (const mod of ['ctrl', 'shift', 'alt', 'meta']) {
        createModifierKey(mod, messageModPrefix + mod.charAt(0).toUpperCase() + mod.slice(1));
    }


    modArea.appendChild(document.createElement('br'));


    const modAnyMode = createCheckBox(null, 'options_modifierKeysAnyMode');
    bindCheckboxToObj(modAnyMode.checkbox, 'anyKeyMode');
    modArea.appendChild(modAnyMode.area);

    // #endregion Modifier Keys


    // #region Click duration

    const timeoutArea = document.createElement('div');
    timeoutArea.classList.add('clickDurationArea');
    timeoutArea.classList.add('area');
    timeoutArea.classList.add('enabled');
    area.appendChild(timeoutArea);


    const timeoutInfo = document.createElement('text');
    timeoutInfo.classList.add(messagePrefix + 'options_clickTimeoutInfo');
    timeoutArea.appendChild(timeoutInfo);


    const maxTimeoutArea = createNumberInput('options_clickTimeoutMax', 0, true);
    maxTimeoutArea.area.classList.add('timeout');
    bindElementToObj(maxTimeoutArea.input, 'value', 'maxTimeout');
    timeoutArea.appendChild(maxTimeoutArea.area);


    const minTimeoutArea = createNumberInput('options_clickTimeoutMin', 0, true);
    minTimeoutArea.area.classList.add('timeout');
    bindElementToObj(minTimeoutArea.input, 'value', 'minTimeout');
    timeoutArea.appendChild(minTimeoutArea.area);

    // #endregion Click duration


    // #region Double Clicks

    const doubleClickArea = document.createElement('div');
    doubleClickArea.classList.add('doubleClickArea');
    doubleClickArea.classList.add('area');
    doubleClickArea.classList.add('enabled');
    area.appendChild(doubleClickArea);


    const doubleClickEnabled = createCheckBox(null, 'options_doubleClick_enabled');
    bindCheckboxToObj(doubleClickEnabled.checkbox, 'doubleClickEnabled',
        (checked) => {
            toggleClass(doubleClickArea, 'enabled', checked);
        }
    );
    doubleClickArea.appendChild(doubleClickEnabled.area);


    doubleClickArea.appendChild(document.createElement('br'));


    const doubleClickOnly = createCheckBox(null, 'options_doubleClick_only');
    bindCheckboxToObj(doubleClickOnly.checkbox, 'doubleClickOnly');
    doubleClickArea.appendChild(doubleClickOnly.area);


    doubleClickArea.appendChild(document.createElement('br'));


    const doubleClickTimeout = createNumberInput('options_doubleClick_timeout', 1, true);
    doubleClickTimeout.area.classList.add('timeout');
    bindElementToObj(doubleClickTimeout.input, 'value', 'doubleClickTimeout');
    doubleClickArea.appendChild(doubleClickTimeout.area);

    // #endregion Double Clicks


    // #region Drag and Drop

    if (info.allowDragDrop) {
        const dragDropArea = document.createElement('div');
        dragDropArea.classList.add('dragAndDropArea');
        dragDropArea.classList.add('area');
        dragDropArea.classList.add('enabled');
        area.appendChild(dragDropArea);


        const dragDropEnabled = createCheckBox(null, 'options_onDrag_enabled');
        bindCheckboxToObj(dragDropEnabled.checkbox, 'onDragEnabled',
            (checked) => {
                toggleClass(dragDropArea, 'enabled', checked);
            }
        );
        dragDropArea.appendChild(dragDropEnabled.area);


        dragDropArea.appendChild(document.createElement('br'));


        const cancelOnDrag = createCheckBox(null, 'options_onDrag_cancel');
        bindCheckboxToObj(cancelOnDrag.checkbox, 'onDragCancel');
        dragDropArea.appendChild(cancelOnDrag.area);


        dragDropArea.appendChild(document.createElement('br'));


        const onDragMouseUpTigger = createCheckBox(null, 'options_onDrag_mouseUpTigger');
        bindCheckboxToObj(onDragMouseUpTigger.checkbox, 'onDragMouseUpTrigger');
        dragDropArea.appendChild(onDragMouseUpTigger.area);


        dragDropArea.appendChild(document.createElement('br'));
        dragDropArea.appendChild(document.createElement('br'));


        const onDragModern_PreventDragAndDrop = createCheckBox(null, 'options_onDrag_Modern_PreventDragAndDrop');
        const onDragModern = createCheckBox(null, 'options_onDrag_Modern');
        bindCheckboxToObj(onDragModern.checkbox, 'onDragModern', (checked) => {
            toggleClass(onDragModern_PreventDragAndDrop.area, 'disabled', !checked);
        });
        dragDropArea.appendChild(onDragModern.area);


        dragDropArea.appendChild(document.createElement('br'));


        bindCheckboxToObj(onDragModern_PreventDragAndDrop.checkbox, 'onDragModern_PreventDragAndDrop');
        dragDropArea.appendChild(onDragModern_PreventDragAndDrop.area);


        dragDropArea.appendChild(document.createElement('br'));


        const onDragTimeout = createNumberInput('options_onDrag_timeout', 1, true);
        onDragTimeout.area.classList.add('timeout');
        bindElementToObj(onDragTimeout.input, 'value', 'onDragTimeout');
        dragDropArea.appendChild(onDragTimeout.area);
    }

    // #endregion Drag and Drop


    // #region Allow for all tabs

    if (info.allowForAll) {
        const allowArea = document.createElement('div');
        allowArea.classList.add('loadedUnloadedArea');
        allowArea.classList.add('area');
        allowArea.classList.add('enabled');
        area.appendChild(allowArea);


        const applyToAllTabs = createCheckBox(null, 'options_applyToAll');
        bindCheckboxToObj(applyToAllTabs.checkbox, 'applyToAllTabs',
            (checked) => {
                toggleClass(allowArea, 'enabled', !checked);
            }
        );
        allowArea.appendChild(applyToAllTabs.area);
        allowArea.appendChild(document.createElement('br'));


        const applyToUnloadedTabs = createCheckBox(null, 'options_applyToUnloadedTabs');
        bindCheckboxToObj(applyToUnloadedTabs.checkbox, 'applyToUnloadedTabs');
        allowArea.appendChild(applyToUnloadedTabs.area);
    }

    // #endregion Allow for all tabs


    // #region Effect modifiers

    if (!info.dontUnload) {
        const effectModifiersArea = document.createElement('div');
        effectModifiersArea.classList.add('area');
        effectModifiersArea.classList.add('enabled');
        area.appendChild(effectModifiersArea);

        const applyToTstTree = createCheckBox(null, 'options_applyToTstTree');
        bindCheckboxToObj(applyToTstTree.checkbox, 'applyToTstTree');
        effectModifiersArea.appendChild(applyToTstTree.area);

        effectModifiersArea.appendChild(document.createElement('br'));
        effectModifiersArea.appendChild(document.createElement('br'));

        const fallbackToLastSelected = createCheckBox(null, 'options_fallbackToLastSelected');
        bindCheckboxToObj(fallbackToLastSelected.checkbox, 'fallbackToLastSelected');
        effectModifiersArea.appendChild(fallbackToLastSelected.area);

        effectModifiersArea.appendChild(document.createElement('br'));

        const ignoreHiddenTabs = createCheckBox(null, 'options_ignoreHiddenTabs');
        bindCheckboxToObj(ignoreHiddenTabs.checkbox, 'ignoreHiddenTabs');
        effectModifiersArea.appendChild(ignoreHiddenTabs.area);

        effectModifiersArea.appendChild(document.createElement('br'));

        const wrapAround = createCheckBox(null, 'options_wrapAround');
        bindCheckboxToObj(wrapAround.checkbox, 'wrapAround');
        effectModifiersArea.appendChild(wrapAround.area);

        effectModifiersArea.appendChild(document.createElement('br'));
    }

    // #endregion Effect modifiers


    // #region Prevent Tree Style Tab Default Action

    if (!info.allwaysPreventTSTAction) {
        const dontPreventTSTAction = createCheckBox(null, 'options_dontPreventTSTAction');
        bindCheckboxToObj(dontPreventTSTAction.checkbox, 'dontPreventTSTAction');
        area.appendChild(dontPreventTSTAction.area);
        area.appendChild(document.createElement('br'));
    }

    // #endregion Prevent Tree Style Tab Default Action


    return { area: section.area, section: section, combo: obj, settingsLoaded: settingsLoadedEvent, settingKey: combo.info.settingKey };
}
