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

	/**
	 * Known tokens whose VALUE was refused. Separate from `unknown` because the
	 * two need different fixes: an unknown key is usually a stale name, while a
	 * rejected value is a malformed one.
	 */
	rejected: string[];
};

/**
 * A value that cannot escape the declaration it is written into.
 *
 * This sheet is built by concatenation, so `}` in a value ends the rule early
 * and everything after it becomes top-level CSS:
 *
 *     { primary: "red} body{display:none" }
 *     -> :root{--primary: red} body{display:none;}
 *
 * A blank page, from what was meant to be a brand colour. Not XSS — custom
 * properties cannot run script, and the sheet is set with `textContent`, so
 * even `</style>` is inert — but an accident that renders nothing is not an
 * acceptable failure just because it was an accident.
 *
 * Refused rather than escaped: no legitimate token value contains these, so
 * sanitising would only hide the mistake from whoever has to fix it.
 */
const UNSAFE_VALUE = /[{};<>]/;

function ruleFor(selector: string, tokens: ThemeTokens | undefined) {
	const applied: string[] = [];
	const unknown: string[] = [];
	const rejected: string[] = [];

	if (!tokens) return { css: "", applied, unknown, rejected };

	const declarations: string[] = [];
	for (const [key, value] of Object.entries(tokens)) {
		if (value === undefined) continue;
		if (!isThemeToken(key)) {
			unknown.push(key);
			continue;
		}
		// The gate, checked here rather than only at the caller because this is
		// the function that does the concatenation — see `UNSAFE_VALUE`. One bad
		// value costs its own token, not the whole palette.
		if (UNSAFE_VALUE.test(value)) {
			rejected.push(key);
			continue;
		}
		declarations.push(`--${key}: ${value};`);
		applied.push(key);
	}

	if (declarations.length === 0) return { css: "", applied, unknown, rejected };
	return {
		css: `${selector}{${declarations.join("")}}`,
		applied,
		unknown,
		rejected,
	};
}

export function injectThemeTokens(override: ThemeOverride): InjectResult {
	const light = ruleFor(":root", override.light);
	const dark = ruleFor(".dark", override.dark);

	const result: InjectResult = {
		applied: [...light.applied, ...dark.applied],
		unknown: [...new Set([...light.unknown, ...dark.unknown])],
		rejected: [...new Set([...light.rejected, ...dark.rejected])],
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
