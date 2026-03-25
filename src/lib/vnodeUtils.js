import { NodeType } from "../constants.js";

export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function normalizeProps(props = {}) {
  if (props === undefined) {
    return {};
  }

  if (!isPlainObject(props)) {
    return props;
  }

  const normalized = {};
  const hasClassName = Object.hasOwn(props, "className");

  for (const [key, value] of Object.entries(props)) {
    if (key === "class") {
      if (!hasClassName) {
        normalized.className = value;
      }

      continue;
    }

    normalized[key] = value;
  }

  return normalized;
}

export function assertValidVnode(vnode) {
  if (!isValidVnode(vnode)) {
    throw new TypeError("Invalid vnode.");
  }
}

export function normalizeVnode(vnode) {
  assertValidVnode(vnode);

  if (vnode.nodeType === NodeType.TEXT) {
    return {
      nodeType: NodeType.TEXT,
      value: vnode.value,
    };
  }

  return {
    nodeType: NodeType.ELEMENT,
    type: vnode.type,
    props: normalizeProps(vnode.props ?? {}),
    children: (vnode.children ?? []).map(normalizeVnode),
  };
}

function isValidVnode(vnode) {
  if (!isPlainObject(vnode) || typeof vnode.nodeType !== "string") {
    return false;
  }

  if (vnode.nodeType === NodeType.TEXT) {
    return Object.hasOwn(vnode, "value");
  }

  if (vnode.nodeType !== NodeType.ELEMENT) {
    return false;
  }

  if (typeof vnode.type !== "string" || vnode.type.trim() === "") {
    return false;
  }

  if (vnode.props !== undefined && !isPlainObject(vnode.props)) {
    return false;
  }

  if (vnode.children !== undefined && !Array.isArray(vnode.children)) {
    return false;
  }

  return (vnode.children ?? []).every(isValidVnode);
}
