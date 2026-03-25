// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { elementNode, textNode } from "../../src/constants.js";
import { vdomToDom } from "../../src/lib/vdomToDom.js";

describe("vdomToDom", () => {
  it("vdomToDom 함수가 export된다", () => {
    // given

    // when
    const actual = typeof vdomToDom;

    // then
    expect(actual).toBe("function");
  });

  it("텍스트 vnode를 Text 노드로 변환한다", () => {
    // given
    const vnode = textNode("hello");

    // when
    const domNode = vdomToDom(vnode);

    // then
    expect(domNode.nodeType).toBe(Node.TEXT_NODE);
    expect(domNode.nodeValue).toBe("hello");
  });

  it("속성과 텍스트 자식을 가진 엘리먼트 vnode를 DOM으로 변환한다", () => {
    // given
    const vnode = elementNode("button", {
      id: "save",
      className: "primary",
      title: "Save",
      "data-count": 3,
    }, [
      textNode("Save"),
    ]);

    // when
    const domNode = vdomToDom(vnode);

    // then
    expect(domNode.nodeType).toBe(Node.ELEMENT_NODE);
    expect(domNode.nodeName).toBe("BUTTON");
    expect(domNode.getAttribute("id")).toBe("save");
    expect(domNode.getAttribute("class")).toBe("primary");
    expect(domNode.getAttribute("title")).toBe("Save");
    expect(domNode.getAttribute("data-count")).toBe("3");
    expect(domNode.textContent).toBe("Save");
  });

  it("중첩된 자식 vnode를 재귀적으로 렌더링한다", () => {
    // given
    const vnode = elementNode("section", { id: "root" }, [
      elementNode("h1", {}, [textNode("Title")]),
      elementNode("p", {}, [textNode("Body copy")]),
    ]);

    // when
    const domNode = vdomToDom(vnode);

    // then
    expect(domNode.querySelector("h1")?.textContent).toBe("Title");
    expect(domNode.querySelector("p")?.textContent).toBe("Body copy");
    expect(domNode.childNodes).toHaveLength(2);
  });

  it("잘못된 vnode 입력이면 일관된 TypeError를 던진다", () => {
    expect(() => vdomToDom({})).toThrowError(new TypeError("Invalid vnode."));
  });
});
