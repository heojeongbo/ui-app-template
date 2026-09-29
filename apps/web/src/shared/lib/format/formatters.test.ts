import { describe, expect, it } from "vitest";

import { createFormatters } from "./formatters";

describe("createFormatters", () => {
	// THE regression test for the bug this seam was built to fix.
	//
	// The date cell used to render `created.toISOString().slice(0, 10)`, which
	// is the UTC calendar day. For a user in Asia/Seoul, an instant one hour
	// before midnight UTC belongs to the NEXT day on their wall clock — so the
	// row showed a date that was a day early, for reasons that had nothing to
	// do with translation and could not be seen from a UTC machine.
	//
	// `TZ` is pinned to Asia/Seoul in vite.config.ts, so the host default this
	// formatter uses is the user's zone and the assertion is meaningful.
	it("renders the user's calendar day, not the UTC one", () => {
		const f = createFormatters("en-US");
		const lateOnNewYearsDayUtc = new Date("2026-01-01T23:00:00Z");

		expect(f.date(lateOnNewYearsDayUtc)).toContain("Jan 2");
	});

	it("groups thousands, which raw interpolation never did", () => {
		expect(createFormatters("en-US").integer(1234)).toBe("1,234");
	});

	// The two locales format the same instant differently — which is the point,
	// and what a hardcoded ISO string could not express in either.
	it("formats per locale", () => {
		const instant = new Date("2026-03-09T04:00:00Z");

		expect(createFormatters("en-US").date(instant)).not.toBe(
			createFormatters("ko-KR").date(instant),
		);
	});
});
