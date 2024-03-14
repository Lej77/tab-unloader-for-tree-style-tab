
import {
    EventManager
} from '../common/events.js';

import {
    deepCopyCompare
} from '../common/utilities.js';


/**
 * @typedef {object} TSTPrivacyInfo
 * @property {boolean} hasPrivacyPermission `true` if this addon is allowed
 * access to private windows. `false` if the addon isn't allowed or if the
 * addon's permission status isn't known.
 * @property {boolean} tstNotifiedAboutPrivateWindow Tree Style Tab has somehow
 * notified this addon about the existence of a private window. This means that:
 * - TST is allowed to message this addon about private windows.
 * - A private window has existed while this addon was running.
 * @property {undefined | null | boolean} tstPermission Indicates if this addon
 * is allowed to get information about private windows from Tree Style Tab.
 *
 * Possible values:
 *
 * - `undefined` if not registered with Tree Style Tab.
 * - `null` if Tree Style Tab didn't give us any information about private
 *   permissions. This likely means that a legacy version of Tree Style Tab is
 *   installed (TST 3.0.11 and older).
 * - `true` if TST promises to allow information about private windows.
 * - `false` if TST claims to not allow information about private windows.
 */

/**
 * @typedef {object} GetPrivacyInfoParams
 * @property {import('../common/private-permission-detector').PrivatePermissionDetector} [detector] A detector for private windows.
 * @property {import('./register.js').TSTManager} [tstManager] A class that handles registering with Tree Style Tab.
 * @property {boolean} [tstNotifiedAboutPrivateWindow] `true` if Tree Style Tab ever informed us about a private window (via a message or something similar).
 */


export class TSTPrivacyPermissionChecker {
    constructor() {
        /** @type { {close: () => Promise<void>, } | null} The tab id for the popup that informs the user about misconfigured privacy settings. */
        this._privacyPopupInfo = null;
        this._haveWarnedAboutPrivacyPermissions = false;
        this._haveHadTstPrivacyPermission = false;

        /** @type {boolean} `true` if an issue with the current privacy permissions were found. */
        this._foundIssue = false;
        /** @type {boolean} Automatically update the popup window state when new info is provided. */
        this._autoUpdatePopup = true;

        /** @type {string} The URL to open in the popup window to warn about misconfigured privacy permissions. */
        this.popupUrl = browser.runtime.getURL('resources/private-permissions.html');

        /** @type {TSTPrivacyInfo | null} */
        this._previousPrivacyInfo = null;
        /** @type {EventManager<[TSTPrivacyInfo], void, void>} */
        this._onPrivacyInfoChanged = new EventManager();
    }

    /**
     * Determine information related to Tree Style Tab's privacy permissions.
     *
     * @static
     * @param {GetPrivacyInfoParams} Params Options
     * @returns {TSTPrivacyInfo} Information about Tree Style Tab's privacy permissions.
     * @memberof TSTPrivacyPermissionChecker
     */
    static createInfo({ detector, tstManager, tstNotifiedAboutPrivateWindow }) {
        return {
            hasPrivacyPermission: detector ? detector.hasPermission : false,
            tstNotifiedAboutPrivateWindow: Boolean(tstNotifiedAboutPrivateWindow),
            tstPermission:
                !tstManager ?
                    /* No TST registration manager: */ undefined :
                    (tstManager.trackedPermissions ?
                    /* Known for certain (boolean): */ tstManager.trackedPermissions.privateWindowAllowed :
                        (tstManager.isRegistered ?
                        /* Legacy?: */ null :
                        /* Unregistered: */ undefined
                        )
                    ),
        };
    }

    /**
     * Provide new info.
     *
     * @param {TSTPrivacyInfo} privacyInfo The new info.
     * @memberof TSTPrivacyPermissionChecker
     */
    provideInfo(privacyInfo) {
        if (this._previousPrivacyInfo && deepCopyCompare(this._previousPrivacyInfo, privacyInfo)) {
            // No change.
            return;
        }
        this._previousPrivacyInfo = privacyInfo;
        this._check(privacyInfo);

        this._onPrivacyInfoChanged.fire(privacyInfo);

        if (this.autoUpdatePopup) {
            this.updatePopup();
        }
    }

