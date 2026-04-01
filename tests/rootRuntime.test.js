// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  FunctionComponent,
  mountRoot,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "../src/rootRuntime.js";
import { elementNode, textNode } from "../src/constants.js";

function CounterLabel(props) {
  return elementNode("p", { "data-kind": "child" }, [
    textNode(`${props.label}: ${props.value}`),
  ]);
}

describe("root runtime", () => {
  it("FunctionComponent.mount가 runtime state를 저장하고 초기 렌더를 수행한다", () => {
    const container = document.createElement("div");
    const Root = new FunctionComponent((props, { renderChild }) => {
      const [count] = useState(props.initialCount);

      return elementNode("section", { id: "app" }, [
        renderChild(CounterLabel, { label: "Count", value: String(count) }),
      ]);
    });

    const rootDom = Root.mount(container, { initialCount: 1 });

    expect(rootDom).toBe(container.firstChild);
    expect(container.innerHTML).toBe(
      '<section id="app"><p data-kind="child">Count: 1</p></section>',
    );
    expect(Root.container).toBe(container);
    expect(Root.rootProps).toEqual({ initialCount: 1 });
    expect(Root.hooks).toHaveLength(1);
    expect(Root.hookCount).toBe(1);
    expect(Root.currentVdom).not.toBeNull();
    expect(Root.isMounted).toBe(true);
  });

  it("FunctionComponent.update가 diff + applyPatches로 다시 렌더링한다", () => {
    const container = document.createElement("div");
    const Root = new FunctionComponent((props, { renderChild }) => (
      elementNode("section", { "data-title": props.title }, [
        renderChild(CounterLabel, { label: props.title, value: props.value }),
      ])
    ));

    Root.mount(container, { title: "Before", value: "1" });
    const originalRoot = container.firstChild;
    const originalChild = originalRoot.firstChild;

    Root.update({ title: "After", value: "2" });

    expect(container.firstChild).toBe(originalRoot);
    expect(container.firstChild.firstChild).toBe(originalChild);
    expect(container.innerHTML).toBe(
      '<section data-title="After"><p data-kind="child">After: 2</p></section>',
    );
  });

  it("mountRoot는 기존 사용성을 유지하는 compatibility wrapper로 동작한다", () => {
    const container = document.createElement("div");
    const Root = new FunctionComponent((props) => (
      elementNode("section", {}, [textNode(props.label)])
    ));

    const runtime = mountRoot(container, Root, { label: "hello" });
    runtime.setProps({ label: "world" });

    expect(container.textContent).toBe("world");
  });

  it("useState setter가 root를 다시 렌더링하고 Object.is가 같으면 skip한다", () => {
    const container = document.createElement("div");
    let setCount;
    let renderCount = 0;

    const Root = new FunctionComponent((props, { renderChild }) => {
      const [count, setState] = useState(0);
      setCount = setState;
      renderCount += 1;

      return elementNode("section", {}, [
        renderChild(CounterLabel, { label: props.label, value: String(count) }),
      ]);
    });

    Root.mount(container, { label: "Count" });
    setCount(1);
    setCount(1);

    expect(renderCount).toBe(2);
    expect(container.textContent).toBe("Count: 1");
  });

  it("useMemo는 deps가 바뀔 때만 값을 다시 계산한다", () => {
    const container = document.createElement("div");
    let setCount;
    let computeCount = 0;

    const Root = new FunctionComponent(() => {
      const [count, setState] = useState(1);
      setCount = setState;

      const doubled = useMemo(() => {
        computeCount += 1;
        return count * 2;
      }, [count]);

      return elementNode("section", {}, [
        textNode(`count=${count}, doubled=${doubled}`),
      ]);
    });

    Root.mount(container);
    setCount(1);
    setCount(2);

    expect(computeCount).toBe(2);
    expect(container.textContent).toBe("count=2, doubled=4");
  });

  it("useRef는 같은 객체를 유지하고 current 변경이 리렌더를 유발하지 않는다", () => {
    const container = document.createElement("div");
    let forceRender;
    let firstRef;
    let lastRef;
    let renderCount = 0;

    const Root = new FunctionComponent(() => {
      const [count, setCount] = useState(0);
      const ref = useRef("init");
      forceRender = setCount;
      renderCount += 1;

      if (!firstRef) {
        firstRef = ref;
      }
      lastRef = ref;

      return elementNode("section", {}, [
        textNode(`count=${count}, ref=${String(ref.current)}`),
      ]);
    });

    Root.mount(container);
    expect(renderCount).toBe(1);
    expect(firstRef).toBe(lastRef);
    expect(container.textContent).toBe("count=0, ref=init");

    firstRef.current = "changed";
    expect(renderCount).toBe(1);
    expect(container.textContent).toBe("count=0, ref=init");

    forceRender((prev) => prev + 1);
    expect(renderCount).toBe(2);
    expect(firstRef).toBe(lastRef);
    expect(container.textContent).toBe("count=1, ref=changed");
  });

  it("useEffect는 commit 뒤에 실행되고 deps 변경 시 cleanup 후 새 effect를 실행한다", () => {
    const container = document.createElement("div");
    const logs = [];
    let setCount;

    const Root = new FunctionComponent(() => {
      const [count, setState] = useState(0);
      setCount = setState;

      useEffect(() => {
        logs.push(`effect:${count}:${container.textContent}`);

        return () => {
          logs.push(`cleanup:${count}`);
        };
      }, [count]);

      return elementNode("section", {}, [
        textNode(`count:${count}`),
      ]);
    });

    Root.mount(container);
    setCount(1);
    Root.unmount();

    expect(logs).toEqual([
      "effect:0:count:0",
      "cleanup:0",
      "effect:1:count:1",
      "cleanup:1",
    ]);
    expect(container.innerHTML).toBe("");
  });

  it("hooks are only valid during an active root render", () => {
    expect(() => useState(0)).toThrowError(
      new Error("useState must be called during an active root render."),
    );
  });

  it("renderChild 안에서 hook을 사용하면 root-only 에러를 던진다", () => {
    const container = document.createElement("div");
    const ChildWithHook = () => {
      useState(0);
      return textNode("nope");
    };
    const Root = new FunctionComponent((props, { renderChild }) => (
      elementNode("section", {}, [renderChild(ChildWithHook, props)])
    ));

    expect(() => Root.mount(container)).toThrowError(
      new Error("Hooks can only be used in the root component."),
    );
  });

  it("hook order가 바뀌면 에러를 던진다", () => {
    const container = document.createElement("div");
    const Root = new FunctionComponent((props) => {
      const [count] = useState(0);

      if (props.includeMemo) {
        useMemo(() => count * 2, [count]);
      }

      return elementNode("section", {}, [textNode(String(count))]);
    });

    const runtime = mountRoot(container, Root, { includeMemo: true });

    expect(() => runtime.setProps({ includeMemo: false })).toThrowError(
      new Error("Hook order changed between renders."),
    );
  });
});
