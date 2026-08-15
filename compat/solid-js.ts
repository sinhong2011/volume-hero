/**
 * Solid 1 compatibility surface, layered over Solid 2.
 *
 * Solid 2 removed several APIs that the UI libraries here still call:
 * `@ark-ui/solid` uses `mergeProps`, `splitProps`, `onMount` and `Index`, and
 * no release of it targets Solid 2 yet. Rather than fork the package, a Vite
 * plugin (see `compat/vite-plugin.ts`) rewrites `solid-js` imports *inside
 * node_modules* to this module.
 *
 * The rewrite is deliberately scoped to dependencies: this file imports
 * `solid-js` itself, and a project-wide alias would send it back to itself.
 * First-party code imports the shims from here explicitly.
 */

import { setContext } from "@solidjs/signals";
import type { JSX } from "@solidjs/web";
import {
  createContext as createContext2,
  createEffect as createEffect2,
  createMemo,
  createRenderEffect as createRenderEffect2,
  getOwner,
  merge,
  Repeat,
  runWithOwner,
  untrack,
  useContext as useContext2,
} from "solid-js";

export * from "solid-js";

/**
 * Solid 2 replaced the `<Context.Provider>` component with an imperative
 * `setContext(context, value)`, so `createContext()` no longer returns anything
 * with a `.Provider`. Ark UI builds every one of its components on
 * `[Context.Provider, useContext] = createContext(...)`, so reading the missing
 * property yielded undefined and rendering threw "Comp is not a function".
 *
 * The Provider is reattached here: it sets the value on its own owner, which
 * the children it renders inherit.
 */
export function createContext<T>(defaultValue?: T) {
  const context = createContext2(defaultValue as T) as ReturnType<typeof createContext2<T>> & {
    Provider: (props: { value: T; children: unknown }) => unknown;
  };

  context.Provider = (props) => {
    setContext(context as never, props.value as never);
    return props.children;
  };

  return context;
}

/**
 * Solid 2 throws ContextNotFoundError when a context has not been provided,
 * where Solid 1 returned the default value (usually undefined). Ark UI depends
 * on the old behaviour to detect *optional* parent contexts — a Switch inside
 * no Field must read undefined, not blow up the render — so absence is turned
 * back into a value.
 */
export function useContext<T>(context: { defaultValue?: T }): T | undefined {
  try {
    return useContext2(context as never) as T | undefined;
  } catch {
    return context?.defaultValue;
  }
}

type Compute<T> = (prev?: T) => T;
type EffectFn<T> = (value: T, prev?: T) => void;

/**
 * Solid 2 split effects into a tracked `compute` and an untracked `effect`, and
 * rejects the single-argument form outright — it throws MISSING_EFFECT_FN.
 * Solid 1 code (Ark UI calls this 22 times) passes one function that both
 * tracks and performs the side effect.
 *
 * Argument count is not the only difference: Solid 1 deferred an effect's first
 * run until after the component body had finished, while Solid 2 runs `compute`
 * eagerly. Zag's state machines rely on the old timing — `getParams()` closes
 * over a `send` that is declared further down the same function, so running
 * eagerly throws a temporal-dead-zone ReferenceError before any UI appears.
 *
 * Creation is therefore deferred to a microtask, which lets the synchronous
 * body complete first. The owner is captured and restored so cleanup still
 * belongs to the right component.
 */
export function createEffect<T>(compute: Compute<T>, effectFn?: EffectFn<T>): void {
  const owner = getOwner();
  queueMicrotask(() => {
    const create = () =>
      (createEffect2 as unknown as (c: Compute<T>, e: EffectFn<T>) => void)(
        compute,
        effectFn ?? (() => {})
      );
    if (owner) runWithOwner(owner, create);
    else create();
  });
}

/** Same two-argument requirement as createEffect. */
export function createRenderEffect<T>(compute: Compute<T>, effectFn?: EffectFn<T>): void {
  (createRenderEffect2 as unknown as (c: Compute<T>, e: EffectFn<T>) => void)(
    compute,
    effectFn ?? (() => {})
  );
}

