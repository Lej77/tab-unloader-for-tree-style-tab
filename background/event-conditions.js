
import {
    OperationManager,
    checkAny,
    Timeout,
} from '../common/delays.js';

import {
    EventListener,
} from '../common/events.js';

import {
    kTST_ID,
} from '../tree-style-tab/utilities.js';


/**
 * Parameters passed to a `Monitor`'s constructor.
 *
 * @typedef {Object} MonitorConstructorParams
 * @property {typeof import('../common/common').defaultValues.MouseClickCombo} data Options for this mouse button "combination".
 * @property {number} time The time when the monitor was created (should be when a mouse down event is received).
 * @property { import('../background/background').MouseButtonManagerEvents } events Events that will be triggered when Tree Style Tab messages are received for this mouse button.
 * @property {any} message The Tree Style Tab message that triggered the creation of the monitor (should be a mouse down message).
 */


/**
 * Ensure the argument is an integer value.
 *
 * @param {number | string} value The value that should be converted to an integer.
 * @returns {number} An integer value.
 */
function ensureInt(value) {
    if (typeof value === 'number') return Math.floor(value);
    return parseInt(value);
}


export class Monitor {
    constructor() {
        this.operationManager = new OperationManager();
    }

    cancel() {
        this.operationManager.value = false;
    }

    get done() {
        return this.operationManager.done;
    }
    get allow() {
        return this.operationManager.value;
    }
}



export class MonitorCollection {
    /**
     * Creates an instance of MonitorCollection.
     * @param { Monitor[] } monitors The monitors in the collection.
     * @memberof MonitorCollection
     */
    constructor(monitors) {
        this.monitors = monitors;
    }

    cancel() {
        for (const monitor of this.monitors) {
            monitor.cancel();
        }
    }

    get done() {
        return Boolean(this.monitors.filter(monitor => !monitor.done).length === 0);
    }
    get allow() {
        let blocked = checkAny(this.monitors.map(monitor => Promise.resolve(monitor.allow).then(allowed => !allowed)));
        return Promise.resolve(blocked).then(block => !block);
    }
}



/**
 * Detects if a tab is long pressed (without that being because of drag and drop), and can be extended to instead detect only if a tab is being drag and dropped.
 *
 * @export
 * @class DragMonitor
 * @extends {Monitor}
 */
export class DragMonitor extends Monitor {
    /**
     * Creates an instance of DragMonitor.
     * @param {MonitorConstructorParams} Params Parameters.
     * @memberof DragMonitor
     */
    constructor({ data, time, events, message }) {
        super();
        const op = this.operationManager;

        // this.allow.then((value) => console.log('DragMonitor: ' + value));

        let {
            onDragEnabled,
            onDragCancel,
            onDragTimeout,
            onDragMouseUpTrigger,
            onDragModern,
            onDragModern_PreventDragAndDrop,
        } = data;

        const hasOnDragTimeout = onDragTimeout && onDragTimeout > 0;
        onDragEnabled = onDragEnabled && hasOnDragTimeout;

        const setLongPress = (longPress) => {
            op.resolve(longPress ? !onDragCancel : onDragCancel);
        };

        if (!onDragEnabled) {
            op.resolve(true);
            return;
        } else if (!onDragModern && !hasOnDragTimeout) {
            op.resolve(false);
            return;
        }

        op.trackDisposables([
            new Timeout(async () => {
                // Legacy version: no event => drag and drop in progress. (dragged = false)
                // Modern version: no event => drag and drop not started. (dragged/longPress = true) Can prevent it in the future with a message.
                setLongPress(onDragModern);
                if (onDragModern && onDragModern_PreventDragAndDrop) {
                    try {
                        await browser.runtime.sendMessage(kTST_ID, {
                            type: "start-custom-drag",
                            windowId: message.tab.windowId,
                        });
                    } catch (error) {
                        console.error('Failed to prevent drag and drop in Tree Style Tab\'s sidebar!.\nError:\n', error);
                    }
                }
            }, onDragTimeout),
            new EventListener(events.onDrag, (eventMessage, eventTime) => {
                // Legacy version: This event is fired after 400 milliseconds if the tab is not dragged.
                // Modern version: only fired if we send a `start-custom-drag` message.
                setLongPress(true);
            }),
            new EventListener(events.onNativeDrag, (eventMessage, eventTime) => {
                // The user has started drag and drop for a tab in the sidebar. Only available in "modern" Tree Style Tab (v2.7.8 and later).
                setLongPress(false);
            }),
            new EventListener(events.onTabUp, (eventMessage, eventTime) => {
                // Mouse up isn't sent after a drag and drop operation is started.
                setLongPress(onDragMouseUpTrigger);
            }),
            new EventListener(events.onTabDown, (eventMessage, eventTime) => {
                // A new tab is being clicked so cancel this old operation. We should have seen a mouse up event if the previous tab wasn't drag and dropped.
                // TL;DR; the previous tab was probably drag and dropped.
                setLongPress(false);
            }),
        ]);
    }
}



