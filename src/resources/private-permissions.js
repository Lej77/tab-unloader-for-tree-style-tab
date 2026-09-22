
import {
    settings,
    settingsTracker,
} from '../common/common.js';

import {
    createPrivacyPermissionArea,
    createSectionAnimationInfo,
} from '../ui/common.js';

import {
    setTextMessages,
} from '../ui/utilities.js';

import {
    bindElementIdsToSettings,
} from '../ui/bind-settings.js';


async function initiatePage() {
    try {
        document.title = browser.i18n.getMessage('privatePermissionPage_Title');
    } catch (error) {
        console.error('Failed to set tab title.\nError: ', error);
    }

    const privacyArea = createPrivacyPermissionArea({ sectionAnimationInfo: createSectionAnimationInfo({ standard: true, bodyImmediately: false }) });
    privacyArea.section.setCollapsedWithoutAnimation(false);
    document.body.appendChild(privacyArea.area);

    setTextMessages();
    bindElementIdsToSettings(settings, {
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
}


initiatePage();
