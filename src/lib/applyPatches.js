/**
 * 담당: 이진혁
 */
import { NodeType, PatchType } from "../constants.js";

export function applyPatches(rootDom, patches) {
  let currentRoot = rootDom;

  for (const patch of orderPatches(patches)) {
    currentRoot = applyPatch(currentRoot, patch);
  }

  return currentRoot;
}

function orderPatches(patches) {
  const removals = patches
    .filter((patch) => patch.type === PatchType.REMOVE)
    .sort(compareRemovalPaths);
  const updates = patches
    .filter(
      (patch) => patch.type !== PatchType.REMOVE && patch.type !== PatchType.ADD,
    )
    .sort((left, right) => comparePaths(left.path, right.path));
  const additions = patches
    .filter((patch) => patch.type === PatchType.ADD)
    .sort((left, right) => comparePaths(left.path, right.path));

  return [...removals, ...updates, ...additions];
}

function compareRemovalPaths(left, right) {
  if (left.path.length !== right.path.length) {
    return right.path.length - left.path.length;
  }

  return comparePaths(right.path, left.path);
}

function comparePaths(leftPath, rightPath) {
  const limit = Math.min(leftPath.length, rightPath.length);

  for (let index = 0; index < limit; index += 1) {
    if (leftPath[index] !== rightPath[index]) {
      return leftPath[index] - rightPath[index];
    }
  }

  return leftPath.length - rightPath.length;
}

function applyPatch(rootDom, patch) {
  switch (patch.type) {
    case PatchType.TEXT:
      return applyTextPatch(rootDom, patch);
    case PatchType.REPLACE:
      return applyReplacePatch(rootDom, patch);
    case PatchType.PROPS:
      return applyPropsPatch(rootDom, patch);
    case PatchType.ADD:
      return applyAddPatch(rootDom, patch);
    case PatchType.REMOVE:
      return applyRemovePatch(rootDom, patch);
    default:
      return rootDom;
  }
}

function applyTextPatch(rootDom, patch) {
  const target = getNodeAtPath(rootDom, patch.path);

  if (!target) {
    return rootDom;
  }

  target.textContent = patch.value ?? "";
  return rootDom;
}

function applyReplacePatch(rootDom, patch) {
  const nextDom = createDomFromVdom(patch.node);

  if (patch.path.length === 0) {
    rootDom?.parentNode?.replaceChild(nextDom, rootDom);
    return nextDom;
  }

  const target = getNodeAtPath(rootDom, patch.path);
  if (!target?.parentNode) {
    return rootDom;
  }

  target.parentNode.replaceChild(nextDom, target);
  return rootDom;
}

function applyPropsPatch(rootDom, patch) {
  const target = getNodeAtPath(rootDom, patch.path);

  if (!target || target.nodeType !== Node.ELEMENT_NODE) {
    return rootDom;
  }

  for (const [key, value] of Object.entries(patch.props ?? {})) {
    if (value === undefined) {
      removeProp(target, key);
      continue;
    }

    setProp(target, key, value);
  }

  return rootDom;
}

function applyAddPatch(rootDom, patch) {
  const nextDom = createDomFromVdom(patch.node);

  if (patch.path.length === 0) {
    return nextDom;
  }

  const parentPath = patch.path.slice(0, -1);
  const childIndex = patch.path[patch.path.length - 1];
  const parent = getNodeAtPath(rootDom, parentPath);

  if (!parent) {
    return rootDom;
  }

  parent.insertBefore(nextDom, parent.childNodes[childIndex] ?? null);
  return rootDom;
}

function applyRemovePatch(rootDom, patch) {
  if (patch.path.length === 0) {
    rootDom?.parentNode?.removeChild(rootDom);
    return null;
  }

  const target = getNodeAtPath(rootDom, patch.path);
  target?.parentNode?.removeChild(target);
  return rootDom;
}

function getNodeAtPath(rootDom, path) {
  let currentNode = rootDom;

  for (const childIndex of path) {
    currentNode = currentNode?.childNodes?.[childIndex] ?? null;
  }

  return currentNode;
}

function createDomFromVdom(vnode) {
  if (vnode.nodeType === NodeType.TEXT) {
    return document.createTextNode(vnode.value ?? "");
  }

  const element = document.createElement(vnode.type);

  for (const [key, value] of Object.entries(vnode.props ?? {})) {
    setProp(element, key, value);
  }

  for (const child of vnode.children ?? []) {
    element.appendChild(createDomFromVdom(child));
  }

  return element;
}

function setProp(element, key, value) {
  const attributeName = key === "className" ? "class" : key;

  if (key === "style" && value && typeof value === "object") {
    Object.assign(element.style, value);
    return;
  }

  if (value === false || value == null) {
    removeProp(element, key);
    return;
  }

  if (value === true) {
    element.setAttribute(attributeName, "");
    return;
  }

  if (
    key in element &&
    typeof value !== "object" &&
    !attributeName.startsWith("data-") &&
    !attributeName.startsWith("aria-")
  ) {
    element[key] = value;
    return;
  }

  element.setAttribute(attributeName, String(value));
}

function removeProp(element, key) {
  const attributeName = key === "className" ? "class" : key;

  if (key === "className") {
    element.className = "";
  } else if (key === "value") {
    element.value = "";
  } else if (key === "checked") {
    element.checked = false;
  } else if (key === "style") {
    element.removeAttribute("style");
    return;
  }

  element.removeAttribute(attributeName);
}
