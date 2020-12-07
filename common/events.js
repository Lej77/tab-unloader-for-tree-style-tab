'use strict';

import {
  defineProperty
} from '../common/utilities.js';


// eslint-disable-next-line valid-jsdoc
/**
 * Define a property on `accessObject` for each property on the `dataObject` and return an event that will be triggered every time the `accessObject` is used to change a value on the `dataObject`.
 *
 * @export
 * @template D
 * @param {Object} accessObject Properties will be defined on this object to allow changing the values on the `dataObject`.
 * @param {D} dataObject The data object that will be changed via the `accessObject`
 * @returns {EventSubscriber<[keyof D, D[keyof D], D[keyof D]]>} An event that will be triggered when changes are made via the `accessObject`. Listeners will be provided with the changed key, the previous value and the new value in that order.
 */
export function accessDataObjectWithProperties(accessObject, dataObject) {
  /** @type {EventManager<[keyof D, D[keyof D], D[keyof D]]>} */
  const onChangeManager = new EventManager();

  const propKeys = /** @type {(keyof D)[]} */ (Object.keys(dataObject));

  for (const key of propKeys) {
    defineProperty(accessObject, key,
      function () {
        return dataObject[key];
      },
      function (value) {
        if (dataObject[key] === value) {
          return;
        }
        const old = dataObject[key];
        dataObject[key] = value;
        onChangeManager.fire(key, old, value);
      }
    );
  }
  return onChangeManager.subscriber;
}

/**
* Relationships between types with `addEventListener` methods and their event maps which define their allowed events and event types.
*
* This list was auto generated from the `lib.dom.d.ts` source file and should hopefully include all `EventMap` types.
*
* @typedef { [[AbortSignal, AbortSignalEventMap], [AbstractWorker, AbstractWorkerEventMap], [Animation, AnimationEventMap], [ApplicationCache, ApplicationCacheEventMap], [AudioScheduledSourceNode, AudioScheduledSourceNodeEventMap], [AudioWorkletNode, AudioWorkletNodeEventMap], [BaseAudioContext, BaseAudioContextEventMap], [BroadcastChannel, BroadcastChannelEventMap], [Document, DocumentEventMap], [DocumentAndElementEventHandlers, DocumentAndElementEventHandlersEventMap], [Element, ElementEventMap], [EventSource, EventSourceEventMap], [FileReader, FileReaderEventMap], [GlobalEventHandlers, GlobalEventHandlersEventMap], [HTMLBodyElement, HTMLBodyElementEventMap], [HTMLElement, HTMLElementEventMap], [HTMLFrameSetElement, HTMLFrameSetElementEventMap], [HTMLMarqueeElement, HTMLMarqueeElementEventMap], [HTMLMediaElement, HTMLMediaElementEventMap], [IDBDatabase, IDBDatabaseEventMap], [IDBOpenDBRequest, IDBOpenDBRequestEventMap], [IDBRequest, IDBRequestEventMap], [IDBTransaction, IDBTransactionEventMap], [MSInputMethodContext, MSInputMethodContextEventMap], [MediaDevices, MediaDevicesEventMap], [MediaKeySession, MediaKeySessionEventMap], [MediaQueryList, MediaQueryListEventMap], [MediaSource, MediaSourceEventMap], [MediaStream, MediaStreamEventMap], [MediaStreamTrack, MediaStreamTrackEventMap], [MessagePort, MessagePortEventMap], [Notification, NotificationEventMap], [OfflineAudioContext, OfflineAudioContextEventMap], [PaymentRequest, PaymentRequestEventMap], [Performance, PerformanceEventMap], [PermissionStatus, PermissionStatusEventMap], [RTCDTMFSender, RTCDTMFSenderEventMap], [RTCDataChannel, RTCDataChannelEventMap], [RTCDtlsTransport, RTCDtlsTransportEventMap], [RTCDtmfSender, RTCDtmfSenderEventMap], [RTCIceGatherer, RTCIceGathererEventMap], [RTCIceTransport, RTCIceTransportEventMap], [RTCPeerConnection, RTCPeerConnectionEventMap], [RTCSctpTransport, RTCSctpTransportEventMap], [RTCSrtpSdesTransport, RTCSrtpSdesTransportEventMap], [SVGElement, SVGElementEventMap], [SVGSVGElement, SVGSVGElementEventMap], [ScreenOrientation, ScreenOrientationEventMap], [ScriptProcessorNode, ScriptProcessorNodeEventMap], [ServiceWorker, ServiceWorkerEventMap], [ServiceWorkerContainer, ServiceWorkerContainerEventMap], [ServiceWorkerRegistration, ServiceWorkerRegistrationEventMap], [SourceBuffer, SourceBufferEventMap], [SourceBufferList, SourceBufferListEventMap], [SpeechRecognition, SpeechRecognitionEventMap], [SpeechSynthesis, SpeechSynthesisEventMap], [SpeechSynthesisUtterance, SpeechSynthesisUtteranceEventMap], [TextTrack, TextTrackEventMap], [TextTrackCue, TextTrackCueEventMap], [TextTrackList, TextTrackListEventMap], [WebSocket, WebSocketEventMap], [Window, WindowEventMap], [WindowEventHandlers, WindowEventHandlersEventMap], [Worker, WorkerEventMap], [XMLHttpRequest, XMLHttpRequestEventMap], [XMLHttpRequestEventTarget, XMLHttpRequestEventTargetEventMap]] } DOMEventMapDefinitions
*/
/**
 * Use the `GetDOMEventMaps` type instead.
 *
 * @template D Event map definition.
 * @template T The actual `EventTarget` type.
// @ts-ignore
 * @typedef { { [K in keyof D]: D[K] extends [any, any] ? (T extends D[K][0] ? D[K][1] : never) : never } } MapDefinitionToEventMap
 */
