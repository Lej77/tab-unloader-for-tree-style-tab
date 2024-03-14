'use strict';

import {
  defineProperty
} from '../common/utilities.js';

import {
  EventListener,
  EventManager
} from '../common/events.js';

import {
  RequestManager
} from '../common/delays.js';

import {
  DisposableCollection
} from '../common/disposables.js';

import {
  toggleClass,
} from '../ui/utilities.js';

import {
  toggleScreenBlocker
} from '../ui/screen-blocks.js';

import {
  createCollapsableArea
} from '../ui/collapsable.js';


/** @typedef {import('../ui/collapsable.js').AnimationDefinition} AnimationDefinition */
/** @typedef {import('../ui/collapsable.js').AnimationInfo} AnimationInfo */
null;


let gListInfo;
/** Possible drag and drop states for a list item. */
const listItemDragState = Object.freeze({
  none: null,
  dragged: /** @type {'dragged'} */ ('dragged'),
  target: /** @type {'target'} */ ('target'),
  appendAfter: /** @type {'after'} */ ('after'),
  draggedAndAppendAfter: /** @type {'draggedAndAfter'} */ ('draggedAndAfter'),
  targetAndAppendAfter: /** @type {'targetAndAfter'} */ ('targetAndAfter'),
});
/**
 * The drag and drop state of a list.
 *
 * @typedef { (Omit<(typeof listItemDragState), 'none'>[(keyof (Omit<(typeof listItemDragState), 'none'>))]) | null } DragState
 */

/**
 * A UI list.
 *
 * @typedef {ReturnType<typeof createListArea>} ListArea
 */
/**
 * An list item in a UI list.
 *
 * @typedef {ReturnType<ListArea['createItem']>} ListAreaItem
 */


