import { createAppStore } from "@template/core/stores";
import { type ReactNode, useEffect } from "react";

export type Theme = "light" | "dark" | "system";

type ThemeState = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
};

/**
 * Theme preference.
 *
 * Hand-rolled rather than `next-themes`, and that is a deliberate correction:
 * the codebase this template draws from depends on next-themes for exactly one
 * `useTheme()` call inside its Toaster, mounts no provider for it, and so
 * resolves to `"system"` forever. A theme system you cannot actually toggle is
 * worse than none.
 */
export const useThemeStore = createAppStore<ThemeState>(
	(set) => ({
		theme: "system",
		setTheme: (theme) => set({ theme }),
	}),
	{
		name: "theme",
		persistKey: "template.theme",
		partialize: (state) => ({ theme: state.theme }),
	},
);

/** The theme actually in effect, with `system` resolved against the OS. */
export function useResolvedTheme(): "light" | "dark" {
	const theme = useThemeStore((s) => s.theme);
	if (theme !== "system") return theme;
	return typeof window !== "undefined" &&
		window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

/**
 * Applies the theme as a class on <html>.
 *
 * The class is the single signal: the token files key off `.dark`, and
 * `@custom-variant dark (&:is(.dark *))` in the design system binds every
 * `dark:` utility to the same class. Without that variant Tailwind would
 * compile `dark:` to a `prefers-color-scheme` media query instead, and a user
 * on a light OS who toggles the app to dark would get dark tokens and light
 * utility overrides.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
	const theme = useThemeStore((s) => s.theme);

	useEffect(() => {
		const root = document.documentElement;

		const apply = () => {
			const dark =
				theme === "dark" ||
				(theme === "system" &&
					window.matchMedia("(prefers-color-scheme: dark)").matches);
			root.classList.toggle("dark", dark);
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
