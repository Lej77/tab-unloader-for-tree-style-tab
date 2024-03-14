'use strict';

import {
  EventListener,
  EventManager
} from '../common/events.js';

/**
 * @typedef {import('../common/events.js').EventSubscriber<T>} EventSubscriber<T>
 * @template T
 */
null;

/**
 * An interface for disposable objects.
 *
 * @typedef {Object} IDisposable
 * @property {function(): any} Info.dispose Dispose of any resources that this object handles.
 * @property {EventSubscriber<undefined>} [Info.onDisposed] Notified when this object has been disposed.
 * @property {boolean} [Info.isDisposed] Indicates if this object has been disposed.
 * @property {boolean | undefined} [Info.isActive] Indicates if this object is still using its resources.
 */
null;


/**
 * Track disposables and allow for disposing of them all.
 *
 * @template {IDisposable} T
 * @class DisposableCollection
 */
export class DisposableCollection {

  /**
   * Creates an instance of DisposableCollection.
   * @param {T | T[] | null} initialDisposables Disposable object(s) that will be added to the collection.
   * @memberof DisposableCollection
   */
  constructor(initialDisposables = null) {
    this._isDisposed = false;
    /** @type { T[] } */
    this._trackedDisposables = [];
    this._disposedEvents = new WeakMap();

    this._onDisposed = new EventManager();

    this.trackDisposables(initialDisposables);
  }

  /**
   * Add a disposable object to the collection. It will be disposed of when the collection is disposed.
   *
   * @param {T | T[] | null | void} disposables The object(s) to add to the collection.
   * @memberof DisposableCollection
   */
  trackDisposables(disposables) {
    if (!disposables) {
      return;
    }
    if (!Array.isArray(disposables)) {
      disposables = [disposables];
    }
    for (const disposable of disposables) {
      if (!disposable) {
        continue;
      }
      if (Array.isArray(disposable)) {
        this.trackDisposables(disposable);
        continue;
      }
      if (this.isDisposed) {
        DisposableCollection.disposeOfObject(disposable);
        continue;
      }
      if (DisposableCollection.checkIfDisposed(disposable)) {
        continue;
      }

      if (!this._trackedDisposables.includes(disposable)) {
        this._trackedDisposables.push(disposable);

        const callback = () => {
          this.untrackDisposables(disposable);
        };
        for (const eventName of DisposableCollection.onDisposedEventNames) {
          const listener = DisposableCollection.subscribeEvent(disposable, eventName, callback);
          if (listener) {
            this._disposedEvents.set(disposable, listener);
            break;
          }
        }
      }
    }
  }

  /**
   * Remove an object from the collection. The object will no longer be disposed when the collection is disposed.
   *
   * @param {T | T[] | null} disposables The object(s) to remove from the collection.
   * @memberof DisposableCollection
   */
  untrackDisposables(disposables) {
    if (this.isDisposed) {
      return;
    }
    if (!disposables) {
      return;
    }
    if (!Array.isArray(disposables)) {
      disposables = [disposables];
    }
    // trackedDisposables = trackedDisposables.filter(disposable => !disposables.includes(disposable));
    for (let disposable of disposables) {
      if (!disposable) {
        continue;
      }
      if (Array.isArray(disposable)) {
        this.untrackDisposables(disposable);
        continue;
      }
      while (true) {
        let index = this._trackedDisposables.indexOf(disposable);
        if (index < 0) {
          break;
        }
        this._trackedDisposables.splice(index, 1);
      }

      let listener = this._disposedEvents.get(disposable);
      if (listener) {
        listener.dispose();
        this._disposedEvents.delete(disposable);
      }
    }
  }

  /**
   * The disposable objects tracked by the collection.
   *
   * @readonly
   * @memberof DisposableCollection
   * @returns {T[]} The tracked disposable objects.
   */
  get array() {
    return this._trackedDisposables.slice();
  }

  /**
   * Dispose of all object in the collection without disposing the collection itself.
   *
   * @memberof DisposableCollection
   */
  stop() {
    let disposables = Array.from(this._trackedDisposables);
    this.untrackDisposables(disposables);
    for (let disposable of disposables) {
      try {
        DisposableCollection.disposeOfObject(disposable);
      } catch (error) {
        console.error('Failed to dispose of object.', '\nObject: ', disposable, '\nError: ', error, '\nStack Trace:\n', error.stack);
      }
    }
  }

