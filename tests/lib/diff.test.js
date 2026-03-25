import { describe, expect, it } from "vitest";
import { diff } from "../../src/lib/diff.js";
import { PatchType, elementNode, textNode } from "../../src/constants.js";

describe("diff", () => {
  it("exposes a function placeholder", () => {
    expect(typeof diff).toBe("function");
  });

  it("creates patches for props, text, and appended children", () => {
    const oldVdom = elementNode("div", { id: "before" }, [
      elementNode("span", { className: "old" }, [textNode("hello")]),
    ]);
    const newVdom = elementNode("div", { id: "after" }, [
      elementNode("span", { className: "new" }, [textNode("world")]),
      elementNode("p", {}, [textNode("added")]),
    ]);

    expect(diff(oldVdom, newVdom)).toEqual([
      {
        type: PatchType.PROPS,
        path: [],
        props: { id: "after" },
      },
      {
        type: PatchType.PROPS,
        path: [0],
        props: { className: "new" },
      },
      {
        type: PatchType.TEXT,
        path: [0, 0],
        value: "world",
      },
      {
        type: PatchType.ADD,
        path: [1],
        node: elementNode("p", {}, [textNode("added")]),
      },
    ]);
  });

  it("creates replace and remove patches for changed node shapes", () => {
    const oldVdom = elementNode("div", {}, [
      elementNode("span", {}, [textNode("keep")]),
      elementNode("button", { title: "old" }, [textNode("remove")]),
    ]);
    const newVdom = elementNode("div", {}, [
      elementNode("p", {}, [textNode("keep")]),
    ]);

    expect(diff(oldVdom, newVdom)).toEqual([
      {
        type: PatchType.REPLACE,
        path: [0],
        node: elementNode("p", {}, [textNode("keep")]),
      },
      {
        type: PatchType.REMOVE,
        path: [1],
      },
    ]);
  });
});
