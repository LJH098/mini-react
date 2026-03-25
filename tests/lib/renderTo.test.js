// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { elementNode, textNode } from "../../src/constants.js";
import { domToVdom } from "../../src/lib/domToVdom.js";
import { renderTo } from "../../src/lib/renderTo.js";
import { vdomToDom } from "../../src/lib/vdomToDom.js";

describe("renderTo", () => {
  it("renderTo 함수가 export된다", () => {
    // given

    // when
    const actual = typeof renderTo;

    // then
    expect(actual).toBe("function");
  });

  it("빈 컨테이너에 첫 렌더를 수행한다", () => {
    // given
    const container = document.createElement("div");
    const vdom = elementNode("section", { id: "app" }, [textNode("Hello")]);

    // when
    renderTo(container, vdom);

    // then
    expect(container.childNodes).toHaveLength(1);
    expect(container.firstChild?.nodeName).toBe("SECTION");
    expect(container.textContent).toBe("Hello");
  });

  it("기존 자식을 지우고 새 내용으로 전체 교체한다", () => {
    // given
    const container = document.createElement("div");
    const vdom = elementNode("main", { title: "next" }, [textNode("Fresh content")]);

    container.innerHTML = "<p>old</p><span>stale</span>";

    // when
    renderTo(container, vdom);

    // then
    expect(container.childNodes).toHaveLength(1);
    expect(container.querySelector("p")).toBeNull();
    expect(container.firstChild?.nodeName).toBe("MAIN");
    expect(container.textContent).toBe("Fresh content");
  });

  it("루트에 텍스트 vnode가 와도 컨테이너에 바로 렌더링한다", () => {
    // given
    const container = document.createElement("div");
    const vdom = textNode("Root text");

    container.innerHTML = "<p>old</p>";

    // when
    renderTo(container, vdom);

    // then
    expect(container.childNodes).toHaveLength(1);
    expect(container.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(container.textContent).toBe("Root text");
  });

  it("renderTo 결과가 단독 변환 결과와 같고 왕복 구조를 유지한다", () => {
    // given
    const container = document.createElement("div");
    const vdom = elementNode("article", { id: "post", "data-kind": "demo" }, [
      elementNode("h1", {}, [textNode("Title")]),
      elementNode("p", {}, [textNode("Body")]),
    ]);
    const expectedDom = vdomToDom(vdom);

    // when
    renderTo(container, vdom);

    // then
    expect(container.firstChild?.isEqualNode(expectedDom)).toBe(true);
    expect(domToVdom(container.firstChild)).toEqual(vdom);
  });
});
