'use strict';

import {
    messagePrefix,
    toggleClass,
    setTextMessages,
} from '../ui/utilities.js';

// eslint-disable-next-line valid-jsdoc
/**
 * Create a UI element that indicates if something is enabled, disabled or has an error.
 *
 * @export
 * @param {Object} Params Configure the UI element.
 * @param {string} Params.headerMessage The i18n message to use for the header.
 * @param {string} Params.enabledMessage The i18n message to display when the indicator is in the "enabled" state.
 * @param {string} Params.disabledMessage The i18n message to use for when the indicator is in the "disabled" state.
 * @param {string} [Params.errorMessage] The i18n message to use for when the indicator is in the "error" state. If the status indicator is never put into the "error" state then you can omit this.
 * @param {boolean} [Params.newLine] `true` to have a (new) line between the status message and the header.
 * @param {boolean} [Params.standardFormat] `true` to use the standard padding and style for the the status indicator.
 * @param {boolean} [Params.fill] `true` to stretch the status message instead of centering it.
 * @returns { (typeof info) } Info about the created UI element.
 */
export function createStatusIndicator({
    headerMessage,
    enabledMessage,
    disabledMessage,
    errorMessage = null,
    newLine = true,
    standardFormat = true,
    fill = false
}) {
    const areaWrapper = document.createElement('div');
    areaWrapper.classList.add('statusIndicatorWrapper');

    const area = document.createElement('div');
    area.classList.add('statusIndicator');
    area.classList.add('textNotSelectable');
    if (newLine) {
        area.classList.add('newLine');
    }
    if (standardFormat) {
        area.classList.add('standardFormat');
    }
    if (fill) {
        area.classList.add('fill');
    }
    areaWrapper.appendChild(area);


    const createSubelement = (parentArea, className, message = null) => {
        const node = document.createElement('div');
        node.classList.add(className);
        if (message) {
            node.classList.add(messagePrefix + message);
        }
        parentArea.appendChild(node);
        return node;
    };

    createSubelement(area, 'statusIndicatorHeader', headerMessage);


    const valueArea = document.createElement('div');
    valueArea.classList.add('statusIndicatorValues');
    area.appendChild(valueArea);


    createSubelement(valueArea, 'statusIndicatorEnabled', enabledMessage);
    createSubelement(valueArea, 'statusIndicatorDisabled', disabledMessage);
    createSubelement(valueArea, 'statusIndicatorError', errorMessage);


    setTextMessages(area);
    const info = {
        /** The DOM element that contains the whole status indicator. */
        area: areaWrapper,

        get isEnabled() {
            return area.classList.contains('enabled');
        },
        set isEnabled(value) {
            toggleClass(area, 'enabled', value);
        },

        get hasError() {
            return area.classList.contains('error');
        },
        set hasError(value) {
            toggleClass(area, 'error', value);
        },
    };
    return info;
}
