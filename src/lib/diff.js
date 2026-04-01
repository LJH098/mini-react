/**
 * 담당: 이진혁
 */
import { NodeType, PatchType } from "../constants.js";
import { normalizeVnode } from "./vnodeUtils.js";

export function diff(oldVdom, newVdom) {
  const patches = [];
  walk(normalizeNullableVnode(oldVdom), normalizeNullableVnode(newVdom), [], patches);
  return patches;
}

function normalizeNullableVnode(vnode) {
  if (vnode == null) {
    return null;
  }

  return normalizeVnode(vnode);
}

function walk(oldNode, newNode, path, patches) {
  if (oldNode == null && newNode == null) {
    return;
  }

  if (oldNode == null) {
    patches.push({
      type: PatchType.ADD,
      path,
      node: newNode,
    });
    return;
  }

  if (newNode == null) {
    patches.push({
      type: PatchType.REMOVE,
      path,
    });
    return;
  }

  if (oldNode.nodeType !== newNode.nodeType) {
    patches.push({
      type: PatchType.REPLACE,
      path,
      node: newNode,
    });
    return;
  }

  if (oldNode.nodeType === NodeType.TEXT) {
    if (oldNode.value !== newNode.value) {
      patches.push({
        type: PatchType.TEXT,
        path,
        value: newNode.value,
      });
    }

    return;
  }

  if (oldNode.type !== newNode.type) {
    patches.push({
      type: PatchType.REPLACE,
      path,
      node: newNode,
    });
    return;
  }

  const propChanges = diffProps(oldNode.props, newNode.props);
  if (propChanges) {
    patches.push({
      type: PatchType.PROPS,
      path,
      props: propChanges,
    });
  }

  const oldChildren = oldNode.children ?? [];
  const newChildren = newNode.children ?? [];

  diffChildren(oldChildren, newChildren, path, patches);
}

function isDeepEqual(a, b) {
  if (a === b) {
    return true;
  }

  if (a == null || b == null) {
    return false;
  }

  if (a.nodeType !== b.nodeType) {
    return false;
  }

  if (a.nodeType === NodeType.TEXT) {
    return a.value === b.value;
  }

  if (a.type !== b.type) {
    return false;
  }

  const aProps = a.props ?? {};
  const bProps = b.props ?? {};
  const aKeys = Object.keys(aProps).filter((key) => key !== "key");
  const bKeys = Object.keys(bProps).filter((key) => key !== "key");

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (const key of aKeys) {
    if (aProps[key] !== bProps[key]) {
      return false;
    }
  }

  const aChildren = a.children ?? [];
  const bChildren = b.children ?? [];

  if (aChildren.length !== bChildren.length) {
    return false;
  }

  for (let index = 0; index < aChildren.length; index += 1) {
    if (!isDeepEqual(aChildren[index], bChildren[index])) {
      return false;
    }
  }

  return true;
}

function tryFindRemoved(oldChildren, newChildren) {
  if (oldChildren.length !== newChildren.length + 1) {
    return -1;
  }

  let pivot = 0;

  while (pivot < newChildren.length && isDeepEqual(oldChildren[pivot], newChildren[pivot])) {
    pivot += 1;
  }

  for (let index = pivot; index < newChildren.length; index += 1) {
    if (!isDeepEqual(oldChildren[index + 1], newChildren[index])) {
      return -1;
    }
  }

  return pivot;
}

function tryFindAdded(oldChildren, newChildren) {
  if (newChildren.length !== oldChildren.length + 1) {
    return -1;
  }

  let pivot = 0;

  while (pivot < oldChildren.length && isDeepEqual(oldChildren[pivot], newChildren[pivot])) {
    pivot += 1;
  }

  for (let index = pivot; index < oldChildren.length; index += 1) {
    if (!isDeepEqual(oldChildren[index], newChildren[index + 1])) {
      return -1;
    }
  }

  return pivot;
}

function diffChildren(oldChildren, newChildren, path, patches) {
  assertUniqueKeys(oldChildren);
  assertUniqueKeys(newChildren);

  const oldMode = getChildListMode(oldChildren);
  const newMode = getChildListMode(newChildren);

  if (oldMode === "keyed" && newMode === "keyed") {
    diffKeyedChildren(oldChildren, newChildren, path, patches);
    return;
  }

  // Mixing keyed and unkeyed siblings is ambiguous, so we keep the old index-based behavior.
  diffChildrenByIndex(oldChildren, newChildren, path, patches);
}