/**
 * Solid 2 dropped `on`. It wraps a computation so only `deps` are tracked, with
 * `defer` skipping the first run — the body must stay untracked, which is the
 * whole point of using it.
 */
export function on<D, R>(
  deps: (() => D) | (() => unknown)[],
  fn: (input: D, prevInput: D | undefined, prevValue: R | undefined) => R,
  options?: { defer?: boolean }
): (prevValue?: R) => R | undefined {
  let prevInput: D | undefined;
  let skipFirst = options?.defer ?? false;

  return (prevValue?: R) => {
    const input = (Array.isArray(deps) ? deps.map((dep) => dep()) : deps()) as D;

    if (skipFirst) {
      skipFirst = false;
      prevInput = input;
      return prevValue;
    }

    const result = untrack(() => fn(input, prevInput, prevValue));
    prevInput = input;
    return result;
  };
}

/**
 * Solid 2 dropped `onMount`. A component body still runs exactly once, and a
 * render effect runs after that pass, so an untracked one-shot render effect
 * reproduces the original "after first render" timing.
 */
export function onMount(fn: () => void): void {
  const owner = getOwner();
  queueMicrotask(() => {
    const run = () => untrack(fn);
    if (owner) runWithOwner(owner, run);
    else run();
  });
}

/**
 * Solid 2 renamed `mergeProps` to `merge`. Re-exported under the old name
 * rather than reimplemented, so reactive getters are preserved — an object
 * spread would read every value once and freeze it.
 */
export const mergeProps: typeof merge = merge;

/**
 * Solid 2 dropped `splitProps`. Rebuilt with getters so both halves stay live
 * for the same reason.
 */
export function splitProps<T extends Record<string, unknown>>(
  props: T,
  keys: readonly (keyof T)[]
): [Record<string, unknown>, Record<string, unknown>];
export function splitProps<T extends Record<string, unknown>>(
  props: T,
  ...keySets: (readonly (keyof T)[])[]
): Record<string, unknown>[];
// The single-key-set form is overloaded to a fixed pair so the common
// `const [local, rest] = splitProps(props, [...])` destructure is not typed as
// possibly-undefined under noUncheckedIndexedAccess.
export function splitProps<T extends Record<string, unknown>>(
  props: T,
  ...keySets: (readonly (keyof T)[])[]
): Record<string, unknown>[] {
  const taken = new Set<PropertyKey>();
  const result: Record<string, unknown>[] = [];

  for (const keys of keySets) {
    const slice: Record<string, unknown> = {};
    for (const key of keys) {
      taken.add(key);
      // Only describe keys the source actually has, matching Solid 1: a
      // requested-but-absent key must stay absent, not become undefined.
      if (key in props) {
        Object.defineProperty(slice, key, {
          get: () => props[key],
          enumerable: true,
          configurable: true,
        });
      }
    }
    result.push(slice);
  }

  const rest: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    if (taken.has(key)) continue;
    Object.defineProperty(rest, key, {
      get: () => props[key as keyof T],
      enumerable: true,
      configurable: true,
    });
  }
  result.push(rest);

  return result;
}

/**
 * Solid 2 dropped `Index`. Unlike `For`, `Index` keys by position and hands the
 * child an accessor, so a row is reused and only its value changes. `Repeat`
 * gives that positional behaviour; the item is read through a memo to stay
 * reactive.
 */
export function Index<T>(props: {
  each: readonly T[] | undefined | null;
  fallback?: JSX.Element;
  children: (item: () => T, index: number) => JSX.Element;
}): JSX.Element {
  const RepeatComponent = Repeat as unknown as (p: Record<string, unknown>) => JSX.Element;
  return RepeatComponent({
    get count() {
      return props.each?.length ?? 0;
    },
    get fallback() {
      return props.fallback;
    },
    children: (index: () => number) => {
      const position = untrack(index);
      const item = createMemo(() => (props.each ?? [])[position] as T);
      return props.children(item, position);
    },
  });
}
