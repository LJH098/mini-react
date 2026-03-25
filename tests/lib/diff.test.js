import { describe, expect, it } from "vitest";
import { diff } from "../../src/lib/diff.js";
import { PatchType, elementNode, textNode } from "../../src/constants.js";

describe("diff", () => {
  it("diff 함수가 export된다", () => {
    // given

    // when
    const actual = typeof diff;

    // then
    expect(actual).toBe("function");
  });

  it("속성 변경과 텍스트 변경, 자식 추가 패치를 만든다", () => {
    // given
    const oldVdom = elementNode("div", { id: "before" }, [
      elementNode("span", { className: "old" }, [textNode("hello")]),
    ]);
    const newVdom = elementNode("div", { id: "after" }, [
      elementNode("span", { className: "new" }, [textNode("world")]),
      elementNode("p", {}, [textNode("added")]),
    ]);

    // when
    const actual = diff(oldVdom, newVdom);

    // then
    expect(actual).toEqual([
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

  it("노드 형태가 바뀌면 교체와 제거 패치를 만든다", () => {
    // given
    const oldVdom = elementNode("div", {}, [
      elementNode("span", {}, [textNode("keep")]),
      elementNode("button", { title: "old" }, [textNode("remove")]),
    ]);
    const newVdom = elementNode("div", {}, [
      elementNode("p", {}, [textNode("keep")]),
    ]);

    // when
    const actual = diff(oldVdom, newVdom);

    // then
    expect(actual).toEqual([
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

  it("루트 텍스트가 바뀌면 path가 빈 TEXT 패치를 만든다", () => {
    // given
    const oldVdom = textNode("before");
    const newVdom = textNode("after");

    // when
    const actual = diff(oldVdom, newVdom);

    // then
    expect(actual).toEqual([
      {
        type: PatchType.TEXT,
        path: [],
        value: "after",
      },
    ]);
  });

  it("잘못된 vnode 입력이면 일관된 TypeError를 던진다", () => {
    expect(() => diff({}, {})).toThrowError(new TypeError("Invalid vnode."));
    expect(() => diff(null, {})).toThrowError(new TypeError("Invalid vnode."));
  });
});
