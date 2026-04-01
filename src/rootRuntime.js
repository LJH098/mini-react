import { applyPatches } from "./lib/applyPatches.js";
import { diff } from "./lib/diff.js";
import { renderTo } from "./lib/renderTo.js";

let activeComponent = null;

export class FunctionComponent {
  constructor(renderFn) {
    if (typeof renderFn !== "function") {
      throw new TypeError("FunctionComponent requires a render function.");
    }

    this.renderFn = renderFn;
    this.helpers = {
      renderChild: (childFn, props = {}) => this.renderChild(childFn, props),
    };
    this.resetRuntimeState();
  }

  resetRuntimeState() {
    this.hooks = [];
    this.hookIndex = 0;
    this.pendingEffects = [];
    this.container = null;
    this.rootProps = {};
    this.currentVdom = null;
    this.rootDom = null;
    this.hookCount = null;
    this.isRendering = false;
    this.isFlushingEffects = false;
    this.needsRerender = false;
    this.isMounted = false;
    this.isUnmounted = false;
    this.renderScope = null;
  }

  render(props = this.rootProps, helpers = this.helpers) {
    return this.renderFn(props, helpers);
  }

  mount(container, initialProps = {}) {
    if (!container || typeof container.replaceChildren !== "function") {
      throw new TypeError("FunctionComponent.mount requires a valid container.");
    }

    if (this.isMounted && !this.isUnmounted) {
      throw new Error("FunctionComponent is already mounted.");
    }

    this.resetRuntimeState();
    this.container = container;
    this.rootProps = initialProps;
    this.isMounted = true;
    this.isUnmounted = false;
    this.update(initialProps);
    return this.rootDom;
  }

  update(nextProps = this.rootProps) {
    if (this.isUnmounted) {
      return this.rootDom;
    }

    if (!this.isMounted || !this.container) {
      throw new Error("FunctionComponent must be mounted before update.");
    }

    this.rootProps = nextProps;

    if (this.isRendering || this.isFlushingEffects) {
      this.needsRerender = true;
      return this.rootDom;
    }

    do {
      this.needsRerender = false;

      const nextVdom = this.renderRoot();

      if (this.currentVdom == null) {
        renderTo(this.container, nextVdom);
        this.rootDom = this.container.firstChild ?? null;
      } else {
        this.rootDom = applyPatches(this.rootDom, diff(this.currentVdom, nextVdom));
      }

      this.currentVdom = nextVdom;
      this.flushEffects();
    } while (this.needsRerender);

    return this.rootDom;
  }

  unmount() {
    if (!this.isMounted || this.isUnmounted) {
      return;
    }

    this.cleanupEffectSlots();

    if (this.currentVdom != null && this.rootDom != null) {
      this.rootDom = applyPatches(this.rootDom, diff(this.currentVdom, null));
    }

    this.container?.replaceChildren();

    if (activeComponent === this) {
      activeComponent = null;
    }

    this.container = null;
    this.rootProps = {};
    this.currentVdom = null;
    this.rootDom = null;
    this.hooks = [];
    this.hookIndex = 0;
    this.hookCount = null;
    this.pendingEffects = [];
    this.isMounted = false;
    this.isUnmounted = true;
    this.isRendering = false;
    this.isFlushingEffects = false;
    this.needsRerender = false;
    this.renderScope = null;
  }

  renderChild(childFn, props = {}) {
    if (typeof childFn !== "function") {
      throw new TypeError("renderChild requires a plain function child.");
    }

    if (activeComponent !== this || !this.isRendering || this.renderScope == null) {
      throw new Error("renderChild must be called during the root render.");
    }

    // Child components stay props-only in this mini runtime.
    // This boundary lets hooks reject child scope without adding child instances or a bigger runtime.
    const previousScope = this.renderScope;
    this.renderScope = "child";

    try {
      return childFn(props);
    } finally {
      this.renderScope = previousScope;
    }
  }

  renderRoot() {
    this.pendingEffects = [];
    // hookIndex resets every render so hook call #1, #2, #3... line back up with the same slots.
    this.hookIndex = 0;
    this.isRendering = true;
    this.renderScope = "root";
    activeComponent = this;

    try {
      const nextVdom = this.render(this.rootProps, this.helpers);

      if (nextVdom == null) {
        throw new TypeError("Root component must return a vnode.");
      }

      if (this.hookCount !== null && this.hookCount !== this.hookIndex) {
        throw new Error("Hook order changed between renders.");
      }

      this.hookCount = this.hookIndex;
      return nextVdom;
    } finally {
      activeComponent = null;
      this.renderScope = null;
      this.isRendering = false;
    }
  }

