/**
 * Minimal toast, replacing `solid-toast` for the Solid 2 build.
 *
 * `solid-toast` drives its queue through Solid 1's path-based store setter
 * (`setStore('toasts', predicate, produce(...))`), which Solid 2 removed
 * outright — emulating it faithfully is far more fragile than owning the
 * handful of behaviour this app actually uses. The public surface here matches
 * what the app calls: `toast.success`, `toast.error`, and `<Toaster>`.
 */

import type { JSX } from "@solidjs/web";
import { createSignal, For, Show } from "solid-js";

type ToastKind = "success" | "error";

interface ToastEntry {
  id: number;
  kind: ToastKind;
  message: string;
}

export interface ToasterProps {
  position?: "top-center" | "top-right" | "bottom-center" | "bottom-right";
  gutter?: number;
  toastOptions?: {
    duration?: number;
    style?: JSX.CSSProperties;
  };
}

const [toasts, setToasts] = createSignal<ToastEntry[]>([]);
let nextId = 0;

/** Duration supplied by the mounted Toaster, so `toast()` needs no argument. */
let defaultDuration = 2000;

function dismiss(id: number): void {
  setToasts((current) => current.filter((entry) => entry.id !== id));
}

function push(kind: ToastKind, message: string, duration?: number): number {
  const id = nextId++;
  setToasts((current) => [...current, { id, kind, message }]);
  // Auto-dismiss. The popup can close before this fires, which simply discards
  // the timer along with the document.
  setTimeout(() => dismiss(id), duration ?? defaultDuration);
  return id;
}

export const toast = {
  success: (message: string, options?: { duration?: number }) =>
    push("success", message, options?.duration),
  error: (message: string, options?: { duration?: number }) =>
    push("error", message, options?.duration),
  dismiss,
};

const POSITION_STYLE: Record<string, JSX.CSSProperties> = {
  "top-center": { top: "12px", left: "50%", transform: "translateX(-50%)" },
  "top-right": { top: "12px", right: "12px" },
  "bottom-center": { bottom: "12px", left: "50%", transform: "translateX(-50%)" },
  "bottom-right": { bottom: "12px", right: "12px" },
};

export function Toaster(props: ToasterProps): JSX.Element {
  defaultDuration = props.toastOptions?.duration ?? defaultDuration;

  return (
    <Show when={toasts().length > 0}>
      {/* data-solid-toast keeps the existing z-index rule in style.css working. */}
      <div
        data-solid-toast
        aria-live="polite"
        style={{
          position: "fixed",
          display: "flex",
          "flex-direction": "column",
          gap: `${props.gutter ?? 8}px`,
          "align-items": "center",
          "pointer-events": "none",
          ...(POSITION_STYLE[props.position ?? "top-center"] ?? {}),
        }}
      >
        <For each={toasts()}>
          {(entry) => (
            <div
              role={entry.kind === "error" ? "alert" : "status"}
              style={{
                padding: "8px 14px",
                "box-shadow": "0 4px 14px rgba(0,0,0,0.18)",
                "max-width": "280px",
                "text-align": "center",
                "pointer-events": "auto",
                ...(props.toastOptions?.style ?? {}),
                ...(entry.kind === "error" ? { color: "var(--color-macos-error, #e5532c)" } : {}),
              }}
            >
              {entry.message}
            </div>
          )}
        </For>
      </div>
    </Show>
  );
}

export default toast;
