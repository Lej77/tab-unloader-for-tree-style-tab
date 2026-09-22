
import {
    createPermissionsArea,
} from '../ui/common.js';

import {
    setTextMessages,
} from '../ui/utilities.js';


async function initiatePage() {
    const permissionsArea = createPermissionsArea({ standardSectionAnimationInfo: { standard: true, bodyImmediately: false } });
    document.body.appendChild(permissionsArea.area);

    try {
        document.title = browser.i18n.getMessage('permissionsPage_Title');
    } catch (error) {
        console.error('Failed to set tab title.\nError: ', error);
    }


    setTextMessages();
}


initiatePage();
