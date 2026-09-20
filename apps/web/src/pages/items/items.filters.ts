import {
	type ItemListParams,
	type StatusFilter,
	statusFromFilter,
} from "@/entities/item";
import { clampPage } from "@/shared/lib/search";

/**
 * Every decision the items screen makes about its own URL state.
 *
 * Pure functions, in a `.ts`, and that is the rule the whole page triad turns
 * on: **a scenario test never renders**, so anything a scenario asserts has to
 * be reachable without React. A filter reset written as a ternary inside an
 * `onChange` handler is invisible to a test and has to be extracted before it
 * can be covered — so it gets extracted first.
 *
 * See docs/screens/items.md for the scenarios these satisfy.
 */

export type ItemsSearch = {
	page: number;
	pageSize: number;
	status: StatusFilter;
	q?: string;
};

/**
 * S1 — changing a filter returns to page 1.
 *
 * Without this, filtering from page 5 down to three results shows an empty
 * page 5, which reads as "no matches" when there are three.
 */
export function applyStatusFilter(
	search: ItemsSearch,
	status: StatusFilter,
): ItemsSearch {
	return { ...search, status, page: 1 };
}

/**
 * S2 — the same rule for the text filter, plus: an empty query clears the
 * param rather than setting it to `""`.
 *
 * `?q=` in the URL is noise, it defeats `stripSearchParams`, and it makes two
 * URLs that mean the same thing look different in history and analytics.
 */
export function applyQuery(search: ItemsSearch, raw: string): ItemsSearch {
	const q = raw.trim();
	return { ...search, q: q.length > 0 ? q : undefined, page: 1 };
}

/** S3 — paging keeps every other filter. */
export function applyPage(search: ItemsSearch, page: number): ItemsSearch {
	return { ...search, page: Math.max(1, page) };
}

/**
 * S4 — changing the page size keeps the user roughly where they were.
 *
 * Jumping back to page 1 loses their place in a long list; the first row
 * currently on screen is the thing to preserve.
 */
export function applyPageSize(
	search: ItemsSearch,
	pageSize: number,
): ItemsSearch {
	const firstRow = (search.page - 1) * search.pageSize;
	return { ...search, pageSize, page: Math.floor(firstRow / pageSize) + 1 };
}

/**
 * S5 — after a result arrives, a page past the end is corrected.
 *
 * Deleting the last row on the last page otherwise leaves the URL pointing at
 * a page with nothing on it. An empty list there looks like a failed request,
 * not the end of the data.
 *
 * Returns `null` when nothing needs to change, so the caller can skip a
 * navigation rather than looping on an identical one.
 */
export function correctOverflowPage(
	search: ItemsSearch,
	total: number,
): ItemsSearch | null {
	const corrected = clampPage(search.page, total, search.pageSize);
	return corrected === search.page ? null : { ...search, page: corrected };
}

/** S6 — is the user filtering at all? Drives the empty state's wording. */
export function hasActiveFilters(search: ItemsSearch): boolean {
	return search.status !== "all" || Boolean(search.q);
}

/**
 * S6 — the exact inverse of `hasActiveFilters`.
 *
 * Here rather than inline in the JSX so the two stay together and a test can
 * hold them to each other. Written apart, adding a third filter to the bar and
 * forgetting this object clears two of three: the empty state stays up and
 * "Clear filters" reads as broken.
 *
 * `pageSize` survives deliberately — it is a display preference, not a filter.
 */
export function clearFilters(search: ItemsSearch): ItemsSearch {
	return { ...search, status: "all", q: undefined, page: 1 };
}

/**
 * S8 — the URL vocabulary translated to the wire vocabulary.
 *
 * The one place that mapping is written. It used to exist three times — the
 * route's `loaderDeps`, the route's loader, and the page's query — and nothing
 * held them together: `ItemListParams.query` is optional, the page's object
 * was an unannotated const so excess-property checking never fired, and query
 * keys hash structurally. A mismatch therefore primed one cache entry and
 * subscribed to another, rendering stale rows under a correct-looking URL.
 *
 * Doubling as `loaderDeps` keeps the loader narrow by construction: it depends
 * on exactly what the query keys on, so an unrelated search param changing
 * cannot re-run it.
 */
export function itemsListParams(search: ItemsSearch): ItemListParams {
	return {
		page: search.page,
		pageSize: search.pageSize,
		status: statusFromFilter(search.status),
		query: search.q,
	};
}

/**
 * S7 — the range label under a list ("1–20 of 47").
 *
 * Extracted because off-by-ones here are the kind of bug that survives review:
 * the last page must show the real count, not `page * pageSize`.
 */
export function visibleRange(
	search: ItemsSearch,
	total: number,
): { from: number; to: number } {
	if (total === 0) return { from: 0, to: 0 };
	const from = (search.page - 1) * search.pageSize + 1;
	const to = Math.min(search.page * search.pageSize, total);
	return { from, to };
}
