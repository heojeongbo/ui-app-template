import { defaultParseSearch } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { ITEMS_SEARCH_DEFAULTS, itemsSearchSchema } from "./items.search";

/**
 * The schema `ItemsSearch` is inferred from.
 *
 * Every assertion here has a type-level twin that cannot be written as a test:
 * the reason this file exists is that the schema and a hand-written
 * `ItemsSearch` had drifted, and the drift was invisible precisely because the
 * runtime kept working. What is pinned below is the behaviour that used to
 * paper over it.
 */
describe("itemsSearchSchema", () => {
	it("fills every key from an empty search", () => {
		// No `.partial()`: every key has a default, so the parsed result is
		// always complete and `<Link to="/items">` with no search type-checks.
		expect(itemsSearchSchema.parse({})).toEqual({
			page: 1,
			pageSize: 20,
			status: "all",
		});
	});

	it("agrees with the defaults that get stripped from the URL", () => {
		// `stripSearchParams(ITEMS_SEARCH_DEFAULTS)` removes these from the URL,
		// so the schema must put them back. A default here that the schema does
		// not also default to would strip a param the route cannot reconstruct.
		expect(itemsSearchSchema.parse({})).toMatchObject(ITEMS_SEARCH_DEFAULTS);
	});

	it("resets a page size that is not on offer", () => {
		// This is the value the TYPE now makes unreachable. Before `ItemsSearch`
		// was inferred, `applyPageSize(search, 999)` type-checked, wrote
		// `?pageSize=999`, and landed here — where `.catch(20)` silently undid
		// it. The user picked nothing, saw 20, and nothing reported anything.
		expect(itemsSearchSchema.parse({ pageSize: 999 }).pageSize).toBe(20);
		expect(itemsSearchSchema.parse({ pageSize: 0 }).pageSize).toBe(20);
	});

	it("keeps a page size that is on offer", () => {
		expect(itemsSearchSchema.parse({ pageSize: 50 }).pageSize).toBe(50);
	});

	it("degrades a hand-edited URL instead of throwing", () => {
		// A URL outlives the code that produced it, so a stale bookmark shows
		// page 1 rather than a router error screen.
		expect(itemsSearchSchema.parse({ page: "abc" }).page).toBe(1);
		expect(itemsSearchSchema.parse({ status: "retired" }).status).toBe("all");
	});

	it("survives the router's own parse, which runs first", () => {
		// `parseSearchWith(JSON.parse)` runs before `validateSearch`, so `?q=`
		// with a numeric value arrives as a number. Asserted through the real
		// parser rather than by hand, because parsing by hand is the assumption
		// that hid this.
		const parsed = defaultParseSearch("?q=12345&pageSize=50&page=3");
		expect(itemsSearchSchema.parse(parsed)).toEqual({
			page: 3,
			pageSize: 50,
			status: "all",
			q: "12345",
		});
	});
});
