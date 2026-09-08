import picocolors from "picocolors";

/**
 * Single entry point for terminal color/style — keeps picocolors usage
 * centralized and easy to audit/strip later. picocolors auto-disables
 * color when stdout isn't a TTY or NO_COLOR is set, no extra logic needed.
 */
export const { bold, dim, green, yellow, red, cyan } = picocolors;
