import { z } from "zod";

/**
 * Building blocks for `validateSearch` schemas.
 *
 * Three rules hold across all of them, and each one is a bug that has happened:
 *
 * 1. **Every field `.catch()`es.** A URL is user-editable, bookmarkable and
 *    outlives the code that produced it. `?page=abc` from a stale bookmark
 *    should show page 1, not a router error screen.
 *
 * 2. **Helpers return a SHAPE, not a `z.object`.** A route almost always needs
 *    its own keys alongside pagination, and spreading a shape composes where a
 *    `.merge()` chain does not.
 *
 * 3. **Never `z.coerce.boolean()`.** It applies JavaScript truthiness, so
 *    `?debug=false` and `?debug=0` are both `true`. Use `boolParam` below.
 *
 * 4. **A search param is NOT necessarily a string by the time zod sees it.**
 *    This is the one that is invisible until it bites. The router supplies no
 *    `parseSearch` of its own, so TanStack's default applies — and the default
 *    is `parseSearchWith(JSON.parse)`, which JSON-parses every value *before*
 *    `validateSearch` runs. Verified against the pinned 1.167.2:
 *
 *        ?q=12345     -> { q: 12345 }      number
 *        ?q=hello     -> { q: "hello" }    string  (JSON.parse threw)
 *        ?debug=true  -> { debug: true }   boolean
 *        ?debug=1     -> { debug: 1 }      number
 *        ?debug=yes   -> { debug: "yes" }  string  (JSON.parse threw)
 *
 *    So a bare `z.string()` rejects `?q=12345`, and a bare `z.stringbool()`
 *    rejects `?debug=true` — and because rule 1 says every field `.catch()`es,
 *    the rejection is *silent*. The param does not error; it disappears.
 *    Every helper below therefore accepts the parsed type, not just the string
 *    spelling. Newer router versions gate JSON.parse behind a lookahead regex
 *    (`/^(?:\s|["[{\d-]|fa|nu|tr)/`) which still matches all of the above.
 */

/** Page sizes the UI offers. One list, so the schema and the picker agree. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

/**
 * A URL boolean that means what it says.
 *
 * `z.stringbool()` accepts "true"/"false"/"1"/"0"/"yes"/"no" and — crucially —
 * treats the negative spellings as `false`. `z.coerce.boolean()` does not:
 * `Boolean("false")` is `true`, which is how a debug flag ends up permanently
 * on for anyone who tried to turn it off.
 *
 * The union is not defensive padding — it is rule 4 above, and without it this
 * helper is **inverted for the spellings people actually type**. `z.stringbool`
 * pipes through a string leg, so the pre-parsed `true` and `1` fail it and fall
 * through `.catch()` to `false`. Measured before the union existed:
 *
 *     ?debug=true -> false      ?debug=1 -> false      ?debug=0 -> false
 *     ?debug=yes  -> true       ?debug=on -> true
 *
 * Only the spellings `JSON.parse` chokes on survived. The clinching case is
 * that the app could not turn its own flag on: `<Link search={{ debug: true }}>`
 * stringifies to `?debug=true`, which read back as `false` on the very route
 * that produced it.
 */
export function boolParam(defaultValue = false) {
	return z
		.union([
			// Already a boolean: `?debug=true`, and every in-app `<Link>`.
			z.boolean(),
			// `?debug=1` / `?debug=0`. Restricted to 0 and 1 rather than any
			// number, so `?debug=99` falls to the default instead of guessing.
			z.literal([0, 1]).transform((n) => n === 1),
			// The string spellings: "yes"/"no"/"on"/"off", plus "true"/"false"
			// and "1"/"0" when something upstream kept them quoted.
			z.stringbool(),
		])
		.catch(defaultValue)
		.default(defaultValue);
}

/**
 * Offset pagination.
 *
 * Spread into a route's schema:
 *
 *     validateSearch: z.object({
 *       ...paginationSearchSchema(20),
 *       status: z.enum(STATUSES).catch("all"),
 *     })
 */
