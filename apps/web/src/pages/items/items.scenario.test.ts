/**
 * Scenarios for the items screen.
 *
 * Spec: ../../../docs/screens/items.md — one `it` per `S<n>`, same numbers,
 * same sentences.
 *
 * Nothing here renders. That is the constraint the whole page triad turns on:
 * because a scenario cannot reach into a `.tsx` handler, every decision this
 * screen makes lives in `items.filters.ts` as a pure function. See
 * docs/screens/README.md.
 */
import { describe, expect, it } from "vitest";

import {
	applyPage,
	applyPageSize,
	applyQuery,
	applyStatusFilter,
	correctOverflowPage,
	hasActiveFilters,
	type ItemsSearch,
	visibleRange,
} from "./items.filters";

const base: ItemsSearch = { page: 5, pageSize: 20, status: "all" };

describe("items screen", () => {
	it("S1: changing the status filter returns to page 1", () => {
		const next = applyStatusFilter(base, "active");

		expect(next.status).toBe("active");
		// Filtering from page 5 down to three results otherwise shows an empty
		// page 5, which reads as "no matches" when there are three.
		expect(next.page).toBe(1);
	});

	it("S2: typing a text filter returns to page 1, and clearing it removes the param", () => {
		const filtered = applyQuery(base, "  widget ");
		expect(filtered.q).toBe("widget");
		expect(filtered.page).toBe(1);

		// `undefined`, not `""`. An empty `?q=` is noise, defeats
		// stripSearchParams, and makes two URLs that mean the same thing look
		// different in history.
		expect(applyQuery(filtered, "").q).toBeUndefined();
		expect(applyQuery(filtered, "   ").q).toBeUndefined();
	});

	it("S3: paging keeps every other filter", () => {
		const filtered = applyQuery(applyStatusFilter(base, "draft"), "widget");
		const paged = applyPage(filtered, 3);

		expect(paged.page).toBe(3);
		// Losing the filters on page change is the bug that makes a filtered
		// list impossible to browse past its first page.
		expect(paged.status).toBe("draft");
		expect(paged.q).toBe("widget");
	});

	it("S3: paging never goes below page 1", () => {
		expect(applyPage(base, 0).page).toBe(1);
		expect(applyPage(base, -3).page).toBe(1);
	});

	it("S4: changing the page size keeps the first visible row on screen", () => {
		// Page 5 of 20 starts at row 80. At 50 per page that row is on page 2.
		expect(applyPageSize(base, 50)).toMatchObject({ page: 2, pageSize: 50 });

		// And the other direction: row 80 at 10 per page is page 9.
		expect(applyPageSize(base, 10)).toMatchObject({ page: 9, pageSize: 10 });
	});

	it("S4: changing page size on page 1 stays on page 1", () => {
		expect(applyPageSize({ ...base, page: 1 }, 50).page).toBe(1);
	});

	it("S5: a page past the end is corrected to the last page that exists", () => {
		// 47 rows at 20 per page is 3 pages; page 5 does not exist.
		expect(correctOverflowPage(base, 47)).toMatchObject({ page: 3 });
	});

	it("S5: a valid page is left alone", () => {
		// `null` means "no navigation needed" — returning a new-but-equal object
		// would make the caller navigate to where it already is, forever.
		expect(correctOverflowPage({ ...base, page: 2 }, 47)).toBeNull();
	});

	it("S5: an empty result corrects to page 1, not page 0", () => {
		expect(correctOverflowPage(base, 0)).toMatchObject({ page: 1 });
	});

	it("S6: the empty state distinguishes 'nothing yet' from 'nothing matches'", () => {
		// The two need different wording because the user's next move differs:
		// one creates an item, the other clears a filter.
		expect(hasActiveFilters(base)).toBe(false);
		expect(hasActiveFilters(applyStatusFilter(base, "draft"))).toBe(true);
		expect(hasActiveFilters(applyQuery(base, "widget"))).toBe(true);
	});

	it("S7: the range label counts real rows on the last page", () => {
		// 47 rows, 20 per page, page 3 → rows 41–47. `page * pageSize` would say
		// 60, which is the off-by-one that survives review because every page
		// except the last one looks right.
		expect(visibleRange({ ...base, page: 3 }, 47)).toEqual({
			from: 41,
			to: 47,
		});
	});

	it("S7: a full page reports its full range", () => {
		expect(visibleRange({ ...base, page: 1 }, 47)).toEqual({ from: 1, to: 20 });
	});

	it("S7: an empty result reports an empty range", () => {
		// 1–0 of 0 would be nonsense on screen.
		expect(visibleRange(base, 0)).toEqual({ from: 0, to: 0 });
	});
});
