/**
 * 담당: 이진혁
 */
import { NodeType, PatchType } from "../constants.js";

export function diff(oldVdom, newVdom) {
  const patches = [];
  walk(oldVdom, newVdom, [], patches);
  return patches;
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
