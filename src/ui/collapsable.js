'use strict';

import {
  toggleClass,
} from '../ui/utilities.js';

import {
  defineProperty
} from '../common/utilities.js';

import {
  RequestManager,
} from '../common/delays.js';


/**
 * An object with info that can be used to determine if a section is enabled.
 *
 * @typedef {Object} EnabledChecker
 * @property {Element | Element[]} Data.element The element(s) that can be enabled.
 * @property { (setToError: () => void) => (boolean | Promise<boolean>) } Data.check A function that will be called to determine if a section should be enabled. The argument is another function that can be called to indicate that an error has occurred in the section.
 */
null;

/**
 * Info about a binding between a collapsable section and a DOM element.
 *
 * @typedef {Object} BoundCollapsableAreasInfo
 * @property {WeakMap<Element, CollapsableAreaInfo>} Info.sectionLookup Lookup to get the section info for each document element.
 * @property {Map<Element, function(): void>} Info.checkLookup Lookup to get the check function for each document element. Call this to re-check if the element's section should be enabled.
 * @property {function(): void} Info.checkAll Call this to re-check all element to see if they should be enabled.
 * @property {function(Element): void} Info.checkElement Call this to re-check an element to see if it should be enabled.
 */
null;

/**
 * A collapsable section that has a title that can be clicked to collapse/expand an area below it.
 *
 * @typedef {Object} CollapsableAreaInfo
 * @property {HTMLDivElement} Info.area The div that represent the whole collapsable area.
 * @property {HTMLDivElement} Info.title The div that represent the sections header.
 * @property {HTMLDivElement} Info.content The div that represent the sections content. This can be collapsed to become hidden.
 * @property {(value: boolean) => void} Info.setCollapsedWithoutAnimation Set the `isCollapsed` property without using any animations.
 * @property {boolean} Info.isButton Determines if the title area can be navigated to with the tab key.
 * @property {boolean} Info.isCollapsed Determines if the content area is hidden/collapsed.
 * @property {AnimationInfo} Info.animationInfo Determines the animation that is used to collapse and expand the content area.
 *
 */
null;


/**
 * Find elements that are marked as sections and create sections for them.
 *
 * @export
 * @param {Object} [details] Configure how elements are bound to sections.
 * @param {string} [details.sectionQuery] The query that will be used to find the elements that should be bound to sections.
 * @param {AnimationInfo} [details.animationInfo] An animation info object to use for the created sections.
 * @param {EnabledChecker | EnabledChecker[]} [details.enabledCheck] An object that can be used to determine if an area is enabled or disabled.
 * @param {boolean} [details.cacheEnabledStatus] Determines if enable status is cached in a local variable for each element or if it is set to the DOM for every check.
 * @returns {BoundCollapsableAreasInfo} Info about the bound areas.
 */
