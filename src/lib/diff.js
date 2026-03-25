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
  const aKeys = Object.keys(aProps);
  const bKeys = Object.keys(bProps);

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

  for (let i = 0; i < aChildren.length; i += 1) {
    if (!isDeepEqual(aChildren[i], bChildren[i])) {
      return false;
    }
  }

  return true;
}

function tryFindRemoved(oldChildren, newChildren) {
  if (oldChildren.length !== newChildren.length + 1) {
    return -1;
  }

  let k = 0;

  while (k < newChildren.length && isDeepEqual(oldChildren[k], newChildren[k])) {
    k += 1;
  }

  for (let i = k; i < newChildren.length; i += 1) {
    if (!isDeepEqual(oldChildren[i + 1], newChildren[i])) {
      return -1;
    }
  }

  return k;
}

function tryFindAdded(oldChildren, newChildren) {
  if (newChildren.length !== oldChildren.length + 1) {
    return -1;
  }

  let k = 0;

  while (k < oldChildren.length && isDeepEqual(oldChildren[k], newChildren[k])) {
    k += 1;
  }

  for (let i = k; i < oldChildren.length; i += 1) {
    if (!isDeepEqual(oldChildren[i], newChildren[i + 1])) {
      return -1;
    }
  }

  return k;
}

function diffChildren(oldChildren, newChildren, path, patches) {
  const removedIndex = tryFindRemoved(oldChildren, newChildren);

  if (removedIndex !== -1) {
    patches.push({ type: PatchType.REMOVE, path: [...path, removedIndex] });
    return;
  }

  const addedIndex = tryFindAdded(oldChildren, newChildren);

  if (addedIndex !== -1) {
    patches.push({ type: PatchType.ADD, path: [...path, addedIndex], node: newChildren[addedIndex] });
    return;
  }

  const maxLength = Math.max(oldChildren.length, newChildren.length);

  for (let index = 0; index < maxLength; index += 1) {
    walk(
      oldChildren[index],
      newChildren[index],
      [...path, index],
      patches,
    );
  }
}

function diffProps(oldProps = {}, newProps = {}) {
  const changes = {};
  const keys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

  for (const key of keys) {
    if (oldProps[key] === newProps[key]) {
      continue;
    }

    changes[key] = newProps[key];
  }

  return Object.keys(changes).length > 0 ? changes : null;
}