export class DoubleClickMonitor extends Monitor {
    /**
     * Creates an instance of DoubleClickMonitor.
     * @param {MonitorConstructorParams} Params Parameters
     * @memberof DoubleClickMonitor
     */
    constructor({ data, time, events, message }) {
        super();
        const op = this.operationManager;

        // this.allow.then((value) => console.log('DoubleClickMonitor: ' + value));

        const doubleClickOnly = data.doubleClickOnly;
        const doubleClickToPrevent = !doubleClickOnly;
        const doubleClickTimeout = ensureInt(data.doubleClickTimeout);
        const hasDoubleClickTimeout = doubleClickTimeout && doubleClickTimeout > 0;
        const doubleClickEnabled = data.doubleClickEnabled && hasDoubleClickTimeout;


        if (!doubleClickEnabled) {
            op.resolve(true);
            return;
        }


        const setDoubleClick = (doubleClick) => {
            if (doubleClickToPrevent && doubleClick) {
                op.resolve(false);
            }
            if (doubleClickOnly && !doubleClick) {
                op.resolve(false);
            }
            op.resolve(true);
        };


        op.trackDisposables([
            new EventListener(events.onTabDown, (eventMessage, eventTime) => {
                setDoubleClick(eventMessage.tab.id === message.tab.id);
                return true;
            }),
            new Timeout(() => {
                setDoubleClick(false);
            }, doubleClickTimeout),
        ]);
    }
}



export class ClickDurationMonitor extends Monitor {
    /**
     * Creates an instance of ClickDurationMonitor.
     * @param {MonitorConstructorParams} Params Parameters
     * @memberof ClickDurationMonitor
     */
    constructor({ data, time, events }) {
        super();
        const op = this.operationManager;

        // this.allow.then((value) => console.log('click duration: ' + value));

        const maxTime = ensureInt(data.maxTimeout);
        const minTime = ensureInt(data.minTimeout);
        const hasMaxTime = maxTime && maxTime > 0;
        const hasMinTime = minTime && minTime > 0;


        if (!hasMaxTime && !hasMinTime) {
            op.resolve(true);
            return;
        }

        let minTimeout = false;
        let maxTimeout = false;
        const checkInterval = (released = false) => {
            if (hasMaxTime && maxTimeout) {
                // Duration is longer than max allowed:
                op.resolve(false);
            }
            if (hasMinTime && minTimeout) {
                // Min time reached:
                if (!hasMaxTime || released) {
                    // No max time or wait stopped:
                    op.resolve(true);
                }
            }
            if (released) {
                if (hasMinTime && !minTimeout) {
                    // Min time wasn't reached:
                    op.resolve(false);
                } else {
                    op.resolve(true);
                }
            }
        };


        op.trackDisposables([
            new EventListener(events.onTabUp, (message, eventTime) => {
                checkInterval(true);
            }),
        ]);


        if (hasMinTime) {
            op.trackDisposables(new Timeout(() => {
                minTimeout = true;
                checkInterval();
            }, minTime));
        }
        if (hasMaxTime) {
            op.trackDisposables(new Timeout(() => {
                maxTimeout = true;
                checkInterval();
            }, maxTime));
        }
    }
}