/**
* Get an array of possible event maps for a type with an `addEventListener` method. Only certain relationships are currently defined (in the `DOMEventMapDefinitions` type) so add new ones when needed.
*
* @template T
* @typedef { MapDefinitionToEventMap<DOMEventMapDefinitions, T> } GetDOMEventMaps
*/
/**
 * Map an array of event maps to an array of event type keys.
 *
 * @template D Event map definitions.
// @ts-ignore
 * @typedef { { [K in keyof D]: D[K] extends never ? never : keyof D[K] } } MapEventMapsToKeys
 */
/**
 * Map an array of event maps to an array of event types.
 *
 * @template D Event map definitions.
 * @template {PropertyKey} T
// @ts-ignore
 * @typedef { { [K in keyof D]: D[K] extends never ? never : (T extends keyof D[K] ? D[K][T] : never ) } } MapEventMapsToEvent
 */

/**
 * Listens to an event.
 *
 * @class EventListener
 * @template {any[]} T
 * @template R
 * @template E
 *
 * @template {EventTarget | EventSubscriber<T, R, E>} A
// @ts-ignore
 * @template {A extends EventTarget ? (MapEventMapsToKeys<M>[number]) : never } D Dom event name.
// @ts-ignore
 * @template {A extends EventTarget ? GetDOMEventMaps<A> : never } M Array of event maps that can apply to provided `EventTarget`.
 */
export class EventListener {

  // eslint-disable-next-line valid-jsdoc
  /**
   * Creates an instance of EventListener that listens to an event.
   *
   * @param { A | EventSubscriber<T, R, E> } DOMElementOrEventObject If DOM event: the DOM object to listen on. Otherwise: the event object to add a listener to.
   *
// @ts-ignore
   * @param { A extends EventTarget ? D : ( (...args: T) => R ) } eventNameOrCallback If DOM event: the name of the event. Otherwise: callback.
   *
// @ts-ignore
   * @param { A extends EventTarget ? ([ (this: A, ev: (MapEventMapsToEvent<M, D>[number])) => any ]) : ( [] | [E | null] ) } callbackOrExtraParameters If DOM event: callback. Otherwise: optional extra parameter for the add listener function, will only be applied if "truthy".
   * @memberof EventListener
   */
  constructor(DOMElementOrEventObject, eventNameOrCallback, ...[callbackOrExtraParameters]) {
    this._onDisposed = null;

    if (typeof eventNameOrCallback === 'string' && typeof callbackOrExtraParameters === 'function') {
      /** @type {EventTarget} */
      this._DOMElement = /** @type {any} */ (DOMElementOrEventObject);
      /** @type { string } */
      this._eventName = /** @type {any} */ (eventNameOrCallback);
      /** @type { Function } */
      this._callback = callbackOrExtraParameters;
    } else {
      /** @type { EventSubscriber<T, R, E> } */
      this._event = /** @type { EventSubscriber<T, R, E> } */ (DOMElementOrEventObject);
      this._callback = /** @type {Function} */ (eventNameOrCallback);
      /** @type {E} */
      this._extraParameter = /** @type {any} */ (callbackOrExtraParameters);
    }

    if (this._DOMElement) {
      this._DOMElement.addEventListener(this._eventName, /** @type {any} */(this._callback));
    } else {
      if (this._extraParameter) {
        this._event.addListener(/** @type {(...args: T) => R} */(this._callback), this._extraParameter);
      } else {
        this._event.addListener(/** @type {(...args: T) => R} */(this._callback));
      }
    }
  }