export function paginationSearchSchema(defaultPageSize: PageSize = 20) {
	return {
		page: z.coerce.number().int().positive().catch(1).default(1),
		pageSize: z.coerce
			.number()
			.int()
			// `.refine` rather than `z.enum`: the value arrives as a string and has
			// to be coerced first, and an out-of-range size must fall back rather
			// than let someone request 10,000 rows by editing the URL.
			.refine((n): n is PageSize =>
				(PAGE_SIZE_OPTIONS as readonly number[]).includes(n),
			)
			.catch(defaultPageSize)
			.default(defaultPageSize),
	};
}

export type SortDirection = "asc" | "desc";

/**
 * Sorting, constrained to the columns a route actually has.
 *
 * `sortBy` is typed from the caller's column tuple, so renaming a column is a
 * compile error at the route rather than a sort that silently stops working.
 */
export function sortSearchSchema<
	const TColumns extends readonly [string, ...string[]],
>(
	columns: TColumns,
	defaultColumn: TColumns[number],
	defaultDirection: SortDirection = "desc",
) {
	return {
		sortBy: z.enum(columns).catch(defaultColumn).default(defaultColumn),
		sortDir: z
			.enum(["asc", "desc"])
			.catch(defaultDirection)
			.default(defaultDirection),
	};
}

/**
 * A free-text filter.
 *
 * `.optional()` with no default on purpose: an empty string and "not filtering"
 * are the same thing to a user but different things in a URL, and writing
 * `?q=` into every link is noise. Clear the param to `undefined`, never `""`.
 *
 * The `preprocess` is rule 4, and it fixes a bug that was live in this
 * template: a plain `z.string()` here rejects `?q=12345`, because the router
 * JSON-parsed it into the NUMBER 12345 before zod ran. `.catch(undefined)`
 * then swallowed the rejection, so `/items?q=12345` rendered the **unfiltered**
 * list with an **empty search box** — which reads as "no filter applied"
 * rather than as an error, and `stripSearchParams` erased the evidence from
 * the URL on the next navigation.
 *
 * Typing in the app hid it: the app's own links stringify to `?q=%2212345%22`,
 * which round-trips as a string. Only hand-written, pasted, emailed and
 * server-generated links broke — exactly the traffic a URL-is-the-state design
 * exists to serve, and exactly the traffic no one clicks while developing.
 *
 * Numbers and booleans only. An object or array stays unconverted so it fails
 * the string check and falls to `undefined`, rather than searching for the
 * literal text "[object Object]".
 */
export function querySearchSchema() {
	return {
		q: z
			.preprocess(
				(value) =>
					typeof value === "number" || typeof value === "boolean"
						? String(value)
						: value,
				z.string().trim().min(1),
			)
			.optional()
			.catch(undefined),
	};
}

/**
 * Offset for a server that pages by offset rather than page number.
 * Kept here so the arithmetic exists once.
 */
export function toOffset(page: number, pageSize: number): number {
	return (page - 1) * pageSize;
}

/**
 * The last page that exists. Zero rows is still page 1, never page 0.
 *
 * Extracted because the identical expression was inlined in the pager's JSX,
 * driving `disabled={page >= lastPage}` — the off-by-one the whole
 * extract-decisions-into-`.ts` discipline exists for, in a file no scenario
 * test can reach.
 */
export function lastPage(total: number, pageSize: number): number {
	return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * Clamp a page to what actually exists.
 *
 * Needed after a query returns: deleting the last row on page 4 leaves the URL
 * pointing at a page with nothing on it, and an empty list there looks like a
 * failed request rather than the end of the data.
 */
export function clampPage(
	page: number,
	total: number,
	pageSize: number,
): number {
	return Math.min(Math.max(1, page), lastPage(total, pageSize));
}