  /**
   * Dispose of the collection and all the object tracked by it.
   *
   * @memberof DisposableCollection
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.stop();
    this._trackedDisposables = [];
    this._disposedEvents = null;
    this._onDisposed.fire(this);
  }


  get isDisposed() {
    return this._isDisposed;
  }

  get onDisposed() {
    return this._onDisposed.subscriber;
  }


  static subscribeEvent(obj, eventName, callback) {
    if (obj[eventName] && obj[eventName].addListener && typeof obj[eventName].addListener === 'function') {
      return new EventListener(obj[eventName], callback);
    }
    return null;
  }
  static callFunction(obj, functionName) {
    if (obj[functionName] && typeof obj[functionName] === 'function') {
      obj[functionName]();
      return true;
    }
    return false;
  }
  static checkIfDisposed(obj) {
    for (let propertyName of DisposableCollection.isDisposedPropertyNames) {
      let inverted = false;
      if (propertyName.startsWith('!')) {
        propertyName = propertyName.slice(1);
        inverted = true;
      }
      const value = obj[propertyName];
      if (value) {
        if (inverted) {
          return false;
        }
        return true;
      }
      if (value !== undefined) {
        break;
      }
    }
    return false;
  }
  static disposeOfObject(obj) {
    for (const disposeFunctionName of DisposableCollection.disposeFunctionNames) {
      if (DisposableCollection.callFunction(obj, disposeFunctionName)) {
        break;
      }
    }
  }
}
DisposableCollection.disposeFunctionNames = [
  'dispose',
  // 'close',
  // 'stop',
  // 'cancel',
];
DisposableCollection.onDisposedEventNames = [
  'onDisposed',
];
DisposableCollection.isDisposedPropertyNames = [
  'isDisposed',
  '!isActive',
];


/**
 * Delay the creation of disposables.
 *
 * @class DisposableCreators
 */
export class DisposableCreators {

  constructor() {
    this._isDisposed = false;
    this._onDisposed = new EventManager();

    this.disposableCollection = null;
    this.disposableCreators = [];
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * Handle a disposable object returned from a callback.
   *
   * @param {(delayed: boolean) => (void | null | IDisposable | IDisposable[])} createCallback A callback that returns a disposable object. The first arg is a Boolean that is `true` if the callback was delayed, otherwise it is `false`.
   * @memberof DisposableCreators
   */
  createDisposable(createCallback) {
    if (this.isDisposed || !createCallback || typeof createCallback !== 'function') {
      return;
    }
    this.disposableCreators.push(createCallback);
    if (this.disposableCollection) {
      this.disposableCollection.trackDisposables(createCallback(false));
    }
  }

  /**
   * Call all callbacks to create the disposables.
   *
   * @memberof DisposableCreators
   */
  start() {
    if (this.isDisposed) {
      return;
    }
    if (!this.disposableCollection) {
      let collection = new DisposableCollection();
      collection.onDisposed.addListener(() => {
        if (this.disposableCollection === collection) {
          this.disposableCollection = null;
        }
      });
      this.disposableCollection = collection;
      collection.trackDisposables(this.disposableCreators.map((callback) => callback(true)));
    }
  }

  /**
   *  Dispose of all tracked disposables.
   *
   * @memberof DisposableCreators
   */
  stop() {
    if (this.disposableCollection) {
      this.disposableCollection.dispose();
    }
  }

  /**
   * Dispose of all tracked disposables and prevent any more from being created.
   *
   * @memberof DisposableCreators
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.disposableCreators = [];
    this.disposableCollection = null;
  }
  get isDisposed() {
    return this._isDisposed;
  }
  get onDisposed() {
    return this._onDisposed.subscriber;
  }

  /**
   * Is delaying the creation of any new disposables for later.
   *
   * @readonly
   * @memberof DisposableCreators
   */
  get isDelaying() {
    return !this.isStarted;
  }

  /**
   * Creators have been called and any new creators will be created immediately.
   *
   * @readonly
   * @memberof DisposableCreators
   */
  get isStarted() {
    return Boolean(this.disposableCollection);
  }

}