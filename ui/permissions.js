'use strict';

import {
  defineProperty
} from '../common/utilities.js';

import {
  EventListener,
  EventManager,
} from '../common/events.js';

import {
  DisposableCollection
} from '../common/disposables.js';

import {
  messagePrefix,
  toggleClass,
} from '../ui/utilities.js';

import {
  toggleInfoPrompt,
  isScreenBlockerActive
} from '../ui/screen-blocks.js';

import {
  createStatusIndicator
} from '../ui/status-indicator.js';

import {
  createCollapsableArea
} from '../ui/collapsable.js';
import { delay } from '../common/delays.js';


/** @typedef {import('../ui/collapsable.js').AnimationDefinition} AnimationDefinition */
/** @typedef {import('../ui/collapsable.js').AnimationInfo} AnimationInfo */
/**
 * @template T
 * @typedef {import('../common/events.js').EventSubscriber<T>} EventSubscriber
 */


/**
 * A WebExtension `permissions.Permissions` object.
 *
 * @typedef {Object} WebExtPermission
 * @property {string[]} [Info.origins] An array of match patterns, representing host permissions.
 * @property {string[]} [Info.permissions] An array of named permissions, including API permissions and clipboard permissions.
 */


// eslint-disable-next-line valid-jsdoc
/**
 * Create a UI section that handles granting and removing an optional permission.
 *
 * @export
 * @param {Object} Config Configure the created UI element.
 * @param {WebExtPermission} Config.permission A WebExtension `permissions.Permissions` object.
 * @param {string} Config.titleMessage i18n message to show in the header of created permissions section.
 * @param {string} Config.explanationMessage i18n message with explanation about the current permission.
 * @param {null | function(typeof obj, boolean): any} [Config.permissionChangedCallback] A callback that is invoked when the UI might have been updated. The second argument will be `true` if the update was caused by the user pressing a button.
 * @param {null | EventSubscriber<any[]>} [Config.onPermissionChanged] An event that is invoked whenever it is possible that a permission has been changed. This will cause the UI element to re-check if it is enabled.
 * @param {null | function(null | WebExtPermission): Promise} [Config.requestViaBrowserActionCallback] A callback that handles requesting a permission via an alternative approach to calling the web extension API directly. This will be called with the permission that should be requested or `null` if the request should be canceled.
 * @param {AnimationDefinition | AnimationInfo} [Config.sectionAnimationInfo = {}] An animation object that defines and possibly controls the animation for the created section.
 * @param {null | string} Config.browserActionPromptMessage i18n message to show in prompt while waiting for a call `requestViaBrowserActionCallback` to complete. If `null` no message will be shown and it won't be possible to cancel the action.
 * @returns {typeof obj} An object with info about and control over the created UI elements.
 */
