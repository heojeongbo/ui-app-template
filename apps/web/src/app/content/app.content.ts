import { type Dictionary, insert, t } from "intlayer";

/**
 * What the application calls itself.
 *
 * `productName` is NOT translated, and that is deliberate: a product name is a
 * proper noun. Translating it gives two names for one thing, and the one in
 * the user's browser tab stops matching the one in their invoice.
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
	key: "app",
	content: {
		/**
		 * ONE declaration of the product name. `apps/web/index.html`'s `<title>`
		 * is a second and deliberately stays a literal — it is what the browser
		 * shows before React boots, and nothing there can read a dictionary.
		 * `pnpm rename:scope` rewrites both.
		 */
		productName: "ui-app-template",

		/**
		 * Screen first, product second — and an insertion rather than a `+` at
		 * the call site, so a locale that wants the product first, or a
		 * different separator, changes this line and nothing else. Screen-first
		 * also survives truncation, which browsers do from the right.
		 */
		documentTitle: insert(
			t({
				"en-US": "{{screen}} · ui-app-template",
				"ko-KR": "{{screen}} · ui-app-template",
			}),
		),
	},
} satisfies Dictionary;
