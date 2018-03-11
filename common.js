
// #region Utilities

async function delay(timeInMilliseconds) {
    return await new Promise((resolve, reject) => setTimeout(resolve, timeInMilliseconds));
}

let createObjectFromKeys = function (
    keys,                   // array of strings.
    values,                 // object, or array of objects.
    defaultValue = null     // object.
) {
    if (keys && Array.isArray(keys)) {
        let data = {};
        let valueIsArray = Array.isArray(values);
        for (let i = 0; i < keys.length; i++) {
            if (typeof keys[i] === "string")
                data[keys[i]] = valueIsArray ? (i < values.length ? values[i] : defaultValue) : values;
        }
        return data;
    } else {
        return keys;
    }
}

let defineProperty = (obj, propertyName, get, set) => {
    let getSet = {};
    if (get) {
        getSet.get = get;
    }
    if (set) {
        getSet.set = set;
    }
    Object.defineProperty(obj, propertyName, getSet)
}

let checkAny = (array) => {
    array = array.filter(value => value);
    if (array.length === 0) {
        return false;
    }

    let promiseWrapper = new PromiseWrapper();

    let promises = 0;
    let waitForValue = async (value) => {
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

    promises++;
    for (let value of array) {
        promises++;
        waitForValue(value);
    }
    promises--;

    if (promises <= 0) {
        promiseWrapper.resolve(false);
    }
    return promiseWrapper.getValue();
}

// #endregion Utilities



class MouseClickComboCollection {
    constructor(array) {
        this.combos = array;
    }

    update(changes, settings) {
        let changedKeys = Object.keys(changes);
        for (let combo of this.combos) {
            let key = combo.info.settingKey;
            if (key && changedKeys.includes(key)) {
                combo.update(settings[key]);
            }
        }
    }

    static createStandard() {
        let standardMessages = {

        };
        let getStandardMessages = () => {
            return Object.assign({}, standardMessages);
        }
        let getStandardInfo = () => {
            let obj = {
                get allowDragDrop() {
                    return obj.button === 0;
                },
            };
            return obj;
        }
        let createInfo = (obj) => {
            let info = Object.assign(getStandardInfo(), obj);
            info.messages = Object.assign(getStandardMessages(), info.messages);
            return info;
        }
        return new MouseClickComboCollection([
            new MouseClickCombo(createInfo({
                button: 0,
                settingKey: 'unloadOnLeftClick',
                messages: {
                    enable: 'options_unloadOnLeftClick',
                },
            })),
            new MouseClickCombo(createInfo({
                button: 1,
                settingKey: 'unloadOnMiddleClick',
                messages: {
                    enable: 'options_unloadOnMiddleClick',
                },
            })),
            new MouseClickCombo(createInfo({
                button: 2,
                settingKey: 'unloadOnRightClick',
                messages: {
                    enable: 'options_unloadOnRightClick',
                },
            })),
            new MouseClickCombo(createInfo({
                button: 0,
                settingKey: 'selectOnLeftClick',
                messages: {
                    enable: 'options_selectOnLeftClick',
                },

                dontUnload: true,
                allwaysPreventTSTAction: true,
                applyToUnloadedTabs: true,
                allowForAll: true,
            })),
        ]);
    }
}



class MouseClickCombo {
    constructor(info = {}) {
        let onChangeManager = new EventManager();
        this.onChange = onChangeManager.subscriber;


        let props = MouseClickCombo.getDefaultValues();
        defineProperty(this, 'data',
            function () {
                return Object.assign({}, props)
            }
        );
        let propKeys = Object.keys(props);

        for (let key of propKeys) {
            defineProperty(this, key,
                function () {
                    return props[key];
                },
                function (value) {
                    if (props[key] === value) {
                        return;
                    }
                    props[key] = value;
                    onChangeManager.fire(key, value);
                }
            );
        }


        this.info = info;


        this.update = (newData) => {
            for (let key of Object.keys(newData)) {
                if (propKeys.includes(key)) {
                    this[key] = newData[key];
                }
            }
        }


        this.test = (ctrl, shift, alt, meta) => {
            if (!props.enabled) {
                return false;
            }

            if (props.anyKeyMode) {
                return (
                    ctrl && props.ctrl ||
                    shift && props.shift ||
                    alt && props.alt ||
                    meta && props.meta ||
                    (!props.ctrl && !props.shift && !props.alt && !props.meta)
                );
            } else {
                return (
                    ctrl == props.ctrl &&
                    shift == props.shift &&
                    alt == props.alt &&
                    meta == props.meta
                );
            }
        }
    }

    static getDefaultValues() {
        return {
            enabled: false,

            anyKeyMode: true,          // If true then at least one of the selected keys must be pressed (but not all). If there are no selected keys then allways unload tabs on click.
            ctrl: false,
            shift: false,
            alt: false,
            meta: false,

            maxTimeout: 500,            // Maximum time between mouse-down and mouse-up events to trigger tab unload. Prevents unload operation if tab is long pressed or being dragged.
            minTimeout: 0,              // Minium time between mouse-down and mouse-up events to trigger tab unload. Allows for long pressing tabs to unload them.

            doubleClickEnabled: false,  // If true then special behavior will be implemented for double clicks.
            doubleClickOnly: true,      // If true then only double clicks will unload tabs; otherwise double clicks will cancel the unload operation from the first click.
            doubleClickTimeout: 500,    // Maximum time between mouse-down events to be recognized as a double click.

            onDragEnabled: false,        // Wait for drag events before discarding tab.
            onDragCancel: false,         // If true then tab will not be unloaded if drag events occured; otherwise tab will only be unloaded if drag events occured.
            onDragMouseUpTrigger: false, // If true then if a mouse up event is registered before the timeout it counts as a drag event.
            onDragTimeout: 500,          // Time in milliseconds to wait for drag events before unloading tab.

            dontPreventTSTAction: false,    // Don't prevent Tree Style Tab's default action while waiting to decide if the tab should be unloaded.
            applyToAllTabs: false,          // Apply click on both loaded and unloaded tabs.
            applyToUnloadedTabs: false,     // Apply click on unloaded tabs instead of loaded tabs.
        };
    }
}



class Settings {
    constructor() {
        Object.assign(this, Settings.getDefaultValues());
    }

    static getDefaultValues() {
        let createComboData = (data) => {
            return Object.assign(MouseClickCombo.getDefaultValues(), data);
        }
        return {
            unloadOnLeftClick: createComboData({
                enabled: true,
                alt: true,
                meta: true
            }),
            unloadOnMiddleClick: createComboData({
                enabled: true,
                maxTimeout: 0,
                minTimeout: 150
            }),
            unloadOnRightClick: createComboData({
                enabled: true,
                ctrl: true,
                shift: true,
                alt: true,
                meta: true
            }),
            selectOnLeftClick: createComboData({
                enabled: false,
                maxTimeout: 0,
                minTimeout: 500,
                doubleClickOnly: false,
                onDragEnabled: true,
                onDragCancel: true,
                onDragMouseUpTrigger: true,
                applyToUnloadedTabs: true
            }),
            unloadInTSTContextMenu: true,
            dimUnloadedTabs: true,
        }
    }


    // #region Manage storage

    static async get(
        key,                    // string, array of string, or object (property names are keys and values are set values).
        defaultValue = null     // object, or array of objects. Ignored if key is an object (not string).
    ) {
        if (typeof key === "string") {
            return (await browser.storage.local.get({ [key]: defaultValue }))[key];
        } else {
            let data = createObjectFromKeys(key, defaultValue);
            return await browser.storage.local.get(data);
        }
    }
    static async set(
        key,            // string, array of string, or object (property names are keys and values are set values).
        value = null    // object, or array of objects. Ignored if key is an object (not string).
    ) {
        if (typeof key === "string") {
            return await browser.storage.local.set({
                [key]: value
            });
        } else {
            let data = createObjectFromKeys(key, value);
            return await browser.storage.local.set(data);
        }
    }
    static async remove(
        key     // string, or array of strings.
    ) {
        return browser.storage.local.remove(key);
    }
    static async clear() {
        return browser.storage.local.clear();
    }

    // #endregion Manage storage


    static createChangeEventListener(
        callback    // Function that will be called when this event occurs. The function will be passed the following arguments:
        // changes:    object. Object describing the change. This contains one property for each key that changed. The name of the property is the name of the key that changed, and its value is a storage.StorageChange object describing the change to that item.
        // areaName:   string. The name of the storage area ("sync", "local" or "managed") to which the changes were made.
    ) {
        return new EventListener(browser.storage.onChanged, callback);
    }
}



class SettingsTracker {
    constructor(
        storageArea = null,
        callback = null
    ) {
        if (!storageArea || typeof storageArea !== "string") {
            storageArea = "local";
        }

        this.settings = new Settings();
        let onChangedManager = new EventManager();
        this.onChanged = onChangedManager.subscriber;
        this.onChanged.addListener(callback);

        let changedProperties = [];
        let changeListener = Settings.createChangeEventListener((changes, areaName) => {
            if (areaName === storageArea) {
                let keys = Object.keys(changes);
                if (changedProperties) {
                    changedProperties.push.apply(keys.filter((change) => !changedProperties.includes(change)));
                }
                for (let key of keys) {
                    let change = changes[key];
                    if (Object.keys(change).includes('newValue')) {
                        this.settings[key] = change.newValue;
                    } else {
                        delete this.settings[key];
                    }
                }
                try {
                    onChangedManager.fire(changes, areaName, this.settings);
                } catch (error) { }
            }
        });
        let start = async () => {
            let allSettings = await Settings.get(null);
            for (let key of Object.keys(allSettings)) {
                if (!changedProperties.includes(key)) {
                    this.settings[key] = allSettings[key];
                }
            }
            changedProperties = null;
        };

        this.start = start();
        this.stop = () => {
            changeListener.close();
        };
    }
}



class EventListener {
    constructor(event, callback) {
        this._callback = callback;
        this._event = event;
        this._event.addListener(this._callback);
    }

    close() {
        if (this._callback) {
            this._event.removeListener(this._callback)
            this._callback = null;
        }
    }
    get isDisposed() {
        return !Boolean(this._callback);
    }
    get isActive() {
        return this._event.hasListener(this._callback);
    }
}



class EventManager {
    constructor() {
        let listeners = [];

        this.subscriber = {
            addListener(listener) {
                if (!listener || typeof listener !== 'function') {
                    return;
                }
                if (listeners.includes(listener)) {
                    return;
                }
                listeners.push(listener);
            },
            removeListener(listener) {
                if (listeners.includes(listener)) {
                    listeners = listeners.filter((l) => l !== listener);
                }
            },
            hasListener(listener) {
                return listeners.includes(listener);
            }
        }

        this.fire = function () {
            let returned = [];
            let args = Array.from(arguments);
            for (let listener of listeners) {
                try {
                    returned.push(listener.apply(null, args));
                } catch (error) {
                    console.log('Error during event handling!' + '\n' + error);
                }
            }
            return returned;
        }
        defineProperty(this, 'listeners', () => listeners, (value) => { listeners = value; });
    }
}



class PromiseWrapper {
    constructor(createPromise = true) {
        let _resolve;
        let _reject;
        let _value;
        let _isError = false;
        let _set = false;
        let _promise;
        let _promiseCreated = false;

        let _createPromise = () => {
            if (_promiseCreated) {
                return;
            }
            _promiseCreated = true;
            _promise = new Promise((resolve, reject) => {
                if (_set) {
                    if (_isError) {
                        reject(_value);
                    } else {
                        resolve(_value);
                    }
                } else {
                    _resolve = resolve;
                    _reject = reject;
                }
            })
        }
        let setInternal = (value, isError) => {
            if (_set) {
                return;
            }
            _set = true;
            _isError = isError;
            _value = value;

            this.done = true;
            this.isError = isError;
            this.value = value;

            if (isError) {
                if (_reject) {
                    _reject(value);
                }
            } else {
                if (_resolve) {
                    _resolve(value);
                }
            }
        }
        defineProperty(this, 'promise', () => {
            if (!_promiseCreated) {
                _createPromise();
            }
            return _promise;
        });

        this.resolve = (value) => setInternal(value, false);
        this.reject = (value) => setInternal(value, true);
        this.getValue = () => {
            if (_promiseCreated) {
                return _promise;
            }
            if (!_set || _isError) {
                _createPromise();
                return _promise;
            } else {
                return _value;
            }
        }
        if (createPromise) {
            _createPromise();
        } else {
            this.start = () => _createPromise();
        }
    }
}



class Timeout {
    constructor(callback, timeInMilliseconds) {
        let timeoutId = null;
        let stop = () => {
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
        };
        if (callback && typeof callback === 'function') {
            timeoutId = setTimeout(() => {
                timeoutId = null;
                callback();
            }, timeInMilliseconds);
        }
        this.stop = () => stop();
        defineProperty(this, 'isActive', () => timeoutId !== null);
    }
}



class DisposableCollection {
    constructor() {
        var trackedDisposables = [];
        var isDisposed = false;
        var disposeFunctionNames = [
            'stop',
            'close',
            'cancel',
        ]
        var callFunction = (obj, functionName) => {
            if (obj[functionName] && typeof obj[functionName] === 'function') {
                obj[functionName]();
                return true;
            }
            return false;
        }
        var dispose = (obj) => {
            for (let disposeFunctionName of disposeFunctionNames) {
                if (callFunction(obj, disposeFunctionName)) {
                    break;
                }
            }
        }
        var disposeAll = () => {
            for (let disposable of trackedDisposables) {
                dispose(disposable);
            }
        }
        this.dispose = () => {
            disposeAll();
            isDisposed = true;
        };

        this.trackDisposables = (disposables) => {
            if (!disposables) {
                return;
            }
            if (!Array.isArray(disposables)) {
                disposables = [disposables];
            }
            for (let disposable of disposables) {
                if (isDisposed) {
                    dispose(disposable);
                }
                if (!trackedDisposables.includes(disposable)) {
                    trackedDisposables.push(disposable);
                }
            }
        }
        defineProperty(this, 'isDisposed', () => isDisposed);
    }
}



class OperationManager {
    constructor() {
        var promiseWrapper = new PromiseWrapper(false);
        let disposableCollection = new DisposableCollection();

        let setValue = (value, isError = false) => {
            if (isError) {
                promiseWrapper.reject(value);
            } else {
                promiseWrapper.resolve(value);
            }
            disposableCollection.dispose();
        }

        this.trackDisposables = (disposables) => disposableCollection.trackDisposables(disposables);

        defineProperty(this, 'done', () => promiseWrapper.done);

        defineProperty(this, 'value',
            () => promiseWrapper.getValue(),
            (value) => setValue(value)
        )

        this.resolve = (value) => setValue(value);
        this.reject = (value) => setValue(value, true);
    }
}