

import {
    EventManager,
} from '../common/events.js';

import {
    createCollapsableArea
} from '../ui/collapsable.js';

import {
    messagePrefix,
    toggleClass,
} from '../ui/utilities.js';

import {
    createStatusIndicator
} from '../ui/status-indicator.js';

import {
    createCheckBox
} from '../ui/basic-components.js';


/**
 * @typedef {import('../ui/collapsable.js').AnimationInfo} AnimationInfo
 */
null;

/**
 * @typedef {import('../tree-style-tab/check-privacy-permissions.js').TSTPrivacyInfo} TSTPrivacyInfo
 */
null;


// eslint-disable-next-line valid-jsdoc
/**
 * Create an area that informs about current privacy permissions configuration.
 *
 * @export
 * @param {Object} Params Parameters
 * @param {AnimationInfo} [Params.sectionAnimationInfo] Animation for section.
 * @param {string} Params.titleMessage i18n message to show in the header of created permissions section.
 * @param {string} Params.infoMessage i18n message to show first inside the created permissions section.
 * @param {string} Params.warnAboutMisconfigurationSettingsKey Settings key to store a `boolean` into based on "show warning" checkbox.
 * @param {string} Params.warnAboutMisconfigurationMessage i18n message to show for "show warning" checkbox.
 * @param {string} Params.firefoxPrivacy_header_message i18n message to show for privacy permission status indicator.
 * @param {string} Params.firefoxPrivacy_error_message i18n message to show for privacy permission status indicator.
 * @param {string} Params.tstPrivacy_header_message i18n message to show for privacy permission status indicator.
 * @param {string} Params.tstPrivacy_error_message i18n message to show for privacy permission status indicator.
 * @param {string} Params.permissionGranted_message i18n message to show for privacy permission status indicator.
 * @param {string} Params.permissionDenied_message i18n message to show for privacy permission status indicator.
 */
export function createPrivacyPermissionArea({
    sectionAnimationInfo = null,
    titleMessage,
    infoMessage,
    warnAboutMisconfigurationSettingsKey,
    warnAboutMisconfigurationMessage,
    firefoxPrivacy_header_message,
    firefoxPrivacy_error_message,
    tstPrivacy_header_message,
    tstPrivacy_error_message,
    permissionGranted_message,
    permissionDenied_message,
}) {

    const onHasErrorChanged = new EventManager();


    const section = createCollapsableArea(sectionAnimationInfo);
    section.area.classList.add('standardFormat');
    section.title.classList.add('center');
    section.title.classList.add('enablable');
    section.content.classList.add('privacyPermissionsArea');
    document.body.appendChild(section.area);

    const header = document.createElement('div');
    header.classList.add(messagePrefix + titleMessage);
    section.title.appendChild(header);

    const infoText = document.createElement('div');
    infoText.classList.add(messagePrefix + infoMessage);
    section.content.appendChild(infoText);


    section.content.appendChild(document.createElement('br'));

    const warnAboutMisconfiguration = createCheckBox(warnAboutMisconfigurationSettingsKey, warnAboutMisconfigurationMessage);
    section.content.appendChild(warnAboutMisconfiguration.area);

    section.content.appendChild(document.createElement('br'));


    const statusArea = document.createElement('div');
    statusArea.classList.add('privacyPermissionsStatusArea');
    section.content.appendChild(statusArea);

    const hasPrivacyPermission = createStatusIndicator({
        headerMessage: firefoxPrivacy_header_message,
        enabledMessage: permissionGranted_message,
        disabledMessage: permissionDenied_message,
        errorMessage: firefoxPrivacy_error_message,
    });
    statusArea.appendChild(hasPrivacyPermission.area);

    const hasTreeStyleTabPermission = createStatusIndicator({
        headerMessage: tstPrivacy_header_message,
        enabledMessage: permissionGranted_message,
        disabledMessage: permissionDenied_message,
        errorMessage: tstPrivacy_error_message,
    });
    statusArea.appendChild(hasTreeStyleTabPermission.area);


    // Update UI based on permissions info:

    /** @type {null | TSTPrivacyInfo} */
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



    return {
        area: section.area,
        section,
        /** `true` if privacy issues are misconfigured. */
        get hasError() {
            return hasError;
        },
        /**
         * Update UI with new privacy info.
         *
         * @param {TSTPrivacyInfo} info Privacy info.
         */
        providePrivacyInfo(info) {
            latestInfo = info;
            check();
        },
        onHasErrorChanged,
    };
}