export function bindCollapsableAreas({
  sectionQuery = '.sectionArea',
  animationInfo = null,
  enabledCheck = null,
  cacheEnabledStatus = true,
} = {}) {
  if (enabledCheck && !Array.isArray(enabledCheck)) {
    enabledCheck = [enabledCheck];
  }

  /** @type {any} */
  let originalAnimation = { standard: true };
  if (animationInfo) {
    originalAnimation = Object.assign({}, animationInfo);
  }
  animationInfo = AnimationInfo.asInfo(animationInfo);
  animationInfo.update({ standard: false });

  /** @type {WeakMap<Element, CollapsableAreaInfo>} */
  const sectionLookup = new WeakMap();
  /** @type {Map<Element, function(): void>} */
  const checkLookup = new Map();

  const sectionAreas = document.querySelectorAll(sectionQuery);
  for (const area of sectionAreas) {
    const section = createCollapsableArea(animationInfo);
    sectionLookup.set(area, section);

    /** @type {null | EnabledChecker[]} */
    const affectedChecks = enabledCheck && (/** @type {EnabledChecker[]} */ (enabledCheck)).filter(checker => {
      if (!checker || !checker.element) return false;
      if (Array.isArray(checker.element)) return checker.element.some(element => element === area);
      else return checker.element === area;
    });
    if (affectedChecks && affectedChecks.length > 0) {
      const checks = affectedChecks.map(checker => checker.check);
      let isEnabled = false;
      let hasError = false;
      // Ensure expensive async checks don't overlap and aren't queued forever:
      const requestManager = new RequestManager(async () => {
        try {
          let error = false;
          const setError = () => {
            error = true;
          };
          const enabled = (await Promise.all(checks.map(callback => callback(setError)))).every(enabled => enabled);

          if (!cacheEnabledStatus || isEnabled !== enabled) {
            toggleClass(section.title, 'enabled', enabled);
            isEnabled = enabled;
          }
          if (!cacheEnabledStatus || hasError !== error) {
            toggleClass(section.title, 'error', error);
            hasError = error;
          }
        } catch (error) {
          console.error('Failed to check the enabled status for a section: ', error);
        }
      }, -1, false);

      let firstCheck = true;
      const check = () => {
        // This section has enabled behaviour:
        if (firstCheck) {
          section.title.classList.add('enablable');
          firstCheck = true;
        }

        // Check current enabled status:
        requestManager.invalidate();
      };
      checkLookup.set(area, check);
    }

    section.isCollapsed = area.classList.contains('collapsed');
    section.title.classList.add('center');
    section.area.classList.add('standardFormat');
    area.parentElement.insertBefore(section.area, area);

    section.content.appendChild(area);

    if (area.children.length > 0) {
      const possibleHeaderNode = area.children[0];
      if (possibleHeaderNode.nodeName.toLowerCase() === 'header') {
        section.title.appendChild(possibleHeaderNode);
      }
    }
  }
  animationInfo.update(originalAnimation);

  return {
    sectionLookup,
    checkLookup,
    checkAll: () => {
      const checks = checkLookup.values();
      for (const check of checks) {
        check();
      }
    },
    checkElement: (ele) => {
      if (!ele) return;
      const check = checkLookup.get(ele);
      if (check) check();
    },
  };
}

/**
 * @typedef {Object} AnimationDefinition Some properties that define an animation.
 * @property {boolean} [Info.standard] Set to `false` to not apply default properties. If this property is not present or is `true` then the default animation property will be used as fallback values.
 * @property {boolean} [Info.reset] Set to `true` to remove all animations before applying any of the other animations defined by this object. If no animations are defined by this object then no animation will be used.
 * @property {number} [Info.duration] The duration in milliseconds of the `transition` css animation.
 * @property {number} [Info.collapseDuration] The duration in milliseconds of the `transition` css animation when the area is collapsing.
 * @property {number} [Info.expandDuration] The duration in milliseconds of the `transition` css animation when the area is expanding.
 * @property {number} [Info.delay] The delay in milliseconds of the `transition` css animation.
 * @property {number} [Info.collapseDelay] The delay in milliseconds of the `transition` css animation when the area is collapsing.
 * @property {number} [Info.expandDelay] The delay in milliseconds of the `transition` css animation when the area is expanding.
 * @property {string} [Info.transition] The timing function of the `transition` css animation.
 * @property {string} [Info.collapseTransition] The timing function of the `transition` css animation when the area is collapsing.
 * @property {string} [Info.expandTransition] The timing function of the `transition` css animation when the area is expanding.
 * @property {number} [Info.durationPerPixel] The duration in milliseconds of the `transition` css animation to add per pixel of height that the area will change.
 * @property {number} [Info.collapseDurationPerPixel] The duration in milliseconds of the `transition` css animation to add per pixel of height that the area will change when the area is collapsing.
 * @property {number} [Info.expandDurationPerPixel] The duration in milliseconds of the `transition` css animation to add per pixel of height that the area will change when the area is expanding.
 * @property {boolean} [Info.bodyImmediately] Change the document body's size immediately. This can prevent "stuttering" when the page resizes.
 * @property {boolean} [Info.collapseBodyImmediately] Change the document body's size immediately when collapsing the area. This can prevent "stuttering" when the page resizes.
 * @property {boolean} [Info.expandBodyImmediately] Change the document body's size immediately when expanding the area. This can prevent "stuttering" when the page resizes.
 */