export function createOptionalPermissionArea({
  permission,
  titleMessage,
  explanationMessage,
  permissionChangedCallback = null,
  onPermissionChanged = null,
  requestViaBrowserActionCallback,
  sectionAnimationInfo = {},
  browserActionPromptMessage = null,
}) {
  const obj = {};
  let hasPermission = false;
  let hasError = false;

  /** @type {EventManager<[boolean]>} */
  const onClick = new EventManager();
  /** @type {EventManager<[typeof obj, boolean]> } */
  const onHasPermissionChanged = new EventManager();
  onHasPermissionChanged.addListener(permissionChangedCallback);

  const section = createCollapsableArea(sectionAnimationInfo);
  section.area.classList.add('standardFormat');
  section.area.classList.add('permissionController');
  section.title.classList.add('noFontChanges');
  section.title.classList.add('enablable');


  const manageArea = document.createElement('div');
  manageArea.classList.add('manageArea');
  manageArea.classList.add('preventOpen');
  section.title.appendChild(manageArea);

  const requestButton = document.createElement('button');
  requestButton.classList.add(messagePrefix + 'optionalPermissions_Request');
  manageArea.appendChild(requestButton);

  const removeButton = document.createElement('button');
  removeButton.classList.add(messagePrefix + 'optionalPermissions_Remove');
  manageArea.appendChild(removeButton);


  const permissionHeader = document.createElement('div');
  permissionHeader.classList.add('permissionHeader');
  if (titleMessage) {
    permissionHeader.classList.add(messagePrefix + titleMessage);
  }
  section.title.appendChild(permissionHeader);


  const permissionIndicator = createStatusIndicator({
    headerMessage: 'optionalPermissions_Available',
    enabledMessage: 'optionalPermissions_Granted',
    disabledMessage: 'optionalPermissions_NotGranted',
    newLine: false,
    standardFormat: false,
    fill: true,
  });
  permissionIndicator.area.classList.add('permissionIndicator');
  section.title.appendChild(permissionIndicator.area);


  const explanation = document.createElement('div');
  if (explanationMessage) {
    explanation.classList.add(messagePrefix + explanationMessage);
  }
  explanation.classList.add('textSelectable');
  section.content.appendChild(explanation);

  const updateUI = () => {
    toggleClass(section.area, 'granted', hasPermission);
    toggleClass(section.title, 'enabled', hasPermission || hasError);
    toggleClass(section.title, 'error', hasError);
  };

  const permissionChanged = (modifiedPermission = false) => {
    permissionIndicator.isEnabled = hasPermission;
    updateUI();

    onHasPermissionChanged.fire(obj, modifiedPermission);
  };

  const start = async () => {
    try {
      hasPermission = await browser.permissions.contains(permission);
    } catch (error) {
      console.error('Failed to check status of permission: ', permission, '\nError: ', error);
      obj.hasError = true;
    }
    permissionChanged();

    const handleButtonClick = async (e) => {
      const wantedState = e.target === requestButton;
      onClick.fire(wantedState);
      checkPermission();
      try {
        const firstAttemptTime = Date.now();
        let attemptWithBrowserAction = false;
        try {
          if (wantedState) {
            const granted = await browser.permissions.request(permission);
          } else {
            const removed = await browser.permissions.remove(permission);
          }
        } catch (error) {
          // Failed to request permission from this page! Try via browser action:
          attemptWithBrowserAction = true;
        }
        if (!attemptWithBrowserAction && wantedState && wantedState !== hasPermission) {
          const attemptDuration = Date.now() - firstAttemptTime;
          if (attemptDuration < 50) {
            // The prompt was probably never shown to the user and the `browser.permissions` API silently failed. Try via the an alternative approach instead:
            attemptWithBrowserAction = true;
          }
        }
        if (wantedState && attemptWithBrowserAction && requestViaBrowserActionCallback && typeof requestViaBrowserActionCallback === 'function') {
          const operation = requestViaBrowserActionCallback(permission);
          if (browserActionPromptMessage && operation) {
            // This operation can be canceled!
            if (isScreenBlockerActive()) {
              requestViaBrowserActionCallback(null);
              throw new Error('Pervious request is still pending.');
            }

            // Show info prompt (about how to handle custom permission code) and wait for request to be finished:
            const listenerCollection = new DisposableCollection();
            try {
              toggleInfoPrompt(true, { yPos: requestButton.getBoundingClientRect().y, message: browserActionPromptMessage });
              // Don't allow canceling immediately since that can cause the user to accidentally cancel:
              delay(50).then(() => {
                if (!listenerCollection.isDisposed) {
                  listenerCollection.trackDisposables(new EventListener(document, 'click', async (e) => {
                    requestViaBrowserActionCallback(null);
                  }));
                }
              });
              await operation;
            } finally {
              toggleInfoPrompt(false);
              listenerCollection.dispose();
            }
          }
        }
      } catch (error) {
        console.error('Failed to modify optional permission!\n', error);
      }

      checkPermission(true);
    };

    requestButton.addEventListener('click', handleButtonClick);
    removeButton.addEventListener('click', handleButtonClick);
  };

  const checkPermission = async (modifiedPermission = false) => {
    let newHasPermission = false;
    try {
      newHasPermission = await browser.permissions.contains(permission);
    } catch (error) {
      console.error('Failed to check status of permission: ', permission, '\nError: ', error);
      obj.hasError = true;
    }
    if (newHasPermission === hasPermission) {
      return false;
    }
    hasPermission = newHasPermission;
    permissionChanged(modifiedPermission);
    return true;
  };

  if (onPermissionChanged) {
    const permissionChangeListener = new EventListener(onPermissionChanged, () => {
      if (!document.documentElement.contains(obj.area)) {
        permissionChangeListener.dispose();
        return;
      }
      checkPermission();
    });
  }


  obj.area = section.area;
  obj.section = section;

  obj.onHasPermissionChanged = onHasPermissionChanged.subscriber;
  /** This event will be invoked when the user presses one of UI section's buttons. The first argument will be `true` if the user wants to request the permission and false if it should be revoked. */
  obj.onClick = onClick.subscriber;

  obj.checkPermission = () => checkPermission();
  obj.permission = permission;

  defineProperty(obj, 'hasPermission', () => hasPermission);
  defineProperty(obj, 'hasError', () => hasError, (value) => {
    value = Boolean(value);
    if (value === hasError) return;
    hasError = value;
    updateUI();
  });

  /** Wait for UI to check the current status of the permission. */
  obj.start = start();
  return obj;
}