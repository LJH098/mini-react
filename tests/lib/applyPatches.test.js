// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { applyPatches } from "../../src/lib/applyPatches.js";
import { diff } from "../../src/lib/diff.js";
import { elementNode, textNode } from "../../src/constants.js";

describe("applyPatches", () => {
  it("applyPatches 함수가 export된다", () => {
    // given

    // when
    const actual = typeof applyPatches;

    // then
    expect(actual).toBe("function");
  });

  it("현재 DOM 트리에 일반 패치를 적용한다", () => {
    // given
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

    // when
    const patchedRoot = applyPatches(rootDom, diff(oldVdom, newVdom));

    // then
    expect(patchedRoot).toBe(rootDom);
    expect(patchedRoot.outerHTML).toBe(
      '<div id="after"><span class="new">world</span><p>added</p></div>',
    );
  });

  it("제거 패치가 있으면 뒤쪽 노드를 삭제한다", () => {
    // given
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

    // when
    applyPatches(rootDom, diff(oldVdom, newVdom));

    // then
    expect(rootDom.outerHTML).toBe("<div><span>first</span></div>");
  });

  it("잘못된 patch 입력이면 일관된 TypeError를 던진다", () => {
    const rootDom = document.createElement("div");

    expect(() =>
      applyPatches(rootDom, [{ type: "UNKNOWN_PATCH", path: [] }]),
    ).toThrowError(new TypeError("Invalid patch."));
    expect(() =>
      applyPatches(rootDom, [{ type: "PROPS", path: [] }]),
    ).toThrowError(new TypeError("Invalid patch."));
    expect(() =>
      applyPatches(rootDom, [{ type: "TEXT", path: ["nope"], value: "x" }]),
    ).toThrowError(new TypeError("Invalid patch."));
  });
});