  dispose() {
    if (this._callback) {
      if (this._DOMElement) {
        this._DOMElement.removeEventListener(this._eventName, /** @type {any} */(this._callback));
      } else {
        this._event.removeListener(/** @type {(...args: T) => R} */(this._callback));
      }
      this._callback = null;
      if (this._onDisposed) {
        this._onDisposed.fire(this);
      }
    }
  }

  get isDisposed() {
    return !Boolean(this._callback);
  }
  get isActive() {
    if (this._DOMElement) {
      return !this.isDisposed;
    } else {
      return this._event.hasListener(/** @type {(...args: T) => R} */(this._callback));
    }
  }

  get onDisposed() {
    if (!this._onDisposed) {
      this._onDisposed = new EventManager();
    }
    return this._onDisposed.subscriber;
  }
}

/**
 * Keeps track of listeners for an event.
 *
 * @class EventSubscriber
 * @template {any[]} T
 * @template R
 * @template E
 */
export class EventSubscriber {

  // eslint-disable-next-line valid-jsdoc
  /**
   * Creates an instance of EventSubscriber.
   * @param {null | function(EventSubscriber<T, R, E>, (...args: T) => R, boolean): void} [changeCallback=null] A callback that will be notified when the subscribed listeners are changed.
   * @memberof EventSubscriber
   */
  constructor(changeCallback = null) {

    /**
     * Callbacks that are listening to this event.
     * @type {Set<(...args: T) => R>}
     */
    this._listeners = new Set();
    /**
     * A callback that will be notified when the subscribed listeners are changed.
     * @type {null | function(EventSubscriber<T, R, E>, (...args: T) => R, boolean): void}
     */
    this._changeCallback = changeCallback && typeof changeCallback === 'function' ? changeCallback : null;
    /**
     * Some extra information that was provided when a listener subscribed.
     * @type {WeakMap<(...args: T) => R, E>}
     */
    this._extraParameters = new WeakMap();
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * Add listener to the event.
   *
   * @param {null | ((...args: T) => R)} listener A function that will be called when the event is triggered.
   * @param {E | undefined} [extraParameters] If this value isn't undefined then it can be used by the event to filter when the callback is called.
   * @memberof EventSubscriber
   */
  addListener(listener, extraParameters = undefined) {
    if (!listener || typeof listener !== 'function' || this.hasListener(listener))
      return;

    if (extraParameters !== undefined)
      this._extraParameters.set(listener, extraParameters);

    this._listeners.add(listener);
    if (this._changeCallback)
      this._changeCallback(this, listener, true);
  }
  // eslint-disable-next-line valid-jsdoc
  /**
   * Remove a listener from the event.
   *
   * @param {(...args: T) => R} listener A function that was previously added to the event.
   * @memberof EventSubscriber
   */
  removeListener(listener) {
    if (!listener || !this.hasListener(listener))
      return;

    this._listeners.delete(listener);
    this._extraParameters.delete(listener);

    if (this._changeCallback)
      this._changeCallback(this, listener, false);
  }
  // eslint-disable-next-line valid-jsdoc
  /**
   * Check if a function is subscribed to the event.
   *
   * @param {(...args: T) => R} listener A function that might have been subscribed to the event.
   * @returns {boolean} True if the event is subscribed to the event; otherwise false.
   * @memberof EventSubscriber
   */
  hasListener(listener) {
    return this._listeners.has(listener);
  }
}


/**
 * Advanced features for an event subscriber such as calling all listeners.
 *
 * @class EventManager
 * @extends {EventSubscriber<T, R, E>}
 * @template {any[]} T
 * @template R
 * @template E
 */
export class EventManager extends EventSubscriber {
  constructor() {
    super();

    this._changeCallback = this._handleChange.bind(this);
    /** @type { EventSubscriber<T, R, E> } */
    this._subscriber = null;
    /** @type { EventManager<[this] | [this, (...args: T) => R, boolean], any, any> } */
    this._onChange = null;
    /** @type { WeakMap<(...args: T) => R, string> } */
    this._stackTraceWhenAdded = new WeakMap();
  }

