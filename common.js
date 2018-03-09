
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
        data = {};
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

// #endregion Utilities



class MouseClickCombo {
    constructor() {
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


        let onChangeManager = new EventManager();
        this.onChange = onChangeManager.subscriber;


        let props = MouseClickCombo.getDefaultValues();
        defineProperty(this, 'data',
            function () {
                return Object.assign({}, props)
            }
        );


        for (let key of Object.keys(props)) {
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


        this.test = (ctrl, shift, alt, meta) => {
            if (!props.enabled) {
                return false;
            }

            let any = ctrl || shift || alt || meta;
            if (!props.ctrl && !props.shift && !props.alt && !props.meta) {
                if (any) {
                    return false;
                } else {
                    return true;
                }
            }

            if (ctrl && !props.ctrl ||
                shift && !props.shift ||
                alt && !props.alt ||
                meta && !props.meta) {
                return false;
            } else if (any) {
                return true;
            } else {
                return false;
            }
        }
    }

    update(newData) {
        for (let key of Object.keys(newData)) {
            this[key] = newData[key];
        }
    }

    static getDefaultValues() {
        return {
            enabled: false,

            ctrl: false,
            shift: false,
            alt: false,
            meta: false,

            timeout: 500,
        };
    }
}



class Settings {
    constructor() {
        Object.assign(this, Settings.getDefaultValues());
    }

    static getDefaultValues() {
        return {
            unloadOnLeftClick: Object.assign(MouseClickCombo.getDefaultValues(), { enabled: true, alt: true, meta: true }),
            unloadOnMiddleClick: Object.assign(MouseClickCombo.getDefaultValues(), { enabled: true }),
            unloadOnRightClick: Object.assign(MouseClickCombo.getDefaultValues(), { ctrl: true, shift: true, alt: true, meta: true }),
            unloadInTSTContextMenu: true,
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

        let changedProperties = [];
        let changeListener = Settings.createChangeEventListener((changes, areaName) => {
            if (areaName === storageArea) {
                let keys = Object.keys(changes);
                if (changedProperties) {
                    changedProperties.push.apply(keys.filter((change) => !changedProperties.includes(change)));
                }
                for (let key of keys) {
                    let newValue = changes[key].newValue;
                    if (newValue) {
                        this.settings[key] = newValue;
                    } else {
                        delete this.settings[key];
                    }
                }
                try {
                    if (callback && typeof callback === "function") {
                        callback(changes, areaName);
                    }
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
    }
}