  flushEffects() {
    const effects = this.pendingEffects;
    this.pendingEffects = [];

    if (effects.length === 0) {
      return;
    }

    this.isFlushingEffects = true;

    try {
      for (const { slotIndex, effect, deps } of effects) {
        const slot = this.hooks[slotIndex];

        if (typeof slot.cleanup === "function") {
          slot.cleanup();
        }

        const cleanup = effect();
        slot.cleanup = typeof cleanup === "function" ? cleanup : undefined;
        slot.deps = cloneDeps(deps);
      }
    } finally {
      this.isFlushingEffects = false;
    }
  }

  cleanupEffectSlots() {
    for (const slot of this.hooks) {
      if (slot?.kind === "effect" && typeof slot.cleanup === "function") {
        slot.cleanup();
        slot.cleanup = undefined;
      }
    }
  }
}

export function mountRoot(container, rootComponent, initialProps = {}) {
  if (!container || typeof container.replaceChildren !== "function") {
    throw new TypeError("mountRoot requires a valid container.");
  }

  if (!(rootComponent instanceof FunctionComponent)) {
    throw new TypeError("mountRoot requires a FunctionComponent root.");
  }

  rootComponent.mount(container, initialProps);

  return {
    rerender() {
      rootComponent.update();
    },
    setProps(nextProps = {}) {
      rootComponent.update(nextProps);
    },
    unmount() {
      rootComponent.unmount();
    },
  };
}

export function useState(initialValue) {
  const component = getActiveComponent("useState");
  assertRootHookScope(component);
  const slotIndex = component.hookIndex;
  let slot = component.hooks[slotIndex];

  if (!slot) {
    const value = typeof initialValue === "function" ? initialValue() : initialValue;

    slot = {
      kind: "state",
      value,
      // Hook state persists in the component's hooks array, outside the render function body.
      setState: (nextValue) => {
        const previousValue = slot.value;
        const resolvedValue = typeof nextValue === "function"
          ? nextValue(previousValue)
          : nextValue;

        if (Object.is(previousValue, resolvedValue)) {
          return previousValue;
        }

        slot.value = resolvedValue;

        // setState does more than store a value: it triggers component.update()
        // so the root reruns through VDOM diff + patch and the screen stays in sync.
        component.update();
        return resolvedValue;
      },
    };
    component.hooks[slotIndex] = slot;
  } else {
    assertHookKind(slot, "state");
  }

  component.hookIndex += 1;
  return [slot.value, slot.setState];
}

export function useMemo(factory, deps) {
  const component = getActiveComponent("useMemo");
  assertRootHookScope(component);
  const slotIndex = component.hookIndex;
  let slot = component.hooks[slotIndex];

  if (!slot) {
    slot = {
      kind: "memo",
      value: factory(),
      deps: cloneDeps(deps),
    };
    component.hooks[slotIndex] = slot;
  } else {
    assertHookKind(slot, "memo");

    if (deps === undefined || !areHookDepsEqual(slot.deps, deps)) {
      slot.value = factory();
      slot.deps = cloneDeps(deps);
    }
  }

  component.hookIndex += 1;
  return slot.value;
}

export function useEffect(effect, deps) {
  const component = getActiveComponent("useEffect");
  assertRootHookScope(component);
  const slotIndex = component.hookIndex;
  let slot = component.hooks[slotIndex];

  if (!slot) {
    slot = {
      kind: "effect",
      deps: undefined,
      cleanup: undefined,
    };
    component.hooks[slotIndex] = slot;
  } else {
    assertHookKind(slot, "effect");
  }

  if (deps === undefined || !areHookDepsEqual(slot.deps, deps)) {
    component.pendingEffects.push({
      slotIndex,
      effect,
      deps,
    });
  }

  component.hookIndex += 1;
}

function getActiveComponent(hookName) {
  if (!activeComponent || activeComponent.isUnmounted) {
    throw new Error(`${hookName} must be called during an active root render.`);
  }

  return activeComponent;
}

function assertRootHookScope(component) {
  // This mini runtime keeps hooks on the root component only, so child renders stay stateless.
  if (component.renderScope !== "root") {
    throw new Error("Hooks can only be used in the root component.");
  }
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
