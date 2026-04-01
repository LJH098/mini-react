/**
 * 담당: 이진혁
 */
import { NodeType, PatchType } from "../constants.js";
import { removeDomProp, setDomProp } from "./domProps.js";
import { isPlainObject, normalizeProps, normalizeVnode } from "./vnodeUtils.js";

export function applyPatches(rootDom, patches) {
  const normalizedPatches = normalizePatches(patches);
  let currentRoot = rootDom;

  for (const patch of orderPatches(normalizedPatches)) {
    currentRoot = applyPatch(currentRoot, patch);
  }

  return currentRoot;
}

function normalizePatches(patches) {
  if (!Array.isArray(patches)) {
    throw new TypeError("Invalid patches.");
  }

  return patches.map(normalizePatch);
}

function normalizePatch(patch) {
  if (!isPlainObject(patch) || !isValidPath(patch.path)) {
    throw new TypeError("Invalid patch.");
  }

  switch (patch.type) {
    case PatchType.TEXT:
      if (!Object.hasOwn(patch, "value")) {
        throw new TypeError("Invalid patch.");
      }

      return {
        type: PatchType.TEXT,
        path: [...patch.path],
        value: patch.value,
      };
    case PatchType.REPLACE:
    case PatchType.ADD:
      if (!Object.hasOwn(patch, "node")) {
        throw new TypeError("Invalid patch.");
      }

      return {
        type: patch.type,
        path: [...patch.path],
        node: normalizeVnode(patch.node),
      };
    case PatchType.PROPS:
      if (!isPlainObject(patch.props)) {
        throw new TypeError("Invalid patch.");
      }

      return {
        type: PatchType.PROPS,
        path: [...patch.path],
        props: normalizeProps(patch.props),
      };
    case PatchType.MOVE:
      if (
        !Number.isInteger(patch.fromIndex) ||
        !Number.isInteger(patch.toIndex) ||
        patch.fromIndex < 0 ||
        patch.toIndex < 0
      ) {
        throw new TypeError("Invalid patch.");
      }

      return {
        type: PatchType.MOVE,
        path: [...patch.path],
        fromIndex: patch.fromIndex,
        toIndex: patch.toIndex,
      };
    case PatchType.REMOVE:
      return {
        type: PatchType.REMOVE,
        path: [...patch.path],
      };
    default:
      throw new TypeError("Invalid patch.");
  }
}

function isValidPath(path) {
  return (
    Array.isArray(path) &&
    path.every((segment) => Number.isInteger(segment) && segment >= 0)
  );
}

function orderPatches(patches) {
  const structural = patches
    .filter((patch) => isStructuralPatch(patch.type))
    .sort(compareStructuralPatches);
  const updates = patches
    .filter((patch) => !isStructuralPatch(patch.type))
    .sort((left, right) => comparePaths(left.path, right.path));

  return [...structural, ...updates];
}

function isStructuralPatch(type) {
  return (
    type === PatchType.REMOVE ||
    type === PatchType.ADD ||
    type === PatchType.MOVE
  );
}

function compareStructuralPatches(left, right) {
  const parentComparison = comparePaths(getParentPath(left), getParentPath(right));

  if (parentComparison !== 0) {
    return parentComparison;
  }

  if (left.type === PatchType.REMOVE && right.type === PatchType.REMOVE) {
    const leftIndex = left.path[left.path.length - 1] ?? -1;
    const rightIndex = right.path[right.path.length - 1] ?? -1;
    return rightIndex - leftIndex;
  }

  if (left.type === PatchType.REMOVE) {
    return -1;
  }

  if (right.type === PatchType.REMOVE) {
    return 1;
  }

  return 0;
}

function getParentPath(patch) {
  if (patch.type === PatchType.MOVE || patch.path.length === 0) {
    return patch.path;
  }

  return patch.path.slice(0, -1);
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
    case PatchType.MOVE:
      return applyMovePatch(rootDom, patch);
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
      removeDomProp(target, key);
      continue;
    }

    setDomProp(target, key, value);
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

function applyMovePatch(rootDom, patch) {
  const parent = getNodeAtPath(rootDom, patch.path);

  if (!parent || patch.fromIndex === patch.toIndex) {
    return rootDom;
  }

  const target = parent.childNodes[patch.fromIndex];

  if (!target) {
    return rootDom;
  }

  // Moving the existing DOM node preserves identity, which is why keyed reorders need MOVE.
  const referenceIndex = patch.fromIndex < patch.toIndex
    ? patch.toIndex + 1
    : patch.toIndex;
  const referenceNode = parent.childNodes[referenceIndex] ?? null;

  parent.insertBefore(target, referenceNode);
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
    setDomProp(element, key, value);
  }

  for (const child of vnode.children ?? []) {
    element.appendChild(createDomFromVdom(child));
  }

  return element;
}
