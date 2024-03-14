'use strict';

import {
    defineProperty
} from '../common/utilities.js';

import {
    EventManager
} from '../common/events.js';

import {
    DisposableCollection
} from '../common/disposables.js';


/**
 * @typedef {import('../common/events.js').EventSubscriber<T, R>} EventSubscriber
 * @template T
 * @template R
 */
null;


/** Wait a certain number of milliseconds.
 *
 * @export
 * @param {number} timeInMilliseconds Milliseconds to wait before promise is resolved.
 * @return {Promise<void>} A promise that is resolved after the specified time.
 */
export function delay(timeInMilliseconds) {
    return new Promise((resolve, reject) => {
        try {
            timeInMilliseconds < 0 ? resolve() : setTimeout(resolve, timeInMilliseconds);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * A delay that will be canceled if a disposable collection is disposed.
 *
 * @param {number} timeInMilliseconds Time in milliseconds to wait.
 * @param {DisposableCollection} [disposables=null] Disposables collection to bind delay to.
 * @returns {Promise<boolean>} True if successful. False if canceled.
 */
export async function boundDelay(timeInMilliseconds, disposables = null) {
    if (!disposables) {
        await delay(timeInMilliseconds);
        return true;
    }
    return new Promise((resolve, reject) => {
        try {
            let timeout = new Timeout(() => resolve(true), timeInMilliseconds);
            timeout.onDisposed.addListener(() => resolve(false));
            if (disposables) {
                disposables.trackDisposables(timeout);
            }
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Wait for all promises to complete.
 *
 * @export
 * @param {any} array Promises to wait for.
 * @returns {Promise<void>} Finishes after all promises in the array has completed.
 */
export async function waitForAll(array) {
    if (!array || !Array.isArray(array)) return;
    for (const value of array) {
        await value;
    }
}

/**
 * Get the first "true" value returned from an array of promises.
 *
 * @export
 * @template T
 * @param {Promise<T>[]} array Promises to await for values.
 * @returns {T | false | Promise<T | false>} Value of the promise that first resolved to a true value. Otherwise false.
 */
export function checkAny(array) {
    if (!array || !Array.isArray(array)) return false;

    if (!array.some(value => Boolean(value))) {
        // Only false values:
        return false;
    }

    /** @type {PromiseWrapper<T | false>} */
    const promiseWrapper = new PromiseWrapper();

    let promises = 0;
    try {
        const waitForValue = async (value) => {
            try {
                value = await value;
                if (value) {
                    promiseWrapper.resolve(value);
                }
            } finally {
                promises--;

                if (promises <= 0) {
                    promiseWrapper.resolve(false);
                }
            }
        };

        // Don't resolve anything until we have queued all promises:
        promises++;
        // Start queuing promises:
        for (const value of array) {
            if (value) {
                promises++;
                waitForValue(value);
            }
        }
    } catch (error) {
        promiseWrapper.resolve(false);
        throw error;
    } finally {
        // Okay, now we can resolve to a value:
        promises--;
    }

    // Check if all promises were already resolved:
    if (promises <= 0) {
        promiseWrapper.resolve(false);
    }
    return promiseWrapper.getValue();
}

/**
 * Allows synchronous access to a Promise's result and ot its resolve and reject
 * functions.
 *
 * @template T
 * @class PromiseWrapper
 */
export class PromiseWrapper {

    /**
     * Creates an instance of PromiseWrapper.
     * @param {boolean} [createPromise=true] Determines if a promise should be created immediately.
     * @memberof PromiseWrapper
     */
    constructor(createPromise = true) {
        /** @type {null | function(T): void} */
        this._resolve = null;
        /** @type {null | function(Error): void} */
        this._reject = null;
        /** @type {T | Error | null} */
        this._value = null;
        this._isError = false;
        this._set = false;
        /** @type {Promise<T>} */
        this._promise = null;

        if (createPromise) {
            this.createPromise();
        }
    }


    /**
     * Resolve the promise.
     *
     * @param {T} value The value to resolve the promise with.
     * @memberof PromiseWrapper
     */
    resolve(value) {
        this.setValue(value, false);
    }

    reject(error) {
        this.setValue(error, true);
    }

    /**
     * Resolve or reject the promise.
     *
     * @param {T | Error} value The value to resolve the promise with or the error to reject it with.
     * @param {boolean} [isError=false] `true` to resolve the promise or `false` to reject it.
     * @memberof PromiseWrapper
     */
    setValue(value, isError = false) {
        if (this._set) {
            return;
        }
        this._set = true;
        this._isError = isError;
        this._value = value;

        if (isError) {
            if (this._reject) {
                this._reject(/**@type {Error}*/(value));
            }
        } else {
            if (this._resolve) {
                this._resolve(/**@type {T}*/(value));
            }
        }
    }

    createPromise() {
        if (this.isPromiseCreated) {
            return;
        }
        if (this._set) {
            if (this._isError) {
                this._promise = Promise.reject(this._value);
            } else {
                this._promise = Promise.resolve(/**@type {T}*/(this._value));
            }
        } else {
            this._promise = new Promise((resolve, reject) => {
                if (this._set) {
                    if (this._isError) {
                        reject(this._value);
                    } else {
                        resolve(/**@type {T}*/(this._value));
                    }
                } else {
                    this._resolve = resolve;
                    this._reject = reject;
                }
            });
        }
    }

    /**
     * Returns a promise if it is available or if it is the only way to provide the results.
     *
     * @returns {Promise<T> | T} Either a promise that will be resolved to the correct value or the value that the promise would have been resolved to.
     * @memberof PromiseWrapper
     */
    getValue() {
        if (this.isPromiseCreated || !this.done || this.isError) {
            return this.promise;
        }
        return /**@type {T}*/(this.value);
    }

    get promise() {
        this.createPromise();
        return this._promise;
    }

    get isPromiseCreated() {
        return Boolean(this._promise);
    }

    /**
     * Indicates if the promise has a value, that is to say has been resolved or rejected.
     *
     * @readonly
     * @memberof PromiseWrapper
     */
    get done() {
        return Boolean(this._set);
    }

    /**
     * Indicates if the promise was rejected.
     *
     * @readonly
     * @memberof PromiseWrapper
     */
    get isError() {
        return Boolean(this._isError);
    }

    /**
     * The value that the promise was resolved or rejected with.
     *
     * @readonly
     * @memberof PromiseWrapper
     */
    get value() {
        return this._value;
    }
}


/**
 * Tracks disposables and disposes of them when a promise is resolved.
 *
 * @class OperationManager
 */
export class OperationManager {
    constructor() {
        this._promiseWrapper = new PromiseWrapper(false);
        this._disposableCollection = new DisposableCollection();

        this.onDisposed = this._disposableCollection.onDisposed;
    }

    _setValue(value, isError = false) {
        if (isError) {
            this._promiseWrapper.reject(value);
        } else {
            this._promiseWrapper.resolve(value);
        }
        this._disposableCollection.dispose();
    }

    trackDisposables(disposables) {
        this._disposableCollection.trackDisposables(disposables);
    }

    resolve(value) {
        this._setValue(value);
    }
    reject(error) {
        this._setValue(error, true);
    }

    get done() {
        return this._promiseWrapper.done;
    }

    get value() {
        return this._promiseWrapper.getValue();
    }
    set value(value) {
        this._setValue(value);
    }
}


/**
 * Wrap a setTimeout call and keep track of the timeoutId.
 *
 * @class Timeout
 */
export class Timeout {

    constructor(callback, timeInMilliseconds) {
        this._isDisposed = false;
        this._onDisposed = null;

        this._timeoutId = null;
        this._callback = callback;

        this._timeInMilliseconds = timeInMilliseconds;

        this._start();
    }

    _start() {
        if (this._callback && typeof this._callback === 'function') {
            this._timeoutId = setTimeout(() => {
                this._timeoutId = null;
                try {
                    this._callback();
                } finally {
                    this.dispose();
                }
            }, this._timeInMilliseconds);
        } else {
            this.dispose();
        }
    }


    // #region Dispose

    dispose() {
        if (this.isDisposed) {
            return;
        }
        this._isDisposed = true;
        if (this._timeoutId !== null) {
            clearTimeout(this._timeoutId);
            this._timeoutId = null;
        }
        if (this._onDisposed)
            this._onDisposed.fire(this);
    }
    get isDisposed() {
        return this._isDisposed;
    }
    get onDisposed() {
        if (!this._onDisposed)
            this._onDisposed = new EventManager();
        return this._onDisposed.subscriber;
    }

    get isActive() {
        return Boolean(this._timeoutId !== null);
    }

    // #endregion Dispose

    get promise() {
        return new Promise((resolve, reject) => {
            try {
                if (this.isDisposed) {
                    resolve();
                } else {
                    this.onDisposed.addListener(resolve);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    get timeInMilliseconds() {
        return this._timeInMilliseconds;
    }

    get callback() {
        return this._callback;
    }
}


/**
 * Ensure a callback isn't called too often.
 *
 * @template {any[]} A
 * @class RequestManager
 */
export class RequestManager {

    // eslint-disable-next-line valid-jsdoc
    /**
     * Creates an instance of RequestManager.
     *
     * @param { (...args: A) => (void | boolean | Promise<void> | Promise<boolean>) } [callback=null] A callback to subscribe to the update event.
     * @param {number | function(): number} [blockTimeInMilliseconds=1000] Time to block between requests in milliseconds. Specify a negative time to ignore any block behaviour, note that `simultaneousUpdates` will still be respected.
     * @param {boolean} [simultaneousUpdates=false] Allow multiple updates at the same time.
     * @memberof RequestManager
     */
    constructor(callback = null, blockTimeInMilliseconds = 1000, simultaneousUpdates = false) {
        this._isDisposed = false;
        this._onDisposed = new EventManager();

        this._onUpdate = new EventManager();

        this._blockTimeout = null;
        this._invalidated = false;
        /** @type {A | []} The arguments to use for the next update. */
        this._lastArgs = [];
        /** @type {PromiseWrapper<boolean>} Resolved when the next update (which is not currently started) completes. */
        this._confirmPromiseWrapper = new PromiseWrapper();

        this._simultaneousUpdates = simultaneousUpdates;
        this._updates = 0;

        this.blockTimeInMilliseconds = blockTimeInMilliseconds;

        this._onUpdate.addListener(callback);
    }

    /**
     * Block all updates.
     *
     * @param {null | number} [overrideTime=null] The time to block the updates in milliseconds. If false the default time will be used.
     * @returns {Timeout} A Timeout object that will be closed when the block has expired.
     * @memberof RequestManager
     */
    block(overrideTime = null) {
        if (this._blockTimeout) {
            this._blockTimeout.dispose();
        }
        if (this.isDisposed) {
            return;
        }
        let time;
        if (overrideTime || overrideTime === 0) {
            time = overrideTime;
        } else if (typeof this.blockTimeInMilliseconds === 'function') {
            time = this.blockTimeInMilliseconds();
        } else {
            time = this.blockTimeInMilliseconds;
        }
        if (time >= 0) {
            this._blockTimeout = new Timeout(() => this.unblock(), time);
            return this._blockTimeout;
        } else {
            this._blockTimeout = null;
            return new Timeout(() => undefined, 0);
        }
    }

    /**
     * Unblock and update if invalidated.
     *
     * @memberof RequestManager
     */
    unblock() {
        if (this._blockTimeout) {
            this._blockTimeout.dispose();
        }
        if (this.isInvalidated) {
            this._update();
        }
    }

    /**
     * Unblock and update. Forces an update now and block after it.
     *
     * @param {A} args Arguments to use when starting the next update.
     * @returns {Promise<boolean>} A promise that resolves to `true` if the started update is completed.
     * @memberof RequestManager
     */
    forceUpdate(...args) {
        this._lastArgs = args;
        const affectedPromise = this._confirmPromiseWrapper;
        this._update();
        return affectedPromise.promise;
    }

    async _update() {
        let doMoreUpdates = true;
        while (doMoreUpdates) {
            doMoreUpdates = false;
            if (this.isDisposed) {
                return;
            }
            if (!this._simultaneousUpdates && this.updateInProgress) {
                // Unblocked but last update has yet to complete.
                this._invalidated = true;
                return;
            }

            const currentUpdateBlock = this.block();
            this._invalidated = false;

            const args = this._lastArgs;
            this._lastArgs = [];

            const affectedConfirmPromise = this._confirmPromiseWrapper;
            this._confirmPromiseWrapper = new PromiseWrapper();
            // If the next update completes before the current one, then that should
            // be enough for anyone waiting:
            this._confirmPromiseWrapper.promise.then((value) => affectedConfirmPromise.resolve(value));

            this._updates++;
            try {
                const releaseBlock = await checkAny(this._onUpdate.fire.apply(this._onUpdate, args));

                if (releaseBlock && currentUpdateBlock === this._blockTimeout) {
                    if (this._blockTimeout) {
                        this._blockTimeout.dispose();
                    }
                }
            } finally {
                this._updates--;
                affectedConfirmPromise.resolve(true);
                if (!this.isBlocked && this.isInvalidated) {
                    doMoreUpdates = true;
                }
            }
        }
    }

    /**
     * Update after block is released.
     *
     * @param {A} args Arguments to use when starting the next update.
     * @returns {Promise<boolean>} True if update was successful.
     * @memberof RequestManager
     */
    invalidate(...args) {
        if (this.isDisposed) {
            // Promise should resolve to `false` when we are disposed:
            return this._confirmPromiseWrapper.promise;
        }
        this._invalidated = true;
        this._lastArgs = args;
        const updatePromise = this._confirmPromiseWrapper.promise;
        if (!this.isBlocked) {
            this._update();
        }
        return updatePromise;
    }

    /**
     * Cancel any queued updates but not any that are currently in progress.
     *
     * Blocks are not affected and will not be released.
     *
     * @memberof RequestManager
     */
    validate() {
        if (this.isDisposed) {
            return;
        }
        this._invalidated = false;
        this._lastArgs = [];
    }


    get isBlocked() {
        return this._blockTimeout && this._blockTimeout.isActive;
    }

    get updateInProgress() {
        return this._updates > 0;
    }

    /**
     * The arguments that will be used for the next update.
     *
     * @returns {A | []} The arguments that will be used for the next call or an empty array if the next call haven't been queued yet.
     * @readonly
     * @memberof RequestManager
     */
    get lastArgs() {
        return this._lastArgs;
    }

    /**
     * Check if the current request is invalidated.
     *
     * @returns {boolean} True if the current state is invalidated.
     * @readonly
     * @memberof RequestManager
     */
    get isInvalidated() {
        return this._invalidated;
    }

    /**
     * An event that will be invoked when the next update should be performed.
     *
     * @returns {EventSubscriber<A, (void | boolean | Promise<void> | Promise<boolean>)>} The event.
     * @readonly
     * @memberof RequestManager
     */
    get onUpdate() {
        return this._onUpdate.subscriber;
    }


    // #region Dispose

    /**
     * Unblock and prevent further updates.
     *
     * @memberof RequestManager
     */
    dispose() {
        if (this.isDisposed) {
            return;
        }
        this._isDisposed = true;

        this._confirmPromiseWrapper.resolve(false);
        this.unblock();

        this._onDisposed.fire(this);
    }

    get isDisposed() {
        return this._isDisposed;
    }
    get onDisposed() {
        return this._onDisposed.subscriber;
    }

    // #endregion Dispose

}


/**
 * Delay events and handle them later.
 *
 * @class EventQueue
 */
export class EventQueue {
    constructor() {
        Object.assign(this, {
            _isDisposed: false,

            queuedEvents: [],
            unsafeToContinue: false,
        });
    }

    /**
     * Handle an event. The callback might be delayed.
     *
     * @param {Function} callback Function to call when the event should be handled. First arg is a Boolean that is true if the callback was delayed.
     * @param {boolean} [safeToDelay=false] Indicates if it is safe to delay the event handler.
     * @memberof EventQueue
     */
    handleEvent(callback, safeToDelay = false) {
        if (this.queuedEvents) {
            this.queuedEvents.push(callback);
            if (!safeToDelay) {
                this.unsafeToContinue = true;
            }
        } else if (!this.isDisposed) {
            callback(false);
        }
    }
    handleQueuedEvents(dontDelayFutureEvents = false) {
        while (!this.isDisposed && this.queuedEvents && this.queuedEvents.length > 0) {
            this.queuedEvents[0](true);
            this.queuedEvents.splice(0, 1);
        }
        if (dontDelayFutureEvents) {
            this.isDelayingEvents = false;
        }
    }
    resetEventQueue() {
        if (this.queuedEvents) {
            this.queuedEvents = [];
        }
        this.unsafeToContinue = false;
    }

    dispose() {
        if (this.isDisposed) {
            return;
        }
        this._isDisposed = true;
        this.queuedEvents = [];
        this.unsafeToContinue = false;
    }

    get isDelayingEvents() {
        return Boolean(this.queuedEvents);
    }
    set isDelayingEvents(value) {
        value = Boolean(value);
        if (this.isDelayingEvents === value) {
            return;
        }

        this.queuedEvents = value ? [] : null;
        this.unsafeToContinue = false;
    }

    get isDisposed() {
        return this._isDisposed;
    }
}
