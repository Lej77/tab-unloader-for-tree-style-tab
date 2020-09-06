
import {
    OperationManager,
    checkAny,
    Timeout,
} from '../common/delays.js';

import {
    EventListener,
} from '../common/events.js';



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
    constructor(monitors) {
        this.monitors = monitors;
    }

    cancel() {
        for (let monitor of this.monitors) {
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



export class DragMonitor extends Monitor {
    constructor({ data, time, events }) {
        super();
        var op = this.operationManager;

        // this.allow.then((value) => console.log('DragMonitor: ' + value));

        let onDragEnabled = data.onDragEnabled;
        let onDragCancel = data.onDragCancel;
        let onDragOnly = !onDragCancel;
        let onDragTimeout = data.onDragTimeout;
        let hasOnDragTimeout = onDragTimeout && onDragTimeout > 0;
        onDragEnabled = onDragEnabled && hasOnDragTimeout;

        let setDragged = (dragged) => {
            op.resolve(dragged ? !onDragCancel : !onDragOnly);
        };

        if (!onDragEnabled) {
            op.resolve(true);
            return;
        } else if (!hasOnDragTimeout) {
            op.resolve(false);
            return;
        }

        op.trackDisposables([
            new Timeout(() => {
                setDragged(false);
            }, onDragTimeout),
            new EventListener(events.onDrag, (eventMessage, eventTime) => {
                // This event is fired after 400 milliseconds if the tab is not dragged.
                setDragged(true);
            }),
            new EventListener(events.onTabUp, (eventMessage, eventTime) => {
                setDragged(data.onDragMouseUpTrigger);
            }),
            new EventListener(events.onTabDown, (eventMessage, eventTime) => {
                setDragged(false);
            }),
        ]);
    }
}



export class DoubleClickMonitor extends Monitor {
    constructor({ data, time, events, message }) {
        super();
        var op = this.operationManager;

        // this.allow.then((value) => console.log('DoubleClickMonitor: ' + value));

        let doubleClickEnabled = data.doubleClickEnabled;
        let doubleClickOnly = data.doubleClickOnly;
        let doubleClickToPrevent = !doubleClickOnly;
        let doubleClickTimeout = parseInt(data.doubleClickTimeout);
        let hasDoubleClickTimeout = doubleClickTimeout && doubleClickTimeout > 0;
        doubleClickEnabled = doubleClickEnabled && hasDoubleClickTimeout;


        if (!doubleClickEnabled) {
            op.resolve(true);
            return;
        }


        let setDoubleClick = (doubleClick) => {
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
    constructor({ data, time, events }) {
        super();
        var op = this.operationManager;

        // this.allow.then((value) => console.log('click duration: ' + value));

        let maxTime = parseInt(data.maxTimeout);
        let minTime = parseInt(data.minTimeout);
        let hasMaxTime = maxTime && maxTime > 0;
        let hasMinTime = minTime && minTime > 0;


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