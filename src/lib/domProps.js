export function setDomProp(element, key, value) {
  // `key` participates in reconciliation only, so it should never leak into the DOM.
  if (key === "key") {
    return;
  }

  const normalizedKey = key === "class" ? "className" : key;
  const attributeName = normalizedKey === "className" ? "class" : normalizedKey;

  if (normalizedKey === "style" && value && typeof value === "object") {
    Object.assign(element.style, value);
    return;
  }

  if (value === false || value == null) {
    removeDomProp(element, normalizedKey);
    return;
  }

  if (value === true) {
    element.setAttribute(attributeName, "");
    return;
  }

  if (
    normalizedKey in element &&
    typeof value !== "object" &&
    !attributeName.startsWith("data-") &&
    !attributeName.startsWith("aria-")
  ) {
    element[normalizedKey] = value;
    return;
  }

  element.setAttribute(attributeName, String(value));
}

export function removeDomProp(element, key) {
  if (key === "key") {
    return;
  }

  const normalizedKey = key === "class" ? "className" : key;
  const attributeName = normalizedKey === "className" ? "class" : normalizedKey;

  if (normalizedKey === "className") {
    element.className = "";
  } else if (normalizedKey === "value") {
    element.value = "";
  } else if (normalizedKey === "checked") {
    element.checked = false;
  } else if (normalizedKey === "style") {
    element.removeAttribute("style");
    return;
  }

  element.removeAttribute(attributeName);
}
