import { Direction as DirectionPrimitive } from "radix-ui";

/**
 * Radix's reading-direction context, re-exported so an app never imports
 * `radix-ui` itself.
 *
 * It is not redundant with `<html dir>`, and that is the whole reason this
 * exists as its own module rather than being left to the consumer: Radix's
 * `useDirection` resolves `localDir || globalDir || "ltr"` and never reads the
 * document. Without this provider mounted, every popper, select, dropdown and
 * tooltip computes left-to-right placement on a right-to-left page — the
 * layout flips and the menus do not.
 */
export const DirectionProvider = DirectionPrimitive.DirectionProvider;

export type TextDirection = "ltr" | "rtl";