function diffChildrenByIndex(oldChildren, newChildren, path, patches) {
  const removedIndex = tryFindRemoved(oldChildren, newChildren);

  if (removedIndex !== -1) {
    patches.push({
      type: PatchType.REMOVE,
      path: [...path, removedIndex],
    });
    return;
  }

  const addedIndex = tryFindAdded(oldChildren, newChildren);

  if (addedIndex !== -1) {
    patches.push({
      type: PatchType.ADD,
      path: [...path, addedIndex],
      node: newChildren[addedIndex],
    });
    return;
  }

  const maxLength = Math.max(oldChildren.length, newChildren.length);

  for (let index = 0; index < maxLength; index += 1) {
    walk(oldChildren[index], newChildren[index], [...path, index], patches);
  }
}

function diffKeyedChildren(oldChildren, newChildren, path, patches) {
  const oldChildrenByKey = mapChildrenByKey(oldChildren);
  const newChildrenByKey = mapChildrenByKey(newChildren);
  const workingKeys = oldChildren.map((child) => getNodeKey(child));

  for (let oldIndex = oldChildren.length - 1; oldIndex >= 0; oldIndex -= 1) {
    const oldKey = getNodeKey(oldChildren[oldIndex]);

    if (!newChildrenByKey.has(oldKey)) {
      patches.push({
        type: PatchType.REMOVE,
        path: [...path, oldIndex],
      });
      workingKeys.splice(oldIndex, 1);
    }
  }

  for (let newIndex = 0; newIndex < newChildren.length; newIndex += 1) {
    const newKey = getNodeKey(newChildren[newIndex]);

    if (workingKeys[newIndex] === newKey) {
      continue;
    }

    const currentIndex = workingKeys.indexOf(newKey);

    if (currentIndex === -1) {
      patches.push({
        type: PatchType.ADD,
        path: [...path, newIndex],
        node: newChildren[newIndex],
      });
      workingKeys.splice(newIndex, 0, newKey);
      continue;
    }

    patches.push({
      type: PatchType.MOVE,
      path,
      fromIndex: currentIndex,
      toIndex: newIndex,
    });
    moveItem(workingKeys, currentIndex, newIndex);
  }

  for (let newIndex = 0; newIndex < newChildren.length; newIndex += 1) {
    const newChild = newChildren[newIndex];
    const oldChild = oldChildrenByKey.get(getNodeKey(newChild));

    if (!oldChild) {
      continue;
    }

    walk(oldChild, newChild, [...path, newIndex], patches);
  }
}

function assertUniqueKeys(children) {
  const seenKeys = new Map();

  for (const child of children) {
    const key = getNodeKey(child);

    if (key === undefined) {
      continue;
    }

    if (seenKeys.has(key)) {
      throw new Error(`Duplicate key "${String(key)}" among siblings.`);
    }

    seenKeys.set(key, true);
  }
}

function getChildListMode(children) {
  if (children.length === 0) {
    return "unkeyed";
  }

  const keyedChildrenCount = children.filter((child) => getNodeKey(child) !== undefined).length;

  if (keyedChildrenCount === 0) {
    return "unkeyed";
  }

  if (keyedChildrenCount === children.length) {
    return "keyed";
  }

  return "mixed";
}

function mapChildrenByKey(children) {
  const childrenByKey = new Map();

  for (const child of children) {
    childrenByKey.set(getNodeKey(child), child);
  }

  return childrenByKey;
}

function getNodeKey(node) {
  if (node?.nodeType !== NodeType.ELEMENT) {
    return undefined;
  }

  const key = node.props?.key;
  return key === undefined || key === null ? undefined : key;
}

function moveItem(list, fromIndex, toIndex) {
  const [item] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, item);
}

function diffProps(oldProps = {}, newProps = {}) {
  const changes = {};
  const keys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

  for (const key of keys) {
    if (key === "key" || oldProps[key] === newProps[key]) {
      continue;
    }

    changes[key] = newProps[key];
  }

  return Object.keys(changes).length > 0 ? changes : null;
}
