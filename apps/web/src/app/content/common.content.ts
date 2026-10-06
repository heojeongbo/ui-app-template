import { type Dictionary, t } from "intlayer";

/**
 * The words every screen needs.
 *
 * Bare action labels ONLY. A sentence stays with the screen that says it —
 * "Could not create the item" means something screen-specific and belongs in
 * `items.content.ts`; "Cancel" does not, and twelve screens independently
 * choosing between "Remove" and "Delete" is the failure this prevents.
 *
 * Read SIDE BY SIDE with a screen's dictionary, never merged into one: a
 * component calls `useIntlayer("common")` alongside `useIntlayer("items")`.
 * Merging them here is not possible even in principle — a dictionary leaf is a
 * node rather than a string, so it cannot be spread. See docs/ux/copy.md.
 *
 * `export default`, which the rest of the codebase does not do. Intlayer's CLI
 * reads the default export and there is no named-export form; the carve-out is
 * written down in CLAUDE.md so it reads as a rule rather than a slip.
 *
 * Declared in `app/` rather than `shared/`, and nothing imports it.
 *
 * A dictionary is reached by KEY through intlayer's registry, so there is no
 * module edge from the components that read it — `useIntlayer("common")` in a
 * `shared/ui` component creates no import, and therefore no upward dependency.
 * It is the same shape as `app/theme.css`: the app layer declares tokens that
 * every layer below consumes without importing anything. Put in `shared/`, it
 * would be a segment with no public API, which is exactly what it is.
 */
export default {
	key: "common",
	content: {
		cancel: t({ "en-US": "Cancel", "ko-KR": "취소" }),
		save: t({ "en-US": "Save", "ko-KR": "저장" }),
		create: t({ "en-US": "Create", "ko-KR": "만들기" }),
		delete: t({ "en-US": "Delete", "ko-KR": "삭제" }),
		undo: t({ "en-US": "Undo", "ko-KR": "실행 취소" }),
		retry: t({ "en-US": "Try again", "ko-KR": "다시 시도" }),

		// Lands in an `sr-only` span on an icon-only button.
		close: t({ "en-US": "Close", "ko-KR": "닫기" }),
		// Lands in `aria-label`.
		loading: t({ "en-US": "Loading", "ko-KR": "불러오는 중" }),
		// The pagination landmark's name. A convention rather than screen copy:
		// two lists whose landmarks disagree is an inconsistency a sighted
		// reviewer never sees.
		pagination: t({ "en-US": "Pagination", "ko-KR": "페이지 매김" }),

		/**
		 * The language switcher, keyed by the locale it switches TO — the same
		 * shape as the theme toggle, and for the same reason.
		 *
		 * Each entry is written IN THE LANGUAGE IT OFFERS, not in the language
		 * currently on screen. "한국어로 전환" on an English page is readable by
		 * exactly the person who needs it; "Switch to Korean" is readable by
		 * everyone except them.
		 *
		 * In `common` rather than the app shell's dictionary because the switcher
		 * is not chrome — it has to exist on the SIGN-IN page too. Someone who
		 * cannot read English cannot sign in to reach a switcher that only
		 * appears after signing in.
		 */
		localeToggle: {
			"en-US": t({
				"en-US": "Switch to English",
				"ko-KR": "Switch to English",
			}),
			"ko-KR": t({ "en-US": "한국어로 전환", "ko-KR": "한국어로 전환" }),
		},
	},
} satisfies Dictionary;
