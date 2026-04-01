// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { FunctionComponent, mountRoot, useEffect, useMemo, useState } from "../src/rootRuntime.js";
import { elementNode, textNode } from "../src/constants.js";

function CounterLabel(props) {
  return elementNode("p", { "data-kind": "child" }, [
    textNode(`${props.label}: ${props.value}`),
  ]);
}

describe("root runtime", () => {
  it("initial mount renders the root FunctionComponent and plain child function together", () => {
    const container = document.createElement("div");
    const Root = new FunctionComponent((props) => {
      const [count] = useState(props.initialCount);

      return elementNode("section", { id: "app" }, [
        CounterLabel({ label: "Count", value: String(count) }),
      ]);
    });

    mountRoot(container, Root, { initialCount: 1 });

    expect(container.innerHTML).toBe(
      '<section id="app"><p data-kind="child">Count: 1</p></section>',
    );
  });

  it("useState setter가 root를 다시 렌더링하고 Object.is가 같으면 skip한다", () => {
    const container = document.createElement("div");
    let setCount;
    let renderCount = 0;

    const Root = new FunctionComponent(() => {
      const [count, setState] = useState(0);
      setCount = setState;
      renderCount += 1;

      return elementNode("section", {}, [
        CounterLabel({ label: "Count", value: String(count) }),
      ]);
    });

    mountRoot(container, Root);
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

    mountRoot(container, Root);
    setCount(1);
    setCount(2);

    expect(computeCount).toBe(2);
    expect(container.textContent).toBe("count=2, doubled=4");
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

    const runtime = mountRoot(container, Root);
    setCount(1);
    runtime.unmount();

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
