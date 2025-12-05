import { type ClassValue, clsx } from "clsx";

/**
 * Utility function for merging and conditionally applying CSS class names.
 * A lightweight wrapper around clsx for consistent class name handling.
 *
 * @example
 * // Basic usage
 * cn("btn", "btn-primary") // => "btn btn-primary"
 *
 * // Conditional classes
 * cn("btn", isActive && "btn-active") // => "btn btn-active" or "btn"
 *
 * // Object syntax
 * cn("btn", { "btn-primary": isPrimary, "btn-ghost": !isPrimary })
 *
 * // Array syntax
 * cn(["btn", "btn-sm"], isDisabled && "btn-disabled")
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