export function createListArea() {
  const obj = {};
  const area = document.createElement('div');
  area.classList.add('list');

  const listDropMarker = document.createElement('div');
  listDropMarker.classList.add('dropMarker');
  area.appendChild(listDropMarker);

  let currentListDragState = null;
  /**
   * Set the current list's drag and drop state.
   *
   * @param {DragState} dragState The list's new drag and drop state.
   */
  const setListDragState = (dragState) => {
    if (currentListDragState === dragState) {
      return;
    }
    internalSetListDragState(currentListDragState, false);
    internalSetListDragState(dragState, true);
    currentListDragState = dragState;
  };
  /**
   * Enabled or disable the current list's CSS classes for a specific drag and drop state.
   *
   * @param {DragState} dragState The drag state which should be enabled or disabled.
   * @param {boolean} value `true` to enable a drag state and `false` to disabled it.
   */
  const internalSetListDragState = (dragState, value) => {
    switch (dragState) {
      case listItemDragState.dragged: {
        toggleClass(area, 'dragged', value);
      } break;

      case listItemDragState.target: {
        toggleClass(area, 'dropTarget', value);
      } break;

      case listItemDragState.appendAfter: {
        toggleClass(area, 'dropTarget', value);
        toggleClass(listDropMarker, 'dropTarget', value);
      } break;

      case listItemDragState.targetAndAppendAfter: {
        internalSetListDragState(listItemDragState.target, value);
        internalSetListDragState(listItemDragState.appendAfter, value);
      } break;
    }
  };

  // #region Global

  if (gListInfo && gListInfo.isActive) {
    gListInfo.addList(obj);
  } else {
    const globalInfo = {
      allLists: [obj],
      debugDrag: false,
      eventCollection: null,
    };
    defineProperty(globalInfo, 'isActive', () => {
      return globalInfo.eventCollection && !globalInfo.eventCollection.isDisposed;
    });
    gListInfo = globalInfo;


    /** @type {EventManager<[ListArea]>} */
    const onListRemoved = new EventManager();

    const addList = (listObj) => {
      globalInfo.allLists.push(listObj);
    };
    const removeList = (listObj) => {
      if (!globalInfo || !globalInfo.allLists) {
        return;
      }
      const all = globalInfo.allLists;
      const index = all.indexOf(listObj);
      if (index < 0) {
        return;
      }
      all.splice(index, 1);
      onListRemoved.fire(listObj);
    };

    const getAllLists = () => {
      for (const listToRemove of globalInfo.allLists.filter(list => !document.documentElement.contains(list.area))) {
        removeList(listToRemove);
      }
      return globalInfo.allLists;
    };
    const getListFromArea = (area) => {
      const all = getAllLists();
      for (const list of all) {
        if (list.area === area) {
          return list;
        }
      }
      return null;
    };
    const getListFromCoordinate = (x, y) => {

    };

    const checkAllowDropOnList = (dragItemObj, dropListObj) => {
      if (dropListObj.checkAllowDrop && typeof dropListObj.checkAllowDrop === 'function') {
        return dropListObj.checkAllowDrop(dragItemObj);
      }
      return true;
    };
    const checkAllowDropOnItem = (dragItemObj, dropItemObj) => {
      if (dropItemObj.checkAllowDrop && typeof dropItemObj.checkAllowDrop === 'function' && typeof dropItemObj.handleDrop === 'function') {
        return dropItemObj.checkAllowDrop(dragItemObj);
      }
      return false;
    };

    let trackingEventCollection;
    let dragInfo = null;
    const stopDrag = (canceled = true) => {
      document.documentElement.classList.remove('dragging');
      toggleScreenBlocker(false);
      if (trackingEventCollection) {
        trackingEventCollection.dispose();
      }
      if (dragInfo) {
        dragInfo.dragItem.setDragState(listItemDragState.none);
        dragInfo.dragList.setDragState(listItemDragState.none);
        if (dragInfo.dropAfter) {
          dragInfo.dropAfter.setDragState(listItemDragState.none);
        }
        if (dragInfo.dropItem) {
          dragInfo.dropItem.setDragState(listItemDragState.none);
        }
        if (!canceled) {
          if (globalInfo.debugDrag) {
            console.log('drop success'); console.log(dragInfo);
          }
          if (dragInfo.dropItem) {
            dragInfo.dropItem.handleDrop(dragInfo.dragItem);
          } else if (dragInfo.dropAfter) {
            let index = 0;
            if (dragInfo.dropAfter !== dragInfo.dropList) {
              index = dragInfo.dropList.items.indexOf(dragInfo.dropAfter) + 1;
              if (dragInfo.dropList === dragInfo.dragList) {
                let currentIndex = dragInfo.dragList.items.indexOf(dragInfo.dragItem);
                if (currentIndex < index) {
                  index--;
                }
              }
            }
            dragInfo.dropList.insertItem(dragInfo.dragItem, index);
          }
        }
      }
      dragInfo = null;
    };
    const startDrag = (list, listItem) => {
      const dragListObj = getListFromArea(list);
      let dragItemObj;
      if (dragListObj) {
        dragItemObj = dragListObj.getItemByArea(listItem);
      }

      if (!dragListObj || !dragItemObj) {
        if (globalInfo.debugDrag) {
          console.log('Cancel drag start due to list or item not found'); console.log(dragListObj); console.log(dragItemObj);
        }
        return;
      }
      stopDrag();

      dragInfo = {
        dragList: dragListObj,
        dragItem: dragItemObj,

        dropList: dragListObj,
      };
      document.documentElement.classList.add('dragging');
      toggleScreenBlocker(true);

      dragItemObj.section.isCollapsed = true;

      dragItemObj.setDragState(listItemDragState.dragged);
      dragListObj.setDragState(listItemDragState.dragged);

      let lastMouseEvent;     // (mouse pos relative to scrolled view of document)
      let dropUpdater = new RequestManager(() => {
        if (dragEventsCollection && dragEventsCollection.isDisposed) {
          return;
        }
        // Keep updating in case an element is resized or the page is scrolled or the page is zoomed.
        dropUpdater.invalidate();
        if (!dragEventsCollection || !lastMouseEvent) {
          return;
        }


        // #region Get Mouse Info

        let e = lastMouseEvent;
        const mousePos = {
          x: lastMouseEvent.clientX,
          y: lastMouseEvent.clientY,
        };

        if (globalInfo.debugDrag) {
          console.log('move\ne: ', e);
        }

        document.documentElement.classList.add('dontBlockScreen');
        const mouseTarget = document.elementFromPoint(mousePos.x, mousePos.y);
        document.documentElement.classList.remove('dontBlockScreen');

        // #endregion Get Mouse Info


        // #region Find most nested allowed list at mouse position

        const findList = (ele, checkBounding = false) => {
          let lastList = null;
          while (ele) {
            if (ele.classList.contains('list')) {
              const listObj = getListFromArea(ele);
              if (listObj && checkAllowDropOnList(dragInfo.dragItem, listObj)) {
                if (checkBounding) {
                  const pos = ele.getBoundingClientRect();
                  if (mousePos.x < pos.left || pos.right < mousePos.x || mousePos.y < pos.top || pos.bottom < mousePos.y) {
                    lastList = listObj;
                  } else {
                    lastList = null;
                  }
                }
                if (!lastList) {
                  return listObj;
                }
              }
            }
            ele = ele.parentElement;
          }
          if (lastList) {
            return lastList;
          }
          return ele;
        };
        let dropListObj = findList(mouseTarget);
        if (!dropListObj) {
          dropListObj = findList(dragInfo.dropList.area, true);
        }
        if (dropListObj && dragInfo.dropList !== dropListObj) {
          dragInfo.dropList.setDragState(listItemDragState.none);
          dragInfo.dropList = dropListObj;
          dragInfo.dropList.setDragState(listItemDragState.target);
          if (globalInfo.debugDrag) {
            console.log('Drag - Parent List'); console.log(dropListObj);
          }
        }

        // #endregion Find most nested allowed list at mouse position


        const listTarget = dragInfo.dropList;
        const targetItems = listTarget.getAllItems();

        let insertIndex = null;
        let dropItem = null;
        for (let iii = 0; iii < targetItems.length; iii++) {
          let targetItem = targetItems[iii];
          let itemPos = targetItem.section.area.getBoundingClientRect();
          if (mousePos.y < itemPos.top) {
            if (!insertIndex && insertIndex !== 0) {
              insertIndex = iii;
            }
          } else if (mousePos.y > itemPos.bottom) {
            insertIndex = iii + 1;
          } else {
            if (itemPos.left < mousePos.x && mousePos.x < itemPos.right && targetItem !== dragInfo.dragItem && checkAllowDropOnItem(dragInfo.dragItem, targetItem)) {
              dropItem = targetItem;
            } else {
              const itemHeight = itemPos.bottom - itemPos.top;
              const middle = itemPos.top + itemHeight / 2;
              if (mousePos.y > middle) {
                insertIndex = iii + 1;
              } else {
                insertIndex = iii;
              }
            }
            break;
          }
        }
        if (!insertIndex) {
          insertIndex = 0;
        }

        if (dropItem !== dragInfo.dropItem) {
          if (dragInfo.dropItem) {
            const getDragState = () => {
              if (dragInfo.dropItem === dragInfo.dropAfter) {
                return listItemDragState.appendAfter;
              }
              return listItemDragState.none;
            };
            dragInfo.dropItem.setDragState(getDragState());
          }
          dragInfo.dropItem = dropItem;
          if (dragInfo.dropItem) {
            dropItem.setDragState(listItemDragState.target);
          }
        }

        insertIndex--;
        let dropAfter;
        if (dropItem) {
          dropAfter = null;
        } else if (insertIndex < 0 || insertIndex > targetItems.length) {
          dropAfter = dragInfo.dropList;
        } else {
          dropAfter = targetItems[insertIndex];
        }

        if (dragInfo.dropAfter !== dropAfter) {
          if (dragInfo.dropAfter) {
            const getDragState = () => {
              if (dragInfo.dropAfter === dragInfo.dropList) {
                return listItemDragState.target;
              }
              if (dragInfo.dropAfter === dragInfo.dropItem) {
                return listItemDragState.target;
              }
              if (dragInfo.dropAfter === dragInfo.dragItem) {
                return listItemDragState.dragged;
              }
              return listItemDragState.none;
            };
            dragInfo.dropAfter.setDragState(getDragState());
          }
          dragInfo.dropAfter = dropAfter;
          const getDragState = () => {
            if (dragInfo.dropAfter === dragInfo.dragItem) {
              return listItemDragState.draggedAndAppendAfter;
            }
            if (dragInfo.dropAfter === dragInfo.dropList) {
              return listItemDragState.targetAndAppendAfter;
            }
            return listItemDragState.appendAfter;
          };
          dropAfter.setDragState(getDragState());
        }
      }, globalInfo.debugDrag ? 250 : 50);
      dropUpdater.invalidate();

      var dragEventsCollection = new DisposableCollection([
        new EventListener(document, 'wheel', (e) => {
          lastMouseEvent = e;
        }),
        new EventListener(document, 'mousemove', (e) => {
          lastMouseEvent = e;
        }),
        /* Other mouse events:
        new EventListener(document.body, 'mouseenter', (e) => {
            if (globalInfo.debugDrag) {
                console.log('enter (page)'); console.log(e);
            }
        }),
        new EventListener(document.body, 'mouseleave', (e) => {
            if (globalInfo.debugDrag) {
                console.log('leave (page)'); console.log(e);
            }
        }),
        new EventListener(document, 'mouseover', (e) => {
            if (globalInfo.debugDrag) {
                console.log('enter'); console.log(e);
            }
            let ele = e.target;
            if (!ele) {
                return;
            }
            if (dragInfo.dropList !== ele && ele.classList.contains('list') && checkAllowListDrop(getListFromArea(ele))) {
                dragInfo.dropList = ele;
                if (globalInfo.debugDrag) {
                    console.log('Drag - Nested List'); console.log(ele);
                }
            }
            if (ele.classList.contains('listItem')) {

            }
        }),
        new EventListener(document, 'mouseout', (e) => {
            if (globalInfo.debugDrag) {
                console.log('leave'); console.log(e);
            }
        }),*/
      ]);
      trackingEventCollection = dragEventsCollection;
    };


    globalInfo.getAllLists = getAllLists;

    globalInfo.addList = addList;
    globalInfo.removeList = removeList;

    globalInfo.onListRemoved = onListRemoved.subscriber;

    globalInfo.stopDrag = stopDrag;
    globalInfo.startDrag = startDrag;


    const dragStartStopCollection = new DisposableCollection([
      new EventListener(document, 'mousedown', (e) => {
        if (globalInfo.debugDrag) {
          console.log('button down'); console.log(e);
        }
        if (e.buttons !== 1) {
          stopDrag();
          return;
        }
        if (dragInfo) {
          return;
        }
        let ele = /** @type {Element} */ (e.target);
        while (ele) {
          if (ele.classList.contains('draggable')) {
            break; // Found draggable element
          }
          ele = ele.parentElement;
        }
        if (ele && !ele.classList.contains('listItemDrag')) {
          return; // Dragged item is not a list item.
        }
        while (ele) {
          if (ele.classList.contains('listItem')) {
            break;
          }
          ele = ele.parentElement;
        }
        let listEle = ele;
        while (listEle) {
          if (listEle.classList.contains('list')) {
            break;
          }
          listEle = listEle.parentElement;
        }
        if (!ele || !listEle) {
          return; // No draggable item was found.
        }
        // ele is the listItem being dragged.
        // listEle is the list the item is a part of.
        startDrag(listEle, ele);
      }),
      new EventListener(document, 'mouseup', (e) => {
        if (globalInfo.debugDrag) {
          console.log('button up'); console.log(e);
        }
        stopDrag(e.buttons % 2 !== 0);
      }),
      new EventListener(document, 'keydown', (e) => {
        if (globalInfo.debugDrag) {
          console.log('key down'); console.log(e);
        }
        if (e.key === 'Escape') {
          stopDrag();
        }
      }),
      new EventListener(document, 'blur', (e) => {
        if (globalInfo.debugDrag) {
          console.log('document lost focus'); console.log(e);
        }
        stopDrag();
      }),
    ]);
    new EventListener(dragStartStopCollection.onDisposed, () => {
      stopDrag();
    });
    globalInfo.eventCollection = dragStartStopCollection;
  }

  const onRemoved = new EventManager();
  const onRemoveListener = new EventListener(gListInfo.onListRemoved, (removeList) => {
    if (removeList !== obj) {
      return;
    }
    onRemoved.fire(obj);
    onRemoveListener.dispose();
    console.log('removed list');
  });

  // #endregion Global


  // #region Item Management

  /** @type {ListAreaItem[]} */
  let itemObjs = [];
  /** @type {EventManager<[ListArea, ListAreaItem, number | false]>} */
  const onItemArrayChange = new EventManager();

  const getAllItems = () => {
    for (const item of itemObjs.filter(item => item.list !== obj || !area.contains(item.area))) {
      removeItem(item);
    }
    return itemObjs;
  };
  // eslint-disable-next-line valid-jsdoc
  /**
   * Get an item in this list given that item's `area`.
   *
   * @param {ListAreaItem['area']} itemArea The area for an item in this list.
   * @returns {null | ListAreaItem} The list item with the specified area, if it exists.
   */
  const getItemByArea = (itemArea) => {
    const all = getAllItems();
    for (const item of all) {
      if (item.area === itemArea) {
        return item;
      }
    }
    return null;
  };
  /**
   * Insert an item into this list.
   *
   * @param {ListAreaItem} itemObj The item to add or move.
   * @param {number} [index=-1] The index that the item should be placed at. Negative to add to the end of the list.
   */
  const insertItem = (itemObj, index = -1) => {
    if (!itemObj) {
      return;
    }
    if (index < 0) {
      index = itemObjs.length + (itemObjs.includes(itemObj) ? -1 : 0);
    }
    if (index < 0 || index > itemObjs.length) {
      index = itemObjs.length;
    }
    if (itemObjs.indexOf(itemObj) === index) {
      return;
    }

    getAllItems();  // Update itemObjs array.
    const previousList = itemObj.list;

    // Remove current entries of item:
    itemObjs = itemObjs.filter(item => item !== itemObj);

    if (index < 0 || index >= itemObjs.length) {
      // Insert last
      area.appendChild(itemObj.area);
      itemObjs.push(itemObj);
      index = itemObjs.length - 1;
    } else {
      area.insertBefore(itemObj.area, itemObjs[index].area);
      itemObjs.splice(index, 0, itemObj);
    }

    itemObj.list = obj;

    if (previousList && previousList !== obj) {
      previousList.removeItem(itemObj);
    }
    onItemArrayChange.fire(obj, itemObj, index);
  };
  /**
   * Add an item to this list.
   * @param {ListAreaItem} itemObj The item to add.
   */
  const addItem = (itemObj) => {
    insertItem(itemObj);
  };
  /**
   * Remove an item from this list. The item should be considered disposed after this.
   *
   * @param {ListAreaItem} itemObj The item to remove.
   */
  const removeItem = (itemObj) => {
    let wasInList = false;
    if (Array.from(area.children).includes(itemObj.area)) {
      area.removeChild(itemObj.area);
      wasInList = true;
    }

    if (itemObj.list) {
      itemObjs = itemObjs.filter(item => item !== itemObj);
    }
    if (wasInList) {
      onItemArrayChange.fire(obj, itemObj, false);
    }
  };

  // eslint-disable-next-line valid-jsdoc
  /**
   * Create a new list item.
   *
   * @param {AnimationDefinition | AnimationInfo} [animationInfo] Animation to use for this list item.
   * @returns The created list item.
   */
  const createItem = (animationInfo = {}) => {
    const itemObj = {};
    /** @type {EventManager<[ListAreaItem, ListArea, ListArea]> } Args: this list item, the previous list it was part of, the new list that the item is in. */
    const onListChange = new EventManager();
    /** @type {EventManager<[ListAreaItem]>} Arg: this list item. */
    const onRemoved = new EventManager();
    /** @type {EventManager<[ListAreaItem]>} Arg: list item that was drag and dropped. */
    const onDrop = new EventManager();
    /** @type {EventManager<[ListAreaItem]>} Arg: list item that was drag and dropped and should be checked. */
    const onCheckDrop = new EventManager();

    const item = document.createElement('div');
    item.classList.add('listItem');

    const itemSectionWrapper = document.createElement('div');
    itemSectionWrapper.classList.add('sectionWrapper');
    item.appendChild(itemSectionWrapper);

    const itemSection = createCollapsableArea(animationInfo);
    itemSectionWrapper.appendChild(itemSection.area);

    const dropMarkerAfter = document.createElement('div');
    dropMarkerAfter.classList.add('dropMarker');
    item.appendChild(dropMarkerAfter);

    const dragWrapper = document.createElement('div');
    dragWrapper.classList.add('listItemDragWrapper');
    dragWrapper.classList.add('preventOpen');
    itemSection.title.appendChild(dragWrapper);

    const draggableArea = document.createElement('div');
    draggableArea.classList.add('dragIcon');
    draggableArea.classList.add('listItemDrag');
    draggableArea.classList.add('draggable');
    dragWrapper.appendChild(draggableArea);

    for (let iii = 0; iii < 3; iii++) {
      const dragIconLine = document.createElement('div');
      dragIconLine.classList.add('dragIconLine');
      draggableArea.appendChild(dragIconLine);
    }

    /** @type {ListArea} The list that this item belongs to. */
    let itemsList = null;

    const remove = () => {
      const list = itemsList;
      itemsList = null;
      if (list) {
        list.removeItem(itemObj);
      }
      gListInfo.getAllLists();  // Dispose of all lists not part of the document. Some might have been part of the removed item.
      onRemoved.fire(itemObj);
    };

    /**
     * Change the list that this item is in.
     *
     * @param {ListArea} value The new list that the item should be moved to.
     */
    const setList = (value) => {
      if (!value) {
        remove();
        return;
      }
      if (itemsList === value) {
        return;
      }
      const oldList = itemsList;

      value.addItem(itemObj);
      itemsList = value;

      onListChange.fire(itemObj, oldList, value);
    };
    const getList = () => {
      return itemsList;
    };

    let currentDragState = null;
    /**
     * Set the list item's current drag state.
     *
     * @param {DragState} dragState The new drag state.
     */
    const setDragState = (dragState) => {
      if (currentDragState === dragState) {
        return;
      }
      internalSetDragState(currentDragState, false);
      internalSetDragState(dragState, true);
      currentDragState = dragState;
    };
    /**
     * Enabled or disable the current list item's CSS classes for a specific drag and drop state.
     *
     * @param {DragState} dragState The drag state which should be enabled or disabled.
     * @param {boolean} value `true` to enable a drag state and `false` to disabled it.
     */
    const internalSetDragState = (dragState, value) => {
      switch (dragState) {
        case listItemDragState.dragged: {
          toggleClass(draggableArea, 'dragged', value);
          toggleClass(item, 'dragged', value);
        } break;

        case listItemDragState.target: {
          toggleClass(item, 'dropTarget', value);
        } break;

        case listItemDragState.appendAfter: {
          toggleClass(dropMarkerAfter, 'dropTarget', value);
        } break;

        case listItemDragState.draggedAndAppendAfter: {
          internalSetDragState(listItemDragState.dragged, value);
          internalSetDragState(listItemDragState.appendAfter, value);
        } break;
      }
    };

    itemObj.area = item;
    itemObj.section = itemSection;

    /** THIS IS AN INTERNAL METHOD. Sets the list item's current drag state. */
    itemObj.setDragState = setDragState;
    // eslint-disable-next-line valid-jsdoc
    /** THIS IS AN INTERNAL METHOD. */
    itemObj.handleDrop = (draggedItemObj) => onDrop.fire(draggedItemObj);
    // eslint-disable-next-line valid-jsdoc
    /** THIS IS AN INTERNAL METHOD. */
    itemObj.checkAllowDrop = (draggedItemObj) => (onCheckDrop.fire(draggedItemObj).filter(returnValue => returnValue).length > 0);

    /** Remove this item from its list. This will dispose of the list item. If you want to move the item to a new list then set the `list` property to another list instead. */
    itemObj.remove = remove;

    /**
     * This event will be invoked when this item is removed from its list. The item should be considered disposed after this point.
     *
     * Args: itemObj
     * The event will be provided this list item as its first argument.
     */
    itemObj.onRemoved = onRemoved.subscriber;
    /**
     * This event will be invoked when this list item is moved between lists.
     *
     * Args: itemObj, oldList, newList
     * The event will be provided this list item as its first argument.
     * The second argument will be the previous list that the item was in and the third argument will be the new list that the item is now a part of.
     */
    itemObj.onListChange = onListChange.subscriber;

    /** THIS IS AN INTERNAL EVENT. */
    itemObj.onDrop = onDrop.subscriber;
    /** THIS IS AN INTERNAL EVENT. */
    itemObj.onCheckDrop = onCheckDrop.subscriber;
    defineProperty(itemObj, 'list', getList, setList);

    // Add this item to the current list:
    insertItem(itemObj);

    return itemObj;
  };

  // #endregion Item Management

  const onCheckListDrop = new EventManager();
  /**
   * Check if list item can be dragged and dropped on this list.
   *
   * @param {ListAreaItem} draggedItemObj The dropped list item.
   * @returns {boolean} `true` if the item can be dropped; otherwise `false`.
   */
  const checkDrop = (draggedItemObj) => {
    const returned = onCheckListDrop.fire(draggedItemObj);
    if (returned.length === 0) {
      return true;
    }
    return returned.some(value => value);
  };

  /** The DOM element that contains the list UI. */
  obj.area = area;

  /** THIS IS AN INTERNAL METHOD. Sets the list's current drag state. */
  obj.setDragState = setListDragState;
  /** Checks if a list item is allowed to dragged and dropped on this list. */
  obj.checkAllowDrop = checkDrop;

  /** Create a new item in this list. */
  obj.createItem = createItem;

  /** Get all items in this list. */
  obj.getAllItems = getAllItems;
  /** Get an item in this list given that item's `area`. */
  obj.getItemByArea = getItemByArea;

  /** Move an item to this list. */
  obj.addItem = addItem;
  /** Remove an item. That item should be considered disposed after this. */
  obj.removeItem = removeItem;
  /** Move an item to this list or change its index if it is already a part of this list. */
  obj.insertItem = insertItem;

  /** Args: listObj, itemObj, newIndexOrFalseIfRemoved */
  obj.onArrayChanged = onItemArrayChange.subscriber;
  /** Fired when this list is removed from the document. Args: listObj */
  obj.onRemoved = onRemoved.subscriber;
  /** Return true from any event listener to allow dropping a dragged item. Args: dropItemObj */
  obj.onCheckDrop = onCheckListDrop.subscriber;
  defineProperty(obj, 'items', getAllItems);
  return obj;
}
