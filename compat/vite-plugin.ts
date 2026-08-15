/**
 * Redirects Solid 1 imports inside dependencies to the Solid 2 equivalents.
 *
 * `@ark-ui/solid` and `lucide-solid` import `solid-js/web`, `solid-js/store`
 * and APIs that Solid 2 either moved or removed. Their published builds target
 * Solid 1 and none of them has a Solid 2 release, so their import specifiers
 * are rewritten as they are loaded.
 *
 * The rewrite is restricted to files under node_modules on purpose:
 * `compat/solid-js.ts` imports `solid-js` itself, and a project-wide alias
 * would resolve that back to the shim.
 */

import path from "node:path";
import type { Plugin } from "vite";

const SHIM = path.resolve(import.meta.dirname, "solid-js.ts");

/** Specifier -> replacement, applied only within dependency code. */
const REWRITES: [RegExp, string][] = [
  // Solid 2 has no `solid-js/web`; the DOM renderer is its own package.
  [/(["'])solid-js\/web\1/g, '"@solidjs/web"'],
  // `solid-js/store` collapsed into the root entry.
  [/(["'])solid-js\/store\1/g, `"${SHIM}"`],
  // Bare `solid-js` goes through the shim so removed APIs resolve.
  [/(["'])solid-js\1/g, `"${SHIM}"`],
];

export function solidCompat(): Plugin {
  return {
    name: "volume-hero:solid-compat",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("node_modules")) return null;
      if (!code.includes("solid-js")) return null;

      let out = code;
      for (const [pattern, replacement] of REWRITES) {
        out = out.replace(pattern, replacement);
      }
      return out === code ? null : { code: out, map: null };
    },
  };
}
