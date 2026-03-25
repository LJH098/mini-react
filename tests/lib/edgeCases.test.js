// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  PatchType,
  elementNode,
  textNode,
} from "../../src/constants.js";
import { applyPatches } from "../../src/lib/applyPatches.js";
import { diff } from "../../src/lib/diff.js";
import { domToVdom } from "../../src/lib/domToVdom.js";
import { vdomToDom } from "../../src/lib/vdomToDom.js";

function removeBlankTextNodes(node) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim() === "") {
      child.remove();
      continue;
    }

    removeBlankTextNodes(child);
  }
}

function makeDom(html) {
  const mount = document.createElement("div");
  mount.innerHTML = html.trim();
  removeBlankTextNodes(mount);

  return {
    mount,
    root: mount.firstElementChild ?? mount.firstChild,
  };
}

function patchFrom(oldVdom, newVdom, rootDom) {
  const patches = diff(oldVdom, newVdom);
  const nextRoot = applyPatches(rootDom, patches);

  return { patches, nextRoot };
}

function captureChildren(root) {
  return Array.from(root.childNodes);
}

function expectNoThrowAndSameDom(rootDom, patches) {
  const before = rootDom.outerHTML;

  expect(() => applyPatches(rootDom, patches)).not.toThrow();
  expect(rootDom.outerHTML).toBe(before);
}

