/**
 * Restores the `JSX` namespace on the `solid-js` module for type-checking.
 *
 * Solid 2 moved JSX types to `@solidjs/web`, but `@ark-ui/solid` ships type
 * definitions written against Solid 1 and imports `JSX` from `solid-js` in 122
 * places. Without the namespace those imports resolve to an error type, every
 * component's `children` prop disappears, and each call site fails with TS2559
 * even though the code runs correctly.
 *
 * Types only — no runtime effect.
 */

import type { JSX as WebJSX } from "@solidjs/web";

declare module "solid-js" {
  export import JSX = WebJSX;
}

// lucide-solid derives its SVG prop types from `JSX` on the old runtime entry
// point, so the namespace has to be reachable there as well.
declare module "solid-js/jsx-runtime" {
  export * from "@solidjs/web/jsx-runtime";
  export import JSX = WebJSX;
}

/**
 * lucide-solid builds `LucideProps` from Solid 1's SVG attribute types, where
 * `style` and `class` lived alongside the attributes. Solid 2 splits those into
 * a separate `Properties<T>` type, so icons rendered with an inline `style`
 * fail to type-check even though they render correctly.
 */
declare module "lucide-solid/dist/types/types" {
  interface LucideProps {
    style?: WebJSX.CSSProperties | string;
    class?: string;
  }
}
