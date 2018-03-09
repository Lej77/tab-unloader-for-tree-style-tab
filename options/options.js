
const messagePrefix = 'message_';


async function initiatePage() {
    let settings = Settings.get(new Settings());
    // Create mouse click info:
    let mouseAreas = [
        createMouseClickArea('options_unloadOnLeftClick', 'unloadOnLeftClick'),
        // createMouseClickArea('options_unloadOnMiddleClick', 'unloadOnMiddleClick'),
        createMouseClickArea('options_unloadOnRightClick', 'unloadOnRightClick'),
    ];
    for (let mouseArea of mouseAreas) {
        document.body.appendChild(mouseArea.area);
    }
    // Create check boxes:
    for (let chb of [
        createCheckBox('unloadInTSTContextMenu', 'options_unloadInTSTContextMenu'),
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


    let area = document.createElement('div');
    area.classList.add('mouseClickArea');


    let mouseButton = createCheckBox(null, message);
    bindCheckboxToObj(mouseButton.checkbox, 'enabled',
        (checked) => {
            let enabledClass = 'enabled';
            if (checked) {
                area.classList.add(enabledClass);
            } else {
                area.classList.remove(enabledClass);
            }
        }
    );
    area.appendChild(mouseButton.area);


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


    let timeoutArea = document.createElement('div');
    timeoutArea.classList.add('timeout')
    area.appendChild(timeoutArea);

    let timeoutText = document.createElement('text')
    timeoutText.classList.add(messagePrefix + 'options_clickTimeout');
    timeoutArea.appendChild(timeoutText);

    let timeoutInput = document.createElement('input');
    timeoutInput.type = 'number';
    timeoutInput.min = 0;
    timeoutInput.value = 0;
    bindElementToObj(timeoutInput, 'value', 'timeout');
    timeoutArea.appendChild(timeoutInput);


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


initiatePage();