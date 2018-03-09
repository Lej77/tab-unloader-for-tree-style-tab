
const messagePrefix = 'message_';


async function initiatePage() {
    let settings = Settings.get(new Settings());
    // Create mouse click info:
    let mouseAreas = [
        createMouseClickArea('options_unloadOnLeftClick', 'unloadOnLeftClick'),
        createMouseClickArea('options_unloadOnMiddleClick', 'unloadOnMiddleClick'),
        createMouseClickArea('options_unloadOnRightClick', 'unloadOnRightClick'),
    ];
    for (let mouseArea of mouseAreas) {
        document.body.appendChild(mouseArea.area);
    }
    // Create check boxes:
    for (let chb of [
        createCheckBox('unloadInTSTContextMenu', 'options_unloadInTSTContextMenu'),
        createCheckBox('dimUnloadedTabs', 'options_dimUnloadedTabs'),
    ]) {
        document.body.appendChild(chb.area);
    }
    setTextMessages();
    settings = await settings;

    for (let key of Object.keys(settings)) {
        let element = document.getElementById(key);
        if (!element) {
            continue;
        }

        let propertyName;
        if (element.type === 'checkbox') {
            propertyName = 'checked';
        } else {
            propertyName = 'value';
        }

        element[propertyName] = settings[key];
        element.addEventListener("input", e => {
            Settings.set(key, e.target[propertyName]);
        });
    }

    for (let area of mouseAreas) {
        let obj = area.combo;
        let key = area.settingKey;

        // Apply settings data to document:
        obj.update(settings[key]);
        area.settingsLoaded.fire();

        // Track document changes and save to settings:
        new EventListener(obj.onChange, () => {
            Settings.set(key, obj.data);
        });
    }
}


function setTextMessages(elementsToText) {
    if (!elementsToText) {
        elementsToText = document.querySelectorAll(`*[class*='${messagePrefix}']`);
    } else if (!Array.isArray(elementsToText)) {
        elementsToText = [elementsToText];
    }
    for (let i = 0; i < elementsToText.length; i++) {
        let ele = elementsToText[i];
        for (let c of ele.classList) {
            if (c.length > messagePrefix.length && c.startsWith(messagePrefix)) {
                let messageId = c.substring(messagePrefix.length);
                ele.textContent = browser.i18n.getMessage(messageId);
                break;
            }
        }
    }
}