  _handleChange(obj, listener, added) {
    if (added)
      this._stackTraceWhenAdded.set(listener, new Error().stack);
    else
      this._stackTraceWhenAdded.delete(listener);

    if (this._onChange)
      this._onChange.fire(this, listener, added);
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * Get the extra parameter for a listener.
   *
   * @param {(...args: T) => R} listener The listener to get the extra parameter for.
   * @returns {undefined | E} The listener's extra parameter. Will be `undefined` if no extra parameter was defined.
   * @memberof EventManager
   */
  getExtraParameter(listener) {
    return this._extraParameters.get(listener);
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * Filter listeners based on their extra parameters.
   *
   * @template {boolean} A
   * @param {function(E): boolean} callback Parameter is a listeners extra parameters. Return `true` to allow the listener; otherwise return `false`.
   * @param {A} [any=false] If this is `true` then the function will only check if there is any listener that passes the condition. Otherwise the function will return all listeners that passes the condition.
   *
// @ts-ignore
   * @returns {A extends true ? boolean : ( (...args: T) => R )[]} The listener callbacks for which the filter callback returned `true`.
   * @memberof EventManager
   */
  _filterListeners(
    callback,
    // @ts-ignore
    any = false
  ) {
    // eslint-disable-next-line valid-jsdoc
    /**
     * @param { (...args: T) => R } listener A listener callback to check against the filter callback.
     * @returns {boolean} True if the listener passed the filter callback.
     */
    let checkListener = (listener) => callback(this.getExtraParameter(listener));
    if (!callback || typeof callback !== 'function')
      checkListener = () => true;

    const listeners = Array.from(this._listeners.values());
    if (any)
      // @ts-ignore
      return listeners.some(checkListener);
    else
      // @ts-ignore
      return listeners.filter(checkListener);
  }


  /**
   * Check if any listeners' extra parameter fulfills a test.
   *
   * @param {function(E): boolean} filterCallback Called to check a listener's extra parameter.
   * @returns {boolean} True if any listeners extra parameter fulfilled the callback.
   * @memberof EventManager
   */
  checkFilter(filterCallback) {
    return this._filterListeners(filterCallback, true);
  }

  /**
   * Notify event listeners that have extra parameters that match a certain condition.
   *
   * @param {function(E): boolean} filterCallback Check if a listener's extra parameter matches a condition, if it does then it will be notified.
   * @param {T} args Arguments to call the event listeners with.
   * @returns {R[]} An array with the values returned from the listeners.
   * @memberof EventManager
   */
  filterDispatch(filterCallback, ...args) {
    return this._fire(this._filterListeners(filterCallback, false), args);
  }

  /**
   * Notify all event listeners.
   *
   * @param {T} args Arguments to call the event listeners with.
   * @returns {R[]} An array with the values returned from the listeners.
   * @memberof EventManager
   */
  dispatch(...args) {
    return this.fire(...args);
  }

  /**
   * Notify all event listeners.
   *
   * @param {T} args Arguments to call the event listeners with.
   * @returns {R[]} An array with the values returned from the listeners.
   * @memberof EventManager
   */
  fire(...args) {
    return this._fire(this._listeners.values(), args);
  }

  _fire(listeners, args) {
    const returned = [];
    for (let listener of listeners) {
      try {
        returned.push(listener.apply(null, args));
      } catch (error) {
        const stack = this._stackTraceWhenAdded.get(listener);
        console.error('Error during event handling!\n', error, '\nListener added at:\n', stack, '\nError at:\n', error.stack);
      }
    }
    return returned;
  }


  clear() {
    this._listeners.clear();
    this._stackTraceWhenAdded = new WeakMap();
    this._extraParameters = new WeakMap();
    if (this._onChange) {
      this._onChange.fire(this);
    }
  }


  // eslint-disable-next-line valid-jsdoc
  /**
   * The listeners that are subscribed to this event.
   *
   * @returns {((...args: T) => R)[]} An array of event listeners subscribed to this event.
   * @memberof EventManager
   */
  get listeners() {
    return Array.from(this._listeners.values());
  }
  // eslint-disable-next-line valid-jsdoc
  /**
   * @param {((...args: T) => R)[]} value Change the subscribed listeners to this array.
   * @memberof EventManager
   */
  set listeners(value) {
    this._listeners = new Set(value);
    if (this._onChange)
      this._onChange.fire(this);
  }

  get listenersLength() {
    return this._listeners.size;
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * An event that is triggered when the event listeners are changed. Args: manager, listener [optional], added [optional]
   *
   * @returns {EventSubscriber<[EventManager<T, R, E>] | [EventManager<T, R, E>, (...args: T) => R, boolean], any, any>} The event.
   * @readonly
   * @memberof EventManager
   */
  get onChanged() {
    if (!this._onChange)
      this._onChange = new EventManager();
    return this._onChange;
  }

  /**
   *
   *
   * @returns {EventSubscriber<T, R, E>} An event subscriber that is connected to this manager.
   * @readonly
   * @memberof EventManager
   */
  get subscriber() {
    if (!this._subscriber) {
      this._subscriber = new EventSubscriber(this._changeCallback);
      defineProperty(this._subscriber, '_listeners', () => this._listeners, (value) => { this._listeners = value; });
    }
    return this._subscriber;
  }
}

/**
 * An `EventManager` that is triggered by an `EventSubscriber`. The argument from the `EventSubscriber` can be modified
 * before it is passed to any `EventSubscriber` of this `EventManager`.
 *
 * @export
 * @class PassthroughEventManager
 * @extends {EventManager<T, R, E>}
 * @template {any[]} T
 * @template R
 * @template E
 * @template {any[]} IT The arguments for the wrapped inner event.
 * @template IR The return value of the wrapped inner event.
 */
export class PassthroughEventManager extends EventManager {

  /**
   * Create an event that passes on data from another event.
   *
   * @static
   * @param {EventSubscriber<IT, IR, E> | EventSubscriber<IT, IR, E>[]} originalEvent The original event or an array of events that will all be listened to.
   * @param {function(R[]): null | IR} returnModifier Allows modifying the returned values. The first argument is an array with the values the listeners returned. The array returned by this function will be used instead. If an array isn't returned then the return values will remain unmodified.
   * @param {function(IT): null | T} argumentModifier Modify the arguments passed to the listeners. The first arg is an array of the args that will be used. The array returned by this function will be used instead. If a false value is returned then the listeners will not be called.
   * @memberof EventManager
   */
  constructor(originalEvent, returnModifier = null, argumentModifier = null) {
    super();
    const checkIfFunction = (test) => test && typeof test === 'function';
    this._passOriginalEvents = Array.isArray(originalEvent) ? originalEvent : [originalEvent];
    this._passOriginalEventListeners = null;

    this._passReturnModifier = returnModifier;
    this._passHasReturnModifier = checkIfFunction(returnModifier);

    this._passArgumentModifier = argumentModifier;
    this._passHasArgumentModifier = checkIfFunction(argumentModifier);

    this._changeListener = new EventListener(this.onChanged, this._passOnChanged.bind(this));
  }

  _passOnChanged() {
    if (this.listenersLength === 0) {
      this._passStop();
    } else {
      this._passStart();
    }
  }

  /**
   * Trigger the event but modify the arguments and the returned values.
   *
   * @param {IT} args Arguments to modify and then use to call listeners.
   * @returns {IR[]} Modified return values from listeners.
   * @memberof PassthroughEventManager
   */
  fireWithModifiers(...args) {
    if (this.isDisposed) return [];

    // Modify event arguments:
    if (this._passHasArgumentModifier) {
      args = /** @type {any} */ (this._passArgumentModifier(args));
      if (!args || !Array.isArray(args)) {
        return [];
      }
    }

    // @ts-ignore
    const returned = this.fire(...args);

    // Modify event return values:
    if (this._passHasReturnModifier) {
      const fixedReturned = this._passReturnModifier(returned);
      if (fixedReturned && Array.isArray(fixedReturned)) {
        return fixedReturned;
      }
    }

    // @ts-ignore
    return returned;
  }

  /**
   * Handle wrapped event.
   *
   * @param {IT} args Arguments that the original event was called with.
   * @returns {IR} The return value for the listener to the wrapped event.
   * @memberof PassthroughEventManager
   */
  _passHandleEvent(...args) {
    const returned = this.fireWithModifiers(...args);

    if (returned.length === 1)
      return returned[0];

    let firstNotUndefined = undefined;
    for (const value of returned) {
      if (value) {
        // First true value gets priority.
        return value;
      }
      if (firstNotUndefined === undefined && value !== undefined) {
        firstNotUndefined = value;
      }
    }
    // If no true value then first value that wasn't undefined.
    return firstNotUndefined;
  }

  _passStart() {
    if (!this._passOriginalEventListeners) {
      this._passOriginalEventListeners = this._passOriginalEvents.map(event => new EventListener(event, this._passHandleEvent.bind(this)));
    }
  }
  _passStop() {
    if (this._passOriginalEventListeners) {
      for (const listener of this._passOriginalEventListeners) {
        listener.dispose();
      }
      this._passOriginalEventListeners = null;
    }
  }

  dispose() {
    this._changeListener.dispose();
    this._passStop();
  }
  get isDisposed() {
    return this._changeListener.isDisposed;
  }
  get onDisposed() {
    return this._changeListener.onDisposed;
  }
}
