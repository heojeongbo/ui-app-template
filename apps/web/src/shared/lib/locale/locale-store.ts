import { createAppStore } from "@template/core/stores";
import { z } from "zod";

/**
 * The tuple is the source: `z.enum` needs it at runtime and the type is
 * inferred back out, so the two cannot drift. Same shape as `THEMES`.
 *
 * FULL BCP-47 tags, not the bare `"en"` / `"ko"` intlayer also offers. The
 * same string is handed to `new Intl.DateTimeFormat()` and written to
 * `<html lang>`, and a region-less tag leaves the date format to whatever ICU
 * picks as the default region — which is not the same answer on every machine.
 *
 * NOT intlayer's `Locales` enum: Biome bans `enum` in our own code
 * (`style/noEnum`), and `z.enum` needs a literal tuple. These values have to
 * match `intlayer.config.ts`'s `locales` exactly — a store that persists a tag
 * the provider does not declare falls back to the default on every reload,
 * silently.
 */
export const LOCALES = ["en-US", "ko-KR"] as const;
export type Locale = (typeof LOCALES)[number];

const DEFAULT_LOCALE: Locale = "en-US";

type LocaleState = {
	locale: Locale;
	setLocale: (locale: Locale) => void;
};

/**
 * The language the app is speaking.
 *
 * Lives in `shared/` rather than `app/` for the reason `theme-store.ts` gives
 * for the same choice: `shared/api` needs it — the transport stamps
 * `Accept-Language` on every request — and a lower layer importing from `app`
 * is the FSD direction reversed. `app/providers` keeps only the React
 * component that applies it to the document.
 *
 * It is the source of truth, and `IntlayerProvider` is TOLD. Letting intlayer
 * detect and persist on its own would give two stores that disagree the first
 * time someone clears localStorage but not the cookie — and the one the
 * transport reads would not be the one the UI renders.
 */
export const useLocaleStore = createAppStore<LocaleState>()(
	(set) => ({
		locale: detectLocale(),
		setLocale: (locale) => set({ locale }),
	}),
	{
		name: "locale",
		persistKey: "template.locale",
		partialize: (state) => ({ locale: state.locale }),

		// localStorage is an untrusted input: an older build, another tab, the
		// console. An unrecognised tag here does not throw — it falls through
		// every comparison, renders English, and leaves the switcher showing
		// Korean. Failing to the default is a state the UI can express.
		persistSchema: z.object({ locale: z.enum(LOCALES) }),
	},
);

/**
 * Read the locale outside React.
 *
 * The transport interceptor needs it inside a `queryFn`, not inside a hook,
 * and a route's `head` is evaluated by the router rather than during a render.
 * Both go through here.
 */
export const localeStore = {
	getState: () => useLocaleStore.getState(),
};

/**
 * The locale the switcher applies next.
 *
 * A toggle rather than a picker because there are exactly two, and the same
 * shape as `nextTheme`: the decision lives in a `.ts` so a scenario test can
 * assert it without rendering. The day a third locale ships, this becomes a
 * menu and this function is what tells you every call site to change.
 */
export function nextLocale(current: Locale): Locale {
	return current === "ko-KR" ? "en-US" : "ko-KR";
}

/**
 * The best supported match for what the browser asks for.
 *
 * Matches on the PRIMARY SUBTAG, not the whole tag: a browser sending `ko-KR`
 * must resolve to our `ko-KR` and one sending `en-GB` to `en-US`. Comparing
 * full tags is how a negotiator quietly serves everyone the default.
 */
export function detectLocale(): Locale {
	if (typeof navigator === "undefined") return DEFAULT_LOCALE;

	for (const tag of navigator.languages) {
		const primary = tag.split("-")[0]?.toLowerCase();
		if (primary === undefined) continue;

		const match = LOCALES.find(
			(l) => l.split("-")[0]?.toLowerCase() === primary,
		);
		if (match) return match;
	}

	return DEFAULT_LOCALE;
}