function createMouseClickArea(message, settingKey) {

    // #region MouseClickCombo Object

    let obj = new MouseClickCombo();
    let settingsLoadedEvent = new EventManager();

    var bindCheckboxToObj = (checkbox, key, callback) => bindElementToObj(checkbox, 'checked', key, callback);
    var bindElementToObj = (element, property, key, callback) => {
        let _callback = (value) => {
            if (callback && typeof callback === "function") {
                callback(value);
            }
        }
        let listener = new EventListener(settingsLoadedEvent.subscriber, () => {
            element[property] = obj[key];
            _callback(element[property]);
        });
        element.addEventListener("input", e => {
            obj[key] = e.target[property];
            _callback(e.target[property]);
        });
        _callback(element[property]);
    }

    // #endregion MouseClickCombo Object


    let area = document.createElement('div');
    area.classList.add('mouseClickArea');


    // #region Mouse Click

    let mouseButton = createCheckBox(null, message);
    bindCheckboxToObj(mouseButton.checkbox, 'enabled',
        (checked) => {
            toggleClass(area, 'enabled', checked);
        }
    );
    area.appendChild(mouseButton.area);

    // #endregion Mouse Click


    // #region Modifier Keys

    let modArea = document.createElement('div');
    modArea.classList.add('modifierKeysArea');
    area.appendChild(modArea);


    let modifierKeysInfo = document.createElement('label');
    modifierKeysInfo.classList.add(messagePrefix + 'options_modifierKeysInfo')
    modArea.appendChild(modifierKeysInfo);


    modArea.appendChild(document.createElement('br'));


    let createModifierKey = (mod, message) => {
        let modCheckbox = createCheckBox(null, message);
        bindCheckboxToObj(modCheckbox.checkbox, mod)
        modArea.appendChild(modCheckbox.area);
    }

    let messageModPrefix = 'options_modifierKey_';
    for (let mod of ['ctrl', 'shift', 'alt', 'meta']) {
        createModifierKey(mod, messageModPrefix + mod.charAt(0).toUpperCase() + mod.slice(1));
    }


    modArea.appendChild(document.createElement('br'));


    let modAnyMode = createCheckBox(null, 'options_modifierKeysAnyMode');
    bindCheckboxToObj(modAnyMode.checkbox, 'anyKeyMode')
    modArea.appendChild(modAnyMode.area);

    // #endregion Modifier Keys


    // #region Click duration

    let timeoutArea = document.createElement('div');
    timeoutArea.classList.add('clickDurationArea');
    area.appendChild(timeoutArea);


    let timeoutInfo = document.createElement('text');
    timeoutInfo.classList.add(messagePrefix + 'options_clickTimeoutInfo');
    timeoutArea.appendChild(timeoutInfo);


    let maxTimeoutArea = createNumberInput('options_clickTimeoutMax', 0, true);
    maxTimeoutArea.area.classList.add('timeout')
    bindElementToObj(maxTimeoutArea.input, 'value', 'maxTimeout');
    timeoutArea.appendChild(maxTimeoutArea.area);


    let minTimeoutArea = createNumberInput('options_clickTimeoutMin', 0, true);
    minTimeoutArea.area.classList.add('timeout')
    bindElementToObj(minTimeoutArea.input, 'value', 'minTimeout');
    timeoutArea.appendChild(minTimeoutArea.area);

    // #endregion Click duration


    // #region Double Clicks

    let doubleClickArea = document.createElement('div');
    doubleClickArea.classList.add('doubleClickArea');
    area.appendChild(doubleClickArea);


    let doubleClickEnabled = createCheckBox(null, 'options_doubleClick_enabled');
    bindCheckboxToObj(doubleClickEnabled.checkbox, 'doubleClickEnabled',
        (checked) => {
            toggleClass(doubleClickArea, 'enabled', checked);
        }
    );
    doubleClickArea.appendChild(doubleClickEnabled.area);


    doubleClickArea.appendChild(document.createElement('br'));


    let doubleClickOnly = createCheckBox(null, 'options_doubleClick_only');
    bindCheckboxToObj(doubleClickOnly.checkbox, 'doubleClickOnly');
    doubleClickArea.appendChild(doubleClickOnly.area);


    doubleClickArea.appendChild(document.createElement('br'));

    
    let doubleClickTimeout = createNumberInput('options_doubleClick_timeout', 1, true);
    doubleClickTimeout.area.classList.add('timeout')
    bindElementToObj(doubleClickTimeout.input, 'value', 'doubleClickTimeout');
    doubleClickArea.appendChild(doubleClickTimeout.area);

    // #endregion Double Clicks


    return { area: area, combo: obj, settingsLoaded: settingsLoadedEvent, settingKey: settingKey };
}


function createCheckBox(id, message) {
    let ele = document.createElement('label');

    let checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    if (id) {
        checkbox.id = id;
    }
    ele.appendChild(checkbox);

    let label = document.createElement('text');
    label.classList.add(messagePrefix + message);
    ele.appendChild(label)

    return { area: ele, checkbox: checkbox, label: label };
}


function createNumberInput(message, min = 0, newLine = false) {
    let timeoutArea = document.createElement('div');

    let timeoutText = document.createElement('text')
    timeoutText.classList.add(messagePrefix + message);
    timeoutArea.appendChild(timeoutText);

    if (newLine) {
        timeoutArea.appendChild(document.createElement('br'))
    }

    let timeoutInput = document.createElement('input');
    timeoutInput.type = 'number';
    if (min || min === 0) {
        timeoutInput.min = min;
    }
    timeoutArea.appendChild(timeoutInput);

    return { area: timeoutArea, input: timeoutInput, text: timeoutText };
}


function toggleClass(element, className, enabled) {
    if (enabled) {
        element.classList.add(className);
    } else {
        element.classList.remove(className);
    }
}


initiatePage();