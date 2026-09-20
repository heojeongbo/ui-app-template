import { type ReactNode, useEffect } from "react";

import { prefersDark, useThemeStore } from "@/shared/lib/theme";

/**
 * Applies the theme as a class on `<html>`.
 *
 * Only the *application* lives here; the store itself is in `shared/lib/theme`
 * so that `shared/ui/toaster` can read the resolved value without importing
 * from `app`, which would reverse the FSD direction.
 *
 * The class is the single signal: the token files key off `.dark`, and
 * `@custom-variant dark (&:is(.dark *))` in the design system binds every
 * `dark:` utility to that same class. Without the variant Tailwind would
 * compile `dark:` to a `prefers-color-scheme` media query instead, and a user
 * on a light OS who toggles the app to dark would get dark tokens with light
 * utility overrides — the bug that makes a theme toggle look half-broken.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
	const theme = useThemeStore((s) => s.theme);

	useEffect(() => {
		const root = document.documentElement;

		const apply = () => {
			const dark = theme === "dark" || (theme === "system" && prefersDark());
			root.classList.toggle("dark", dark);
			// Tells the browser which scrollbars, form controls and `color-scheme`
			// defaults to use. Without it a dark page keeps light native widgets.
			root.style.colorScheme = dark ? "dark" : "light";
		};

		apply();

		// Only follow the OS while the preference IS "system". Subscribing
		// unconditionally would override an explicit choice the moment the OS
		// changed — the bug that makes a theme toggle feel broken.
		if (theme !== "system") return;

		const media = window.matchMedia("(prefers-color-scheme: dark)");
		media.addEventListener("change", apply);
		return () => media.removeEventListener("change", apply);
	}, [theme]);

	return children;
}
