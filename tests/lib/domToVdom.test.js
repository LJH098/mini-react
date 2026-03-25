// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { elementNode, textNode } from "../../src/constants.js";
import { domToVdom } from "../../src/lib/domToVdom.js";

describe("domToVdom", () => {
  it("domToVdom 함수가 export된다", () => {
    // given

    // when
    const actual = typeof domToVdom;

    // then
    expect(actual).toBe("function");
  });

  it("Text 노드를 텍스트 vnode로 변환한다", () => {
    // given
    const domNode = document.createTextNode("hello");

    // when
    const actual = domToVdom(domNode);

    // then
    expect(actual).toEqual(textNode("hello"));
  });

  it("엘리먼트 트리를 vnode 구조로 변환한다", () => {
    // given
    const article = document.createElement("article");
    const strong = document.createElement("strong");

    article.setAttribute("id", "intro");
    article.setAttribute("class", "hero");
    article.setAttribute("data-count", "3");
    article.append("Hello ");
    strong.textContent = "world";
    article.append(strong);

    // when
    const actual = domToVdom(article);

    // then
    expect(actual).toEqual(
      elementNode("article", { id: "intro", className: "hero", "data-count": "3" }, [
        textNode("Hello "),
        elementNode("strong", {}, [textNode("world")]),
      ]),
    );
  });

  it("지원하지 않는 comment 노드는 무시한다", () => {
    // given
    const wrapper = document.createElement("div");
    const comment = document.createComment("skip me");

    wrapper.append(comment);
    wrapper.append(document.createTextNode("kept"));

    // when
    const actualComment = domToVdom(comment);
    const actualWrapper = domToVdom(wrapper);

    // then
    expect(actualComment).toBeNull();
    expect(actualWrapper).toEqual(
      elementNode("div", {}, [textNode("kept")]),
    );
  });
});
