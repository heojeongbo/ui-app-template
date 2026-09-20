import { isThemeToken, type ThemeOverride, type ThemeTokens } from "./tokens";

/**
 * Apply a palette at runtime, for both light and dark.
 *
 * For the case `theme.css` cannot cover: a palette that is not known at build
 * time — a tenant's brand colours, a white-label deployment, a live theme
 * editor. Everything else should go in `apps/web/src/app/theme.css`, which
 * costs nothing at runtime.
 *
 * **A `<style>` element, not inline styles on `<html>`.** Inline styles can
 * only set `:root`, so a dark value would have nowhere to live and dark mode
 * would silently keep the stylesheet's colours. A stylesheet can carry both
 * rules, which is the whole reason this is fifty lines rather than five.
 *
 * Appended last, so it wins over `theme.css` on the cascade — runtime is more
 * specific to *this* deployment than a value compiled into the bundle.
 *
 * Idempotent: it reuses one element keyed by `data-theme-override`, so calling
 * it on every tenant change replaces the palette rather than stacking copies.
 */

const ELEMENT_ID = "template-theme-override";

export type InjectResult = {
	/** Tokens that were applied. */
	applied: string[];
	/**
	 * Keys that are not tokens. Reported rather than dropped — a payload from
	 * a server can carry a typo or a name from a newer build, and a silently
	 * ignored colour is very hard to tell from a colour that did not change.
	 */
	unknown: string[];
};

function ruleFor(selector: string, tokens: ThemeTokens | undefined) {
	const applied: string[] = [];
	const unknown: string[] = [];

	if (!tokens) return { css: "", applied, unknown };

	const declarations: string[] = [];
	for (const [key, value] of Object.entries(tokens)) {
		if (value === undefined) continue;
		if (!isThemeToken(key)) {
			unknown.push(key);
			continue;
		}
		// Values are NOT escaped or parsed. This comes from your own backend,
		// and CSS custom properties cannot break out of a declaration into
		// script — but a hostile value can still make the UI unreadable, so do
		// not wire this to untrusted input.
		declarations.push(`--${key}: ${value};`);
		applied.push(key);
	}

	if (declarations.length === 0) return { css: "", applied, unknown };
	return { css: `${selector}{${declarations.join("")}}`, applied, unknown };
}

export function injectThemeTokens(override: ThemeOverride): InjectResult {
	const light = ruleFor(":root", override.light);
	const dark = ruleFor(".dark", override.dark);

	const result: InjectResult = {
		applied: [...light.applied, ...dark.applied],
		unknown: [...new Set([...light.unknown, ...dark.unknown])],
	};

	if (typeof document === "undefined") return result;

	let element = document.getElementById(ELEMENT_ID) as HTMLStyleElement | null;
	if (!element) {
		element = document.createElement("style");
		element.id = ELEMENT_ID;
		// `dataset` is a `DOMStringMap` — an index signature, so bracket access.
		element.dataset["themeOverride"] = "";
		// `head` and not `body`: a stylesheet in the body is valid but applies
		// after first paint, which shows up as a flash of the default palette.
		document.head.append(element);
	}

	element.textContent = light.css + dark.css;
	return result;
}

/** Remove the runtime palette, falling back to the stylesheet's. */
export function clearThemeTokens(): void {
	if (typeof document === "undefined") return;
	document.getElementById(ELEMENT_ID)?.remove();
}
