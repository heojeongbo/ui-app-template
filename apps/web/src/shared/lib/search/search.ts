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
 */
export function boolParam(defaultValue = false) {
	return z.stringbool().catch(defaultValue).default(defaultValue);
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
 */
export function querySearchSchema() {
	return {
		q: z.string().trim().min(1).optional().catch(undefined),
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
	const lastPage = Math.max(1, Math.ceil(total / pageSize));
	return Math.min(Math.max(1, page), lastPage);
}
