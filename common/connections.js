'use strict';

import {
  EventListener,
  EventManager,
  PassthroughEventManager,
} from '../common/events.js';

import {
  DisposableCollection
} from '../common/disposables.js';


export class PortManager {
  constructor() {
    this._isDisposed = false;
    this._onDisposed = new EventManager();

    this._onMessage = new EventManager();

    this._disposables = new DisposableCollection();
    /** @type {DisposableCollection<PortConnection> } */
    this._ports = new DisposableCollection();

    this._disposables.trackDisposables([
      this._ports,
      new EventListener(browser.runtime.onMessage, this._handleMessage.bind(this)),
      new EventListener(browser.runtime.onConnect, (port) => this._ports.trackDisposables(new PortConnection(port))),
    ]);
  }

  getPortById(portId) {
    for (let port of this.openPorts) {
      if (port.id === portId) {
        return port;
      }
    }
    return null;
  }

  fireEvent(eventName, args = []) {
    for (let port of this.openPorts) {
      port.fireEvent(eventName, args);
    }
  }

  _handleMessage(message, sender) {
    if (this._onMessage.listenersLength === 0)
      return;

    const port = this.getPortById(message.portId);

    const disposables = new DisposableCollection();
    if (port)
      port.operations.trackDisposables(disposables);

    const messageReturns = this._onMessage.fire(message, sender, disposables, this);

    let done = false;
    let firstDefined;
    const promise = (async () => {
      for (const value of messageReturns) {
        if (value) {
          firstDefined = value;
          break;
        }
        if (firstDefined === undefined) {
          firstDefined = value;
        }
      }
      try {
        await firstDefined;
      } catch (error) {
        console.log('Error on async runtime message handling\n', error, '\nStack Trace:\n', error.stack);
      }
      disposables.dispose();
      done = true;
      return firstDefined;
    })();

    return done && firstDefined === undefined ? undefined : promise;
  }

  // #region Dispose

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._disposables.dispose();
    this._onDisposed.fire(this);
  }

  get isDisposed() {
    return this._isDisposed;
  }
  get onDisposed() {
    return this._onDisposed.subscriber;
  }

  // #endregion Dispose

  get openPorts() {
    return this._ports.array;
  }
  get onMessage() {
    return this._onMessage.subscriber;
  }
}


export class PortConnection {
  constructor(port = null) {
    if (!port) {
      port = browser.runtime.connect({ name: PortConnection.getUniqueId() });
    }

    this._isDisposed = false;
    this._onDisposed = new EventManager();

    this._onPortEvent = new EventManager();
    this._passthroughEventNameLookup = new Map();
    /** Name of events that will be sent to this port. */
    this._subscribedEventNames = [];
    /** Name of events that are requested from this port. Message should be sent with data from these events. */
    this._listeningEventNames = [];

    this._port = port;
    this._operations = new DisposableCollection();

    // #region Dispose

    if (port.error) {
      this._dispose(true);
      return;
    }
    port.onDisconnect.addListener(() => this._dispose(true));
    this._operations.onDisposed.addListener(() => this.dispose());

    // #endregion Dispose


    port.onMessage.addListener((message) => this._handleMessage(message));
    this._onPortEvent.onChanged.addListener((manager, listener, added) => this._handleSubscribedEventsChanged(listener, added));
  }

  _handleMessage(message) {
    if (!message) {
      return;
    }
    switch (message.type) {
      case PortConnection.messageTypes.eventData: {
        this._onPortEvent.fire(message);
      } break;
      case PortConnection.messageTypes.eventSubscribe: {
        this._listeningEventNames = message.subscribeEventNames;
      } break;
    }
  }

  _handleSubscribedEventsChanged(listener, added) {
    if (this.isDisposed) {
      return;
    }
    let changed = false;
    let subscribed = this._getSubscribedEventNames();
    if (
      subscribed.some(shouldSub => !this._subscribedEventNames.includes(shouldSub)) ||  // Any new event names?
      this._subscribedEventNames.some(subed => !subscribed.includes(subed))             // Any removed event names?
    ) {
      this._subscribedEventNames = subscribed;
      changed = true;
    }
    if (changed) {
      this._port.postMessage({ type: PortConnection.messageTypes.eventSubscribe, subscribeEventNames: this._subscribedEventNames });
    }
  }

  sendMessageBoundToPort(message) {
    message.portId = this.id;
    return browser.runtime.sendMessage(message);
  }

  fireEvent(eventName, args) {
    if (this.isDisposed) {
      return;
    }
    if (this._listeningEventNames.includes(eventName)) {
      this._port.postMessage({ type: PortConnection.messageTypes.eventData, eventName: eventName, eventArgs: args });
    }
  }

  getEvent(eventName) {
    const event = new PassthroughEventManager(
      this._onPortEvent,
      (returnedValues) => {
        return false; // Return false to the original event.
      },
      (args) => {
        if (args.length === 0)
          return false; // Don't call the listeners.

        const message = args[0];
        if (message.type !== PortConnection.messageTypes.eventData || message.eventName !== eventName)
          return false; // Don't call the listeners.

        return message.eventArgs || []; // Call the listeners with these arguments.
      }
    );
    this._passthroughEventNameLookup.set(event, eventName);
    return event;
  }

  getListeningEventNames() {
    return this._listeningEventNames;
  }
  getSubscribedEventNames() {
    return this._subscribedEventNames;
  }

  _getSubscribedEventNames() {
    return Array.from(this._passthroughEventNameLookup.keys()).filter(event => event.listenersLength > 0).map(event => this._passthroughEventNameLookup.get(event));
  }


  // #region Dispose

  _dispose(portDisconnected = false) {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    if (!portDisconnected) {
      this._port.disconnect();
    }
    this._passthroughEventNameLookup.clear();
    this._subscribedEventNames = [];
    this._listeningEventNames = [];

    this._operations.dispose();
    this._onDisposed.fire(this);
  }
  dispose() {
    this._dispose(false);
  }

  get isDisposed() {
    return this._isDisposed;
  }
  get onDisposed() {
    return this._onDisposed.subscriber;
  }

  // #endregion Dispose


  get id() {
    return this._port.name;
  }

  get operations() {
    return this._operations;
  }

  static getUniqueId() {
    // print random number in base 36
    return 'id-' + Math.random().toString(36).substr(2, 16);
  }
}
PortConnection.messageTypes = Object.freeze({
  eventSubscribe: 'event-subscribe',
  eventData: 'event-data',
});