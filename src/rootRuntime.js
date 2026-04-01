import { applyPatches } from "./lib/applyPatches.js";
import { diff } from "./lib/diff.js";
import { renderTo } from "./lib/renderTo.js";

let activeRuntime = null;

export class FunctionComponent {
  constructor(renderFn) {
    if (typeof renderFn !== "function") {
      throw new TypeError("FunctionComponent requires a render function.");
    }

    this.renderFn = renderFn;
  }

  render(props) {
    return this.renderFn(props);
  }
}

export function mountRoot(container, rootComponent, initialProps = {}) {
  if (!container || typeof container.replaceChildren !== "function") {
    throw new TypeError("mountRoot requires a valid container.");
  }

  if (!(rootComponent instanceof FunctionComponent)) {
    throw new TypeError("mountRoot requires a FunctionComponent root.");
  }

  const runtime = {
    container,
    rootComponent,
    rootProps: initialProps,
    currentVdom: null,
    rootDom: null,
    hookSlots: [],
    hookIndex: 0,
    pendingEffects: [],
    hookCount: null,
    isRendering: false,
    isFlushingEffects: false,
    needsRerender: false,
    isUnmounted: false,
  };

  rerenderRuntime(runtime);

  return {
    rerender() {
      rerenderRuntime(runtime);
    },
    setProps(nextProps = {}) {
      runtime.rootProps = nextProps;
      rerenderRuntime(runtime);
    },
    unmount() {
      if (runtime.isUnmounted) {
        return;
      }

      cleanupEffectSlots(runtime);

      if (runtime.currentVdom != null && runtime.rootDom != null) {
        runtime.rootDom = applyPatches(runtime.rootDom, diff(runtime.currentVdom, null));
      }

      container.replaceChildren();
      runtime.currentVdom = null;
      runtime.rootDom = null;
      runtime.hookSlots = [];
      runtime.hookCount = null;
      runtime.pendingEffects = [];
      runtime.isUnmounted = true;
    },
  };
}

export function useState(initialValue) {
  const runtime = getActiveRuntime("useState");
  const slotIndex = runtime.hookIndex;
  let slot = runtime.hookSlots[slotIndex];

  if (!slot) {
    const value = typeof initialValue === "function" ? initialValue() : initialValue;

    slot = {
      kind: "state",
      value,
      // Hook state persists here, outside the function body, so the next render can reuse it.
      setState(nextValue) {
        const previousValue = slot.value;
        const resolvedValue = typeof nextValue === "function"
          ? nextValue(previousValue)
          : nextValue;

        if (Object.is(previousValue, resolvedValue)) {
          return previousValue;
        }

        slot.value = resolvedValue;

        // setState updates the stored slot value first, then reruns the root through diff + patch.
        rerenderRuntime(runtime);
        return resolvedValue;
      },
    };
    runtime.hookSlots[slotIndex] = slot;
  } else {
    assertHookKind(slot, "state");
  }

  runtime.hookIndex += 1;
  return [slot.value, slot.setState];
}

export function useMemo(factory, deps) {
  const runtime = getActiveRuntime("useMemo");
  const slotIndex = runtime.hookIndex;
  let slot = runtime.hookSlots[slotIndex];

  if (!slot) {
    slot = {
      kind: "memo",
      value: factory(),
      deps: cloneDeps(deps),
    };
    runtime.hookSlots[slotIndex] = slot;
  } else {
    assertHookKind(slot, "memo");

    if (deps === undefined || !areHookDepsEqual(slot.deps, deps)) {
      slot.value = factory();
      slot.deps = cloneDeps(deps);
    }
  }

  runtime.hookIndex += 1;
  return slot.value;
}

export function useEffect(effect, deps) {
  const runtime = getActiveRuntime("useEffect");
  const slotIndex = runtime.hookIndex;
  let slot = runtime.hookSlots[slotIndex];

  if (!slot) {
    slot = {
      kind: "effect",
      deps: undefined,
      cleanup: undefined,
    };
    runtime.hookSlots[slotIndex] = slot;
  } else {
    assertHookKind(slot, "effect");
  }

  if (deps === undefined || !areHookDepsEqual(slot.deps, deps)) {
    runtime.pendingEffects.push({
      slotIndex,
      effect,
      deps,
    });
  }

  runtime.hookIndex += 1;
}

function rerenderRuntime(runtime) {
  if (runtime.isUnmounted) {
    return;
  }

  if (runtime.isRendering || runtime.isFlushingEffects) {
    runtime.needsRerender = true;
    return;
  }

  do {
    runtime.needsRerender = false;

    const nextVdom = renderRoot(runtime);

    if (runtime.currentVdom == null) {
      renderTo(runtime.container, nextVdom);
      runtime.rootDom = runtime.container.firstChild ?? null;
    } else {
      runtime.rootDom = applyPatches(runtime.rootDom, diff(runtime.currentVdom, nextVdom));
    }

    runtime.currentVdom = nextVdom;
    flushEffects(runtime);
  } while (runtime.needsRerender);
}

function renderRoot(runtime) {
  runtime.pendingEffects = [];
  // hookIndex resets every render so the root function reads its hook slots in the same order.
  runtime.hookIndex = 0;
  runtime.isRendering = true;
  activeRuntime = runtime;

  try {
    const nextVdom = runtime.rootComponent.render(runtime.rootProps);

    if (nextVdom == null) {
      throw new TypeError("Root component must return a vnode.");
    }

    if (runtime.hookCount !== null && runtime.hookCount !== runtime.hookIndex) {
      throw new Error("Hook order changed between renders.");
    }

    runtime.hookCount = runtime.hookIndex;
    return nextVdom;
  } finally {
    activeRuntime = null;
    runtime.isRendering = false;
  }
}

function flushEffects(runtime) {
  const effects = runtime.pendingEffects;
  runtime.pendingEffects = [];

  if (effects.length === 0) {
    return;
  }

  runtime.isFlushingEffects = true;

  try {
    for (const { slotIndex, effect, deps } of effects) {
      const slot = runtime.hookSlots[slotIndex];

      if (typeof slot.cleanup === "function") {
        slot.cleanup();
      }

      const cleanup = effect();

      slot.cleanup = typeof cleanup === "function" ? cleanup : undefined;
      slot.deps = cloneDeps(deps);
    }
  } finally {
    runtime.isFlushingEffects = false;
  }
}

function cleanupEffectSlots(runtime) {
  for (const slot of runtime.hookSlots) {
    if (slot?.kind === "effect" && typeof slot.cleanup === "function") {
      slot.cleanup();
      slot.cleanup = undefined;
    }
  }
}

function getActiveRuntime(hookName) {
  if (!activeRuntime || activeRuntime.isUnmounted) {
    throw new Error(`${hookName} must be called during an active root render.`);
  }

  return activeRuntime;
}

function assertHookKind(slot, expectedKind) {
  if (slot.kind !== expectedKind) {
    throw new Error("Hook order changed between renders.");
  }
}

function areHookDepsEqual(previousDeps, nextDeps) {
  if (!Array.isArray(previousDeps) || !Array.isArray(nextDeps)) {
    return false;
  }

  if (previousDeps.length !== nextDeps.length) {
    return false;
  }

  for (let index = 0; index < previousDeps.length; index += 1) {
    if (!Object.is(previousDeps[index], nextDeps[index])) {
      return false;
    }
  }

  return true;
}

function cloneDeps(deps) {
  return Array.isArray(deps) ? [...deps] : undefined;
}
