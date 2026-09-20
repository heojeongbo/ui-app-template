import { expect, test } from "@playwright/test";

/**
 * Both theming seams, in a real browser.
 *
 * `theme.css` is compile-time and is covered by the build itself — its output
 * is the last `:root` / `.dark` rule in the stylesheet. What needs a browser
 * is the RUNTIME path, because the thing that can go wrong is ordering: a
 * palette applied after first paint flashes, and one that only sets `:root`
 * silently leaves dark mode on the default colours.
 */

const TENANT = {
	theme: {
		light: { primary: "oklch(0.55 0.22 260)" },
		dark: { primary: "oklch(0.75 0.18 260)" },
	},
};

test.describe("runtime theme injection", () => {
	test.beforeEach(async ({ page }) => {
		// Stand in for what the container entrypoint writes at boot.
		await page.route("**/config.js", (route) =>
			route.fulfill({
				contentType: "application/javascript",
				body: `window.__APP_CONFIG__ = ${JSON.stringify(TENANT)};`,
			}),
		);
	});

	test("applies the palette in both light and dark", async ({ page }) => {
		await page.goto("/signin");

		const root = page.locator(":root");
		// Light first — the app starts on the system preference, which is light
		// in a default Playwright context.
		await expect(root).toHaveCSS("--primary", "oklch(0.55 0.22 260)");

		// Then dark. This is the assertion that fails if the injection only
		// writes `:root` — the token would keep its stylesheet value here.
		await page.evaluate(() => document.documentElement.classList.add("dark"));
		await expect(root).toHaveCSS("--primary", "oklch(0.75 0.18 260)");
	});

	test("the override actually reaches a rendered element", async ({ page }) => {
		await page.goto("/signin");

		// A token nothing reads is a token that changed nothing. The submit
		// button is `bg-primary`, so it is the proof the mapping holds all the
		// way from config.js to a painted pixel.
		const button = page.getByRole("button", { name: "Sign in" });
		await expect(button).toHaveCSS("background-color", "oklch(0.55 0.22 260)");
	});

	test("is in <head>, so it is in place before first paint", async ({
		page,
	}) => {
		await page.goto("/signin");
		// In <body> it would apply after the first frame, which reads as a
		// flash of the default palette.
		await expect(
			page.locator("head > style#template-theme-override"),
		).toBeAttached();
	});
});

test.describe("without a runtime palette", () => {
	test("falls back to the stylesheet", async ({ page }) => {
		await page.goto("/signin");
		// The shipped default. No injected element at all.
		await expect(page.locator("#template-theme-override")).toHaveCount(0);
		// `oklch(20.5% 0 0)`, not the `oklch(0.205 0 0)` written in light.css:
		// Tailwind normalises values it processes. Runtime-injected values are
		// never touched by the build, which is why the assertions above compare
		// against exactly what was sent.
		await expect(page.locator(":root")).toHaveCSS(
			"--primary",
			"oklch(20.5% 0 0)",
		);
	});
});
