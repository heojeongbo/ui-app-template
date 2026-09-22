/**
 * Everything this screen says.
 *
 * Three strings is not enough copy to need a module, and that is exactly why
 * the module exists. The convention has to hold at the small end or it does
 * not hold: this file is the first screen a reader opens, and a screen that
 * inlines "just these three" teaches that inlining is fine — after which the
 * fourth screen inlines twelve.
 *
 * It is also the i18n seam. `docs/i18n.md` promises that EVERY screen's
 * strings live in a `*.content.ts`, and a promise with an exception is a
 * find-and-replace waiting to happen.
 */
export const homeContent = {
	title: "Home",
	description: "A starting point. Replace this screen with your own.",
	browseItems: "Browse items",
} as const;

export type HomeContent = typeof homeContent;
