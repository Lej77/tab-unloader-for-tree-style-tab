'use strict';


/**
 * Detects if this extension has access to private windows.
 *
 * @class PrivateWindowDetector
 */
export class PrivatePermissionDetector {
    constructor() {
        this._onCreatedCallback = this._onWindowCreated.bind(this);
        this.hasPermission = false;
        this._isDisposed = false;

        browser.windows.onCreated.addListener(this._onCreatedCallback);
        browser.windows.getAll().then((windows) => {
            for (const window of windows) {
                this._onWindowCreated(window);
            }
        }).catch(error => console.error('Failed to get windows from Firefox.\nError:\n', error));
    }

    _onWindowCreated(window) {
        if (window.incognito) {
            this.hasPermission = true;
            this.dispose();
        }
    }

    dispose() {
        if (this.isDisposed) return;
        browser.windows.onCreated.removeListener(this._onCreatedCallback);
        this._isDisposed = true;
    }
    get isDisposed() {
        return this._isDisposed;
    }
}