/**
 * Information about the collapse and expand animation for a collapsable section.
 *
 * @export
 * @class AnimationInfo
 */
export class AnimationInfo {

  /**
   * Creates an instance of AnimationInfo.
   * @param {AnimationDefinition|false} [animationInfo] A definition for the animation. Or `false` to create info about an animation that does nothing.
   * @memberof AnimationInfo
   */
  constructor(animationInfo = {}) {

    // #region Check Arg

    if (animationInfo === false) {
      animationInfo = { reset: true, standard: false };
    } else if (!animationInfo) {
      animationInfo = {};
    }
    if (!('standard' in animationInfo)) {
      animationInfo.standard = true;
    }
    animationInfo.reset = true;

    // #endregion Check Arg

    this.update(animationInfo);
  }

  /**
   * Return the object if it is an AnimationInfo. Otherwise create an AnimationInfo from it.
   *
   * @static
   * @param {AnimationInfo | AnimationDefinition | false} [obj={}] Object to convert into AnimationInfo.
   * @returns {AnimationInfo} An AnimationInfo object.
   * @memberof AnimationInfo
   */
  static asInfo(obj = {}) {
    if (obj instanceof AnimationInfo) {
      return obj;
    } else {
      return new AnimationInfo(obj);
    }
  }

  /**
   * A default animation definition.
   *
   * @static
   * @returns {AnimationDefinition} A definition for a default animation.
   * @memberof AnimationInfo
   */
  static getStandardInfo() {
    return {
      collapseDuration: 200, expandDuration: 200,
      collapseDelay: 0, expandDelay: 0,
      collapseTransition: '', expandTransition: '',
      collapseDurationPerPixel: 0.4, expandDurationPerPixel: 0.4,
      collapseBodyImmediately: true, expandBodyImmediately: true,
    };
  }
  /**
   * An animation definition that will do nothing.
   *
   * @static
   * @returns {AnimationDefinition} A definition for an animation that will do nothing.
   * @memberof AnimationInfo
   */
  static getResetInfo() {
    return {
      duration: 0,
      delay: 0,
      transition: '',
      durationPerPixel: 0,
      bodyImmediately: false
    };
  }

  /**
   * Convert shortened ("standard") modifiers to their longer names.
   *
   * @param {Object} obj Object with keys that can be standard modifiers.
   * @returns {Object} The provided object with the standard keys removed.
   * @memberof AnimationInfo
   */
  static applyStandardModifiers(obj) {
    const standardKeys = Object.keys(AnimationInfo.getResetInfo());
    const keys = Object.keys(obj);
    for (const key of standardKeys) {
      if (keys.includes(key)) {
        const value = obj[key];
        const suffix = AnimationInfo.changeFirstLetter(key);
        obj['collapse' + suffix] = value;
        obj['expand' + suffix] = value;
        delete obj[key];
      }
    }
    return obj;
  }

  /**
   * Convert shorthand animation definition properties to the longer variants that can actually be used.
   *
   * @memberof AnimationInfo
   */
  applyModifiers() {
    AnimationInfo.applyStandardModifiers(this);
  }

  /**
   * Modify this animation.
   *
   * @param {AnimationDefinition} changes Some changes that should be applied to this animation.
   * @memberof AnimationInfo
   */
  update(changes) {
    if (changes !== this) {
      // Don't modify the provided object unless it is actually this object.
      changes = Object.assign({}, changes);
    }

    if (changes.reset) {
      Object.assign(this, AnimationInfo.getResetInfo());
    }
    delete changes.reset;

    // Ensure that there are no standard modifiers that will override new changes:
    this.applyModifiers();

    if (changes.standard) {
      Object.assign(this, AnimationInfo.getStandardInfo());
      // Don't need to apply changes since all standard keys are long names.
    }
    delete changes.standard;

    Object.assign(this, changes);
    this.applyModifiers();
  }

