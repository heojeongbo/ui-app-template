import { afterEach, describe, expect, it } from "vitest";

import { clearThemeTokens, injectThemeTokens } from "./inject";
import { isThemeToken, THEME_TOKENS } from "./tokens";

afterEach(clearThemeTokens);

function sheet(): string {
	return document.getElementById("template-theme-override")?.textContent ?? "";
}

describe("injectThemeTokens", () => {
	it("writes both light and dark from one call", () => {
		injectThemeTokens({
			light: { primary: "oklch(0.55 0.22 260)" },
			dark: { primary: "oklch(0.75 0.18 260)" },
		});

		// Inline styles on <html> could only ever set :root, so a dark value
		// would have nowhere to live and dark mode would silently keep the
		// stylesheet's colour. That is why this emits a stylesheet.
		expect(sheet()).toContain(":root{--primary: oklch(0.55 0.22 260);}");
		expect(sheet()).toContain(".dark{--primary: oklch(0.75 0.18 260);}");
	});

	it("refuses a value that would escape its own declaration", () => {
		// The sheet is built by string concatenation, so a `}` in a value ends
		// the rule early and everything after it becomes top-level CSS. This
		// exact value produced `:root{--primary: red} body{display:none;}` — a
		// blank page from what was meant to be a brand colour.
		const result = injectThemeTokens({
			light: { primary: "red} body{display:none", secondary: "blue" },
		});

		expect(result.rejected).toEqual(["primary"]);
		expect(sheet()).not.toContain("display:none");
		// One bad value costs its own token, not the whole palette — a tenant
		// with nine good colours and one typo should still be branded.
		expect(result.applied).toContain("secondary");
		expect(sheet()).toContain("--secondary: blue;");
	});

	it("separates a rejected value from an unrecognised key", () => {
		// Different fixes: an unknown key is usually a stale or misspelled name,
		// a rejected value is a malformed one. Reporting both as "unknown" sends
		// whoever is debugging to the wrong half of their config.
		const result = injectThemeTokens({
			// `as never` for the same reason as the unknown-key test below: the
			// type forbids what the runtime must survive, because this arrives as
			// JSON from config.js rather than as a literal.
			light: { notAToken: "red", primary: "a;b" } as never,
		});

		expect(result.unknown).toEqual(["notAToken"]);
		expect(result.rejected).toEqual(["primary"]);
	});

	it("goes in <head>, not <body>", () => {
		injectThemeTokens({ light: { primary: "red" } });
		// A stylesheet in the body is valid but applies after first paint,
		// which reads as a flash of the default palette.
		expect(
			document.head.querySelector("#template-theme-override"),
		).toBeTruthy();
	});

	it("replaces rather than stacks on repeated calls", () => {
		injectThemeTokens({ light: { primary: "red" } });
		injectThemeTokens({ light: { primary: "blue" } });

		// Calling this on every tenant change must not accumulate elements —
		// the last one would win visually while the rest keep growing the DOM.
		expect(document.querySelectorAll("#template-theme-override")).toHaveLength(
			1,
		);
		expect(sheet()).toContain("blue");
		expect(sheet()).not.toContain("red");
	});

	it("reports unknown keys instead of dropping them", () => {
		const { applied, unknown } = injectThemeTokens({
			light: { primary: "red", brandd: "blue" } as never,
		});

		// A typo'd key would otherwise be a colour that silently does not
		// change — indistinguishable from a colour that was already correct.
		expect(applied).toEqual(["primary"]);
		expect(unknown).toEqual(["brandd"]);
		expect(sheet()).not.toContain("brandd");
	});

	it("emits nothing for an empty override", () => {
		injectThemeTokens({});
		expect(sheet()).toBe("");
	});

	it("omits a mode that was not supplied", () => {
		injectThemeTokens({ light: { primary: "red" } });
		expect(sheet()).toContain(":root{");
		// Emitting an empty `.dark{}` would be harmless but misleading in
		// devtools — it looks like dark mode was configured.
		expect(sheet()).not.toContain(".dark{");
	});
});

describe("clearThemeTokens", () => {
	it("falls back to the stylesheet palette", () => {
		injectThemeTokens({ light: { primary: "red" } });
		clearThemeTokens();
		expect(document.getElementById("template-theme-override")).toBeNull();
	});

	it("is safe to call when nothing was injected", () => {
		expect(() => clearThemeTokens()).not.toThrow();
	});
});

describe("THEME_TOKENS", () => {
	it("has no duplicates", () => {
		expect(new Set(THEME_TOKENS).size).toBe(THEME_TOKENS.length);
	});

	it("recognises exactly its own members", () => {
		expect(isThemeToken("primary")).toBe(true);
		expect(isThemeToken("--primary")).toBe(false);
		expect(isThemeToken("nope")).toBe(false);
	});
});
