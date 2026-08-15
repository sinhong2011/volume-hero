import { describe, expect, test } from "bun:test";
import { createRoot, createSignal } from "solid-js";
import { on, splitProps } from "./solid-js";

/**
 * The compatibility layer stands in for framework primitives, so the parts that
 * are pure logic are pinned here. `splitProps` and `on` carry the real risk: a
 * spread instead of getters, or a mishandled `defer`, breaks reactivity in ways
 * a render smoke-test would not surface.
 */

describe("splitProps", () => {
  test("splits keys from the rest", () => {
    const [local, rest] = splitProps({ a: 1, b: 2, c: 3 }, ["a", "b"]);
    expect(local).toEqual({ a: 1, b: 2 });
    expect(rest).toEqual({ c: 3 });
  });

  test("supports several key sets", () => {
    const [one, two, rest] = splitProps({ a: 1, b: 2, c: 3, d: 4 }, ["a"], ["b", "c"]);
    expect(one).toEqual({ a: 1 });
    expect(two).toEqual({ b: 2, c: 3 });
    expect(rest).toEqual({ d: 4 });
  });

  test("stays live — both halves track the source", () => {
    // The whole point of getters: a spread would freeze these at split time.
    const [count, setCount] = createSignal(0);
    const props = {
      get taken() {
        return count();
      },
      get left() {
        return count() * 10;
      },
    };

    const [local, rest] = splitProps(props as Record<string, unknown>, ["taken"]);
    expect(local.taken).toBe(0);
    expect(rest.left).toBe(0);

    setCount(3);
    expect(local.taken).toBe(3);
    expect(rest.left).toBe(30);
  });

  test("a requested key the source lacks stays absent", () => {
    // Matching Solid 1: the key must not materialise as undefined, or spreading
    // the result would clobber a real value downstream.
    const [local] = splitProps({ a: 1 } as Record<string, unknown>, ["missing"]);
    expect("missing" in local).toBe(false);
  });

  test("does not mutate the source", () => {
    const source = { a: 1, b: 2 };
    splitProps(source, ["a"]);
    expect(source).toEqual({ a: 1, b: 2 });
  });
});

describe("on", () => {
  test("passes the current and previous input", () =>
    createRoot((dispose) => {
      const [value, setValue] = createSignal(1);
      const seen: [number, number | undefined][] = [];
      const runner = on<number, void>(value, (input, prevInput) => {
        seen.push([input, prevInput]);
      });

      runner();
      setValue(2);
      runner();

      expect(seen).toEqual([
        [1, undefined],
        [2, 1],
      ]);
      dispose();
    }));

  test("defer skips the first run", () =>
    createRoot((dispose) => {
      const [value, setValue] = createSignal("a");
      const seen: string[] = [];
      const runner = on<string, void>(value, (input) => void seen.push(input), { defer: true });

      runner();
      expect(seen).toEqual([]); // first run suppressed

      setValue("b");
      runner();
      expect(seen).toEqual(["b"]);

      dispose();
    }));

  test("accepts an array of accessors", () =>
    createRoot((dispose) => {
      const [a] = createSignal(1);
      const [b] = createSignal(2);
      let received: unknown;
      const runner = on<unknown[], void>([a, b], (input) => {
        received = input;
      });
      runner();
      expect(received).toEqual([1, 2]);
      dispose();
    }));

  test("threads the previous return value through", () =>
    createRoot((dispose) => {
      const [value, setValue] = createSignal(1);
      const runner = on<number, number>(
        value,
        (input, _prev, prevValue) => (prevValue ?? 0) + input
      );

      expect(runner()).toBe(1);
      setValue(5);
      expect(runner(1)).toBe(6);
      dispose();
    }));
});
