import { elementNode, textNode } from "../constants.js";
import { normalizeProps } from "./vnodeUtils.js";

/**
 * DOM 엘리먼트의 어트리뷰트를 { 이름: 값 } 형태의 객체로 변환한다.
 * 예) <div class="box" id="app"> → { className: "box", id: "app" }
 */
function readProps(element) {
  return normalizeProps(
    Object.fromEntries(
      Array.from(element.attributes, (attribute) => [attribute.name, attribute.value]),
    ),
  );
}

/**
 * 담당: 위승철
 *
 * 실제 DOM 노드를 Virtual DOM(vdom) 객체로 변환한다.
 *
 * - 텍스트 노드면 → textNode("텍스트 내용") 반환
 * - 엘리먼트 노드면 → 자식 노드들도 재귀적으로 변환한 뒤 elementNode(태그, 속성, 자식들) 반환
 * - 그 외(주석 노드 등)는 → null 반환 (부모에서 filter로 제거됨)
 */
export function domToVdom(domNode) {
  // 텍스트 노드: "안녕하세요" 같은 순수 텍스트
  if (domNode.nodeType === Node.TEXT_NODE) {
    return textNode(domNode.nodeValue ?? "");
  }

  // 엘리먼트 노드: <div>, <span> 같은 태그
  if (domNode.nodeType === Node.ELEMENT_NODE) {
    // 자식 노드들을 재귀 변환하고, null(지원하지 않는 노드)은 제거
    const children = Array.from(domNode.childNodes, domToVdom).filter(
      (child) => child !== null,
    );

    // 태그명은 소문자로 통일 (DOM은 대문자로 반환하므로)
    return elementNode(domNode.tagName.toLowerCase(), readProps(domNode), children);
  }

  // 주석 노드 등 지원하지 않는 노드 타입은 null로 버림
  return null;
}
