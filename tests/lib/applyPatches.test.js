// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { applyPatches } from "../../src/lib/applyPatches.js";
import { diff } from "../../src/lib/diff.js";
import { elementNode, textNode } from "../../src/constants.js";

describe("applyPatches", () => {
  it("exposes a function placeholder", () => {
    expect(typeof applyPatches).toBe("function");
  });

  it("applies normal-flow patches to the current DOM tree", () => {
    const rootDom = document.createElement("div");
    rootDom.id = "before";

    const span = document.createElement("span");
    span.className = "old";
    span.textContent = "hello";
    rootDom.appendChild(span);

    const oldVdom = elementNode("div", { id: "before" }, [
      elementNode("span", { className: "old" }, [textNode("hello")]),
    ]);
    const newVdom = elementNode("div", { id: "after" }, [
      elementNode("span", { className: "new" }, [textNode("world")]),
      elementNode("p", {}, [textNode("added")]),
    ]);

    const patchedRoot = applyPatches(rootDom, diff(oldVdom, newVdom));

    expect(patchedRoot).toBe(rootDom);
    expect(patchedRoot.outerHTML).toBe(
      '<div id="after"><span class="new">world</span><p>added</p></div>',
    );
  });

  it("removes trailing nodes when diff asks for removal", () => {
    const rootDom = document.createElement("div");

    const first = document.createElement("span");
    first.textContent = "first";
    const second = document.createElement("button");
    second.textContent = "second";

    rootDom.append(first, second);

    const oldVdom = elementNode("div", {}, [
      elementNode("span", {}, [textNode("first")]),
      elementNode("button", {}, [textNode("second")]),
    ]);
    const newVdom = elementNode("div", {}, [
      elementNode("span", {}, [textNode("first")]),
    ]);

    applyPatches(rootDom, diff(oldVdom, newVdom));

    expect(rootDom.outerHTML).toBe("<div><span>first</span></div>");
  });
});
