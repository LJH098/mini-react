import { NodeType } from "../constants.js";
import { setDomProp } from "./domProps.js";
import { normalizeVnode } from "./vnodeUtils.js";

/**
 * 담당: 위승철
 *
 * Virtual DOM(vdom) 객체를 실제 DOM 노드로 변환한다. domToVdom의 반대 방향.
 *
 * - 텍스트 노드면 → document.createTextNode("텍스트 내용") 반환
 * - 엘리먼트 노드면 → createElement로 태그 생성 후, 속성 주입 → 자식들도 재귀 변환해서 붙임
 * - 둘 다 아니면 → TypeError 던짐 (잘못된 vnode가 들어온 것)
 */
export function vdomToDom(vnode) {
  return createDomFromVnode(normalizeVnode(vnode));
}

function createDomFromVnode(vnode) {
  // 텍스트 노드: DOM TextNode로 만들어서 반환
  if (vnode.nodeType === NodeType.TEXT) {
    return document.createTextNode(vnode.value ?? "");
  }

  // 엘리먼트 노드: 태그명으로 DOM 엘리먼트 생성
  if (vnode.nodeType === NodeType.ELEMENT) {
    const element = document.createElement(vnode.type);

    for (const [name, value] of Object.entries(vnode.props ?? {})) {
      setDomProp(element, name, value);
    }

    // 자식 vnode들을 재귀 변환해서 현재 엘리먼트에 붙임
    for (const child of vnode.children ?? []) {
      element.appendChild(createDomFromVnode(child));
    }

    return element;
  }
}