  /**
   * Create a new string that has the first letter as lowercase or uppercase.
   *
   * @static
   * @param {string} string Original text.
   * @param {boolean} [toUpperCase=true] Determines if the first letter is uppercase or lowercase.
   * @returns {string} The modified text.
   * @memberof AnimationInfo
   */
  static changeFirstLetter(string, toUpperCase = true) {
    let firstLetter = string.charAt(0);
    firstLetter = toUpperCase ? firstLetter.toUpperCase() : firstLetter.toLowerCase();
    return firstLetter + string.slice(1);
  }

  /**
   * Get an object that only contains the keys that start with a certain string.
   *
   * @param {*} prefix Prefix that all keys must begin with.
   * @returns {Object} Contains only the keys that have the correct prefix.
   * @memberof AnimationInfo
   */
  getPrefixed(prefix) {
    if (!prefix || typeof prefix !== 'string') {
      prefix = '';
    }
    const info = {};
    for (const [key, value] of Object.entries(this)) {
      if (key.startsWith(prefix)) {
        info[AnimationInfo.changeFirstLetter(key.slice(prefix.length), false)] = value;
      }
    }
    return info;
  }
}

/**
 * Create a collapsable area.
 *
 * @export
 * @param {AnimationInfo | AnimationDefinition} [animationInfo] Info about the animation that will be used to collapse and expand the created area.
 * @returns {CollapsableAreaInfo} Info about the created section.
 */