    /** `true` if the privacy permissions were misconfigured. */
    get foundIssue() {
        return this._foundIssue;
    }

    /** The latest info that was provided. */
    get latestInfo() {
        return this._previousPrivacyInfo;
    }
    /** Event that is sent every time some new info (that is different from the
     * previous info) is provided. */
    get onPrivacyInfoChanged() {
        return this._onPrivacyInfoChanged.subscriber;
    }

    /**
     * @type {boolean} Automatically update the popup window state when new info
     * is provided.
     *
     * Note: changing this from `false` to `true` will update the popup's state.
     */
    get autoUpdatePopup() {
        return this._autoUpdatePopup;
    }
    set autoUpdatePopup(value) {
        value = Boolean(value);
        if (this._autoUpdatePopup === value) return;

        this._autoUpdatePopup = value;
        if (value) {
            this.updatePopup();
        }
    }

    /**
     * Check for issues with new info.
     *
     * @param {TSTPrivacyInfo} info The new info.
     * @memberof TSTPrivacyPermissionChecker
     */
    _check(info) {
        let foundIssue = false;

        if (info.tstNotifiedAboutPrivateWindow && !info.hasPrivacyPermission) {
            // Extension isn't granted permission to access private windows.
            // We can only know this after a private window has been opened and the user tried to interact with it via Tree Style Tab.
            foundIssue = true;
        }
        if (info.hasPrivacyPermission && info.tstPermission === false) {
            // Extension is granted permission to private windows but Tree Style Tab won't send notifications about them.

            if (this._haveHadTstPrivacyPermission) {
                // The user probably just removed the permission for Tree Style Tab to send notifications for private windows.
                // Don't warn about this since the user is obviously aware that Tree Style Tab has permissions.
            } else {
                foundIssue = true;
            }
        }
        if (info.tstPermission === true) {
            // Don't warn if the user later removes this permission.
            this._haveHadTstPrivacyPermission = true;
        }


        if (this._foundIssue !== foundIssue) {
            this._foundIssue = foundIssue;
        }
    }

    updatePopup() {
        if (!this._foundIssue) {
            // No privacy configuration issues could be detected.
            if (this._privacyPopupInfo != null) {
                // Close the popup => the user probably fixed their issues.
                this._privacyPopupInfo.close();
                this._privacyPopupInfo = null;
            }
            return;
        }

        // Don't open the popup more than once.
        if (this._haveWarnedAboutPrivacyPermissions) return;

        (async () => {
            const info = {
                window: null,
                _isClosed: false,
                async close() {
                    try {
                        if (this.window === null) {
                            // Window is still being opened.
                            return;
                        }

                        // Ensure we only try to close once:
                        if (this._isClosed) return;
                        this._isClosed = true;

                        /** @type {any[]} */
                        const query = await browser.tabs.query({ windowId: this.window.id });
                        if (query.length <= 1) {
                            // Close window
                            await browser.windows.remove(this.window.id);
                        } else {
                            // Avoid closing user tabs => only close the tab with the warning message.
                            const warningTab = this.window.tabs[0];
                            await browser.tabs.remove(warningTab.id);
                        }
                    } catch (error) {
                        console.warn('Failed to close misconfigured privacy permissions popup.\nError: ', error);
                    }
                }
            };
            try {
                if (this._privacyPopupInfo != null) {
                    // Already have a popup open.
                    return;
                }
                this._privacyPopupInfo = info;
                this._haveWarnedAboutPrivacyPermissions = true;

                info.window = await browser.windows.create({
                    type: 'popup',
                    url: this.popupUrl,
                });
            } catch (error) {
                console.error('Failed to open popup to warn about misconfigured privacy permissions.\nError: ', error);
            } finally {
                if (info !== this._privacyPopupInfo) {
                    // A new popup has been opened or this one has already been closed.
                    info.close();
                }
            }
        })();
    }
}
