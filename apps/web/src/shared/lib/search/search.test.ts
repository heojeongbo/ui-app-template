import {
	defaultParseSearch,
	defaultStringifySearch,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
	boolParam,
	clampPage,
	paginationSearchSchema,
	querySearchSchema,
	sortSearchSchema,
	toOffset,
} from "./search";

describe("boolParam", () => {
	const schema = z.object({ debug: boolParam() });

	it('reads "false" and "0" as false', () => {
		// `z.coerce.boolean()` reads both as TRUE — Boolean("false") is true —
		// which is how a debug flag stays on for anyone who tried to turn it off.
		expect(schema.parse({ debug: "false" }).debug).toBe(false);
		expect(schema.parse({ debug: "0" }).debug).toBe(false);
	});

	it('reads "true" and "1" as true', () => {
		expect(schema.parse({ debug: "true" }).debug).toBe(true);
		expect(schema.parse({ debug: "1" }).debug).toBe(true);
	});

	it("falls back rather than throwing on nonsense", () => {
		expect(schema.parse({ debug: "maybe" }).debug).toBe(false);
	});

	it("reads an already-parsed boolean and 0|1, not only their spellings", () => {
		// The three tests above pass strings, which is the reason the defect they
		// were written to cover survived them: the router hands `validateSearch`
		// a value that `JSON.parse` already ate, so a plain `z.stringbool()`
		// never sees `?debug=true` as the string "true".
		expect(schema.parse({ debug: true }).debug).toBe(true);
		expect(schema.parse({ debug: false }).debug).toBe(false);
		expect(schema.parse({ debug: 1 }).debug).toBe(true);
		expect(schema.parse({ debug: 0 }).debug).toBe(false);
	});

	it("falls back for a number that is not 0 or 1", () => {
		// Restricted rather than truthy: `?debug=99` is a typo, not a yes.
		expect(schema.parse({ debug: 99 }).debug).toBe(false);
	});
});

/**
 * The integration the unit tests above cannot see.
 *
 * Everything else in this file feeds the schemas by hand, which silently
 * assumes search params arrive as strings. They do not: the app installs no
 * `parseSearch`, so TanStack's `parseSearchWith(JSON.parse)` runs first. These
 * tests drive the real parser so that assumption is checked rather than
 * restated — and they would have caught both defects below on the day they
 * were written.
 */
describe("the router's own parse, before validateSearch", () => {
	it("hands validateSearch a boolean for ?debug=true", () => {
		expect(defaultParseSearch("?debug=true")).toEqual({ debug: true });
		expect(defaultParseSearch("?debug=1")).toEqual({ debug: 1 });
		// Survives only because JSON.parse throws on it.
		expect(defaultParseSearch("?debug=yes")).toEqual({ debug: "yes" });
	});

	it("hands validateSearch a number for a numeric ?q", () => {
		expect(defaultParseSearch("?q=12345")).toEqual({ q: 12345 });
		expect(defaultParseSearch("?q=hello")).toEqual({ q: "hello" });
	});

	it("round-trips a flag the app set itself", () => {
		// The clinching case. `<Link search={{ debug: true }}>` stringifies to
		// `?debug=true`, and before the union in `boolParam` that read back as
		// `false` — the app could not turn on its own flag.
		const url = defaultStringifySearch({ debug: true });
		const parsed = defaultParseSearch(url);
		expect(z.object({ debug: boolParam() }).parse(parsed).debug).toBe(true);
	});

	it("keeps a numeric text filter through the full parse", () => {
		// Was live: `/items?q=12345` rendered the UNFILTERED list with an EMPTY
		// search box, because `z.string()` rejected the number and `.catch()`
		// swallowed it. Order numbers, SKUs and years are the realistic values,
		// and pasted links are the realistic traffic.
		const parsed = defaultParseSearch("?q=12345");
		expect(z.object({ ...querySearchSchema() }).parse(parsed).q).toBe("12345");
	});
});

describe("paginationSearchSchema", () => {
	const schema = z.object({ ...paginationSearchSchema(20) });

	it("defaults an absent search", () => {
		expect(schema.parse({})).toEqual({ page: 1, pageSize: 20 });
	});

	it("coerces the string a URL actually carries", () => {
		expect(schema.parse({ page: "3" }).page).toBe(3);
	});

	it("falls back on a stale or hand-edited URL", () => {
		// A bookmark outlives the code that produced it; `?page=abc` should show
		// page 1, not a router error screen.
		expect(schema.parse({ page: "abc" }).page).toBe(1);
		expect(schema.parse({ page: "-2" }).page).toBe(1);
	});

	it("refuses a page size outside the offered list", () => {
		// Otherwise `?pageSize=10000` is a denial-of-service you can type.
		expect(schema.parse({ pageSize: "10000" }).pageSize).toBe(20);
		expect(schema.parse({ pageSize: "50" }).pageSize).toBe(50);
	});

	it("composes with a route's own keys", () => {
		// The helper returns a SHAPE, not a z.object, precisely so this works.
		const routeSchema = z.object({
			...paginationSearchSchema(10),
			status: z.enum(["all", "active"]).catch("all"),
		});
		expect(routeSchema.parse({ status: "nope" })).toEqual({
			page: 1,
			pageSize: 10,
			status: "all",
		});
	});
});

describe("sortSearchSchema", () => {
	const schema = z.object({
		...sortSearchSchema(["name", "createdAt"] as const, "createdAt"),
	});

	it("accepts a known column", () => {
		expect(schema.parse({ sortBy: "name" }).sortBy).toBe("name");
	});

	it("falls back for a column that no longer exists", () => {
		// A renamed column leaves old links pointing at it.
		expect(schema.parse({ sortBy: "removed" }).sortBy).toBe("createdAt");
	});

	it("defaults the direction", () => {
		expect(schema.parse({}).sortDir).toBe("desc");
	});
});

describe("querySearchSchema", () => {
	const schema = z.object({ ...querySearchSchema() });

	it("leaves an absent filter undefined rather than empty", () => {
		// `?q=` in every link is noise; undefined is what `stripSearchParams`
		// and a clean URL need.
		expect(schema.parse({}).q).toBeUndefined();
		expect(schema.parse({ q: "" }).q).toBeUndefined();
		expect(schema.parse({ q: "   " }).q).toBeUndefined();
	});

	it("trims what the user typed", () => {
		expect(schema.parse({ q: "  widget " }).q).toBe("widget");
	});
});

describe("toOffset", () => {
	it("is zero-based", () => {
		expect(toOffset(1, 20)).toBe(0);
		expect(toOffset(3, 20)).toBe(40);
	});
});

describe("clampPage", () => {
	it("pulls a page past the end back to the last one", () => {
		// Deleting the last row on page 4 otherwise leaves the URL on a page with
		// nothing on it, which reads as a failed request rather than the end.
		expect(clampPage(4, 25, 10)).toBe(3);
	});

	it("keeps page 1 when there is no data at all", () => {
		expect(clampPage(1, 0, 10)).toBe(1);
		expect(clampPage(5, 0, 10)).toBe(1);
	});

	it("leaves a valid page alone", () => {
		expect(clampPage(2, 100, 10)).toBe(2);
	});
});
