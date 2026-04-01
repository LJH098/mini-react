import { NodeType, PatchType } from "./constants.js";

function formatPath(path = []) {
  return `[${path.join(", ")}]`;
}

function formatValue(value, indentLevel = 0) {
  const indent = "  ".repeat(indentLevel);
  const nextIndent = "  ".repeat(indentLevel + 1);

  if (value === null) {
    return `${indent}null`;
  }

  if (value === undefined) {
    return `${indent}undefined`;
  }

  if (typeof value === "string") {
    return `${indent}${JSON.stringify(value)}`;
  }

  if (typeof value !== "object") {
    return `${indent}${String(value)}`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${indent}[]`;
    }

    const lines = [`${indent}[`];

    for (const item of value) {
      lines.push(`${nextIndent}${formatValue(item, indentLevel + 1).trimStart()},`);
    }

    lines.push(`${indent}]`);
    return lines.join("\n");
  }

  const entries = Object.entries(value);

  if (entries.length === 0) {
    return `${indent}{}`;
  }

  const lines = [`${indent}{`];

  for (const [key, entryValue] of entries) {
    lines.push(`${nextIndent}${key}: ${formatValue(entryValue, indentLevel + 1).trimStart()},`);
  }

  lines.push(`${indent}}`);
  return lines.join("\n");
}

export function formatPatchTitle(patch, index) {
  return `${index + 1}. ${patch?.type ?? "PATCH"} ${formatPath(patch?.path ?? [])}`;
}

export function formatPatch(patch) {
  return formatValue(patch);
}

function describeVdom(vnode) {
  if (!vnode) {
    return "";
  }

  if (vnode.nodeType === NodeType.TEXT) {
    return JSON.stringify(vnode.value ?? "");
  }

  const props = Object.entries(vnode.props ?? {})
    .map(([key, value]) => `${key === "className" ? "class" : key}="${String(value)}"`)
    .join(" ");

  return props ? `<${vnode.type} ${props}>` : `<${vnode.type}>`;
}

function appendAnnotatedTreeLines(vnode, prefix, isLast, path, lines) {
  const connector = isLast ? "└─ " : "├─ ";
  lines.push({ text: `${prefix}${connector}${describeVdom(vnode)}`, path });

  const children = vnode?.children ?? [];
  const nextPrefix = `${prefix}${isLast ? "   " : "│  "}`;

  children.forEach((child, index) => {
    appendAnnotatedTreeLines(
      child,
      nextPrefix,
      index === children.length - 1,
      [...path, index],
      lines,
    );
  });
}

function buildAnnotatedTreeLines(vnode) {
  if (!vnode) {
    return [];
  }

  const lines = [{ text: describeVdom(vnode), path: [] }];
  const children = vnode.children ?? [];

  children.forEach((child, index) => {
    appendAnnotatedTreeLines(child, "", index === children.length - 1, [index], lines);
  });

  return lines;
}

function isPathAffected(linePath, affectedEntries) {
  return affectedEntries.some(({ path: affectedPath, type }) => {
    const isExactMatch =
      linePath.length === affectedPath.length &&
      affectedPath.every((v, i) => v === linePath[i]);

    const isPrefixMatch =
      linePath.length >= affectedPath.length &&
      affectedPath.every((v, i) => v === linePath[i]);

    switch (type) {
      case PatchType.REPLACE:
        return isExactMatch;
      case PatchType.REMOVE:
      case PatchType.ADD:
        return isPrefixMatch;
      default:
        return isExactMatch;
    }
  });
}

export function formatSnapshotComparison(previousVdom, currentVdom, patches) {
  const leftAnnotated = buildAnnotatedTreeLines(previousVdom);
  const rightAnnotated = buildAnnotatedTreeLines(currentVdom);

  const leftAffectedPaths = [];
  const rightAffectedPaths = [];

  for (const patch of patches) {
    const path = patch.path;

    switch (patch.type) {
      case PatchType.TEXT:
      case PatchType.PROPS:
      case PatchType.REPLACE:
      case PatchType.MOVE:
        leftAffectedPaths.push({ path, type: patch.type });
        rightAffectedPaths.push({ path, type: patch.type });
        break;
      case PatchType.REMOVE:
        leftAffectedPaths.push({ path, type: patch.type });
        break;
      case PatchType.ADD:
        rightAffectedPaths.push({ path, type: patch.type });
        break;
    }
  }

  const left = leftAnnotated.map((line) => ({
    text: line.text,
    type: isPathAffected(line.path, leftAffectedPaths) ? "removed" : "",
  }));

  const right = rightAnnotated.map((line) => ({
    text: line.text,
    type: isPathAffected(line.path, rightAffectedPaths) ? "added" : "",
  }));

  return { left, right };
}