export function createCollapsableArea(animationInfo = {}) {

  // #region Animation Info

  /**
   * Change the animation that is used by this section.
   *
   * @param {AnimationInfo | AnimationDefinition} value The new animation info.
   */
  const setAnimationInfo = (value) => {
    if (value instanceof AnimationInfo) {
      animationInfo = value;
    } else {
      animationInfo = new AnimationInfo(value);
    }
  };
  setAnimationInfo(animationInfo);

  // #endregion Animation Info


  const area = document.createElement('div');
  area.classList.add('collapsable');
  area.classList.add('section');


  const headerArea = document.createElement('div');
  headerArea.classList.add('headerArea');
  headerArea.classList.add('textNotSelectable');
  area.appendChild(headerArea);

  const hoverIndicator = document.createElement('div');
  hoverIndicator.classList.add('hoverIndicator');
  headerArea.appendChild(hoverIndicator);


  const contentWrapper = document.createElement('div');
  contentWrapper.classList.add('contentWrapper');
  area.appendChild(contentWrapper);

  const contentArea = document.createElement('div');
  contentArea.classList.add('contentArea');
  contentWrapper.appendChild(contentArea);


  let isButton = false;
  // Make header behave as a button:
  /**
   * Set if the section can be used as a button-
   *
   * @param {boolean} value `true` to allow using the section as a button; otherwise `false`.
   */
  const setIsButton = (value) => {
    value = Boolean(value);
    if (isButton === value) {
      return;
    }

    if (value) {
      headerArea.setAttribute('tabindex', String(0));
      headerArea.setAttribute('role', 'button');
    } else {
      headerArea.removeAttribute('tabindex');
      headerArea.removeAttribute('role');
    }

    isButton = value;
  };
  setIsButton(true);

  headerArea.addEventListener('click', (e) => {
    let ele = /** @type {HTMLElement} */ (e.target);
    while (true) {
      if (!ele || ele.classList.contains('preventOpen')) {
        return;
      }
      if (ele === headerArea) {
        break;
      }
      ele = ele.parentElement;
    }
    setCollapsed(!isCollapsed);
  });
  headerArea.addEventListener('keydown', (/** @type {any} */ e) => {
    if (e.target !== headerArea)
      return;
    if (!isButton)
      return;
    if (e.target.classList.contains('preventOpen'))
      return;

    // 13 = Return, 32 = Space
    if (![13, 32].includes(e.keyCode))
      return;

    setCollapsed(!isCollapsed);
  });


  let isCollapsed = true;
  let collapseTimeoutId = null;
  /**
   * Change the collapse state of the section.
   *
   * @param {boolean} value `true` if the section should be collapsed; otherwise `false`.
   */
  const setCollapsed = (value) => {
    value = Boolean(value);
    if (isCollapsed === value) {
      return;
    }
    const wasCollapsed = isCollapsed;
    isCollapsed = value;

    const info = (/** @type {AnimationInfo} */ (animationInfo)).getPrefixed(value ? 'collapse' : 'expand');
    let { duration = 0, delay = 0, transition = '', durationPerPixel = 0, bodyImmediately = false } = info;


    if (duration <= 0 && durationPerPixel <= 0) {
      toggleClass(area, 'collapsed', value);
      toggleClass(area, 'open', !value);
      return;
    }


    if (wasCollapsed) {
      toggleClass(area, 'collapsed', true);
    }
    toggleClass(area, 'open', true);
    const wantedHeight = contentWrapper.scrollHeight;


    if (durationPerPixel > 0) {
      duration += durationPerPixel * wantedHeight;
    }

    transition = 'max-height ' + duration + 'ms ' + transition;
    if (delay > 0) {
      transition += ' ' + delay + 'ms';
    } else {
      delay = 0;
    }


    contentWrapper.style.transition = transition;
    // Set max height so that transition effect will work:
    contentWrapper.style.maxHeight = wantedHeight + 'px';
    if (bodyImmediately) {
      if (value) {
        document.body.style.minHeight = document.body.scrollHeight + 'px';
      } else {
        // Remove min height so that it doesn't affect `minBodyHeight` calculation:
        document.body.style.minHeight = null;

        const minBodyHeight = document.body.scrollHeight - contentWrapper.clientHeight + wantedHeight;

        document.body.style.minHeight = minBodyHeight + 'px';
      }
    }


    /**
     * Cancel any previous timeout and start a new one. Calls the provided `callback` when the timeout completes.
     * @param {function(): any} callback The callback to call when the timeout completes.
     * @param {number} timeInMilliseconds The time in milliseconds to set the timeout to.
     */
    const startTimeout = (callback, timeInMilliseconds) => {
      if (collapseTimeoutId !== null) {
        clearTimeout(collapseTimeoutId);
      }

      collapseTimeoutId = setTimeout(() => {
        collapseTimeoutId = null;
        callback();
      }, timeInMilliseconds);
    };

    // Ensure that max height is applied:
    contentWrapper.clientHeight;
    // Then start height change:
    toggleClass(area, 'collapsed', value);

    // Handle change completed:
    startTimeout(() => {
      toggleClass(area, 'open', !value);
      contentWrapper.style.maxHeight = null;
      contentWrapper.style.transition = null;
      document.body.style.minHeight = null;
    }, duration + delay);
  };
  setCollapsed(isCollapsed);


  const obj = {
    area: area,
    title: headerArea,
    content: contentArea,
    setCollapsedWithoutAnimation: (value) => {
      if (isCollapsed === Boolean(value)) return;
      const actualAnimation = animationInfo;
      animationInfo = new AnimationInfo({ reset: true, standard: false });
      setCollapsed(value);
      animationInfo = actualAnimation;
    },
  };
  defineProperty(obj, 'isButton', () => isButton, setIsButton);
  defineProperty(obj, 'isCollapsed', () => isCollapsed, setCollapsed);
  defineProperty(obj, 'animationInfo', () => animationInfo, setAnimationInfo);
  return /** @type {any}*/ (obj);
}
