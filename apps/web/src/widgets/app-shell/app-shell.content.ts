import { type Dictionary, t } from "intlayer";

/**
 * Everything the signed-in chrome says.
 *
 * A widget gets a dictionary for the same reason a page does: the seam is the
 * FILE, not the layer. The shell was the exception that made the promise a
 * find-and-replace waiting to happen — while being the one surface a signed-in
 * user is looking at on every screen.
 */
export default {
	key: "app-shell",
	content: {
		/**
		 * Keyed by `NavItemId`, never by array position — the same discipline as
		 * `ICONS` in app-shell.tsx, which keys off the same id. The record was
		 * half-built and this is the other half.
		 *
		 * The `satisfies Record<NavItemId, …>` that used to sit here cannot: a
		 * dictionary's declared type is not what the generated type resolves to.
		 * The exhaustiveness check moved to the READ side in app-shell.tsx,
		 * where the compiler sees the generated shape.
		 */
		nav: {
			home: t({ "en-US": "Home", "ko-KR": "홈" }),
			items: t({ "en-US": "Items", "ko-KR": "품목" }),
		},

		/** The navigation landmark's name. Lands in `aria-label`. */
		navLabel: t({ "en-US": "Main", "ko-KR": "주 메뉴" }),

		signOut: t({ "en-US": "Sign out", "ko-KR": "로그아웃" }),

		/**
		 * ONE WHOLE SENTENCE PER DESTINATION — not `"Switch to " + theme + " mode"`.
		 *
		 * The old form interpolated the theme store's raw enum into an English
		 * frame, so the single word that changed was the one word no dictionary
		 * could reach: `THEMES` is a runtime vocabulary, not copy. Korean puts
		 * the verb last and could not reorder that frame; a gendered language
		 * could not agree with it.
		 *
		 * Keying by the theme the button switches TO also settles the ambiguity
		 * docs/ux/copy.md warns about: the key and the promise are the same
		 * thing.
		 *
		 * The English is byte-identical to the concatenated version on purpose —
		 * e2e matches /Switch to dark mode/.
		 */
		themeToggle: {
			light: t({
				"en-US": "Switch to light mode",
				"ko-KR": "밝은 모드로 전환",
			}),
			dark: t({
				"en-US": "Switch to dark mode",
				"ko-KR": "어두운 모드로 전환",
			}),
		},
	},
} satisfies Dictionary;