describe("edgeCases", () => {
  describe("최소 변경 보장", () => {
    it("부분 업데이트 정확성: 바뀐 리프 텍스트에만 패치를 만든다", () => {
      const { root } = makeDom(`
        <div id="root">
          <span id="a">A</span>
          <span id="b">B</span>
          <span id="c">C</span>
        </div>
      `);
      const oldVdom = elementNode("div", { id: "root" }, [
        elementNode("span", { id: "a" }, [textNode("A")]),
        elementNode("span", { id: "b" }, [textNode("B")]),
        elementNode("span", { id: "c" }, [textNode("C")]),
      ]);
      const newVdom = elementNode("div", { id: "root" }, [
        elementNode("span", { id: "a" }, [textNode("A")]),
        elementNode("span", { id: "b" }, [textNode("B!")]),
        elementNode("span", { id: "c" }, [textNode("C")]),
      ]);

      const { patches } = patchFrom(oldVdom, newVdom, root);

      expect(patches).toEqual([
        {
          type: PatchType.TEXT,
          path: [1, 0],
          value: "B!",
        },
      ]);
      expect(root.outerHTML).toBe(
        '<div id="root"><span id="a">A</span><span id="b">B!</span><span id="c">C</span></div>',
      );
    });

    it("리프 텍스트 변경 시 형제 DOM identity를 재사용한다", () => {
      const { root } = makeDom(`
        <div id="root">
          <span id="a">A</span>
          <span id="b">B</span>
          <span id="c">C</span>
        </div>
      `);
      const before = captureChildren(root);
      const oldVdom = elementNode("div", { id: "root" }, [
        elementNode("span", { id: "a" }, [textNode("A")]),
        elementNode("span", { id: "b" }, [textNode("B")]),
        elementNode("span", { id: "c" }, [textNode("C")]),
      ]);
      const newVdom = elementNode("div", { id: "root" }, [
        elementNode("span", { id: "a" }, [textNode("A")]),
        elementNode("span", { id: "b" }, [textNode("B!")]),
        elementNode("span", { id: "c" }, [textNode("C")]),
      ]);

      patchFrom(oldVdom, newVdom, root);

      expect(root.childNodes[0]).toBe(before[0]);
      expect(root.childNodes[1]).toBe(before[1]);
      expect(root.childNodes[2]).toBe(before[2]);
    });

    it("무변경 no-op: 동일 vnode를 비교하면 빈 배열을 반환한다", () => {
      const vnode = elementNode("div", { id: "root" }, [
        elementNode("span", {}, [textNode("same")]),
      ]);

      expect(diff(vnode, vnode)).toEqual([]);
    });
  });

  describe("구조 변경", () => {
    it("부모 삭제 시 서브트리 하위 path 제거 없이 결과 DOM을 안전하게 정리한다", () => {
      const { root } = makeDom(`
        <div id="root">
          <section id="parent">
            <span>A</span>
            <em>B</em>
          </section>
          <p>C</p>
        </div>
      `);
      const oldVdom = elementNode("div", { id: "root" }, [
        elementNode("section", { id: "parent" }, [
          elementNode("span", {}, [textNode("A")]),
          elementNode("em", {}, [textNode("B")]),
        ]),
        elementNode("p", {}, [textNode("C")]),
      ]);
      const newVdom = elementNode("div", { id: "root" }, [
        elementNode("p", {}, [textNode("C")]),
      ]);

      const { patches } = patchFrom(oldVdom, newVdom, root);

      expect(patches).toEqual([
        {
          type: PatchType.REPLACE,
          path: [0],
          node: elementNode("p", {}, [textNode("C")]),
        },
        {
          type: PatchType.REMOVE,
          path: [1],
        },
      ]);
      expect(
        patches.some(
          (patch) => patch.path.length > 1 && patch.path[0] === 0,
        ),
      ).toBe(false);
      expect(root.outerHTML).toBe('<div id="root"><p>C</p></div>');
    });

    it("루트 기준 replace, remove, add를 현재 구현대로 처리한다", () => {
      const replaceDom = makeDom('<div id="mount"><div id="root"><span>a</span></div></div>');
      const replaceOldVdom = elementNode("div", { id: "root" }, [
        elementNode("span", {}, [textNode("a")]),
      ]);
      const replaceNewVdom = elementNode("section", { id: "next" }, [
        textNode("b"),
      ]);
      const { patches: replacePatches, nextRoot: replacedRoot } = patchFrom(
        replaceOldVdom,
        replaceNewVdom,
        replaceDom.mount.firstElementChild,
      );

      expect(replacePatches).toEqual([
        {
          type: PatchType.REPLACE,
          path: [],
          node: replaceNewVdom,
        },
      ]);
      expect(replacedRoot?.outerHTML).toBe('<section id="next">b</section>');
      expect(replaceDom.mount.innerHTML).toBe('<section id="next">b</section>');

      const removeDom = makeDom('<div id="mount"><div id="root"><span>a</span></div></div>');
      const removeOldVdom = elementNode("div", { id: "root" }, [
        elementNode("span", {}, [textNode("a")]),
      ]);
      const { patches: removePatches, nextRoot: removedRoot } = patchFrom(
        removeOldVdom,
        null,
        removeDom.mount.firstElementChild,
      );

      expect(removePatches).toEqual([
        {
          type: PatchType.REMOVE,
          path: [],
        },
      ]);
      expect(removedRoot).toBeNull();
      expect(removeDom.mount.innerHTML).toBe("");

      const addedRoot = applyPatches(
        null,
        diff(null, elementNode("br", {}, [])),
      );
      removeDom.mount.appendChild(addedRoot);

      expect(addedRoot?.outerHTML).toBe("<br>");
      expect(removeDom.mount.innerHTML).toBe("<br>");
    });

    it("앞쪽 삽입은 결과 DOM은 맞지만 뒤 형제 identity는 재사용하지 않는다", () => {
      const { root } = makeDom(`
        <div id="root">
          <span id="b">B</span>
          <span id="c">C</span>
        </div>
      `);
      const before = captureChildren(root);
      const oldVdom = elementNode("div", { id: "root" }, [
        elementNode("span", { id: "b" }, [textNode("B")]),
        elementNode("span", { id: "c" }, [textNode("C")]),
      ]);
      const newVdom = elementNode("div", { id: "root" }, [
        elementNode("span", { id: "a" }, [textNode("A")]),
        elementNode("span", { id: "b" }, [textNode("B")]),
        elementNode("span", { id: "c" }, [textNode("C")]),
      ]);

      const { patches } = patchFrom(oldVdom, newVdom, root);

      expect(patches).toEqual([
        {
          type: PatchType.PROPS,
          path: [0],
          props: { id: "a" },
        },
        {
          type: PatchType.TEXT,
          path: [0, 0],
          value: "A",
        },
        {
          type: PatchType.PROPS,
          path: [1],
          props: { id: "b" },
        },
        {
          type: PatchType.TEXT,
          path: [1, 0],
          value: "B",
        },
        {
          type: PatchType.ADD,
          path: [2],
          node: elementNode("span", { id: "c" }, [textNode("C")]),
        },
      ]);
      expect(root.outerHTML).toBe(
        '<div id="root"><span id="a">A</span><span id="b">B</span><span id="c">C</span></div>',
      );
      expect(root.childNodes[1]).not.toBe(before[0]);
      expect(root.childNodes[2]).not.toBe(before[1]);
    });

    it("형제 reorder는 move 대신 인덱스 기반 텍스트 업데이트로 처리한다", () => {
      const { root } = makeDom(`
        <ul>
          <li>A</li>
          <li>B</li>
        </ul>
      `);
      const before = captureChildren(root);
      const oldVdom = elementNode("ul", {}, [
        elementNode("li", {}, [textNode("A")]),
        elementNode("li", {}, [textNode("B")]),
      ]);
      const newVdom = elementNode("ul", {}, [
        elementNode("li", {}, [textNode("B")]),
        elementNode("li", {}, [textNode("A")]),
      ]);

      const { patches } = patchFrom(oldVdom, newVdom, root);

      expect(patches).toEqual([
        {
          type: PatchType.TEXT,
          path: [0, 0],
          value: "B",
        },
        {
          type: PatchType.TEXT,
          path: [1, 0],
          value: "A",
        },
      ]);
      expect(root.outerHTML).toBe("<ul><li>B</li><li>A</li></ul>");
      expect(root.childNodes[0]).toBe(before[0]);
      expect(root.childNodes[1]).toBe(before[1]);
    });
  });

  describe("입력 오류 / 방어 처리", () => {
    it("잘못된 vnode 입력은 public API 전반에서 동일하게 TypeError를 던진다", () => {
      expect(() => vdomToDom({})).toThrowError(
        new TypeError("Invalid vnode."),
      );
      expect(() => diff({}, {})).toThrowError(
        new TypeError("Invalid vnode."),
      );
      expect(() => diff(null, {})).toThrowError(
        new TypeError("Invalid vnode."),
      );
    });

    it("알 수 없는 patch type과 필수 필드 누락 patch는 TypeError를 던진다", () => {
      const { root } = makeDom('<div id="root"><span>one</span></div>');

      expect(() =>
        applyPatches(root, [{ type: "UNKNOWN_PATCH", path: [] }]),
      ).toThrowError(new TypeError("Invalid patch."));
      expect(() =>
        applyPatches(root, [{ type: PatchType.PROPS, path: [] }]),
      ).toThrowError(new TypeError("Invalid patch."));
      expect(() =>
        applyPatches(root, [{ type: PatchType.TEXT, path: ["bad"], value: "x" }]),
      ).toThrowError(new TypeError("Invalid patch."));
    });

    it("존재하지 않는 path와 이미 제거된 노드를 가리키는 path를 안전하게 무시한다", () => {
      const first = makeDom('<div id="root"><span>one</span></div>');

      expectNoThrowAndSameDom(first.root, [
        { type: PatchType.TEXT, path: [9, 9], value: "changed" },
        { type: PatchType.PROPS, path: [4], props: { title: "ignored" } },
        { type: PatchType.REMOVE, path: [7] },
      ]);

      const second = makeDom('<div id="root"><span>one</span></div>');

      expect(() =>
        applyPatches(second.root, [
          { type: PatchType.REMOVE, path: [0] },
          { type: PatchType.TEXT, path: [0, 0], value: "after-remove" },
        ]),
      ).not.toThrow();
      expect(second.root.outerHTML).toBe('<div id="root"></div>');
    });
  });

  describe("속성 / 노드 타입 처리", () => {
    it("prop 삭제는 undefined 패치를 만들고 실제 DOM에서도 제거한다", () => {
      const { root } = makeDom('<div id="root" title="before" data-kind="demo"></div>');
      const oldVdom = elementNode("div", {
        id: "root",
        title: "before",
        "data-kind": "demo",
      });
      const newVdom = elementNode("div", { id: "root" });

      const { patches } = patchFrom(oldVdom, newVdom, root);

      expect(patches).toHaveLength(1);
      expect(patches[0].type).toBe(PatchType.PROPS);
      expect(patches[0].path).toEqual([]);
      expect(Object.hasOwn(patches[0].props, "title")).toBe(true);
      expect(Object.hasOwn(patches[0].props, "data-kind")).toBe(true);
      expect(patches[0].props.title).toBeUndefined();
      expect(patches[0].props["data-kind"]).toBeUndefined();
      expect(root.outerHTML).toBe('<div id="root"></div>');
    });

    it("prop 타입 처리: boolean, null, undefined, 빈 문자열을 현재 구현대로 반영한다", () => {
      const inputDom = makeDom('<input checked value="hello" disabled>');
      const buttonDom = makeDom("<button></button>");

      applyPatches(inputDom.root, [
        {
          type: PatchType.PROPS,
          path: [],
          props: {
            checked: null,
            value: "",
            disabled: undefined,
          },
        },
      ]);
      applyPatches(buttonDom.root, [
        {
          type: PatchType.PROPS,
          path: [],
          props: {
            hidden: true,
          },
        },
      ]);

      expect(inputDom.root.checked).toBe(false);
      expect(inputDom.root.value).toBe("");
      expect(inputDom.root.disabled).toBe(false);
      expect(inputDom.root.hasAttribute("checked")).toBe(false);
      expect(inputDom.root.hasAttribute("disabled")).toBe(false);
      expect(buttonDom.root.hidden).toBe(true);
      expect(buttonDom.root.getAttribute("hidden")).toBe("");
    });

    it("className / class 입력은 내부적으로 className으로 canonicalize된다", () => {
      const { root } = makeDom('<div class="a"></div>');
      const oldVdom = domToVdom(root);
      const newVdom = elementNode("div", { className: "a" }, []);
      const { patches } = patchFrom(oldVdom, newVdom, root);

      expect(oldVdom).toEqual(elementNode("div", { className: "a" }, []));
      expect(patches).toEqual([]);
      expect(root.outerHTML).toBe('<div class="a"></div>');
      expect(domToVdom(root)).toEqual(elementNode("div", { className: "a" }, []));
    });

    it("img, input, button, data-*, aria-*, style 조합을 생성하고 교체할 수 있다", () => {
      const { root } = makeDom("<div></div>");
      const oldVdom = elementNode("div", {}, []);
      const newVdom = elementNode("section", { "data-kind": "demo" }, [
        elementNode("img", {
          src: "/demo.png",
          alt: "demo image",
          "aria-label": "preview",
        }),
        elementNode("input", {
          type: "checkbox",
          checked: true,
          value: "on",
        }),
        elementNode("button", {
          "data-action": "save",
          "aria-pressed": "false",
          style: { color: "red" },
        }, [textNode("Save")]),
      ]);

      const { nextRoot } = patchFrom(oldVdom, newVdom, root);

      expect(nextRoot?.nodeName).toBe("SECTION");
      expect(nextRoot?.getAttribute("data-kind")).toBe("demo");
      expect(nextRoot?.querySelector("img")?.getAttribute("alt")).toBe("demo image");
      expect(nextRoot?.querySelector("img")?.getAttribute("aria-label")).toBe("preview");
      expect(nextRoot?.querySelector("input")?.checked).toBe(true);
      expect(nextRoot?.querySelector("input")?.value).toBe("on");
      expect(nextRoot?.querySelector("button")?.getAttribute("data-action")).toBe("save");
      expect(nextRoot?.querySelector("button")?.getAttribute("aria-pressed")).toBe("false");
      expect(nextRoot?.querySelector("button")?.style.color).toBe("red");
    });

    it("void element는 생성, 비교, patch 과정에서 자식 없이 처리된다", () => {
      const { root } = makeDom('<div><img src="/before.png"></div>');
      const oldVdom = elementNode("div", {}, [
        elementNode("img", { src: "/before.png" }),
      ]);
      const newVdom = elementNode("div", {}, [
        elementNode("input", { value: "typed" }),
        elementNode("br", {}),
      ]);

      patchFrom(oldVdom, newVdom, root);

      expect(root.outerHTML).toBe('<div><input><br></div>');
      expect(root.querySelector("input")?.value).toBe("typed");
      expect(root.querySelector("img")).toBeNull();
      expect(root.querySelector("br")?.childNodes).toHaveLength(0);
    });

    it('빈 텍스트 경계값은 "", null, undefined 모두 빈 문자열 DOM으로 정규화한다', () => {
      const states = ["", null, undefined];

      for (const nextValue of states) {
        const { root } = makeDom("<div>x</div>");
        const oldVdom = elementNode("div", {}, [textNode("x")]);
        const newVdom = elementNode("div", {}, [textNode(nextValue)]);

        patchFrom(oldVdom, newVdom, root);

        expect(root.textContent).toBe("");
        expect(root.outerHTML).toBe("<div></div>");
      }
    });
  });
});
