import { type IntlayerConfig, Locales } from "intlayer";

/**
 * Intlayer's configuration.
 *
 * Lives beside `vite.config.ts` rather than at the repo root: `contentDir` and
 * `baseDir` resolve against this file, and the dictionaries only ever describe
 * `apps/web`. `packages/core` and `packages/design` ship no copy, so nothing
 * below this directory needs a dictionary.
 */
const config: IntlayerConfig = {
	internationalization: {
		// Full BCP-47 tags, not the bare `Locales.ENGLISH` / `Locales.KOREAN`.
		// The same string reaches `new Intl.DateTimeFormat()` and `<html lang>`,
		// and a region-less tag leaves the date format to whatever ICU picks as
		// the default region — which is not the same answer on every machine.
		locales: [Locales.ENGLISH_UNITED_STATES, Locales.KOREAN_KOREA],
		defaultLocale: Locales.ENGLISH_UNITED_STATES,

		// "strict", not the default "inclusive". Under "inclusive" a `t()` that
		// is missing `ko-KR` is a WARNING and renders the English — which looks
		// exactly like a string that was translated to the same word. The whole
		// value of shipping a second locale is that it cannot rot unnoticed, so
		// a missing translation has to fail the type check.
		strictMode: "strict",
	},

	content: {
		contentDir: ["src"],

		// The watcher, not the plugin, is what has to be off under Vitest: a
		// file watcher keeps the Node process alive after the last assertion,
		// so `vitest run` looks like it hangs until the teardown timeout.
		//
		// The default is already `NODE_ENV === "development"`, which Vitest does
		// not match — this is explicit because `vitest --watch` and a custom
		// NODE_ENV both defeat the default, and the failure reads as a flake
		// rather than as a config choice.
		watch: !process.env["VITEST"] && process.env["NODE_ENV"] === "development",
	},

	editor: {
		// No visual editor. It is a second runtime and a second auth surface,
		// and it changes the TYPE of every dictionary leaf: with the editor on,
		// `IntlayerNode` resolves to `ReactNode & { value: T }` instead of the
		// value itself, so every string prop needs `.value`. The convention in
		// docs/ux/copy.md writes `.value` unconditionally, which keeps this
		// switch from being a breaking change either way.
		enabled: false,
	},
};

export default config;
