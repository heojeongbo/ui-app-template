import { createAppStore } from "@template/core/stores";
import { z } from "zod";

/**
 * The tuple is the source: `z.enum` needs it at runtime, and the type is
 * inferred back out so the two cannot drift.
 */
export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

type ThemeState = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
};

/**
 * Theme preference.
 *
 * Lives in `shared/` rather than `app/` because `shared/ui/toaster` needs the
 * resolved value, and a lower layer importing from `app` is the FSD direction
 * reversed. `app/providers` keeps only the React component that applies it —
 * the state itself is shared infrastructure.
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

		// Lower stakes than the session, and still worth it: an unrecognised
		// value here does not throw, it falls through every `theme === "dark"`
		// comparison and silently renders light with the toggle showing
		// something else. Failing to the default is a state the UI can express.
		persistSchema: z.object({ theme: z.enum(THEMES) }),
	},
);

/** Whether the OS is currently asking for dark. */
export function prefersDark(): boolean {
	return (
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-color-scheme: dark)").matches
	);
}

/** The theme actually in effect, with `system` resolved against the OS. */
export function useResolvedTheme(): "light" | "dark" {
	const theme = useThemeStore((s) => s.theme);
	if (theme !== "system") return theme;
	return prefersDark() ? "dark" : "light";
}
